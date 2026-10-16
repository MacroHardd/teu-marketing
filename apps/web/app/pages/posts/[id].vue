<script setup lang="ts">
// Editor. Preview e Exportação usam o mesmo canvas 1080×1350: o PNG é exatamente o que está na tela (ADR 0001).
import {
  desenha, ENQUADRAMENTO_PADRAO, escolhe, motor,
  type Ctx2D, type Enquadramento, type Fontes, type MetaFoto, type ProvedorFoto, type Resultado, type TipoEstilo
} from '@teu/motor'

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

/** Estilos já portados do publi, na ordem em que aparecem. */
const ESTILOS: { tipo: TipoEstilo, nome: string, foto: boolean }[] = [
  { tipo: 'acento', nome: 'Acento', foto: false },
  { tipo: 'fina', nome: 'Letra fina', foto: true },
  { tipo: 'ogilvy', nome: 'Foto e legenda', foto: true }
]
const ehEstilo = (t: unknown): t is TipoEstilo => ESTILOS.some(e => e.tipo === t)

interface Ajustes { enquadramento?: Enquadramento }
const ajustes0 = (post.value.ajustes ?? {}) as Ajustes

const texto = ref(post.value.texto)
/** null = o Cliente não escolheu: vale a sugestão do Motor. */
const estiloEscolhido = ref<TipoEstilo | null>(ehEstilo(post.value.estilo) ? post.value.estilo : null)
const enquadramento = ref<Enquadramento>({ ...ENQUADRAMENTO_PADRAO, ...ajustes0.enquadramento })
const fotoPath = ref<string | null>(post.value.foto_path)
const fotoMeta = shallowRef<MetaFoto | null>(post.value.foto_meta as MetaFoto | null)
const provedor = shallowRef<ProvedorFoto>()
const enviandoFoto = ref(false)
const inputFoto = ref<HTMLInputElement>()
const aceita = ACEITA_FOTO

const canvas = ref<HTMLCanvasElement>()
const fontes = shallowRef<Fontes>()
const resultado = shallowRef<Resultado>()
const salvo = ref<'salvo' | 'salvando' | 'erro'>('salvo')
const exportando = ref(false)
let criadoAvisado = !route.query.novo
let trocasEstilo = 0

const temFoto = computed(() => !!fotoMeta.value)
const sugerido = computed<TipoEstilo>(() => {
  const t = escolhe(texto.value.trim(), temFoto.value)
  if (ehEstilo(t)) return t
  if (!temFoto.value) return 'acento'
  return texto.value.trim().split(/\s+/).length <= 10 ? 'fina' : 'ogilvy'
})
const estilo = computed(() => estiloEscolhido.value ?? sugerido.value)
const estiloComFoto = computed(() => ESTILOS.find(e => e.tipo === estilo.value)!.foto)

// ------------------------------------------------------------------ preview
const AVISOS: [RegExp, string, boolean][] = [
  [/cortado/, 'O texto ficou grande demais e foi cortado. Encurte a frase ou divida em 2 Posts.', true],
  [/letra fina/, 'O texto não cabe inteiro na Letra fina. Encurte (até umas 8 palavras) ou escolha Foto e legenda.', true],
  [/pede foto/, 'Este Estilo fica melhor com foto. Envie uma foto ou escolha outro Estilo.', false],
  [/emoji/, 'Tiramos os emojis: a fonte deste Estilo não desenha emoji.', false],
  [/destaque grande/, 'A palavra em destaque ficou grande demais. Destaque só 1 palavra curta.', false]
]
const avisos = computed(() => (resultado.value?.cena.travas.avisos ?? [])
  .map(a => AVISOS.find(([re]) => re.test(a)))
  .filter(Boolean) as [RegExp, string, boolean][])
const bloqueado = computed(() => avisos.value.some(([, , b]) => b) || !texto.value.trim() || enviandoFoto.value)

function render() {
  if (!fontes.value || !canvas.value) return
  try {
    resultado.value = motor({
      texto: texto.value || ' ',
      estilo: estilo.value,
      foto: fotoMeta.value ?? undefined,
      enquadramento: enquadramento.value
    }, fontes.value)
  } catch (e) {
    return evento('erro_motor', { estilo: estilo.value, variacao: null, etapa: 'layout', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
  }
  try {
    desenha(canvas.value.getContext('2d') as unknown as Ctx2D, resultado.value.cena, fontes.value, 1, provedor.value)
  } catch (e) {
    evento('erro_motor', { estilo: estilo.value, variacao: null, etapa: 'desenho', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
  }
}

// ------------------------------------------------------------------ salvamento automático
const salva = useDebounceFn(async () => {
  salvo.value = 'salvando'
  const { error } = await supabase.from('posts').update({
    texto: texto.value,
    estilo: estiloEscolhido.value,
    ajustes: { enquadramento: enquadramento.value },
    foto_path: fotoPath.value,
    foto_meta: fotoMeta.value as never
  }).eq('id', id)
  salvo.value = error ? 'erro' : 'salvo'
  if (!error && !criadoAvisado && texto.value.trim()) {
    criadoAvisado = true
    evento('post_criado', { tem_foto: temFoto.value, tem_pauta: false, n_palavras: texto.value.trim().split(/\s+/).length }, id)
  }
}, 800)

function mudou() {
  render()
  salvo.value = 'salvando'
  salva()
}
watch([texto, estiloEscolhido, enquadramento, fotoMeta], mudou, { deep: true })

function trocaEstilo(t: TipoEstilo) {
  if (t === estilo.value) return
  trocasEstilo++
  evento('estilo_trocado', { de: estilo.value, para: t, posicao_na_lista: ESTILOS.findIndex(e => e.tipo === t) }, id)
  estiloEscolhido.value = t
}

// ------------------------------------------------------------------ foto
async function enviaFoto(ev: Event) {
  const input = ev.target as HTMLInputElement
  const arquivo = input.files?.[0]
  input.value = ''
  if (!arquivo) return
  enviandoFoto.value = true
  try {
    const f = await preparaFoto(arquivo)
    const caminho = `${post.value!.cliente_id}/${id}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('fotos').upload(caminho, f.blob, { contentType: 'image/jpeg' })
    if (error) throw new ErroFoto('Não deu para enviar a foto. Confira a internet e tente de novo.')
    const antiga = fotoPath.value
    provedor.value = await provedorDe(f.blob)
    fotoPath.value = caminho
    enquadramento.value = { ...ENQUADRAMENTO_PADRAO }
    fotoMeta.value = f.meta
    if (antiga) supabase.storage.from('fotos').remove([antiga])
    evento('foto_enviada', { formato_origem: f.formato, bytes: arquivo.size, ms_processamento: f.ms, rosto_detectado: false }, id)
  } catch (e) {
    const msg = e instanceof ErroFoto ? e.message : 'Não deu para usar essa foto. Tente outra.'
    if (!(e instanceof ErroFoto)) evento('erro_motor', { estilo: estilo.value, variacao: null, etapa: 'foto', mensagem_curta: String((e as Error).message).slice(0, 120) }, id)
    toast.add({ title: msg, color: 'error' })
  } finally {
    enviandoFoto.value = false
  }
}

function removeFoto() {
  if (fotoPath.value) supabase.storage.from('fotos').remove([fotoPath.value])
  fotoPath.value = null
  fotoMeta.value = null
  provedor.value = undefined
}

async function carregaFoto() {
  if (!fotoPath.value) return
  const { data, error } = await supabase.storage.from('fotos').download(fotoPath.value)
  if (error || !data) return toast.add({ title: 'Não deu para abrir a foto deste Post', color: 'warning' })
  provedor.value = await provedorDe(data)
  render()
}

// enquadrar: arrastar a foto no preview
let arrasto: { x: number, y: number } | null = null
const itemFoto = computed(() => resultado.value?.cena.itens.find(i => i.tipo === 'foto'))
function arrastaInicio(e: PointerEvent) {
  if (!itemFoto.value) return
  arrasto = { x: e.clientX, y: e.clientY }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function arrasta(e: PointerEvent) {
  const it = itemFoto.value
  if (!arrasto || !it || it.tipo !== 'foto' || !fotoMeta.value || !canvas.value) return
  const k = 1080 / canvas.value.clientWidth // px da tela → px da peça
  const dx = (e.clientX - arrasto.x) * k * it.recorte.sw / it.w
  const dy = (e.clientY - arrasto.y) * k * it.recorte.sh / it.h
  arrasto = { x: e.clientX, y: e.clientY }
  const folgaX = fotoMeta.value.largura - it.recorte.sw
  const folgaY = fotoMeta.value.altura - it.recorte.sh
  const lim = (v: number) => Math.min(1, Math.max(0, v))
  enquadramento.value = {
    ...enquadramento.value,
    x: folgaX > 0.5 ? lim(enquadramento.value.x - dx / folgaX) : enquadramento.value.x,
    y: folgaY > 0.5 ? lim(enquadramento.value.y - dy / folgaY) : enquadramento.value.y
  }
}
function arrastaFim() {
  arrasto = null
}

// ------------------------------------------------------------------ Exportação
async function exporta() {
  if (!canvas.value || bloqueado.value) return
  exportando.value = true
  const t0 = performance.now()
  const blob = await new Promise<Blob | null>(r => canvas.value!.toBlob(r, 'image/png'))
  if (!blob) {
    exportando.value = false
    evento('erro_motor', { estilo: estilo.value, variacao: null, etapa: 'exportacao', mensagem_curta: 'toBlob vazio' }, id)
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
    estilo: estilo.value, variacao: null, n_trocas_estilo: trocasEstilo, n_ajustes: 0,
    tempo_ativo_ms: tempo.ms(), ms_export: Math.round(performance.now() - t0), reexport
  }, id)
  exportando.value = false
  toast.add({ title: 'Imagem baixada', description: 'Pronta para postar no Instagram.', color: 'success', icon: 'i-lucide-download' })
}

onMounted(async () => {
  evento('editor_aberto', { novo: !!route.query.novo }, id)
  fontes.value = await useFontes()
  render()
  carregaFoto()
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
        <div class="flex flex-col gap-5 w-full lg:w-80 shrink-0">
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

          <UFormField label="Foto (opcional)">
            <input
              ref="inputFoto"
              type="file"
              :accept="aceita"
              class="hidden"
              data-testid="input-foto"
              @change="enviaFoto"
            >
            <div class="flex gap-2">
              <UButton
                :label="temFoto ? 'Trocar foto' : 'Enviar foto'"
                icon="i-lucide-image-plus"
                color="neutral"
                variant="outline"
                :loading="enviandoFoto"
                @click="inputFoto?.click()"
              />
              <UButton
                v-if="temFoto"
                label="Remover"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                @click="removeFoto"
              />
            </div>
          </UFormField>

          <UFormField v-if="temFoto && estiloComFoto" label="Zoom da foto" help="Arraste a foto na prévia para enquadrar.">
            <USlider
              v-model="enquadramento.zoom"
              :min="1"
              :max="3"
              :step="0.05"
              aria-label="Zoom da foto"
            />
          </UFormField>

          <UFormField label="Estilo">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="e in ESTILOS"
                :key="e.tipo"
                :color="e.tipo === estilo ? 'primary' : 'neutral'"
                :variant="e.tipo === estilo ? 'solid' : 'outline'"
                @click="trocaEstilo(e.tipo)"
              >
                {{ e.nome }}
                <UBadge
                  v-if="e.tipo === sugerido"
                  label="sugerido"
                  size="sm"
                  :color="e.tipo === estilo ? 'neutral' : 'primary'"
                  variant="subtle"
                />
              </UButton>
            </div>
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
          class="w-full max-w-md rounded-md shadow ring ring-default touch-none"
          :class="itemFoto ? 'cursor-grab active:cursor-grabbing' : ''"
          aria-label="Prévia do Post"
          @pointerdown="arrastaInicio"
          @pointermove="arrasta"
          @pointerup="arrastaFim"
          @pointercancel="arrastaFim"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
