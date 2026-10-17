import { randomUUID } from 'node:crypto'

/**
 * Asaas (ADR 0005): cliente + assinatura pela API, com externalReference = id da nossa Assinatura, e a
 * pessoa paga na fatura hospedada do Asaas (nenhum dado de cartão passa por nós).
 * Modo simulado (só local, sem chave): ids falsos e a fatura vira /assinar/simulado.
 */
export type Plano = 'mensal' | 'anual'

export const simulado = () => {
  const cfg = useRuntimeConfig()
  return !cfg.asaasApiKey && !!cfg.asaasSimulado
}

export function precoDo(plano: Plano): number {
  const p = useRuntimeConfig().public
  return Number(plano === 'mensal' ? p.precoMensal : p.precoAnual) || 0
}

function api<T>(caminho: string, opts: { method?: 'GET' | 'POST' | 'DELETE', body?: Record<string, unknown> } = {}) {
  const cfg = useRuntimeConfig()
  if (!cfg.asaasApiKey) throw createError({ statusCode: 500, statusMessage: 'Pagamento não configurado (NUXT_ASAAS_API_KEY)' })
  return $fetch<T>(`${cfg.asaasUrl}${caminho}`, {
    method: opts.method ?? 'GET',
    body: opts.body,
    headers: { 'access_token': cfg.asaasApiKey, 'User-Agent': 'teu-marketing' }
  })
}

const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

/** Cria cliente e assinatura no Asaas e devolve a URL da 1ª fatura. */
export async function criaCobranca(c: { assinaturaId: string, plano: Plano, email: string, nome: string, cpf: string }) {
  if (simulado()) {
    return {
      asaasClienteId: `sim_cus_${randomUUID()}`,
      asaasAssinaturaId: `sim_sub_${randomUUID()}`,
      url: `${useRuntimeConfig().public.siteUrl}/assinar/simulado?a=${c.assinaturaId}`
    }
  }
  const valor = precoDo(c.plano)
  if (!valor) throw createError({ statusCode: 500, statusMessage: 'Preço não configurado (NUXT_PUBLIC_PRECO_*)' })
  const cliente = await api<{ id: string }>('/customers', {
    method: 'POST',
    body: { name: c.nome, cpfCnpj: c.cpf, email: c.email, externalReference: c.assinaturaId }
  })
  const sub = await api<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: {
      customer: cliente.id,
      // a pessoa escolhe Pix, boleto ou cartão na fatura
      billingType: 'UNDEFINED',
      value: valor,
      nextDueDate: hoje(),
      cycle: c.plano === 'mensal' ? 'MONTHLY' : 'YEARLY',
      description: `Teu Marketing, plano ${c.plano}`,
      externalReference: c.assinaturaId
    }
  })
  const cobrancas = await api<{ data: { invoiceUrl: string }[] }>(`/subscriptions/${sub.id}/payments`)
  const url = cobrancas.data[0]?.invoiceUrl
  if (!url) throw createError({ statusCode: 502, statusMessage: 'O Asaas não devolveu a fatura.' })
  return { asaasClienteId: cliente.id, asaasAssinaturaId: sub.id, url }
}

/** Cancela no Asaas (para de cobrar). Ids simulados não vão para a API. */
export async function cancelaNoAsaas(asaasAssinaturaId: string) {
  if (asaasAssinaturaId.startsWith('sim_')) return
  await api(`/subscriptions/${asaasAssinaturaId}`, { method: 'DELETE' })
}
