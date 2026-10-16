import { z } from 'zod'

const Corpo = z.object({
  nome: z.enum(DO_CLIENTE),
  post_id: z.uuid().nullish(),
  sessao_id: z.uuid().nullish(),
  props: z.record(z.string(), z.unknown())
})

/** Telemetria do browser do Cliente. Parceiro e Cliente vêm da sessão, nunca do corpo. */
export default defineEventHandler(async (event) => {
  const cliente = await clienteDaSessao(event)
  const e = await readValidatedBody(event, Corpo.parse)
  if (!PROPS[e.nome].safeParse(e.props).success) throw createError({ statusCode: 400, statusMessage: 'props inválidas' })
  if (e.post_id) {
    const { data } = await servico(event).from('posts').select('id').eq('id', e.post_id).eq('cliente_id', cliente.id).maybeSingle()
    if (!data) throw createError({ statusCode: 404, statusMessage: 'Post não encontrado.' })
  }
  await registraEvento(event, { ...e, parceiro_id: cliente.parceiro_id, cliente_id: cliente.id })
  return { ok: true }
})
