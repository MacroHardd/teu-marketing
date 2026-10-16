import type { H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'

export const servico = (event: H3Event) => serverSupabaseServiceRole<Database>(event)

async function usuarioId(event: H3Event): Promise<string> {
  const id = (await serverSupabaseUser(event))?.sub
  if (!id) throw createError({ statusCode: 401, statusMessage: 'Entre de novo.' })
  return id
}

/** Parceiro dono da sessão, ou 403. */
export async function parceiroDaSessao(event: H3Event) {
  const id = await usuarioId(event)
  const { data } = await servico(event).from('parceiros').select('*').eq('usuario_id', id).maybeSingle()
  if (!data) throw createError({ statusCode: 403, statusMessage: 'Só o Parceiro pode fazer isso.' })
  return data
}

/** Cliente ativo dono da sessão, ou 403. */
export async function clienteDaSessao(event: H3Event) {
  const id = await usuarioId(event)
  const { data } = await servico(event).from('clientes').select('*').eq('usuario_id', id).eq('ativo', true).maybeSingle()
  if (!data) throw createError({ statusCode: 403, statusMessage: 'Acesso de Cliente não encontrado.' })
  return data
}
