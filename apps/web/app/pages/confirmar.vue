<script setup lang="ts">
// Volta do link mágico. Dois caminhos: ?code= (login pela tela Entrar, troca automática do
// @nuxtjs/supabase) e ?token_hash= (Convite aceito no servidor, verificado aqui).
definePageMeta({ layout: 'auth' })
useSeoMeta({ title: 'Entrando' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const erro = ref(false)

onMounted(async () => {
  const tokenHash = route.query.token_hash
  if (typeof tokenHash === 'string') {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (error) erro.value = true
  }
  if (route.query.error_description || route.query.error) erro.value = true
})

watch(user, (u) => {
  if (u) {
    clearNuxtData('acesso')
    navigateTo('/', { replace: true })
  }
}, { immediate: true })
</script>

<template>
  <div class="text-center space-y-3">
    <template v-if="erro">
      <p class="font-semibold">
        Este link não vale mais
      </p>
      <p class="text-sm text-muted">
        Links de entrada valem por pouco tempo e só uma vez. Peça um novo.
      </p>
      <UButton to="/entrar" label="Pedir novo link" />
    </template>
    <template v-else>
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      <p class="text-sm text-muted">
        Entrando…
      </p>
    </template>
  </div>
</template>
