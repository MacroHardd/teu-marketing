// Preview e Exportação são o mesmo Motor + Desenhista. Aqui se garante que nada diverge entre os dois.
import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import pixelmatch from 'pixelmatch'
import { desenha, motor, type Ctx2D } from '../src'
import { casos, entrada, fontes, renderiza } from './util'

const pedido = { texto: 'Pare de *esperar*. Comece hoje!', marca: { perfil: '@teumarketing' } }

describe('preview = PNG', () => {
  it('Motor é determinístico: mesma Entrada, mesma Cena', () => {
    expect(motor(pedido, fontes())).toEqual(motor(pedido, fontes()))
  })

  it('duas renderizações da mesma Cena são idênticas pixel a pixel', () => {
    const { cena } = motor(pedido, fontes())
    const a = renderiza(cena).getContext('2d').getImageData(0, 0, 1080, 1350).data
    const b = renderiza(cena).getContext('2d').getImageData(0, 0, 1080, 1350).data
    expect(Buffer.compare(Buffer.from(a), Buffer.from(b))).toBe(0)
  })

  it('preview em escala menor é a mesma peça (só reduzida)', () => {
    for (const c of casos('manchete')) {
      const { cena } = motor(entrada(c), fontes())
      const k = 0.5
      const w = cena.largura * k, h = cena.altura * k
      const prev = createCanvas(w, h)
      desenha(prev.getContext('2d') as unknown as Ctx2D, cena, fontes(), { escala: k })
      const red = createCanvas(w, h)
      red.getContext('2d').drawImage(renderiza(cena), 0, 0, w, h)
      const n = pixelmatch(prev.getContext('2d').getImageData(0, 0, w, h).data, red.getContext('2d').getImageData(0, 0, w, h).data, undefined, w, h, { threshold: 0.2 })
      expect(n / (w * h) * 100, c.id).toBeLessThan(1)
    }
  })
})
