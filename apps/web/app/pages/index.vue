<script setup lang="ts">
// Encaminha pelo papel. Quem é Parceiro e Cliente ao mesmo tempo cai no painel do Parceiro.
const { data: acesso } = await useAcesso()
const a = acesso.value
if (a?.parceiro) await navigateTo('/clientes', { replace: true })
else if (a?.cliente?.ativo) await navigateTo('/posts', { replace: true })
else if (a?.cliente?.direto) await navigateTo('/acesso/assinatura-encerrada', { replace: true })
else if (a?.cliente) await navigateTo('/acesso/desativado', { replace: true })
else await navigateTo('/acesso/sem-acesso', { replace: true })
</script>

<template>
  <div />
</template>
