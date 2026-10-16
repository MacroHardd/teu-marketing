// P8 · ordem de leitura (com foto) — princípio de David Ogilvy (1983): foto em cima, título, legenda
import { acentoSobre, contraste, mistura, neutros } from '../cor'
import type { Item } from '../cena'
import { Bloco, limpaTexto, px, ret, separaFrase } from '../texto'
import { area, elementos, fotoCover, type Contexto, type Saida } from './comum'

export function ogilvy(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const [fundo, tinta] = neutros(t)
  const [x0, y0, x1, y10] = area(H, p.formato)
  // CTA e contato ficam na base: a legenda termina antes deles
  const y1 = y10 - (p.el.cta ? 100 : 0) - (p.el.contato ? 46 : 0)
  const story = p.formato === 'story'
  const fotoY1 = story ? y0 + (y1 - y0) * 0.66 : H * 0.62
  const itens: Item[] = []
  const foto = fotoCover(p, 0, 0, W, fotoY1)
  if (foto) {
    itens.push(foto)
  } else {
    av.push('este formato pede foto: sem foto, usei bloco de cor')
    itens.push(ret(0, 0, px(W) + 1, px(fotoY1) + 1, t.acento))
  }
  const texto = limpaTexto(p.campos.texto ?? '', av)
  let [tit, leg] = separaFrase(texto)
  let legMarca = false
  if (!leg && p.el.assinatura) { // a legenda sempre existe: na falta, é quem assina
    leg = p.marca.nome || p.marca.perfil || ''
    legMarca = true
  }
  const ty = fotoY1 + 50
  const bt = new Bloco(fontes, tit, 'grot-xbold', x1 - x0, (story ? 320 : 250) * p.k, (story ? 84 : 74) * p.k, 40, { lh: 1.12, maxLinhas: 3, avisos: av })
  itens.push(...bt.desenha(x0, ty, tinta, { corA: acentoSobre(t, fundo) }))
  const ly = ty + bt.alto + 26
  if (leg) {
    const bl = new Bloco(fontes, leg, legMarca ? 'grot-semi' : 'grot-med', x1 - x0, Math.max(40, y1 - ly - 10), Math.max(32, bt.tam * 0.5), 26,
      { lh: 1.35, maxLinhas: 5, avisos: av })
    itens.push(...bl.desenha(x0, ly, mistura(tinta, fundo, 0.3)))
  }
  const acc = acentoSobre(t, fundo)
  const sutil = mistura(tinta, fundo, 0.3)
  itens.push(...elementos(c, x0, y0, x1, y10, { tinta, sutil, acc }, null))
  return { fundo, itens, travas: { tituloPx: bt.tam, contraste: contraste(tinta, fundo) } }
}
