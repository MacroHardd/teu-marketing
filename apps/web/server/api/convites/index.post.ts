import { z } from 'zod'

const Corpo = z.object({
  emails: z.array(z.string()).min(1).max(500),
  origem: z.enum(['manual', 'planilha']).default('manual')
})

/** Parceiro convida uma lista de emails. Devolve o que foi enviado e o que ficou de fora (e por quê). */
export default defineEventHandler(async (event) => {
  const parceiro = await parceiroDaSessao(event)
  const { emails, origem } = await readValidatedBody(event, Corpo.parse)
  const db = servico(event)

  const vistos = new Set<string>()
  const invalidos: string[] = []
  const duplicados: string[] = []
  const validos: string[] = []
  for (const bruto of emails) {
    const e = bruto.trim().toLowerCase()
    if (!e) continue
    if (!z.email().safeParse(e).success) invalidos.push(bruto.trim())
    else if (vistos.has(e)) duplicados.push(e)
    else {
      vistos.add(e)
      validos.push(e)
    }
  }

  const { data: ativos } = await db.from('clientes').select('email').eq('parceiro_id', parceiro.id).eq('ativo', true).in('email', validos)
  const jaClientes = new Set((ativos ?? []).map(c => c.email))
  const lote = novoLote()
  const enviados: string[] = []
  const falhas: string[] = []
  for (const e of validos) {
    if (jaClientes.has(e)) continue
    try {
      await enviaConvite(event, parceiro, e, { loteId: lote, origem })
      enviados.push(e)
    } catch (err) {
      console.error('convite falhou', err)
      falhas.push(e)
    }
  }
  return { enviados, invalidos, duplicados, ja_clientes: [...jaClientes], falhas }
})
