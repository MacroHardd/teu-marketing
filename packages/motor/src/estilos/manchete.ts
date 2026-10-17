// P2 · só manchete (sem foto) — princípio das capas da The Economist
import { contraste, mistura, PRETO } from '../cor'
import { split } from '../py'
import { Bloco, fonte, largura, limpaTexto, px, texto } from '../texto'
import { area, elementos, reserva, yZona, type Contexto, type Saida } from './comum'

export function manchete(c: Contexto): Saida {
  const { p, H, t, av, fontes } = c
  let fundo = t.acento
  let tinta = t.sobreAcento
  if (p.modo === 'escuro') { // inversão: fundo quase preto tingido, letra clara
    fundo = mistura(t.acento, PRETO, 0.86)
    tinta = [243, 241, 236]
  }
  const [x00, y0, x1, y1] = area(H, p.formato)
  const x0 = x00 + 8
  const res = reserva(p)
  const txt = limpaTexto(p.campos.texto ?? '', av)
  if (split(txt).length > 22) av.push('manchete longa: funciona melhor com até 12 palavras')
  const story = p.formato === 'story'
  const hmax = Math.min((y1 - y0) * 0.72 * p.k, y1 - y0 - res.topo - res.base - 220)
  const b = new Bloco(fontes, txt, 'grot-xbold', x1 - x0, hmax, (story ? 132 : 118) * p.k, 54, { lh: 1.06, avisos: av })
  const centro = y0 + ((y1 - y0) - b.alto) / 2 - 30
  const by = yZona(p.zona ?? 'centro', y0 + res.topo, y1 - res.base, b.alto, centro)
  const itens = b.desenha(x0, by, tinta)
  const sutil = mistura(tinta, fundo, 0.25)
  const s = p.marca.perfil || p.marca.nome || ''
  if (s && p.el.assinatura) { // alinhada à direita na base (anchor "rs" do Pillow)
    const f = fonte(fontes, 'grot-bold', px(30))
    itens.push(texto('grot-bold', f.tam, px(x1) - largura(f, s), px(y1 - 6), s, sutil))
  }
  // o fundo já é a cor de acento: CTA e selo usam a cor da letra
  itens.push(...elementos(c, x0, y0, x1, y1, { tinta, acc: tinta }))
  return { fundo, itens, travas: { corpoPx: b.tam, contraste: contraste(tinta, fundo) } }
}
