import type { H3Event } from 'h3'
import type { Tables } from '~/types/database.types'

type Assinatura = Tables<'assinaturas'>

const casaId = async (event: H3Event) => {
  const { data } = await servico(event).from('parceiros').select('id').eq('direto', true).single()
  return data!.id
}

/** Pago até: vencimento da cobrança + 1 ciclo (fim do dia, horário de Brasília). */
export function pagoAte(vencimento: string, plano: Assinatura['plano']) {
  const d = new Date(`${vencimento}T23:59:59-03:00`)
  if (plano === 'mensal') d.setUTCMonth(d.getUTCMonth() + 1)
  else d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString()
}

/**
 * Pagamento confirmado: cria (ou reativa) o Cliente direto e estende o acesso. Regras no banco
 * (pagamento_confirmado). No 1º pagamento manda o email com o link de entrada.
 */
export async function confirmaPagamento(event: H3Event, a: Assinatura, vencimento: string) {
  const db = servico(event)
  let usuarioId: string
  let tokenHash: string | null = null
  const { data: cl } = a.cliente_id ? await db.from('clientes').select('usuario_id').eq('id', a.cliente_id).maybeSingle() : { data: null }
  if (cl) {
    // renovação: sem gerar link novo (invalidaria um link de entrada que a pessoa acabou de pedir)
    usuarioId = cl.usuario_id
  } else {
    // usuário do Auth: cria se ainda não existe (o signup público é desligado)
    const criado = await db.auth.admin.createUser({ email: a.email, email_confirm: true })
    if (criado.error && criado.error.code !== 'email_exists') throw createError({ statusCode: 500, statusMessage: criado.error.message })
    const link = await db.auth.admin.generateLink({ type: 'magiclink', email: a.email })
    if (link.error || !link.data.user) throw createError({ statusCode: 500, statusMessage: link.error?.message })
    usuarioId = link.data.user.id
    tokenHash = link.data.properties.hashed_token
  }

  const { data, error } = await db.rpc('pagamento_confirmado', {
    p_assinatura: a.id, p_usuario_id: usuarioId, p_pago_ate: pagoAte(vencimento, a.plano)
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const r = data as { resultado: string, primeira?: boolean }
  if (r.resultado !== 'ok') {
    // pagou mas é Cliente ativo de um Parceiro (corrida com o bloqueio do formulário): resolver à mão
    console.error('pagamento sem ativação', a.id, r.resultado)
    return r
  }
  if (r.primeira) {
    const site = useRuntimeConfig().public.siteUrl
    const entrar = tokenHash ? `${site}/confirmar?${new URLSearchParams({ token_hash: tokenHash, type: 'magiclink' })}` : `${site}/entrar`
    await enviaEmail({ para: a.email, ...emailAcessoLiberado(entrar, `${site}/entrar`) })
  }
  return r
}

export async function marcaCancelada(event: H3Event, a: Assinatura, origem: 'cliente' | 'asaas') {
  if (a.status === 'encerrada' || a.status === 'cancelada') return
  const db = servico(event)
  if (a.status === 'pendente') {
    // nunca pagou: não há acesso para manter
    await db.from('assinaturas').update({ status: 'encerrada', encerrada_em: new Date().toISOString() }).eq('id', a.id)
    return
  }
  await db.from('assinaturas').update({ status: 'cancelada', cancelada_em: new Date().toISOString() }).eq('id', a.id)
  await registraEvento(event, { nome: 'assinatura_cancelada', parceiro_id: await casaId(event), cliente_id: a.cliente_id, props: { plano: a.plano, origem } })
}

export async function marcaIniciada(event: H3Event, plano: Assinatura['plano']) {
  await registraEvento(event, { nome: 'assinatura_iniciada', parceiro_id: await casaId(event), props: { plano } })
}

interface Webhook {
  id: string
  event: string
  payment?: { subscription?: string | null, dueDate?: string }
  subscription?: { id?: string }
}

/** Webhook do Asaas. Idempotente: o mesmo id de evento só é processado uma vez. */
export async function processaWebhook(event: H3Event, w: Webhook) {
  const db = servico(event)
  const { data: visto } = await db.from('pagamento_eventos').select('id').eq('id', w.id).maybeSingle()
  if (visto) return 'repetido'

  const subId = w.payment?.subscription ?? w.subscription?.id
  if (!subId) return 'ignorado'
  const { data: a } = await db.from('assinaturas').select('*').eq('asaas_assinatura_id', subId).maybeSingle()
  if (!a) return 'ignorado'

  switch (w.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      if (w.payment?.dueDate) await confirmaPagamento(event, a, w.payment.dueDate)
      break
    case 'PAYMENT_OVERDUE':
      if (a.status === 'ativa') await db.from('assinaturas').update({ status: 'atrasada' }).eq('id', a.id)
      break
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED': {
      const { error } = await db.rpc('encerrar_assinatura', { p_assinatura: a.id, p_motivo: 'reembolso' })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      break
    }
    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_INACTIVATED':
      await marcaCancelada(event, a, 'asaas')
      break
    default:
      return 'ignorado'
  }
  await db.from('pagamento_eventos').insert({ id: w.id, tipo: w.event })
  return 'ok'
}
