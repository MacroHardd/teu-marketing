import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'
import { analisaFoto, trata, type Imagem } from '../src'
import { ORACULO } from './util'

const foto = (arq: string): Imagem => {
  const p = PNG.sync.read(readFileSync(join(ORACULO, 'fotos', arq)))
  return { data: new Uint8ClampedArray(p.data), width: p.width, height: p.height }
}
/** Mesmos pixels? (sem `toEqual`: diff de 7 milhões de posições estoura a memória) */
const igual = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.length), Buffer.from(b.buffer, b.byteOffset, b.length)) === 0
const media = (im: Imagem) => analisaFoto(im.data, im.width, im.height, 1).lum[0]!

describe('tratamento (receita do Ativo)', () => {
  const orig = foto('clara.png')

  it('sem receita: cópia igual, original intacto', () => {
    const r = trata(orig, {})
    expect(igual(r.data, orig.data)).toBe(true)
    expect(r.data === orig.data).toBe(false)
  })

  it('corte em fração vira px e recorta', () => {
    const r = trata(orig, { corte: { x: 0.25, y: 0.5, w: 0.5, h: 0.25 } })
    expect([r.width, r.height]).toEqual([600, 375])
    const i = ((750 * 1200) + 300) * 4
    expect([...r.data.slice(0, 4)]).toEqual([...orig.data.slice(i, i + 4)])
  })

  it('duotom: só 2 tintas (escuro tingido → cor), na cor pedida', () => {
    const r = trata(orig, { efeito: 'duotom', cor: 'marca' }, { corMarca: '#1f8a70' })
    for (let i = 0; i < r.data.length; i += 4 * 997) {
      const [a, b, c] = [r.data[i]!, r.data[i + 1]!, r.data[i + 2]!]
      // todo pixel está na reta entre o escuro e a cor da marca (verde: G ≥ B ≥ R)
      expect(b).toBeGreaterThanOrEqual(c)
      expect(c).toBeGreaterThanOrEqual(a)
    }
  })

  it('pixelar: blocos iguais', () => {
    const r = trata(orig, { efeito: 'pixel', nivel: 'G' })
    const b = Math.round(1200 / 24)
    const px = (x: number, y: number) => [...r.data.slice((y * 1200 + x) * 4, (y * 1200 + x) * 4 + 3)]
    expect(px(b + 1, b + 1)).toEqual(px(2 * b - 1, 2 * b - 1))
  })

  it('envelhecer: mais escuro nas bordas (vinheta), sem preto puro, determinístico', () => {
    const a = trata(orig, { efeito: 'velho', forca: 'forte' })
    const b = trata(orig, { efeito: 'velho', forca: 'forte' })
    expect(igual(a.data, b.data)).toBe(true)
    expect(media(a)).toBeLessThan(media(orig))
    const escura = trata(foto('escura.png'), { efeito: 'velho', forca: 'forte' })
    let min = 255
    for (let i = 0; i < escura.data.length; i += 4) min = Math.min(min, escura.data[i]!)
    expect(min).toBeGreaterThan(5)
  })

  it('textura multiplica a foto (escurece onde a textura é escura)', () => {
    const tex: Imagem = { data: new Uint8ClampedArray(4 * 4).fill(128), width: 2, height: 2 }
    const r = trata(orig, { textura: 'x', texturaForca: 'forte' }, { textura: tex })
    expect(media(r)).toBeLessThan(media(orig) * 0.75)
    // sem os pixels da textura, a textura é ignorada
    expect(igual(trata(orig, { textura: 'x' }).data, orig.data)).toBe(true)
  })
})
