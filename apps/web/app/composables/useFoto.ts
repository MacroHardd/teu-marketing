// Foto do Post: preparada no browser (HEIC→JPEG, reduzida, analisada) antes de subir.
// A análise vira metadado (MetaFoto); o Motor nunca lê pixel (ADR 0001).
import { analisaFoto, aplicaFiltro, chaveFiltro, type Filtro, type MetaFoto, type ProvedorFoto } from '@teu/motor'

export const ACEITA_FOTO = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif'
const MAX_BYTES = 10 * 1024 * 1024
const MAX_LADO = 2160

export interface FotoPronta {
  blob: Blob
  meta: MetaFoto
  formato: 'jpeg' | 'png' | 'heic'
  ms: number
}

export class ErroFoto extends Error {}

/** Arquivo escolhido → JPEG de até 2160 px + metadado. Erros viram ErroFoto com mensagem para o Cliente. */
export async function preparaFoto(arquivo: File): Promise<FotoPronta> {
  const t0 = performance.now()
  if (arquivo.size > MAX_BYTES) throw new ErroFoto('A foto passa de 10 MB. Escolha uma menor.')
  const heic = /hei[cf]/i.test(arquivo.type) || /\.hei[cf]$/i.test(arquivo.name)
  const png = /png/i.test(arquivo.type)
  if (!heic && !png && !/jpe?g/i.test(arquivo.type)) throw new ErroFoto('Use uma foto JPEG, PNG ou HEIC.')
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    if (!heic) throw new ErroFoto('Não conseguimos abrir essa foto. Tente outra.')
    // só o Safari abre HEIC sozinho: nos outros, converte (biblioteca carregada só agora)
    try {
      const { default: heic2any } = await import('heic2any')
      const jpeg = await heic2any({ blob: arquivo, toType: 'image/jpeg', quality: 0.92 })
      bmp = await createImageBitmap(Array.isArray(jpeg) ? jpeg[0]! : jpeg, { imageOrientation: 'from-image' })
    } catch {
      throw new ErroFoto('Não conseguimos abrir essa foto HEIC. Tente exportar como JPEG.')
    }
  }
  const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff' // PNG com transparência vira fundo branco no JPEG
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const meta = analisaFoto(ctx.getImageData(0, 0, w, h).data, w, h)
  const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/jpeg', 0.88))
  if (!blob) throw new ErroFoto('Não conseguimos preparar a foto. Tente outra.')
  return { blob, meta, formato: heic ? 'heic' : png ? 'png' : 'jpeg', ms: Math.round(performance.now() - t0) }
}

/**
 * A foto pronta para o Desenhista: a original ou com filtro, guardada por filtro (poucas entradas:
 * o filtro muda quando o enquadramento muda a média de luz do recorte).
 */
export async function provedorDe(blob: Blob): Promise<ProvedorFoto> {
  const bmp = await createImageBitmap(blob)
  const cache = new Map<string, CanvasImageSource>()
  let pixels: ImageData | undefined
  return (filtro?: Filtro) => {
    if (!filtro) return bmp
    const k = chaveFiltro(filtro)
    let img = cache.get(k)
    if (!img) {
      const cv = document.createElement('canvas')
      cv.width = bmp.width
      cv.height = bmp.height
      const ctx = cv.getContext('2d', { willReadFrequently: true })!
      if (!pixels) {
        ctx.drawImage(bmp, 0, 0)
        pixels = ctx.getImageData(0, 0, bmp.width, bmp.height)
      }
      const d = new ImageData(new Uint8ClampedArray(pixels.data), bmp.width, bmp.height)
      aplicaFiltro(d.data, filtro)
      ctx.putImageData(d, 0, 0)
      if (cache.size >= 4) cache.delete(cache.keys().next().value!)
      cache.set(k, cv)
      img = cv
    }
    return img
  }
}
