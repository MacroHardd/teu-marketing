<script setup lang="ts">
// Editor (M2: só texto + Estilo Acento). Preview e Exportação usam o mesmo canvas 1080×1350:
// o PNG é exatamente o que está na tela (ADR 0001).
import { desenha, motor, type Ctx2D, type Fontes, type Resultado } from '@teu/motor'

useSeoMeta({ title: 'Editor' })

const supabase = useSupabaseClient()
const route = useRoute()
const toast = useToast()
const evento = useEvento()
const tempo = useTempoAtivo()
const id = String(route.params.id)

const { data: post } = await useAsyncData(`post-${id}`, async () => {
  const { data } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  return data
})
if (!post.value) throw createError({ statusCode: 404, statusMessage: 'Post não encontrado' })

const texto = ref(post.value.texto)
const canvas = ref<HTMLCanvasElement>()
const fontes = shallowRef<Fontes>()
const resultado = shallowRef<Resultado>()
const salvo = ref<'salvo' | 'salvando' | 'erro'>('salvo')
const exportando = ref(false)
let criadoAvisado = !route.query.novo

// ------------------------------------------------------------------ preview
const AVISOS: [RegExp, string, boolean][] = [
  [/cortado/, 'O texto ficou grande demais e foi cortado. Encurte a frase ou divida em 2 Posts.', true],
  [/emoji/, 'Tiramos os emojis: a fonte deste Estilo não desenha emoji.', false],
  [/destaque grande/, 'A palavra em destaque ficou grande demais. Destaque só 1 palavra curta.', false]
]
const avisos = computed(() => (resultado.value?.cena.travas.avisos ?? [])
  .map(a => AVISOS.find(([re]) => re.test(a)))
  .filter(Boolean) as [RegExp, string, boolean][])
const bloqueado = computed(() => avisos.value.some(([, , b]) => b) || !texto.value.trim())

function render() {
  if (!fontes.value || !canvas.value) return
  try {
    resultado.value = motor({ texto: texto.value || ' ', estilo: 'acento' }, fontes.value)
    desenha(canvas.value.getContext('2d') as unknown as Ctx2D, resultado.value.cena, fontes.value)
  } catch (e) {
    evento('erro_motor', { estilo: 'acento', variacao: null, etapa: 'layout', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
  }
}

// ------------------------------------------------------------------ salvamento automático
const salva = useDebounceFn(async () => {
  salvo.value = 'salvando'
  const { error } = await supabase.from('posts').update({ texto: texto.value, estilo: 'acento' }).eq('id', id)
  salvo.value = error ? 'erro' : 'salvo'
  if (!error && !criadoAvisado && texto.value.trim()) {
    criadoAvisado = true
    evento('post_criado', { tem_foto: false, tem_pauta: false, n_palavras: texto.value.trim().split(/\s+/).length }, id)
  }
}, 800)

watch(texto, () => {
  render()
  salvo.value = 'salvando'
  salva()
})

// ------------------------------------------------------------------ Exportação
async function exporta() {
  if (!canvas.value || bloqueado.value) return
  exportando.value = true
  const t0 = performance.now()
  const blob = await new Promise<Blob | null>(r => canvas.value!.toBlob(r, 'image/png'))
  if (!blob) {
    exportando.value = false
    evento('erro_motor', { estilo: 'acento', variacao: null, etapa: 'exportacao', mensagem_curta: 'toBlob vazio' }, id)
    return toast.add({ title: 'Não deu para gerar a imagem', color: 'error' })
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `post-${new Date().toISOString().slice(0, 10)}.png`
  a.click()
  URL.revokeObjectURL(a.href)
  const reexport = post.value!.status === 'exportado'
  await supabase.from('posts').update({ texto: texto.value, status: 'exportado', exportado_em: new Date().toISOString() }).eq('id', id)
  post.value!.status = 'exportado'
  evento('post_exportado', {
    estilo: 'acento', variacao: null, n_trocas_estilo: 0, n_ajustes: 0,
    tempo_ativo_ms: tempo.ms(), ms_export: Math.round(performance.now() - t0), reexport
  }, id)
  exportando.value = false
  toast.add({ title: 'Imagem baixada', description: 'Pronta para postar no Instagram.', color: 'success', icon: 'i-lucide-download' })
}

onMounted(async () => {
  evento('editor_aberto', { novo: !!route.query.novo }, id)
  fontes.value = await useFontes()
  render()
})
</script>

<template>
  <UDashboardPanel id="editor">
    <template #header>
      <UDashboardNavbar title="Editor">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/posts"
            aria-label="Voltar"
          />
        </template>
        <template #right>
          <span class="text-sm text-muted">{{ { salvo: 'Salvo', salvando: 'Salvando…', erro: 'Não salvou' }[salvo] }}</span>
          <UButton
            label="Baixar imagem"
            icon="i-lucide-download"
            :disabled="bloqueado"
            :loading="exportando"
            @click="exporta"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col lg:flex-row gap-8 items-start">
        <div class="flex flex-col gap-4 w-full lg:w-80 shrink-0">
          <UFormField label="Seu texto" help="Uma frase curta e forte funciona melhor. Use *asteriscos* para escolher a palavra em destaque.">
            <UTextarea
              v-model="texto"
              :rows="5"
              autoresize
              autofocus
              placeholder="Menos ruído, mais resultado"
              class="w-full"
            />
          </UFormField>
          <UAlert
            v-for="[, msg, b] in avisos"
            :key="msg"
            :color="b ? 'error' : 'warning'"
            variant="subtle"
            :title="msg"
          />
        </div>
        <canvas
          ref="canvas"
          width="1080"
          height="1350"
          class="w-full max-w-md rounded-md shadow ring ring-default"
          aria-label="Prévia do Post"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
