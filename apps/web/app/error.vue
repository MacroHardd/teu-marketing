<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Página não encontrada'
})

useHead({
  htmlAttrs: {
    lang: 'pt-BR'
  }
})
</script>

<template>
  <UApp>
    <UError :error="error" :clear="{ label: 'Voltar ao início' }" />
  </UApp>
</template>
