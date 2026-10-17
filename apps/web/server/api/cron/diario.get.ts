/** Cron diário (nuxt.config → nitro.vercel; o Hobby permite 1x/dia): encerra as Assinaturas vencidas há mais de 3 dias. */
export default defineEventHandler(async (event) => {
  const segredo = useRuntimeConfig().cronSecret || process.env.CRON_SECRET
  if (!segredo || getHeader(event, 'authorization') !== `Bearer ${segredo}`) throw createError({ statusCode: 401 })
  const { data, error } = await servico(event).rpc('encerrar_assinaturas_vencidas')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { assinaturas_encerradas: data }
})
