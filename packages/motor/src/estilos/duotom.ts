// P6 · duas tintas + branco (com foto) — princípio das capas da Blue Note (Reid Miles / Francis Wolff, 1956–67).
// Porta do `p_bluenote` em revisão no publi-lab (render/bluenote_src.py): só as composições aprovadas, faixa e janela.
// Trava: fundo branco (3ª tinta), preto + 1 cor da marca, foto P&B. Nunca caixa/fundo atrás do texto.
import { acentoSobre, contraste, type Cor } from '../cor'
import type { Item } from '../cena'
import { mediaRecorte, type FiltroCinza } from '../foto'
import { Bloco, fonte, largura, limpaTexto, px, S, texto } from '../texto'
import { area, assinatura, elementos, fotoCover, reserva, type Contexto, type Pedido, type Saida } from './comum'

const PAPEL: Cor = [250, 249, 246]
const TINTA: Cor = [18, 18, 18]

/** Foto P&B do Blue Note (`_pb`): cinza, contraste 1,3 em volta da média, rampa de quase preto ao papel. */
function pb(p: Pedido, x0: number, y0: number, x1: number, y1: number): Item | null {
  const f = fotoCover(p, x0, y0, x1, y1)
  if (!f || f.tipo !== 'foto' || !p.foto) return f
  const filtro: FiltroCinza = { tipo: 'cinza', media: Math.trunc(mediaRecorte(p.foto, f.recorte) + 0.5), contraste: 1.3, brilho: 1, tinge: [[14, 14, 14], PAPEL] }
  return { ...f, filtro }
}

/** Assinatura alinhada à direita (onde a Blue Note põe o selo), em preto. */
function assinaDir({ fontes }: Contexto, p: Pedido, x1: number, y: number): Item[] {
  const s = (p.marca.perfil || p.marca.nome || '').toUpperCase()
  if (!s) return []
  const f = fonte(fontes, 'grot-semi', px(26))
  const tr = 0.08 * px(26)
  let xx = px(x1) - ([...s].reduce((a, ch) => a + largura(f, ch) + tr, 0) - tr)
  const itens: Item[] = []
  for (const ch of s) {
    itens.push(texto('grot-semi', f.tam, xx, px(y), ch, TINTA))
    xx += largura(f, ch) + tr
  }
  return itens
}

export function duotom(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const story = p.formato === 'story'
  const [x0, y0, x1, y10] = area(H, p.formato)
  const y1 = y10 - (p.el.cta ? 100 : 0)
  const res = reserva(p)
  const acc = acentoSobre(t, PAPEL)
  const tit = limpaTexto(p.campos.titulo ?? p.campos.texto ?? '', av)
  const sub = limpaTexto(p.campos.subtitulo ?? '', av)
  let comp = p.variacao === 'janela' ? 'janela' : 'faixa'
  if (!p.foto) {
    av.push('este formato pede foto: sem foto, ficou só o texto no branco')
    comp = 'so_texto'
  }
  const itens: Item[] = []
  // título na cor da marca (com *destaque*: preto + destaque na cor); linha de baixo em preto. Nada atrás.
  const escreve = (x: number, y: number, w: number, h: number, grande: boolean) => {
    const smax = (grande ? (story ? 150 : 128) : (story ? 124 : 112)) * p.k
    const b = new Bloco(fontes, tit, 'grot-bold', w, h - (sub ? 70 : 0), smax, 44, { lh: 1.02, maxLinhas: 4 })
    const s = sub ? new Bloco(fontes, sub.toUpperCase(), 'grot-med', w, 120, (story ? 34 : 30) * p.k, 22, { lh: 1.2, maxLinhas: 3, equilibrar: false }) : null
    const dest = b.linhas.some(l => l.some(([, st]) => st === 'a'))
    itens.push(...b.desenha(x, y, dest ? TINTA : acc, { corA: acc, wbox: w }))
    if (s) itens.push(...s.desenha(x, y + b.alto + 22, TINTA, { wbox: w, track: 0.02 }))
    return { b, fim: y + b.alto + (s ? 22 + s.alto : 0) }
  }
  let b: Bloco
  let base = y10
  if (comp === 'janela') {
    const fw = W * 0.56
    const fh = H * (story ? 0.42 : 0.46)
    const fx = W - fw
    const fy = story ? y0 - 60 : 0
    const f = pb(p, fx, fy, fx + fw, fy + fh)
    if (f) itens.push(f)
    const ty = fy + fh + 64
    b = escreve(x0, ty, x1 - x0, y1 - ty - 60, true).b
    if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y0 + 30 + res.topo, TINTA))
  } else if (comp === 'faixa') {
    const faixa = (y0 - 72) + H * (story ? 0.36 : 0.34)
    const e = escreve(x0, y0 + 6 + res.topo, (x1 - x0) * 0.9, faixa - y0 - 80, false)
    b = e.b
    // com CTA, ele fica no branco, logo acima da foto
    const topo = Math.max(faixa, e.fim + 80 + (p.el.cta ? 100 : 0))
    base = topo + 12
    // a foto sangra até a base: px(H - topo) de altura a partir de px(topo), como o paste do publi
    const f = pb(p, 0, topo, W, topo + px(H - topo) / S)
    if (f) itens.push(f)
    if (p.el.assinatura) itens.push(...assinaDir(c, p, x1, topo - 28))
  } else {
    b = escreve(x0, y0 + (y1 - y0) * 0.45, x1 - x0, (y1 - y0) * 0.5, true).b
    if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y0 + 30 + res.topo, TINTA))
  }
  if (b.cortado) av.push('título longo demais para este formato: foi cortado — encurtar ou dividir')
  itens.push(...elementos(c, x0, y0, x1, base, { tinta: TINTA, acc }))
  return { fundo: PAPEL, itens, travas: { tituloPx: b.tam, contraste: contraste(acc, PAPEL) } }
}
