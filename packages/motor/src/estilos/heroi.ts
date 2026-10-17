// P9 · objeto-herói (com ou sem foto) — princípio dos anúncios da Absolut (TBWA, 1980): o objeto no centro, iluminado
import { BRANCO, contraste, mistura, PRETO, vivo, type Cor } from '../cor'
import type { Item } from '../cena'
import { split } from '../py'
import { Bloco, limpaTexto, px, S } from '../texto'
import { area, assinatura, elementos, fotoCover, reserva, type Contexto, type Saida } from './comum'

const CLARO: Cor = [245, 243, 238]
/** O radial_gradient do Pillow chega a 255 em 1,409 × meio lado da caixa (128·√2 no quadro de 256). */
const ALCANCE = 255 / (128 * Math.SQRT2)

export function heroi(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const escuro = mistura(t.acento, PRETO, 0.88)
  const [x0, y0, x1, y10] = area(H, p.formato)
  const y1 = y10 - (p.el.cta ? 100 : 0)
  const story = p.formato === 'story'
  const itens: Item[] = []
  // luz no centro (o objeto "iluminado")
  const cx = W / 2
  const cy = y0 + (y1 - y0) * 0.44 + reserva(p).topo / 2
  const lx = px(cx - W * 0.55) / S
  const ly = px(cy - W * 0.55) / S
  const lado = px(W * 1.1) / S
  const luz = mistura(t.acento, BRANCO, 0.25)
  itens.push({ tipo: 'radial', x: lx, y: ly, w: lado, h: lado, cx: lx + lado / 2, cy: ly + lado / 2, r: ALCANCE * lado / 2, de: [...luz, 0.3], ate: [...luz, 0] })
  let legenda = limpaTexto(p.campos.texto ?? '', av)
  const foto = p.foto ? (() => {
    const oh = (y1 - y0) * (story ? 0.46 : 0.5) * p.k
    const ow = oh * 0.8
    return fotoCover(p, cx - ow / 2, cy - oh / 2, cx + ow / 2, cy + oh / 2)
  })() : null
  if (foto && foto.tipo === 'foto') {
    itens.push({ tipo: 'sombra', x: foto.x, y: foto.y + 30, w: foto.w, h: foto.h, blur: 40, cor: [0, 0, 0, 0.5] })
    itens.push(foto)
  } else {
    // sem foto, o objeto-herói é o preço/valor que a pessoa trouxe
    let obj = limpaTexto(p.campos.objeto ?? '', av)
    if (!obj) {
      av.push('falta o objeto: mande uma foto do produto ou um preço/valor')
      obj = legenda
      legenda = ''
    }
    const bo = new Bloco(fontes, obj, 'cut', x1 - x0, (y1 - y0) * 0.42 * p.k, (story ? 420 : 360) * p.k, 90, { lh: 0.95, maxLinhas: 2, avisos: av, maiusc: true })
    itens.push(...bo.desenha(x0, cy - bo.alto / 2, BRANCO, { alinhar: 'centro', wbox: x1 - x0 }))
  }
  if (split(legenda).length > 6) av.push('legenda longa: aqui funciona com 2–3 palavras')
  const v = vivo(t.acento)
  const acc = contraste(v, escuro) >= 3 ? v : undefined
  if (legenda) {
    const bl = new Bloco(fontes, legenda, 'grot-xbold', x1 - x0, 160, (story ? 54 : 48) * p.k, 30, { lh: 1.15, maxLinhas: 2, avisos: av, maiusc: true })
    itens.push(...bl.desenha(x0, y1 - 70 - bl.alto, CLARO, { alinhar: 'centro', wbox: x1 - x0, corA: acc }))
  }
  if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y10 - 6, mistura(CLARO, escuro, 0.45), x1 - x0))
  itens.push(...elementos(c, x0, y0, x1, y10, { tinta: CLARO, acc: acc ?? CLARO }))
  return { fundo: escuro, itens, travas: { contraste: contraste(CLARO, escuro) } }
}
