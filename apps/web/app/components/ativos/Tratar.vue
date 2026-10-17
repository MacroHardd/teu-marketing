<script setup lang="ts">
// Tratar um Ativo: 1 efeito por vez (duotom, pixelar, envelhecer), textura por cima e recorte.
// Prévia ao vivo numa cópia reduzida; ao salvar, a receita é aplicada no tamanho real só para tirar o metadado.
import { CORES_DUOTOM, receitaVazia, type Corte, type Efeito, type Forca, type Imagem, type Receita } from '@teu/motor'

const props = defineProps<{ ativo: Ativo, corMarca?: string, emUso: number }>()
const emit = defineEmits<{ salvo: [Ativo], excluido: [], usar: [] }>()

const supabase = useSupabaseClient()
const evento = useEvento()
const toast = useToast()

const receita = ref<Receita>({ ...(props.ativo.receita as Receita) })
const texturas = ref<Textura[]>([])
const canvas = ref<HTMLCanvasElement>()
const salvando = ref(false)
const confirmaExcluir = ref(false)
let original: Imagem | undefined

const EFEITOS: { e: Efeito | null, nome: string }[] = [
  { e: null, nome: 'Nenhum' }, { e: 'duotom', nome: 'Duotom' }, { e: 'pixel', nome: 'Pixelar' }, { e: 'velho', nome: 'Envelhecer' }
]
const NOMES_COR: Record<string, string> = { azul: 'Azul', vermelho: 'Vermelho', verde: 'Verde', amarelo: 'Amarelo' }
const FORCAS: { f: Forca, nome: string }[] = [{ f: 'leve', nome: 'Leve' }, { f: 'forte', nome: 'Forte' }]

function muda(m: Partial<Receita>) {
  receita.value = { ...receita.value, ...m }
}
function efeito(e: Efeito | null) {
  const r: Receita = { ...receita.value, efeito: e ?? undefined }
  if (e === 'duotom') r.cor ??= props.corMarca ? 'marca' : 'azul'
  if (e === 'pixel') r.nivel ??= 'M'
  if (e === 'velho') r.forca ??= 'leve'
  receita.value = r
}

// ------------------------------------------------------------------ recorte (arrastar o retângulo)
const cortando = ref(false)
const proporcao = ref<number | null>(4 / 5)
const caixa = ref<Corte>({ x: 0, y: 0, w: 1, h: 1 })
/** Proporção da imagem original (largura / altura). */
const ar = computed(() => (original ? original.width / original.height : 1))

function encaixaProporcao(c: Corte, p: number | null): Corte {
  if (!p) return c
  // w/h em fração: (w · L) / (h · A) = p
  let w = c.w
  let h = w * ar.value / p
  if (h > 1) {
    h = 1
    w = h * p / ar.value
  }
  return { x: Math.min(c.x, 1 - w), y: Math.min(c.y, 1 - h), w, h }
}
function comecaCorte() {
  caixa.value = receita.value.corte ? { ...receita.value.corte } : encaixaProporcao({ x: 0, y: 0, w: 1, h: 1 }, proporcao.value)
  if (!receita.value.corte) caixa.value = { ...caixa.value, x: (1 - caixa.value.w) / 2, y: (1 - caixa.value.h) / 2 }
  cortando.value = true
}
function trocaProporcao(p: number | null) {
  proporcao.value = p
  caixa.value = encaixaProporcao(caixa.value, p)
}
function aplicaCorte() {
  muda({ corte: caixa.value.w > 0.999 && caixa.value.h > 0.999 ? undefined : { ...caixa.value } })
  cortando.value = false
}

let arrasto: { modo: 'mover' | 'canto', x: number, y: number, c: Corte } | null = null
function pegaCorte(e: PointerEvent, modo: 'mover' | 'canto') {
  arrasto = { modo, x: e.clientX, y: e.clientY, c: { ...caixa.value } }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function moveCorte(e: PointerEvent) {
  if (!arrasto || !canvas.value) return
  const r = canvas.value.getBoundingClientRect()
  const dx = (e.clientX - arrasto.x) / r.width
  const dy = (e.clientY - arrasto.y) / r.height
  const c = arrasto.c
  const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
  if (arrasto.modo === 'mover') {
    caixa.value = { ...c, x: lim(c.x + dx, 0, 1 - c.w), y: lim(c.y + dy, 0, 1 - c.h) }
  } else {
    const w = lim(c.w + dx, 0.1, 1 - c.x)
    const h = proporcao.value ? w * ar.value / proporcao.value : lim(c.h + dy, 0.1, 1 - c.y)
    if (c.y + h <= 1) caixa.value = { ...c, w, h }
  }
}
function soltaCorte() {
  arrasto = null
}

// ------------------------------------------------------------------ prévia
async function desenha() {
  if (!original || !canvas.value) return
  // no recorte, mostra a imagem inteira (com o efeito) para escolher o pedaço
  const r = cortando.value ? { ...receita.value, corte: undefined } : receita.value
  const img = await aplicaReceita(original, r, props.corMarca)
  canvas.value.width = img.width
  canvas.value.height = img.height
  canvas.value.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
}
watch([receita, cortando], desenha, { deep: true })

onMounted(async () => {
  texturas.value = await useCatalogoTexturas()
  const blob = await originalDe(supabase, props.ativo.path)
  if (!blob) return toast.add({ title: 'Não deu para abrir esta imagem', color: 'error' })
  original = await pixelsDe(blob, 900)
  desenha()
})

// ------------------------------------------------------------------ salvar / excluir
/** Receita como está no banco (chaves em ordem: o jsonb do Postgres reordena). */
const chave = (r: unknown) => JSON.stringify(r ?? {}, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b))) : v))
const mudou = computed(() => chave(receita.value) !== chave(props.ativo.receita))

async function salva() {
  salvando.value = true
  const t0 = performance.now()
  try {
    const blob = await originalDe(supabase, props.ativo.path)
    if (!blob) throw new Error('sem original')
    const r = { ...receita.value }
    const { meta } = await ativoTratado(blob, r, props.corMarca)
    const { data, error } = await supabase.from('ativos').update({ receita: r as never, meta: meta as never }).eq('id', props.ativo.id).select().single()
    if (error || !data) throw error ?? new Error('sem retorno')
    const tipo = receitaVazia(r) ? 'original' : r.efeito ?? (r.textura ? 'textura' : 'corte')
    evento('tratamento_aplicado', { tipo, ms: Math.round(performance.now() - t0) })
    toast.add({ title: 'Imagem salva', color: 'success', icon: 'i-lucide-check' })
    emit('salvo', data)
  } catch {
    toast.add({ title: 'Não deu para salvar. Tente de novo.', color: 'error' })
  } finally {
    salvando.value = false
  }
}

async function exclui() {
  if (!confirmaExcluir.value) {
    confirmaExcluir.value = true
    return
  }
  const { error } = await supabase.from('ativos').delete().eq('id', props.ativo.id)
  if (error) return toast.add({ title: 'Não deu para excluir', color: 'error' })
  supabase.storage.from('fotos').remove([props.ativo.path])
  evento('ativo_excluido', { em_uso: props.emUso })
  emit('excluido')
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="relative w-full lg:w-[420px] shrink-0 self-start select-none touch-none">
      <canvas ref="canvas" class="w-full rounded-md ring ring-default" aria-label="Prévia da imagem" />
      <!-- recorte: escurece fora da caixa; arrasta a caixa ou o canto -->
      <div
        v-if="cortando"
        class="absolute inset-0"
        @pointermove="moveCorte"
        @pointerup="soltaCorte"
        @pointercancel="soltaCorte"
      >
        <div
          class="absolute border-2 border-white cursor-move"
          :style="{ left: `${caixa.x * 100}%`, top: `${caixa.y * 100}%`, width: `${caixa.w * 100}%`, height: `${caixa.h * 100}%`, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)' }"
          data-testid="caixa-corte"
          @pointerdown.stop="pegaCorte($event, 'mover')"
        >
          <div
            class="absolute -right-2 -bottom-2 size-5 rounded-full bg-white ring-2 ring-primary cursor-nwse-resize"
            aria-label="Redimensionar recorte"
            @pointerdown.stop="pegaCorte($event, 'canto')"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-5 flex-1 min-w-0">
      <template v-if="cortando">
        <UFormField label="Formato do recorte" help="Arraste a caixa para mover e o círculo do canto para mudar o tamanho.">
          <div class="flex gap-2">
            <UButton
              v-for="p in [{ v: 4 / 5, n: 'Post (4:5)' }, { v: 1, n: 'Quadrado' }, { v: null, n: 'Livre' }]"
              :key="p.n"
              :label="p.n"
              size="sm"
              :color="proporcao === p.v ? 'primary' : 'neutral'"
              :variant="proporcao === p.v ? 'solid' : 'outline'"
              @click="trocaProporcao(p.v)"
            />
          </div>
        </UFormField>
        <div class="flex gap-2">
          <UButton label="Aplicar recorte" icon="i-lucide-check" @click="aplicaCorte" />
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            @click="cortando = false"
          />
        </div>
      </template>

      <template v-else>
        <UFormField label="Efeito">
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="x in EFEITOS"
              :key="x.nome"
              :label="x.nome"
              size="sm"
              :color="(receita.efeito ?? null) === x.e ? 'primary' : 'neutral'"
              :variant="(receita.efeito ?? null) === x.e ? 'solid' : 'outline'"
              @click="efeito(x.e)"
            />
          </div>
          <div v-if="receita.efeito === 'duotom'" class="flex flex-wrap gap-2 mt-3">
            <UTooltip v-if="corMarca" text="Cor da sua marca">
              <button
                type="button"
                class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-default"
                :class="receita.cor === 'marca' ? 'ring-primary' : 'ring-transparent'"
                :style="{ background: corMarca }"
                aria-label="Duotom na cor da marca"
                @click="muda({ cor: 'marca' })"
              />
            </UTooltip>
            <UTooltip v-for="(hex, k) in CORES_DUOTOM" :key="k" :text="NOMES_COR[k]">
              <button
                type="button"
                class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-default"
                :class="receita.cor === k ? 'ring-primary' : 'ring-transparent'"
                :style="{ background: hex }"
                :aria-label="`Duotom ${NOMES_COR[k]}`"
                @click="muda({ cor: String(k) })"
              />
            </UTooltip>
          </div>
          <div v-if="receita.efeito === 'pixel'" class="flex gap-2 mt-3">
            <UButton
              v-for="n in (['P', 'M', 'G'] as const)"
              :key="n"
              :label="n"
              class="w-10 justify-center"
              size="sm"
              :color="receita.nivel === n ? 'primary' : 'neutral'"
              :variant="receita.nivel === n ? 'solid' : 'outline'"
              :aria-label="`Pixel ${n}`"
              @click="muda({ nivel: n })"
            />
          </div>
          <div v-if="receita.efeito === 'velho'" class="flex gap-2 mt-3">
            <UButton
              v-for="x in FORCAS"
              :key="x.f"
              :label="x.nome"
              size="sm"
              :color="receita.forca === x.f ? 'primary' : 'neutral'"
              :variant="receita.forca === x.f ? 'solid' : 'outline'"
              @click="muda({ forca: x.f })"
            />
          </div>
        </UFormField>

        <UFormField v-if="texturas.length" label="Textura por cima">
          <SeletorTextura
            :texturas="texturas"
            :valor="receita.textura ?? null"
            @escolhe="id => muda({ textura: id ?? undefined, texturaForca: id ? receita.texturaForca ?? 'leve' : undefined })"
          />
          <div v-if="receita.textura" class="flex gap-2 mt-3">
            <UButton
              v-for="x in FORCAS"
              :key="x.f"
              :label="x.nome"
              size="sm"
              :color="receita.texturaForca === x.f ? 'primary' : 'neutral'"
              :variant="receita.texturaForca === x.f ? 'solid' : 'outline'"
              @click="muda({ texturaForca: x.f })"
            />
          </div>
        </UFormField>

        <UFormField label="Recorte">
          <div class="flex gap-2">
            <UButton
              :label="receita.corte ? 'Mudar recorte' : 'Recortar'"
              icon="i-lucide-crop"
              size="sm"
              color="neutral"
              variant="outline"
              @click="comecaCorte"
            />
            <UButton
              v-if="receita.corte"
              label="Tirar recorte"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="muda({ corte: undefined })"
            />
          </div>
        </UFormField>

        <div class="flex flex-wrap gap-2 pt-2 border-t border-default">
          <UButton
            label="Salvar"
            icon="i-lucide-check"
            :loading="salvando"
            :disabled="!mudou"
            @click="salva"
          />
          <UButton
            v-if="!receitaVazia(receita)"
            label="Voltar ao original"
            color="neutral"
            variant="outline"
            @click="receita = {}"
          />
          <UButton
            label="Usar num Post novo"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            :disabled="mudou"
            @click="emit('usar')"
          />
          <UButton
            :label="confirmaExcluir ? (emUso ? `Excluir (sai de ${emUso} Post${emUso > 1 ? 's' : ''})` : 'Confirmar exclusão') : 'Excluir'"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            class="ms-auto"
            @click="exclui"
          />
        </div>
      </template>
    </div>
  </div>
</template>
