<script setup lang="ts">
// Minha Assinatura (só Cliente direto, ADR 0005): situação, até quando vale e cancelar.
useSeoMeta({ title: 'Assinatura' })

const supabase = useSupabaseClient()
const toast = useToast()
const { data: acesso } = await useAcesso()
if (!acesso.value?.cliente?.ativo || !acesso.value.cliente.direto) await navigateTo('/')

const { data: assinatura, refresh } = await useAsyncData('assinatura', async () => {
  const { data } = await supabase.from('assinaturas').select('plano, status, pago_ate')
    .neq('status', 'pendente').order('criado_em', { ascending: false }).limit(1).maybeSingle()
  return data
})

const SITUACAO: Record<string, { label: string, cor: 'success' | 'warning' | 'neutral' }> = {
  ativa: { label: 'Ativa', cor: 'success' },
  atrasada: { label: 'Pagamento atrasado', cor: 'warning' },
  cancelada: { label: 'Cancelada', cor: 'neutral' },
  encerrada: { label: 'Encerrada', cor: 'neutral' }
}
const data = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : ''
const cobrando = computed(() => ['ativa', 'atrasada'].includes(assinatura.value?.status ?? ''))

const confirmar = ref(false)
const cancelando = ref(false)
async function cancelar() {
  cancelando.value = true
  try {
    await $fetch('/api/assinatura/cancelar', { method: 'POST' })
    toast.add({ title: 'Assinatura cancelada', description: `Seu acesso continua até ${data(assinatura.value?.pago_ate)}.`, color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Não deu para cancelar agora. Tente de novo em instantes.', color: 'error' })
  }
  cancelando.value = false
  confirmar.value = false
}
</script>

<template>
  <UDashboardPanel id="assinatura">
    <template #header>
      <UDashboardNavbar title="Assinatura">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard v-if="assinatura" class="max-w-lg">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="font-semibold">Plano {{ assinatura.plano }}</span>
            <UBadge :color="SITUACAO[assinatura.status]?.cor" variant="subtle" :label="SITUACAO[assinatura.status]?.label" />
          </div>
          <p v-if="assinatura.status === 'ativa'" class="text-sm text-muted">
            Renova automaticamente. Pago até {{ data(assinatura.pago_ate) }}.
          </p>
          <p v-else-if="assinatura.status === 'atrasada'" class="text-sm text-muted">
            O último pagamento não foi confirmado. Pague a fatura que o Asaas mandou por email para não perder o acesso depois de {{ data(assinatura.pago_ate) }}.
          </p>
          <p v-else-if="assinatura.status === 'cancelada'" class="text-sm text-muted">
            Não renova mais. Seu acesso continua até {{ data(assinatura.pago_ate) }}.
          </p>
          <UButton
            v-if="cobrando"
            label="Cancelar Assinatura"
            color="neutral"
            variant="outline"
            @click="confirmar = true"
          />
          <UButton v-else label="Assinar de novo" to="/assinar" />
        </div>
      </UPageCard>

      <UModal
        :open="confirmar"
        title="Cancelar a Assinatura?"
        :description="`Para de cobrar. Você continua usando até ${data(assinatura?.pago_ate)}, e seus Posts ficam guardados.`"
        @update:open="v => confirmar = v"
      >
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton
              label="Manter"
              color="neutral"
              variant="ghost"
              @click="confirmar = false"
            />
            <UButton
              label="Cancelar Assinatura"
              color="error"
              :loading="cancelando"
              @click="cancelar"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
