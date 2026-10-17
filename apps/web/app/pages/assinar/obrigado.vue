<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Assinatura recebida' })
</script>

<template>
  <div class="text-center space-y-3">
    <UIcon name="i-lucide-mail-check" class="size-10 text-primary" />
    <p class="font-semibold">
      Falta só o pagamento ser confirmado
    </p>
    <p class="text-sm text-muted">
      Assim que o Asaas confirmar, você recebe um email com o link de entrada. Pix e cartão levam poucos minutos; boleto, até 3 dias úteis.
    </p>
    <UButton variant="link" label="Já recebi o email" to="/entrar" />
  </div>
</template>
