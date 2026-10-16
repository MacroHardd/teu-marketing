// Meta do ADR 0001: Motor + Desenhista em p95 < 50 ms por quadro do preview (1080×1350).
// Aqui é Node (@napi-rs/canvas); a medição no browser fica na página /spike do apps/web.
import { describe, expect, it } from 'vitest'
import { motor } from '../src'
import { casos, entrada, foto, fontes, renderiza } from './util'

describe('desempenho', () => {
  it('p95 < 50 ms', () => {
    const cs = ['acento', 'fina', 'ogilvy'].flatMap(casos)
    const quadro = (c: (typeof cs)[number]) => renderiza(motor(entrada(c), fontes()).cena, c.foto ? foto(c.foto).provedor : undefined)
    for (const c of cs) quadro(c) // aquece caches de glifo e de filtro da foto
    const tempos: number[] = []
    for (let i = 0; i < 10; i++) {
      for (const c of cs) {
        const t0 = performance.now()
        quadro(c)
        tempos.push(performance.now() - t0)
      }
    }
    tempos.sort((a, b) => a - b)
    const p95 = tempos[Math.floor(tempos.length * 0.95)]!
    console.log(`p95 ${p95.toFixed(1)} ms · p50 ${tempos[tempos.length >> 1]!.toFixed(1)} ms · n=${tempos.length}`)
    expect(p95).toBeLessThan(50)
  })
})
