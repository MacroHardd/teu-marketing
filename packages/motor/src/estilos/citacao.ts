// P10 · retrato + citação (com foto) — princípio do "got milk?" (Bozell, 1995): retrato e uma fala, com quem disse
import { acentoSobre, BRANCO, contraste, mistura, PRETO, type Cor } from '../cor'
import type { Item } from '../cena'
import { lumEm } from '../foto'
import { split, strip } from '../py'
import { Bloco, fonte, limpaTexto, px, ret, S, texto } from '../texto'
import { area, CONTRASTE_MIN, elementos, fotoCover, luzAtras, reserva, type Contexto, type Saida } from './comum'

const FALA = /^\s*["“”']?([\s\S]+?)["“”']?\s*(?:\n|\s)[—–-]\s*([\s\S]{2,60})$/u
const TINTA_ESCURA: Cor = [18, 18, 18]
const TINTA_CLARA: Cor = [246, 244, 238]
/** Véu suave do lado da citação (opacidade máxima); com a correção de contraste, mais forte. */
const VEU = 0.55
const VEU_REFORCO = 0.85

/** Separa a fala de quem disse ("… — Ana"), sem trocar palavra. */
export function separaFala(t: string): [string, string] {
  const m = FALA.exec(t)
  return m ? [m[1]!.trim(), m[2]!.trim()] : [t, '']
}

export function citacao(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const [x0, y0, x1, y10] = area(H, p.formato)
  // o CTA fica na base: a citação de baixo termina antes dele
  const y1 = y10 - (p.el.cta ? 100 : 0)
  let [fala, quem] = separaFala(limpaTexto(p.campos.texto ?? '', av))
  fala = strip(fala, '"“”\' ')
  if (!quem && p.el.assinatura) quem = p.marca.nome || ''
  if (split(fala).length > 25) av.push('citação longa: até ~25 palavras fica melhor')
  const itens: Item[] = []
  const foto = fotoCover(p, 0, 0, W, H)
  const c0 = mistura(t.acento, PRETO, 0.2)
  const c1 = mistura(t.acento, PRETO, 0.6)
  if (foto) {
    itens.push(foto)
  } else {
    av.push('este formato pede o retrato de quem fala: sem foto, usei a cor da marca')
    itens.push({ tipo: 'degrade', x: 0, y: 0, w: W, h: H, de: [...c0, 1], ate: [...c1, 1] })
  }
  // luz da foto (ou do degradê) num ponto da peça, pelo metadado
  const luz = (x: number, y: number): number => {
    if (foto && foto.tipo === 'foto' && p.foto) {
      const r = foto.recorte
      return lumEm(p.foto, r.sx + x / W * r.sw, r.sy + y / H * r.sh)
    }
    const g = mistura(c0, c1, y / H)
    return (g[0] * 19595 + g[1] * 38470 + g[2] * 7471 + 0x8000) >> 16
  }
  // a citação mora na faixa mais calma (cima ou baixo), nunca no meio (rosto)
  const fh = (y10 - y0) * 0.36
  const emCima = energia(c, foto, luz, y0, y0 + fh) < energia(c, foto, luz, y10 - fh, y10) * 0.8
  const [ra, rb] = emCima ? [y0, y0 + fh] : [y10 - fh, y10]
  const clara = media(luz, W, ra, rb) > 140
  // véu suave do lado da citação (legibilidade em foto amadora), sem caixa
  const vh = H * 0.48
  const forte = p.reforco ? VEU_REFORCO : VEU
  const corVeu = clara && !p.reforco ? BRANCO : PRETO
  const vy = emCima ? 0 : px(H - vh) / S
  const vH = px(vh) / S
  const transp = [...corVeu, 0] as const
  const opaco = [...corVeu, forte] as const
  itens.push({ tipo: 'degrade', x: 0, y: vy, w: W, h: vH, de: emCima ? opaco : transp, ate: emCima ? transp : opaco })
  const tinta = clara && !p.reforco ? TINTA_ESCURA : TINTA_CLARA
  const acc = acentoSobre(t, corVeu)
  const story = p.formato === 'story'
  const b = new Bloco(fontes, '“' + fala + '”', 'grot-bold', (x1 - x0) * 0.9, fh - 90, (story ? 72 : 64) * p.k, 32, { lh: 1.22, avisos: av })
  const fq = fonte(fontes, 'grot-semi', px(32))
  const alto = b.alto + 24 + 32
  const by = emCima ? y0 + 10 + reserva(p).topo : y1 - alto - 10
  itens.push(...b.desenha(x0, by, tinta, { corA: acc }))
  if (quem) {
    itens.push(ret(px(x0), px(by + b.alto + 22), px(x0 + 40) + 1, px(by + b.alto + 26) + 1, acc))
    itens.push(texto('grot-semi', fq.tam, px(x0 + 54), px(by + b.alto + 34), quem, tinta))
  }
  // Trava de contraste: a letra contra a luz atrás dela (foto + véu)
  const veu = (y: number) => {
    const k = Math.min(1, Math.max(0, (y - vy) / vH))
    return y < vy || y > vy + vH ? 0 : forte * (emCima ? 1 - k : k)
  }
  const corV = corVeu[0]
  const l = foto && foto.tipo === 'foto'
    ? luzAtras(p, foto, x0, by, x0 + b.largura, by + b.alto, veu, corV)
    : media((x, y) => luz(x, y) * (1 - veu(y)) + corV * veu(y), W, by, by + b.alto)
  const atras: Cor = [Math.round(l), Math.round(l), Math.round(l)]
  const ctr = contraste(tinta, atras)
  if (ctr < CONTRASTE_MIN) av.push('pouco contraste entre a letra e a foto')
  itens.push(...elementos(c, x0, y0, x1, y10, { tinta, acc }))
  return { fundo: PRETO, itens, travas: { citacaoEm: emCima ? 'cima' : 'baixo', luminanciaAtras: Math.round(l), contraste: ctr } }
}

/** Média de luz numa faixa horizontal da peça (amostrada). */
function media(luz: (x: number, y: number) => number, W: number, ya: number, yb: number, passo = 6): number {
  let s = 0
  let n = 0
  for (let y = ya + passo / 2; y < yb; y += passo) {
    for (let x = passo / 2; x < W; x += passo) {
      s += luz(x, y)
      n++
    }
  }
  return n ? s / n : 0
}

/**
 * `energia` do publi (média do FIND_EDGES em cinza) numa faixa da peça, sem ler pixel. O FIND_EDGES do Pillow
 * copia a moldura de 1 px do recorte: essa parte sai da grade de luz; o miolo sai da grade `bordas` do upload,
 * na escala em que a foto entra na peça. Foto sem `bordas` (enviada antes) ou sem foto: só a moldura decide.
 */
function energia({ W, p }: Contexto, foto: Item | null, luz: (x: number, y: number) => number, ya: number, yb: number): number {
  const w2 = px(W)
  const h2 = px(yb) - px(ya)
  let moldura = 0
  const n = 64
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * W
    moldura += (luz(x, ya + 0.25) + luz(x, yb - 0.25)) * w2 / n
  }
  for (let i = 0; i < n; i++) {
    const y = ya + (i + 0.5) / n * (yb - ya)
    moldura += (luz(0.25, y) + luz(W - 0.25, y)) * (h2 - 2) / n
  }
  let miolo = 0
  const m = p.foto
  if (foto && foto.tipo === 'foto' && m?.bordas) {
    const r = foto.recorte
    const esc = w2 / r.sw // px da foto → px 2x da peça
    let s = 0
    let k = 0
    for (let j = 0; j < 24; j++) {
      for (let i = 0; i < 48; i++) {
        const sx = r.sx + (i + 0.5) / 48 * r.sw
        const sy = r.sy + (ya + (j + 0.5) / 24 * (yb - ya)) / H(foto) * r.sh
        const cx = Math.min(m.cols - 1, Math.floor(sx / m.largura * m.cols))
        const cy = Math.min(m.lins - 1, Math.floor(sy / m.altura * m.lins))
        s += m.bordas[cy * m.cols + cx]!
        k++
      }
    }
    miolo = s / k / Math.max(1, esc)
  }
  return (moldura + miolo * (w2 - 2) * (h2 - 2)) / (w2 * h2)
}

const H = (foto: Item) => (foto.tipo === 'foto' ? foto.h : 1)
