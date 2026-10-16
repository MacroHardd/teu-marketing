// P1 · acento raro (sem foto) — princípio das capas de César Villela
import { acentoSobre, contraste, mistura, neutros } from '../cor'
import { Bloco, limpaTexto } from '../texto'
import { area, areaDaCor, assinatura, circulo, elementos, reserva, yZona, type Contexto, type Saida } from './comum'

export function acento(c: Contexto): Saida {
  const { p, H, W, t, av, fontes } = c
  const [fundo, tinta] = neutros(t)
  const acc = acentoSobre(t, fundo)
  const [x0, y0, x1, y1] = area(H, p.formato)
  const res = reserva(p)
  const txt = limpaTexto(p.campos.texto ?? '', av)
  const story = p.formato === 'story'
  const hmax = Math.min((y1 - y0) * (story ? 0.62 : 0.6) * p.k, y1 - y0 - res.topo - res.base - 220)
  const b = new Bloco(fontes, txt, 'cut', x1 - x0, hmax, (story ? 190 : 168) * p.k, 76, { lh: 0.98, avisos: av, maiusc: true })
  const centro = y0 + ((y1 - y0) - b.alto) / 2 - (story ? 20 : 30)
  const by = yZona(p.zona ?? 'centro', y0 + res.topo, y1 - res.base, b.alto, centro)
  const itens = b.desenha(x0, by, tinta, { corA: acc })
  // 3 pontos de acento, longe do texto (~0,3% da área) e dos Elementos
  const pts: [number, number][] = [[x1 - 40, y0 + 70], [x0 + 50, by + b.alto + 150], [x1 - 80, y1 - 70]]
  pts.forEach(([cx, cy], i) => {
    if (i === 0 && p.el.selo) return
    if (i > 0 && cy > y1 - res.base - 40) return
    if (cy < by - 40 || cy > by + b.alto + 40) itens.push(circulo(cx, cy, 20, acc))
  })
  const sutil = mistura(tinta, fundo, 0.35)
  if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y1 - 6, sutil))
  itens.push(...elementos(c, x0, y0, x1, y1, { tinta, sutil, acc }, p.el.assinatura ? 'esq' : null))
  const pct = areaDaCor(itens, acc, fontes, W, H)
  if (pct > 7) av.push('destaque grande demais: marcar só 1 palavra curta')
  return { fundo, itens, travas: { acentoAreaPct: Math.round(pct * 100) / 100, contraste: contraste(tinta, fundo) } }
}
