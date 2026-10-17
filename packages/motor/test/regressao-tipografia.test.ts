// Regressão visual dos Estilos da skill tipografia-igor: Motor TS + Desenhista contra os estáticos do kit (Remotion).
// Gere as referências antes: (cd packages/oraculo/tipografia && npm ci && node gerar.mjs)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { motor, type TipoEstilo } from '../src'
import { casosT, entradaT, foto, fontes, renderiza, ORACULO, RAIZ } from './util'

/** Mesmo limite do publi: % de pixels diferentes na peça. */
const LIMITE_PCT = 1
const DIFF = join(RAIZ, 'test', '__diff__')
const SAIDA = join(ORACULO, 'saida', 'tipografia')

const casos = casosT()

for (const estilo of [...new Set(casos.map(c => c.estilo))]) {
  describe.skipIf(!existsSync(join(SAIDA, estilo)))(`regressão tipografia ${estilo}`, () => {
    for (const c of casos.filter(x => x.estilo === estilo)) {
      it(c.id, () => {
        const r = motor(entradaT(c), fontes())
        expect(r.estilo).toBe(estilo)
        if (c.ink) expect(r.cena.travas.letra).toBe(c.ink === '#111111' ? 'escura' : 'clara')
        const a = PNG.sync.read(readFileSync(join(SAIDA, estilo, `${c.id}.png`)))
        const cv = renderiza(r.cena, c.foto ? foto(c.foto).provedor : undefined)
        const b = PNG.sync.read(cv.toBuffer('image/png'))
        const diff = new PNG({ width: a.width, height: a.height })
        const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.2 })
        const pct = n / (a.width * a.height) * 100
        if (pct >= LIMITE_PCT || process.env.DIFF) {
          mkdirSync(DIFF, { recursive: true })
          writeFileSync(join(DIFF, `t-${estilo}-${c.id}-ts.png`), cv.toBuffer('image/png'))
          writeFileSync(join(DIFF, `t-${estilo}-${c.id}-diff.png`), PNG.sync.write(diff))
        }
        if (process.env.PCT) console.log(`PCT ${c.id} ${pct.toFixed(3)}`)
        expect(pct, `${pct.toFixed(3)}% diferente`).toBeLessThan(LIMITE_PCT)
      })
    }
  })
}
