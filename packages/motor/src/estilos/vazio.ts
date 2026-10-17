// P7 · vazio (com foto) — princípio do "Think Small" (VW, DDB 1959): objeto pequeno num campo enorme
import { acentoSobre, contraste, mistura, neutros } from '../cor'
import type { Item } from '../cena'
import { split } from '../py'
import { Bloco, limpaTexto } from '../texto'
import { area, assinatura, circulo, elementos, fotoCover, type Contexto, type Saida } from './comum'

export function vazio(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const [fundo, tinta] = neutros(t)
  const [x0, y0, x1, y1] = area(H, p.formato)
  const story = p.formato === 'story'
  // objeto pequeno (≤ ~8% da área) no terço de cima; o resto é vazio
  const lado = W * (story ? 0.26 : 0.27)
  const cx = W / 2
  const cy = y0 + (y1 - y0) * (story ? 0.26 : 0.28)
  const itens: Item[] = []
  const foto = fotoCover(p, cx - lado / 2, cy - lado / 2, cx + lado / 2, cy + lado / 2)
  if (foto) {
    itens.push(foto)
  } else {
    av.push('este formato pede foto do produto: sem foto, usei um ponto na cor da marca')
    itens.push(circulo(cx, cy, lado * 0.18, t.acento))
  }
  const txt = limpaTexto(p.campos.texto ?? '', av)
  if (split(txt).length > 8) av.push('aqui o vazio é a mensagem: frase de até ~5 palavras fica melhor')
  const hy = y0 + (y1 - y0) * (story ? 0.62 : 0.66)
  const wb = (x1 - x0) * 0.86
  // o CTA fica na base: a frase termina antes dele
  const b = new Bloco(fontes, txt, 'grot-xbold', wb, y1 - hy - 90 - (p.el.cta ? 100 : 0), (story ? 64 : 58) * p.k, 34, { lh: 1.12, maxLinhas: 3, avisos: av })
  const acc = acentoSobre(t, fundo)
  itens.push(...b.desenha(x0 + (x1 - x0) * 0.07, hy, tinta, { corA: acc, alinhar: 'centro', wbox: wb }))
  if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y1 - 6, mistura(tinta, fundo, 0.4), x1 - x0))
  itens.push(...elementos(c, x0, y0, x1, y1, { tinta, acc }))
  return { fundo, itens, travas: { objetoAreaPct: Math.round(lado * lado / (W * H) * 1000) / 10, contraste: contraste(tinta, fundo) } }
}
