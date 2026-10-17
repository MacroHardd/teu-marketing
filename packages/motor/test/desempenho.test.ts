// Meta do ADR 0001: Motor + Desenhista em p95 < 50 ms por quadro do preview (1080×1350).
// Decisão do usuário (2026-10-17): desempenho fino espera o pós-MVP. Este teste só barra piora
// grosseira (p95 < 150 ms, ainda não trava a digitação); a meta de 50 ms segue impressa no log.
// Aqui é Node (@napi-rs/canvas).
import { describe, expect, it } from 'vitest'
import { motor } from '../src'
import { casos, casosT, entrada, entradaT, foto, fontes, renderiza } from './util'

describe('desempenho', () => {
  it('p95 < 150 ms (meta fina 50 ms no backlog)', () => {
    const cs = [...['manchete', 'ogilvy'].flatMap(casos).map(entrada), ...casosT().map(entradaT)]
    const fotos = [...casos('ogilvy'), ...casosT()].map(c => c.foto)
    const quadro = (i: number) => renderiza(motor(cs[i]!, fontes()).cena, fotos[i - casos('manchete').length] ? foto(fotos[i - casos('manchete').length]!).provedor : undefined)
    for (let i = 0; i < cs.length; i++) quadro(i) // aquece caches de glifo e de filtro da foto
    const tempos: number[] = []
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < cs.length; j++) {
        const t0 = performance.now()
        quadro(j)
        tempos.push(performance.now() - t0)
      }
    }
    tempos.sort((a, b) => a - b)
    const p95 = tempos[Math.floor(tempos.length * 0.95)]!
    console.log(`p95 ${p95.toFixed(1)} ms · p50 ${tempos[tempos.length >> 1]!.toFixed(1)} ms · n=${tempos.length}`)
    expect(p95).toBeLessThan(150)
  }, 30_000) // ~400 quadros + preparo dos filtros de foto: o limite padrão de 5 s é do teste, não do quadro
})
