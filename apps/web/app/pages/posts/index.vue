<script setup lang="ts">
useSeoMeta({ title: 'Meus Posts' })

const supabase = useSupabaseClient()
const toast = useToast()
const { data: acesso } = await useAcesso()
if (!acesso.value?.cliente?.ativo) await navigateTo('/')

const { data: posts } = await useAsyncData('meus-posts', async () => {
  const { data } = await supabase.from('posts').select('id, texto, status, atualizado_em').order('atualizado_em', { ascending: false })
  return data ?? []
})

const { data: perfil } = await useMarca()

const criando = ref(false)
async function novo() {
  criando.value = true
  const { data, error } = await supabase.from('posts').insert({ cliente_id: acesso.value!.cliente!.id }).select('id').single()
  criando.value = false
  if (error) return toast.add({ title: 'Não deu para criar o Post', color: 'error' })
  await navigateTo(`/posts/${data.id}?novo=1`)
}
</script>

<template>
  <UDashboardPanel id="posts">
    <template #header>
      <UDashboardNavbar title="Meus Posts">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Novo Post"
            icon="i-lucide-plus"
            :loading="criando"
            @click="novo"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="!perfil"
        class="mb-6"
        icon="i-lucide-badge-check"
        color="primary"
        variant="subtle"
        title="Coloque a sua marca nos Posts"
        description="Nome, @, cor, logo e contato. É opcional e leva 1 minuto."
        :actions="[{ label: 'Preencher Perfil de Marca', to: '/marca?voltar=/posts' }]"
      />
      <UEmpty
        v-if="!posts?.length"
        icon="i-lucide-image-plus"
        title="Seu primeiro Post sai em minutos"
        description="Escreva uma frase e a gente monta o visual."
        :actions="[{ label: 'Criar meu primeiro Post', icon: 'i-lucide-plus', onClick: novo }]"
      />
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UPageCard
          v-for="p in posts"
          :key="p.id"
          :to="`/posts/${p.id}`"
          :title="p.texto || 'Sem texto'"
          :description="new Date(p.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })"
          :ui="{ title: 'line-clamp-2' }"
        >
          <template #footer>
            <UBadge :label="p.status === 'exportado' ? 'Exportado' : 'Rascunho'" :color="p.status === 'exportado' ? 'success' : 'neutral'" variant="subtle" />
          </template>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
