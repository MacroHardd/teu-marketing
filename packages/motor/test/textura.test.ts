import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import { desenha, motor, type Ctx2D } from '../src'
import { fontes } from './util'

/** Textura cinza-média lisa: multiplicar escurece tudo o que ela cobre. */
const tex = (() => {
  const c = createCanvas(8, 8)
  const x = c.getContext('2d')
  x.fillStyle = 'rgb(128,128,128)'
  x.fillRect(0, 0, 8, 8)
  return c
})()

function pinta(textura?: { id: string, onde: 'fundo' | 'letra', forca?: 'leve' | 'forte' }) {
  const r = motor({ texto: 'Menos ruído, mais *resultado*', estilo: 'manchete', ajustes: textura ? { textura } : {} }, fontes())
  const cv = createCanvas(1080, 1350)
  desenha(cv.getContext('2d') as unknown as Ctx2D, r.cena, fontes(), { textura: id => (id === 'cinza' ? tex : undefined) })
  return { cena: r.cena, px: cv.getContext('2d').getImageData(0, 0, 1080, 1350).data }
}

describe('textura no Post (Ajuste)', () => {
  const sem = pinta()
  it('sem Ajuste: Cena sem textura', () => expect(sem.cena.textura).toBeUndefined())

  it('no fundo: o fundo escurece, com a força pedida', () => {
    const leve = pinta({ id: 'cinza', onde: 'fundo' })
    const forte = pinta({ id: 'cinza', onde: 'fundo', forca: 'forte' })
    expect(leve.cena.textura).toEqual({ id: 'cinza', onde: 'fundo', forca: 0.35 })
    expect(leve.px[0]!).toBeLessThan(sem.px[0]!)
    expect(forte.px[0]!).toBeLessThan(leve.px[0]!)
  })

  it('na letra: o fundo fica igual e só a letra muda', () => {
    const l = pinta({ id: 'cinza', onde: 'letra', forca: 'forte' })
    expect(l.px[0]).toBe(sem.px[0])
    let mudou = 0
    for (let i = 0; i < l.px.length; i += 4) if (l.px[i] !== sem.px[i]) mudou++
    expect(mudou).toBeGreaterThan(1000)
    expect(mudou).toBeLessThan(1080 * 1350 * 0.3)
  })

  it('textura que não carregou: desenha sem ela (não quebra)', () => {
    const r = pinta({ id: 'nao-existe', onde: 'fundo' })
    expect(r.px[0]).toBe(sem.px[0])
  })
})
