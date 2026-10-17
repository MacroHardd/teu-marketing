<script setup lang="ts">
// Só no local (NUXT_ASAAS_SIMULADO=1): faz o papel da fatura do Asaas. Em produção a API responde 404.
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Pagamento simulado' })

const route = useRoute()
const carregando = ref(false)
const erro = ref('')
async function pagar() {
  carregando.value = true
  try {
    await $fetch('/api/assinatura/simulada', { method: 'POST', body: { assinatura: route.query.a } })
    await navigateTo('/assinar/obrigado')
  } catch {
    erro.value = 'Pagamento simulado indisponível (só no ambiente local).'
    carregando.value = false
  }
}
</script>

<template>
  <div class="text-center space-y-3">
    <UIcon name="i-lucide-flask-conical" class="size-10 text-info" />
    <p class="font-semibold">
      Pagamento simulado
    </p>
    <p class="text-sm text-muted">
      Ambiente local: no lugar da fatura do Asaas. Confirmar aqui passa pelo mesmo código do webhook.
    </p>
    <UAlert
      v-if="erro"
      color="error"
      variant="subtle"
      :title="erro"
    />
    <UButton
      label="Confirmar pagamento"
      :loading="carregando"
      block
      @click="pagar"
    />
  </div>
</template>
