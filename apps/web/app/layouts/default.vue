<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const { data: acesso } = await useAcesso()

const links = computed<NavigationMenuItem[]>(() => {
  const fecha = () => {
    open.value = false
  }
  const itens: NavigationMenuItem[] = []
  if (acesso.value?.cliente?.ativo) {
    itens.push({ label: 'Meus Posts', icon: 'i-lucide-images', to: '/posts', onSelect: fecha })
    itens.push({ label: 'Ativos', icon: 'i-lucide-folder-open', to: '/ativos', onSelect: fecha })
    itens.push({ label: 'Perfil de Marca', icon: 'i-lucide-badge-check', to: '/marca', onSelect: fecha })
    if (acesso.value.cliente.direto) itens.push({ label: 'Assinatura', icon: 'i-lucide-credit-card', to: '/assinatura', onSelect: fecha })
  }
  if (acesso.value?.parceiro) itens.push({ label: 'Clientes', icon: 'i-lucide-users', to: '/clientes', onSelect: fecha })
  return itens
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="font-semibold tracking-tight truncate px-2">
          {{ collapsed ? 'TM' : 'Teu Marketing' }}
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
