/** Reenvia um Convite pendente ou expirado: gera link novo e renova os 7 dias. */
export default defineEventHandler(async (event) => {
  const parceiro = await parceiroDaSessao(event)
  const id = getRouterParam(event, 'id')!
  const db = servico(event)
  const { data: cv } = await db.from('convites').select('*').eq('id', id).eq('parceiro_id', parceiro.id).maybeSingle()
  if (!cv) throw createError({ statusCode: 404, statusMessage: 'Convite não encontrado.' })
  if (cv.status === 'aceito' || cv.status === 'cancelado') throw createError({ statusCode: 409, statusMessage: 'Este Convite não pode ser reenviado.' })
  if (cv.status === 'expirado') await db.from('convites').update({ status: 'cancelado' }).eq('id', cv.id)
  await enviaConvite(event, parceiro, cv.email, { loteId: novoLote(), origem: cv.origem as 'manual' | 'planilha' })
  return { ok: true }
})
