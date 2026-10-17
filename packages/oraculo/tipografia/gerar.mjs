// Gera as referências dos Estilos da skill tipografia-igor: saida/tipografia/<estilo>/<id>.png (+ .json com o caso).
// Uso: node packages/oraculo/tipografia/gerar.mjs [estilo ...]   (precisa de `npm ci` nesta pasta e de um Chrome)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const AQUI = import.meta.dirname
const SAIDA = join(AQUI, '..', 'saida', 'tipografia')
const filtro = process.argv.slice(2)
const casos = JSON.parse(readFileSync(join(AQUI, '..', 'casos', 'tipografia.json'), 'utf8')).filter(c => !filtro.length || filtro.includes(c.estilo))
const browserExecutable = process.env.CHROME ?? '/usr/bin/google-chrome'

const serveUrl = await bundle({ entryPoint: join(AQUI, 'src', 'index.ts'), publicDir: join(AQUI, 'public') })
for (const c of casos) {
  const id = `${c.estilo}-${c.id}`
  const composition = await selectComposition({ serveUrl, id, inputProps: { c }, browserExecutable })
  const pasta = join(SAIDA, c.estilo)
  mkdirSync(pasta, { recursive: true })
  await renderStill({ composition, serveUrl, output: join(pasta, `${c.id}.png`), inputProps: { c }, browserExecutable, imageFormat: 'png' })
  writeFileSync(join(pasta, `${c.id}.json`), JSON.stringify(c, null, 2))
  console.log(id)
}
