<script setup lang="ts">
// Ativos: as imagens do Cliente. Envia, trata (efeito, textura, recorte) e usa nos Posts.
// Só o próprio Cliente vê (RLS; o Parceiro não lê Ativos).
import type { Receita } from '@teu/motor'

useSeoMeta({ title: 'Ativos' })

const supabase = useSupabaseClient()
const toast = useToast()
const evento = useEvento()
const route = useRoute()
const { data: acesso } = await useAcesso()
if (!acesso.value?.cliente?.ativo) await navigateTo('/')

const { data: ativos, refresh } = await useAsyncData('ativos', async () => {
  const { data } = await supabase.from('ativos').select('*').order('criado_em', { ascending: false })
  return data ?? []
})
/** Quantos Posts usam cada Ativo (para avisar antes de excluir). */
const { data: usos, refresh: refreshUsos } = await useAsyncData('ativos-usos', async () => {
  const { data } = await supabase.from('posts').select('ativo_id').not('ativo_id', 'is', null)
  const n: Record<string, number> = {}
  for (const p of data ?? []) n[p.ativo_id!] = (n[p.ativo_id!] ?? 0) + 1
  return n
})
const { data: perfil } = await useMarca()
const corMarca = computed(() => perfil.value?.cor ?? undefined)

const aberto = ref<Ativo | null>(null)
watch(ativos, (l) => {
  const id = route.query.id
  if (id && !aberto.value) aberto.value = l?.find(a => a.id === id) ?? null
}, { immediate: true })

const input = ref<HTMLInputElement>()
const enviando = ref(0)
async function envia(ev: Event) {
  const el = ev.target as HTMLInputElement
  const arquivos = [...(el.files ?? [])]
  el.value = ''
  for (const arquivo of arquivos) {
    enviando.value++
    try {
      const r = await enviaAtivo(supabase, acesso.value!.cliente!.id, arquivo)
      evento('ativo_enviado', { formato_origem: r.formato, bytes: arquivo.size, ms_processamento: r.ms })
    } catch (e) {
      toast.add({ title: e instanceof ErroFoto ? e.message : 'Não deu para usar essa imagem. Tente outra.', color: 'error' })
    } finally {
      enviando.value--
    }
  }
  await refresh()
}

function salvo(a: Ativo) {
  aberto.value = a
  const i = ativos.value?.findIndex(x => x.id === a.id) ?? -1
  if (i >= 0) ativos.value![i] = a
}
async function excluido() {
  aberto.value = null
  await Promise.all([refresh(), refreshUsos()])
}
async function usar(a: Ativo) {
  const { data, error } = await supabase.from('posts').insert({ cliente_id: acesso.value!.cliente!.id, ativo_id: a.id }).select('id').single()
  if (error) return toast.add({ title: 'Não deu para criar o Post', color: 'error' })
  await navigateTo(`/posts/${data.id}?novo=1`)
}

const NOMES_EFEITO: Record<string, string> = { duotom: 'Duotom', pixel: 'Pixelado', velho: 'Envelhecido' }
const etiquetas = (r: Receita) => [r.efeito && NOMES_EFEITO[r.efeito], r.textura && 'Textura', r.corte && 'Recortada'].filter(Boolean) as string[]
</script>

<template>
  <UDashboardPanel id="ativos">
    <template #header>
      <UDashboardNavbar title="Ativos">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <input
            ref="input"
            type="file"
            multiple
            :accept="ACEITA_FOTO"
            class="hidden"
            data-testid="input-ativo"
            @change="envia"
          >
          <UButton
            label="Enviar imagens"
            icon="i-lucide-upload"
            :loading="enviando > 0"
            @click="input?.click()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="!ativos?.length"
        icon="i-lucide-images"
        title="Suas imagens ficam aqui"
        description="Envie fotos dos seus produtos, do seu espaço ou de você. Aqui você trata cada uma (duotom, pixelar, envelhecer, textura, recorte) e usa nos Posts."
        :actions="[{ label: 'Enviar imagens', icon: 'i-lucide-upload', onClick: () => input?.click() }]"
      />
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          v-for="a in ativos"
          :key="a.id"
          type="button"
          class="text-left group"
          :aria-label="`Abrir imagem ${etiquetas(a.receita as Receita).join(', ') || 'original'}`"
          data-testid="ativo"
          @click="aberto = a"
        >
          <AtivosMiniatura
            :path="a.path"
            :receita="a.receita as Receita"
            :cor-marca="corMarca"
            class="group-hover:ring-2 ring-primary"
          />
          <div class="flex flex-wrap gap-1 mt-2 min-h-5">
            <UBadge
              v-for="e in etiquetas(a.receita as Receita)"
              :key="e"
              :label="e"
              size="sm"
              color="neutral"
              variant="subtle"
            />
            <UBadge
              v-if="usos?.[a.id]"
              :label="`em ${usos[a.id]} Post${usos[a.id]! > 1 ? 's' : ''}`"
              size="sm"
              color="primary"
              variant="subtle"
            />
          </div>
        </button>
      </div>

      <UModal
        :open="!!aberto"
        title="Tratar imagem"
        description="O original fica guardado: dá para voltar atrás a qualquer hora."
        :ui="{ content: 'sm:max-w-4xl' }"
        @update:open="v => { if (!v) aberto = null }"
      >
        <template #body>
          <AtivosTratar
            v-if="aberto"
            :key="aberto.id"
            :ativo="aberto"
            :cor-marca="corMarca"
            :em-uso="usos?.[aberto.id] ?? 0"
            @salvo="salvo"
            @excluido="excluido"
            @usar="usar(aberto!)"
          />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
