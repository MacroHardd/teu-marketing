<script setup lang="ts">
import type { Tables } from '~/types/database.types'

useSeoMeta({ title: 'Meus Posts' })

const supabase = useSupabaseClient()
const toast = useToast()
const evento = useEvento()
const { duplica, exclui, miniaturas } = usePosts()
const { data: acesso } = await useAcesso()
if (!acesso.value?.cliente?.ativo) await navigateTo('/')
const clienteId = acesso.value?.cliente?.id ?? ''

const { data: posts, refresh } = await useAsyncData('meus-posts', async () => {
  const { data } = await supabase.from('posts').select('*').order('atualizado_em', { ascending: false })
  return data ?? []
})
// miniaturas só no browser (URL assinada; a grade aparece antes, com o texto)
const { data: minis } = await useAsyncData('meus-posts-miniaturas', () => miniaturas(clienteId), { server: false, lazy: true, default: () => ({} as Record<string, string>) })

const { data: perfil } = await useMarca()

const criando = ref(false)
async function novo() {
  criando.value = true
  const { data, error } = await supabase.from('posts').insert({ cliente_id: clienteId }).select('id').single()
  criando.value = false
  if (error) return toast.add({ title: 'Não deu para criar o Post', color: 'error' })
  await navigateTo(`/posts/${data.id}?novo=1`)
}

const duplicando = ref<string | null>(null)
async function duplicar(p: Tables<'posts'>) {
  duplicando.value = p.id
  const novoId = await duplica(p)
  duplicando.value = null
  if (!novoId) return toast.add({ title: 'Não deu para duplicar o Post', color: 'error' })
  evento('post_duplicado', { tem_foto: !!(p.ativo_id || p.foto_path) }, novoId)
  toast.add({ title: 'Post duplicado', description: 'Agora é só mudar o que quiser.', color: 'success', icon: 'i-lucide-copy' })
  await navigateTo(`/posts/${novoId}`)
}

// excluir pede confirmação numa janela (nunca confirm() do browser)
const aExcluir = ref<Tables<'posts'> | null>(null)
const excluindo = ref(false)
async function excluir() {
  const p = aExcluir.value
  if (!p) return
  excluindo.value = true
  const ok = await exclui(p)
  excluindo.value = false
  aExcluir.value = null
  if (!ok) return toast.add({ title: 'Não deu para excluir o Post', color: 'error' })
  evento('post_excluido', { exportado: p.status === 'exportado' })
  toast.add({ title: 'Post excluído', color: 'neutral', icon: 'i-lucide-trash-2' })
  await refresh()
}

const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
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
        description="Nome, @, cor e logo. É opcional e leva 1 minuto."
        :actions="[{ label: 'Preencher Perfil de Marca', to: '/marca?voltar=/posts' }]"
      />
      <UEmpty
        v-if="!posts?.length"
        icon="i-lucide-image-plus"
        title="Seu primeiro Post sai em minutos"
        description="Escreva uma frase e a gente monta o visual."
        :actions="[{ label: 'Criar meu primeiro Post', icon: 'i-lucide-plus', onClick: novo }]"
      />
      <div v-else class="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="p in posts"
          :key="p.id"
          data-testid="post"
          class="rounded-lg border border-default bg-default overflow-hidden flex flex-col"
        >
          <NuxtLink :to="`/posts/${p.id}`" class="block group" :aria-label="`Abrir Post: ${p.texto || 'Sem texto'}`">
            <div class="aspect-[4/5] bg-elevated flex items-center justify-center overflow-hidden">
              <img
                v-if="minis?.[p.id]"
                :src="minis[p.id]"
                alt=""
                class="w-full h-full object-cover group-hover:opacity-90"
              >
              <p v-else class="p-4 text-sm text-muted line-clamp-5 text-center">
                {{ p.texto || 'Sem texto' }}
              </p>
            </div>
            <p class="px-3 pt-2 text-sm font-medium line-clamp-1">
              {{ p.texto || 'Sem texto' }}
            </p>
          </NuxtLink>
          <div class="px-3 pb-2 pt-1 mt-auto flex items-center gap-1">
            <UBadge :label="p.status === 'exportado' ? 'Exportado' : 'Rascunho'" :color="p.status === 'exportado' ? 'success' : 'neutral'" variant="subtle" />
            <span class="text-xs text-muted truncate">{{ quando(p.atualizado_em) }}</span>
            <UButton
              class="ml-auto"
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Duplicar"
              :loading="duplicando === p.id"
              @click="duplicar(p)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Excluir"
              @click="aExcluir = p"
            />
          </div>
        </div>
      </div>

      <UModal
        :open="!!aExcluir"
        title="Excluir este Post?"
        :description="aExcluir?.ativo_id ? 'Não dá para desfazer. A imagem continua nos seus Ativos.' : 'Não dá para desfazer.'"
        @update:open="v => { if (!v) aExcluir = null }"
      >
        <template #footer>
          <div class="flex gap-2 justify-end w-full">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              @click="aExcluir = null"
            />
            <UButton
              label="Excluir Post"
              color="error"
              icon="i-lucide-trash-2"
              :loading="excluindo"
              @click="excluir"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
