// Regra 10 · letra riscada (Kyle Cooper, títulos de Se7en 1995), pelo estático E10 da skill tipografia-igor.
// Trava: palavra-chave escrita à mão e arranhada; o resto em grotesca pequena e quieta, minúscula. Quase mono + 1 acento,
// fundo escuro. Sem música, a chave é a palavra marcada pelo Cliente (*assim*); sem marcação, a de tom escuro.
import { contraste, hexrgb, type Cor } from '../cor'
import type { Item } from '../cena'
import { chaveRiscada } from '../campos'
import { comContraste, PAL } from '../paletas'
import { split } from '../py'
import { limpaTexto } from '../texto'
import { elementos, reserva, type Contexto, type Saida } from './comum'
import { baseCss, creditoCss, largCss } from './css'

/** Estático: padding 110 × 80, coluna no centro; chave 230 px (a que manda, 300), resto 42 px. */
const E10 = { padV: 110, padH: 80, mao: 230, maior: 300, lhMao: 0.92, grot: 42, lhGrot: 1.3, ls: 0.04, margem: 10, traco: 6, min: 0.3 }
/** Mesma semente do `Scratch id="s10" seed={3}` da skill. */
const SEMENTE = 3

const bare = (w: string) => w.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}']/gu, '')

export function paletaRiscada(p: Contexto['p'], comAcento: boolean): { bg: Cor, ink: Cor, acc: Cor } {
  const { paper: bg, ink } = PAL.se7en
  const marca = (p.cor ?? (p.marca.cor ? 'marca' : 'se7en')) === 'marca' && p.marca.cor
  const acc = marca ? comContraste(hexrgb(p.marca.cor!), bg, 3) : PAL.villela.acc
  return { bg, ink, acc: comAcento ? acc : ink }
}

interface Bloco { chave: boolean, ws: string[] }

export function riscada(c: Contexto): Saida {
  const { p, W, H, av, fontes } = c
  const comAcento = p.variacao === 'acento'
  const { bg, ink, acc } = paletaRiscada(p, comAcento)
  const res = reserva(p)
  const marcado = chaveRiscada(limpaTexto(p.campos.texto ?? '', av))
  const chaves = new Set([...marcado.matchAll(/\*([^*]+)\*/g)].flatMap(m => split(m[1]!).map(bare)))
  const ws = split(marcado.replaceAll('*', ''))
  if (ws.length > 14) av.push('texto longo para letra riscada: até ~10 palavras fica melhor')
  // blocos: cada palavra-chave sozinha; as outras, juntas
  const blocos: Bloco[] = []
  for (const w of ws) {
    const chave = chaves.has(bare(w))
    const ult = blocos[blocos.length - 1]
    if (!chave && ult && !ult.chave) ult.ws.push(w)
    else blocos.push({ chave, ws: [w] })
  }
  const larg = W - 2 * E10.padH
  const topo = E10.padV + res.topo
  const livre = H - E10.padV - res.base - topo
  const lsGrot = (k: number) => E10.ls * E10.grot * k
  // largura da linha de grotesca: kerning + espaçamento depois de cada letra (letter-spacing do CSS)
  const largG = (s: string, k: number) => largCss(fontes, 'grot-med', E10.grot * k, s) + [...s].length * lsGrot(k)
  const linhasG = (s: string, k: number, w: number) => {
    const out: string[] = []
    for (const p of split(s)) {
      const l = out[out.length - 1]
      if (l !== undefined && largG(l + ' ' + p, k) <= w + 0.01) out[out.length - 1] = l + ' ' + p
      else out.push(p)
    }
    return out
  }
  // só a palavra-chave anda para o lado (marginLeft do estático); a grotesca fica na coluna
  const ml = (j: number) => (blocos[j]!.chave ? (j * 137) % 160 : 0)
  const tamMao = (b: Bloco, j: number, k: number) => {
    const t = (comAcento ? E10.maior : E10.mao) * k
    const w = largCss(fontes, 'hand', t, b.ws.join(' ')) + E10.traco
    return w > larg - ml(j) ? t * (larg - ml(j)) / w : t
  }
  const alturas = (k: number) => blocos.map((b, j) => b.chave
    ? tamMao(b, j, k) * E10.lhMao
    : linhasG(b.ws.join(' ').toLowerCase(), k, larg - ml(j)).length * E10.grot * k * E10.lhGrot + 2 * E10.margem * k)
  // texto longo: tudo encolhe junto até caber
  let k = p.k
  const total = (kk: number) => alturas(kk).reduce((a, b) => a + b, 0)
  while (total(k) > livre && k > E10.min) k -= 0.02
  if (total(k) > livre) av.push('texto longo demais para este formato: foi cortado — dividir em 2 posts ou encurtar')
  const hs = alturas(k)
  let y = topo + (livre - total(k)) / 2 // justify-content: center
  const itens: Item[] = []
  blocos.forEach((b, j) => {
    const x = E10.padH + ml(j)
    const w = larg - ml(j)
    if (b.chave) {
      const t = tamMao(b, j, k)
      const lh = t * E10.lhMao
      const cor = comAcento ? acc : ink
      const s = b.ws.join(' ')
      itens.push({ tipo: 'texto', fonte: 'hand', tam: t, x, y: y + baseCss(fontes, 'hand', t, lh), texto: s, cor, kern: true, traco: E10.traco,
        risco: { x, y, w, h: lh, semente: SEMENTE } })
    } else {
      const t = E10.grot * k
      const lh = t * E10.lhGrot
      const b0 = baseCss(fontes, 'grot-med', t, lh)
      linhasG(b.ws.join(' ').toLowerCase(), k, w).forEach((l, i) => {
        // letra a letra: kerning do par + letter-spacing
        let antes = ''
        for (const ch of l) {
          const cx = x + largCss(fontes, 'grot-med', t, antes + ch) - largCss(fontes, 'grot-med', t, ch) + [...antes].length * lsGrot(k)
          itens.push({ tipo: 'texto', fonte: 'grot-med', tam: t, x: cx, y: y + E10.margem * k + i * lh + b0, texto: ch, cor: ink })
          antes += ch
        }
      })
    }
    y += hs[j]!
  })
  itens.push(...creditoCss(c, ink, bg))
  itens.push(...elementos(c, 72, 72, W - 72, H - 72, { tinta: ink, acc: comAcento ? acc : ink }))
  return { fundo: bg, itens, travas: { contraste: contraste(ink, bg) } }
}
