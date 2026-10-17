import { describe, expect, it } from 'vitest'
import { analisaFoto, aplicaFiltro, recorteCover } from '../src'
import { filtraLum, lumEm } from '../src/foto'

describe('recorteCover (ImageOps.fit do Pillow)', () => {
  it('foto alta numa caixa larga corta em cima e embaixo, no meio', () => {
    expect(recorteCover({ largura: 1200, altura: 1500 }, 2160, 1674)).toEqual({ sx: 0, sy: 285, sw: 1200, sh: 930 })
  })
  it('foto larga numa caixa alta corta dos lados', () => {
    const r = recorteCover({ largura: 1600, altura: 1200 }, 2160, 2700)
    expect(r.sh).toBe(1200)
    expect(r.sw).toBeCloseTo(960)
    expect(r.sx).toBeCloseTo(320)
  })
  it('enquadramento move o recorte e zoom fecha nele', () => {
    expect(recorteCover({ largura: 1000, altura: 1000 }, 1, 1, { x: 0, y: 1, zoom: 2 })).toEqual({ sx: 0, sy: 500, sw: 500, sh: 500 })
  })
  it('zoom abaixo de 1 e centro fora de 0–1 ficam no limite (a foto sempre cobre a caixa)', () => {
    expect(recorteCover({ largura: 1000, altura: 1000 }, 1, 1, { x: 3, y: -1, zoom: 0.2 })).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 1000 })
  })
})

describe('analisaFoto', () => {
  it('grade de luminância: metade de cima branca, de baixo preta', () => {
    const w = 4, h = 4
    const px = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) px.set(i < 8 ? [255, 255, 255, 255] : [0, 0, 0, 255], i * 4)
    const m = analisaFoto(px, w, h, 2)
    expect(m).toEqual({ largura: 4, altura: 4, cols: 2, lins: 2, lum: [255, 255, 0, 0], bordas: [63.75, 63.75, 0, 0] })
    expect(lumEm(m, 2, 0)).toBe(255)
    expect(lumEm(m, 2, 4)).toBe(0)
    expect(lumEm(m, 2, 2)).toBeCloseTo(127.5)
  })
})

describe('filtro cinza (contraste + brilho do Pillow)', () => {
  const f = { tipo: 'cinza' as const, media: 100, contraste: 1.3, brilho: 0.85 }
  it('estica em volta da média e escurece', () => {
    expect(filtraLum(100, f)).toBe(85)
    expect(filtraLum(255, f)).toBe(216)
    expect(filtraLum(0, f)).toBe(0)
  })
  it('aplicaFiltro deixa a foto em tons de cinza', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255])
    aplicaFiltro(px, f)
    expect(px[0]).toBe(px[1])
    expect(px[1]).toBe(px[2])
    expect(px[3]).toBe(255)
  })
})
