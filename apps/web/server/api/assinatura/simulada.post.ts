import { z } from 'zod'

/** Só no local (NUXT_ASAAS_SIMULADO=1, sem chave do Asaas): "paga" a fatura simulada pelo mesmo código do webhook. */
export default defineEventHandler(async (event) => {
  if (!simulado()) throw createError({ statusCode: 404 })
  const { assinatura } = await readValidatedBody(event, z.object({ assinatura: z.uuid() }).parse)
  const { data: a } = await servico(event).from('assinaturas').select('*').eq('id', assinatura).maybeSingle()
  if (!a?.asaas_assinatura_id) throw createError({ statusCode: 404 })
  const vencimento = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  return processaWebhook(event, {
    id: `sim_evt_${crypto.randomUUID()}`,
    event: 'PAYMENT_CONFIRMED',
    payment: { subscription: a.asaas_assinatura_id, dueDate: vencimento }
  })
})
