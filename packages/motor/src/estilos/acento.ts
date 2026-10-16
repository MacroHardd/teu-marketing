// P1 · acento raro (sem foto) — princípio das capas de César Villela
import { acentoSobre, mistura, neutros } from '../cor'
import { Bloco, limpaTexto } from '../texto'
import { area, areaDaCor, assinatura, circulo, type Contexto, type Saida } from './comum'

export function acento({ p, H, W, t, av, fontes }: Contexto): Saida {
  const [fundo, tinta] = neutros(t)
  const acc = acentoSobre(t, fundo)
  const [x0, y0, x1, y1] = area(H, p.formato)
  const txt = limpaTexto(p.campos.texto ?? '', av)
  const story = p.formato === 'story'
  const hmax = (y1 - y0) * (story ? 0.62 : 0.6)
  const b = new Bloco(fontes, txt, 'cut', x1 - x0, hmax, story ? 190 : 168, 76, { lh: 0.98, avisos: av, maiusc: true })
  const by = y0 + ((y1 - y0) - b.alto) / 2 - (story ? 20 : 30)
  const itens = b.desenha(x0, by, tinta, { corA: acc })
  // 3 pontos de acento, longe do texto (~0,3% da área)
  const pts: [number, number][] = [[x1 - 40, y0 + 70], [x0 + 50, by + b.alto + 150], [x1 - 80, y1 - 70]]
  for (const [cx, cy] of pts) {
    if (cy < by - 40 || cy > by + b.alto + 40) itens.push(circulo(cx, cy, 20, acc))
  }
  itens.push(...assinatura(fontes, t, p.marca, x0, y1 - 6, mistura(tinta, fundo, 0.35)))
  const pct = areaDaCor(itens, acc, fontes, W, H)
  if (pct > 7) av.push('destaque grande demais: marcar só 1 palavra curta')
  return { fundo, itens, travas: { acentoAreaPct: Math.round(pct * 100) / 100 } }
}
