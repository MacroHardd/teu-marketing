// Regra 6 · síncope fora da grade (Villela / Lennie Dale 1963), pelo estático E6 da skill tipografia-igor.
// Trava: grade; palavra no tempo forte fica na coluna, a do contratempo sai dela. Sem música, o contratempo é
// a palavra marcada pelo Cliente (*assim*); sem marcação, palavras alternadas. 2 cores; o bloco é opcional.
import { contraste, hexrgb } from '../cor'
import type { Item } from '../cena'
import { comContraste, letraSobre, PAL } from '../paletas'
import { limpaTexto, ret } from '../texto'
import { elementos, reserva, type Contexto, type Saida } from './comum'
import { baseCss, creditoCss, largCss, palavrasCss } from './css'

/** Estático: coluna em x=80 (contratempo +220), primeira linha em y=170, passo até 150, letra 140 × passo/150. */
const E6 = { col: 220, x0: 80, y0: 170, row: 150, fs: 140, bloco: { l: 540, t: 760 }, min: 30 }

export function paletaSincope(p: Contexto['p'], bloco: boolean): { paper: readonly [number, number, number], ink: readonly [number, number, number] } {
  const nome = p.cor ?? (p.marca.cor ? 'marca' : bloco ? 'villela' : 'azul')
  if (nome === 'marca' && p.marca.cor) {
    const cor = hexrgb(p.marca.cor)
    // com bloco: papel claro e a marca como tinta; sem bloco: fundo cheio na marca e 1 tinta
    return bloco ? { paper: PAL.villela.paper, ink: comContraste(cor, PAL.villela.paper, 4.5) } : { paper: cor, ink: letraSobre(cor) }
  }
  if (nome === 'azul') return PAL.azul
  return { paper: PAL.villela.paper, ink: PAL.villela.ink }
}

export function sincope(c: Contexto): Saida {
  const { p, W, H, av, fontes } = c
  const bloco = (p.variacao ?? 'bloco') !== 'sem-bloco'
  const { paper, ink } = paletaSincope(p, bloco)
  const res = reserva(p)
  const ws = palavrasCss(limpaTexto(p.campos.texto ?? '', av), true)
  let fora = new Set(ws.flatMap(([, st], k) => (st === 'a' ? [k] : [])))
  if (!fora.size) fora = new Set(ws.map((_, k) => k).filter(k => k % 2 === 1))
  const livre = H - 100 - 140 - E6.y0 - res.base
  let row = Math.min(E6.row * p.k, livre / Math.max(ws.length - 1, 1))
  let fs = E6.fs * (row / E6.row)
  // palavra larga demais para a peça: a letra diminui (a grade continua)
  const larg = Math.max(0, ...ws.map(([w], k) => E6.x0 + (fora.has(k) ? E6.col : 0) + largCss(fontes, 'cut', fs, w)))
  if (larg > W - 40) fs *= (W - 40 - E6.x0 - E6.col) / (larg - E6.x0 - E6.col)
  let n = ws.length
  if (fs < E6.min) {
    fs = E6.min
    row = Math.max(row, fs)
    n = Math.max(1, Math.floor(livre / row) + 1)
    av.push('texto longo demais para este formato: foi cortado — dividir em 2 posts ou encurtar')
  }
  const B = E6.bloco
  const foraDoBloco: [number, number][] = [[0, 0], [W, 0], [W, B.t], [B.l, B.t], [B.l, H], [0, H]]
  const noBloco: [number, number][] = [[B.l, B.t], [W, B.t], [W, H], [B.l, H]]
  const itens: Item[] = []
  if (bloco) itens.push(ret(B.l * 2, B.t * 2, W * 2, H * 2, ink))
  const b0 = baseCss(fontes, 'cut', fs, fs)
  ws.slice(0, n).forEach(([w], k) => {
    const x = E6.x0 + (fora.has(k) ? E6.col : 0)
    const y = E6.y0 + k * row + b0
    const t = { tipo: 'texto' as const, fonte: 'cut' as const, tam: fs, x, y, texto: w, kern: true }
    if (!bloco) {
      itens.push({ ...t, cor: ink })
    } else { // a letra vira negativo dentro do bloco
      itens.push({ ...t, cor: ink, clip: foraDoBloco })
      itens.push({ ...t, cor: paper, clip: noBloco })
    }
  })
  itens.push(...creditoCss(c, ink, paper))
  itens.push(...elementos(c, 72, 72, W - 72, H - 72, { tinta: ink, acc: ink }))
  return { fundo: paper, itens, travas: { contraste: contraste(ink, paper), corpoPx: Math.round(fs) } }
}
