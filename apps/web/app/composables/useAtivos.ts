// Ativos: imagens do Cliente com receita de tratamento, não destrutiva (ADR 0004). O original fica no Storage;
// a receita é aplicada aqui no browser (mesma função `trata` do pacote do Motor), e a imagem tratada é
// analisada para virar metadado: o Motor continua sem ver pixel (ADR 0001).
import { analisaFoto, trata, type Imagem, type MetaFoto, type Receita } from '@teu/motor'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export type Ativo = Database['public']['Tables']['ativos']['Row']

export interface Textura {
  id: string
  nome: string
  arquivo: string
  /** Gerada por nós até chegarem os arquivos do usuário. */
  provisoria?: boolean
}

// ------------------------------------------------------------------ texturas (catálogo global em /texturas)
let catalogo: Promise<Textura[]> | undefined
export function useCatalogoTexturas(): Promise<Textura[]> {
  catalogo ??= $fetch<Textura[]>('/texturas/catalogo.json').catch(() => [])
  return catalogo
}

const bitmaps = new Map<string, ImageBitmap>()
const carregando = new Map<string, Promise<ImageBitmap | undefined>>()
/** Muda quando uma textura termina de carregar (quem desenha observa e redesenha). */
export const versaoTexturas = ref(0)

export function carregaTextura(id: string): Promise<ImageBitmap | undefined> {
  let p = carregando.get(id)
  if (!p) {
    p = (async () => {
      const t = (await useCatalogoTexturas()).find(x => x.id === id)
      if (!t) return undefined
      const bmp = await createImageBitmap(await $fetch<Blob>(`/texturas/${t.arquivo}`, { responseType: 'blob' }))
      bitmaps.set(id, bmp)
      versaoTexturas.value++
      return bmp
    })().catch(() => undefined)
    carregando.set(id, p)
  }
  return p
}

/** Para o Desenhista: a textura já carregada, ou undefined (e começa a carregar). */
export function texturaDe(id: string): ImageBitmap | undefined {
  const b = bitmaps.get(id)
  if (!b) carregaTextura(id)
  return b
}

// ------------------------------------------------------------------ pixels
/** Imagem (blob ou bitmap) → pixels RGBA, reduzida para caber em `maxLado` (sem limite: tamanho real). */
export async function pixelsDe(fonte: Blob | ImageBitmap, maxLado = Infinity): Promise<Imagem> {
  const bmp = fonte instanceof Blob ? await createImageBitmap(fonte) : fonte
  const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  if (fonte instanceof Blob) bmp.close()
  const d = ctx.getImageData(0, 0, w, h)
  return { data: d.data, width: w, height: h }
}

export function canvasDe(img: Imagem): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = img.width
  cv.height = img.height
  cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return cv
}

/** Aplica a receita (carregando os pixels da textura, se houver). */
export async function aplicaReceita(original: Imagem, r: Receita, corMarca?: string): Promise<Imagem> {
  let textura: Imagem | undefined
  if (r.textura) {
    const bmp = await carregaTextura(r.textura)
    // a textura vai em cover sobre a imagem: não precisa de mais resolução que ela
    if (bmp) textura = await pixelsDe(bmp, Math.max(original.width, original.height))
  }
  return trata(original, r, { corMarca, textura })
}

/** Ativo → imagem tratada pronta para o provedor de foto + o metadado dela. */
export async function ativoTratado(original: Blob, r: Receita, corMarca?: string): Promise<{ canvas: HTMLCanvasElement, meta: MetaFoto }> {
  const img = await aplicaReceita(await pixelsDe(original), r, corMarca)
  return { canvas: canvasDe(img), meta: analisaFoto(img.data, img.width, img.height) }
}

// ------------------------------------------------------------------ Storage + banco
interface Supa {
  storage: { from(b: string): { upload(p: string, b: Blob, o: object): Promise<{ error: unknown }>, download(p: string): Promise<{ data: Blob | null }>, remove(p: string[]): Promise<unknown> } }
}

/** Baixa o original do Ativo (com cache na sessão: o mesmo Ativo aparece na grade, no editor e no tratamento). */
const originais = new Map<string, Promise<Blob | null>>()
export function originalDe(supabase: Supa, path: string): Promise<Blob | null> {
  let p = originais.get(path)
  if (!p) {
    p = supabase.storage.from('fotos').download(path).then(r => r.data)
    originais.set(path, p)
  }
  return p
}

/** Arquivo escolhido → Ativo novo (original reduzido no Storage + linha no banco). */
export async function enviaAtivo(supabase: SupabaseClient<Database>, clienteId: string, arquivo: File) {
  const f = await preparaFoto(arquivo)
  const path = `${clienteId}/ativos/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(path, f.blob, { contentType: 'image/jpeg' })
  if (error) throw new ErroFoto('Não deu para enviar a imagem. Confira a internet e tente de novo.')
  originais.set(path, Promise.resolve(f.blob))
  const { data, error: e2 } = await supabase.from('ativos').insert({ cliente_id: clienteId, path, meta: f.meta as never }).select().single()
  if (e2 || !data) {
    supabase.storage.from('fotos').remove([path])
    throw new ErroFoto('Não deu para guardar a imagem. Tente de novo.')
  }
  return { ativo: data, formato: f.formato, ms: f.ms }
}
