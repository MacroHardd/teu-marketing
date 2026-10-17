import { timingSafeEqual } from 'node:crypto'

/**
 * Webhook do Asaas (configurar no painel: URL <site>/api/asaas/webhook, token = NUXT_ASAAS_WEBHOOK_TOKEN,
 * eventos de cobrança e de assinatura). Responde 200 para o que não é nosso: erro repetido pausa a fila no Asaas.
 */
export default defineEventHandler(async (event) => {
  const esperado = useRuntimeConfig().asaasWebhookToken
  const veio = getHeader(event, 'asaas-access-token') ?? ''
  const ok = !!esperado && veio.length === esperado.length && timingSafeEqual(Buffer.from(veio), Buffer.from(esperado))
  if (!ok) throw createError({ statusCode: 401 })
  const w = await readBody(event)
  if (!w?.id || !w?.event) return { resultado: 'ignorado' }
  return { resultado: await processaWebhook(event, w) }
})
