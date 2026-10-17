// Regra 1 · acento raro (César Villela, Elenco 1963), pelo estático E1 da skill tipografia-igor.
// Trava: 2 neutros ≈ 95% + 1 acento ≤ ~7% da área, só na palavra-gancho. A palavra marcada pelo Cliente manda.
import { contraste, hexrgb, type Cor } from '../cor'
import type { Item } from '../cena'
import { PAL, type Neutros } from '../paletas'
import { limpaTexto } from '../texto'
import { areaDaCor, elementos, reserva, yZona, type Contexto, type Saida } from './comum'
import { baseCss, creditoCss, encaixa, linhaCss, palavrasCss, quebraCss } from './css'

const E1 = { left: 80, top: 380, width: 900, fontSize: 150, lh: 0.98, min: 32 }

export function paletaAcento(p: Contexto['p']): Neutros {
  const nome = p.cor ?? (p.marca.cor ? 'marca' : 'villela')
  if (nome === 'marca' && p.marca.cor) {
    const base = p.modo === 'escuro' ? PAL.noite : PAL.villela
    return { ...base, acc: hexrgb(p.marca.cor) as Cor }
  }
  return PAL[nome as 'villela' | 'noite' | 'verde'] ?? PAL.villela
}

export function acento(c: Contexto): Saida {
  const { p, H, W, av, fontes } = c
  const { paper, ink, acc } = paletaAcento(p)
  const res = reserva(p)
  const ws = palavrasCss(limpaTexto(p.campos.texto ?? '', av), true)
  const altura = (t: number) => quebraCss(fontes, 'cut', t, ws, E1.width).length * t * E1.lh
  const max = Math.round(E1.fontSize * p.k)
  // como no estático: a partir de y=380 (até ~200 px da base). Se não cabe ali, o texto encolhe e ocupa a área toda.
  const fundoLivre = H - 200 - res.base
  let tam = !p.zona && altura(max) <= fundoLivre - E1.top ? max : null
  let topo = E1.top
  if (tam === null) {
    const y0 = 72 + res.topo
    tam = encaixa(max, E1.min, t => altura(t) <= fundoLivre - y0) ?? E1.min
    const alto = altura(tam)
    topo = Math.max(y0, Math.min(fundoLivre - alto, yZona(p.zona ?? 'centro', y0, fundoLivre + 70, alto, (H - alto) / 2 - 30)))
  }
  let linhas = quebraCss(fontes, 'cut', tam, ws, E1.width)
  const lh = tam * E1.lh
  const nMax = Math.max(1, Math.floor((fundoLivre - topo) / lh + 1e-6))
  if (linhas.length > nMax) {
    linhas = linhas.slice(0, nMax)
    av.push('texto longo demais para este formato: foi cortado — dividir em 2 posts ou encurtar')
  }
  const itens: Item[] = []
  // os 3 pontos do estático (40 px), longe do texto e dos Elementos
  const fim = topo + linhas.length * lh
  for (const [x, y, i] of [[860, 170, 0], [120, 1040, 1], [900, 1150, 2]] as const) {
    if (i === 0 && p.el.selo) continue
    if (y + 40 > topo - 20 && y < fim + 20) continue
    if (i > 0 && y + 40 > H - 72 - res.base) continue
    itens.push({ tipo: 'circulo', cx: x + 20, cy: y + 20, r: 20, cor: acc })
  }
  const b0 = baseCss(fontes, 'cut', tam, lh)
  linhas.forEach((l, k) => itens.push(...linhaCss(fontes, 'cut', tam, l, E1.left, topo + k * lh + b0, ink, acc)))
  itens.push(...creditoCss(c, ink, paper))
  itens.push(...elementos(c, 72, 72, W - 72, H - 72, { tinta: ink, acc }))
  const pct = areaDaCor(itens, acc, fontes, W, H)
  // a palavra marcada pelo Cliente manda, mesmo que passe da trava; o aviso é só para a escolha automática
  if (pct > 7 && !p.marcado) av.push('destaque grande demais: marcar só 1 palavra curta')
  return { fundo: paper, itens, travas: { acentoAreaPct: Math.round(pct * 100) / 100, contraste: contraste(ink, paper), corpoPx: tam } }
}
