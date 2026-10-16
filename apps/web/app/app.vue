<script setup lang="ts">
import { pt_br as ptBR } from '@nuxt/ui/locale'

const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'pt-BR'
  },
  titleTemplate: t => t ? `${t} · Teu Marketing` : 'Teu Marketing'
})

useSeoMeta({
  description: 'Posts de Instagram prontos em minutos, sem precisar saber design.'
})
</script>

<template>
  <UApp :locale="ptBR">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
