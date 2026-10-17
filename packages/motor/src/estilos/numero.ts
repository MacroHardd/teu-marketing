// P3 · número gigante (sem foto) — princípio do "Thanks 2016" do Spotify: o número exato vira a peça
import { contraste, mistura, PRETO } from '../cor'
import type { Item } from '../cena'
import { Bloco, limpaTexto } from '../texto'
import { area, assinatura, elementos, reserva, yZona, type Contexto, type Saida } from './comum'

export function numero(c: Contexto): Saida {
  const { p, H, t, av, fontes } = c
  let fundo = t.acento
  let tinta = t.sobreAcento
  if (p.modo === 'escuro') { // inversão: fundo quase preto tingido, letra clara
    fundo = mistura(t.acento, PRETO, 0.86)
    tinta = [243, 241, 236]
  }
  const [x0, y0, x1, y1] = area(H, p.formato)
  const res = reserva(p)
  const num = limpaTexto(p.campos.numero ?? '', av)
  const txt = limpaTexto(p.campos.texto ?? '', av)
  if (!num) av.push('falta o número (ex.: "1.200", "98%", "15 anos")')
  const story = p.formato === 'story'
  const bn = new Bloco(fontes, num, 'cut', x1 - x0, (y1 - y0) * 0.42 * p.k, (story ? 520 : 440) * p.k, 120, { lh: 0.92, maxLinhas: 2, avisos: av, maiusc: true })
  const bt = txt ? new Bloco(fontes, txt, 'grot-bold', x1 - x0, (y1 - y0) * 0.36, (story ? 76 : 66) * p.k, 40, { lh: 1.16, avisos: av }) : null
  const gap = 48
  const total = bn.alto + (bt ? gap + bt.alto : 0)
  const centro = y0 + ((y1 - y0) - total) / 2 - 20
  const yy = yZona(p.zona ?? 'centro', y0 + res.topo, y1 - res.base, total, centro)
  const itens: Item[] = [...bn.desenha(x0 - 6, yy, tinta)]
  if (bt) itens.push(...bt.desenha(x0, yy + bn.alto + gap, tinta))
  if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y1 - 6, mistura(tinta, fundo, 0.3)))
  // o fundo já é a cor de acento: CTA e selo usam a cor da letra
  itens.push(...elementos(c, x0, y0, x1, y1, { tinta, acc: tinta }))
  return { fundo, itens, travas: { numeroPx: bn.tam, contraste: contraste(tinta, fundo) } }
}
