/** O Cliente direto cancela a própria Assinatura: para de cobrar, o acesso segue até o fim do período pago. */
export default defineEventHandler(async (event) => {
  const cliente = await clienteDaSessao(event)
  const db = servico(event)
  const { data: a } = await db.from('assinaturas').select('*').eq('cliente_id', cliente.id).in('status', ['ativa', 'atrasada']).maybeSingle()
  if (!a) throw createError({ statusCode: 404, statusMessage: 'Nenhuma Assinatura ativa.' })
  if (a.asaas_assinatura_id) await cancelaNoAsaas(a.asaas_assinatura_id)
  await marcaCancelada(event, a, 'cliente')
  return { pago_ate: a.pago_ate }
})
