import { z } from 'zod'

const Corpo = z.object({
  email: z.email().transform(e => e.trim().toLowerCase()),
  nome: z.string().trim().min(2).max(100),
  cpf: z.string().refine(cpfValido, 'CPF inválido').transform(c => c.replace(/\D/g, '')),
  plano: z.enum(['mensal', 'anual'])
})

/**
 * Começa uma Assinatura (Cliente direto, ADR 0005): cria a cobrança no Asaas e devolve a URL da fatura.
 * O acesso só é liberado pelo webhook do pagamento. O CPF vai só para o Asaas, não fica no nosso banco.
 */
export default defineEventHandler(async (event) => {
  const c = await readValidatedBody(event, Corpo.parse)
  const db = servico(event)

  const { data: casa } = await db.from('parceiros').select('id').eq('direto', true).single()
  const { data: ativo } = await db.from('clientes').select('parceiro_id').eq('email', c.email).eq('ativo', true).maybeSingle()
  if (ativo && ativo.parceiro_id !== casa!.id) throw createError({ statusCode: 409, statusMessage: 'parceiro' })
  const { data: cobrando } = await db.from('assinaturas').select('id').eq('email', c.email).in('status', ['ativa', 'atrasada']).maybeSingle()
  if (cobrando) throw createError({ statusCode: 409, statusMessage: 'ja_assina' })

  // tentativa anterior sem pagamento: cancela no Asaas para não ficar fatura aberta
  const { data: pendentes } = await db.from('assinaturas').select('*').eq('email', c.email).eq('status', 'pendente')
  for (const p of pendentes ?? []) {
    if (p.asaas_assinatura_id) await cancelaNoAsaas(p.asaas_assinatura_id).catch(e => console.error('cancelar pendente', p.id, e))
    await db.from('assinaturas').update({ status: 'encerrada', encerrada_em: new Date().toISOString() }).eq('id', p.id)
  }

  const { data: a, error } = await db.from('assinaturas').insert({ email: c.email, plano: c.plano }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const cob = await criaCobranca({ assinaturaId: a.id, plano: c.plano, email: c.email, nome: c.nome, cpf: c.cpf })
  await db.from('assinaturas').update({ asaas_cliente_id: cob.asaasClienteId, asaas_assinatura_id: cob.asaasAssinaturaId }).eq('id', a.id)
  await marcaIniciada(event, c.plano)
  return { url: cob.url }
})
