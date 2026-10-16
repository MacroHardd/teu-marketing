// Regressão visual: Motor TS + Desenhista contra o publi (oráculo). Gere as referências antes:
//   packages/oraculo/.venv/bin/python packages/oraculo/gerar.py
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { motor } from '../src'
import { casos, entrada, foto, fontes, referencia, renderiza, RAIZ, temSaida } from './util'

/**
 * Pixels que diferem além do limiar de cor do pixelmatch, em % da peça. O layout é conferido 1:1
 * (campos, avisos, Trava); o que sobra é borda de 1 px dentro da palavra, porque o Pillow posiciona
 * cada glifo com o avanço hintado. Texto denso de 7 linhas dá ~0,5%; deslocar o texto 1 px já dá 1,1%.
 */
const LIMITE_PCT = 1
const DIFF = join(RAIZ, 'test', '__diff__')

for (const conjunto of ['acento', 'fina', 'ogilvy']) {
  describe.skipIf(!temSaida(conjunto))(`regressão ${conjunto}`, () => {
    for (const c of casos(conjunto)) {
      it(c.id, () => {
        const ref = referencia(conjunto, c.id)!
        const r = motor(entrada(c), fontes())
        expect(r.estilo).toBe(ref.json.tipo)
        expect(r.campos).toEqual(ref.json.campos)
        expect(r.cena.travas.avisos).toEqual(ref.json.travas.avisos)
        if (ref.json.travas.acento_area_pct !== undefined) {
          expect(r.cena.travas.acentoAreaPct).toBeCloseTo(ref.json.travas.acento_area_pct, 0)
        }
        if (ref.json.travas.letra !== undefined) {
          // o publi mede o pixel; o Motor estima pela grade do metadado
          expect(r.cena.travas.letra).toBe(ref.json.travas.letra)
          expect(Math.abs(r.cena.travas.luminanciaAtras! - ref.json.travas.luminancia_atras)).toBeLessThanOrEqual(6)
        }
        if (ref.json.travas.titulo_px !== undefined) expect(r.cena.travas.tituloPx).toBe(ref.json.travas.titulo_px)
        const a = PNG.sync.read(ref.png)
        const cv = renderiza(r.cena, c.foto ? foto(c.foto).provedor : undefined)
        const b = PNG.sync.read(cv.toBuffer('image/png'))
        const diff = new PNG({ width: a.width, height: a.height })
        const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.2 })
        const pct = n / (a.width * a.height) * 100
        if (pct >= LIMITE_PCT) {
          mkdirSync(DIFF, { recursive: true })
          writeFileSync(join(DIFF, `${conjunto}-${c.id}-ts.png`), cv.toBuffer('image/png'))
          writeFileSync(join(DIFF, `${conjunto}-${c.id}-diff.png`), PNG.sync.write(diff))
        }
        expect(pct, `${pct.toFixed(3)}% diferente`).toBeLessThan(LIMITE_PCT)
      })
    }
  })
}
