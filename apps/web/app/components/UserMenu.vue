<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function sair() {
  await supabase.auth.signOut()
  clearNuxtData('acesso')
  await navigateTo('/entrar')
}

const items = computed<DropdownMenuItem[][]>(() => [[{
  type: 'label',
  label: user.value?.email ?? ''
}], [{
  label: 'Sair',
  icon: 'i-lucide-log-out',
  onSelect: sair
}]])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : user?.email"
      icon="i-lucide-circle-user"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
    />
  </UDropdownMenu>
</template>
