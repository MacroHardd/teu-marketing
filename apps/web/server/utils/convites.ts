import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Tables } from '~/types/database.types'

/**
 * Envia (ou reenvia) o Convite de um email. Um Convite em aberto por email e Parceiro:
 * reenviar troca o token (o link antigo para de valer) e renova os 7 dias.
 */
export async function enviaConvite(event: H3Event, parceiro: Tables<'parceiros'>, email: string, opts: { loteId: string, origem: 'manual' | 'planilha' }) {
  const db = servico(event)
  const { token, hash } = novoToken()
  const expira = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  const { data: aberto } = await db.from('convites').select('id')
    .eq('parceiro_id', parceiro.id).eq('email', email).in('status', ['agendado', 'enviado']).maybeSingle()
  const campos = { token_hash: hash, status: 'enviado' as const, enviado_em: new Date().toISOString(), expira_em: expira, lote_id: opts.loteId, origem: opts.origem }
  const { error } = aberto
    ? await db.from('convites').update(campos).eq('id', aberto.id)
    : await db.from('convites').insert({ ...campos, parceiro_id: parceiro.id, email })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const link = `${useRuntimeConfig().public.siteUrl}/convite/${token}`
  await enviaEmail({ para: email, ...emailConvite(parceiro.nome, link) })
  await registraEvento(event, { nome: 'convite_enviado', parceiro_id: parceiro.id, props: { lote_id: opts.loteId, origem: opts.origem } })
}

export const novoLote = () => randomUUID()
