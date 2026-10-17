// Regra 3 · zona calma (Rogério Duarte, capa de Gil 1968), pelo estático E3 da skill tipografia-igor.
// Trava: fundo cheio/saturado (raios, ou a foto) + 1 zona neutra (a pílula) onde mora a letra.
import { contraste, hexrgb, mistura } from '../cor'
import type { Cmd, Item } from '../cena'
import { PAL, zonaDaMarca, type PaletaZona } from '../paletas'
import { Bloco, limpaTexto } from '../texto'
import { elementos, fotoCover, type Contexto, type Saida } from './comum'
import { baseCss, encaixa, largLinhaCss, linhaCss, palavrasCss, quebraCss } from './css'

/** Caixa do texto dentro da pílula (estático: left 190, top 500, 700 × 460), Anton 84, line-height 1. */
const E3 = { x: 190, y: 500, w: 700, h: 460, fontSize: 84, min: 36 }

export function paletaZona(p: Contexto['p']): PaletaZona {
  const nome = p.cor ?? (p.marca.cor ? 'marca' : 'gil')
  if (nome === 'marca' && p.marca.cor) return zonaDaMarca(hexrgb(p.marca.cor))
  return PAL[nome as 'gil' | 'neon'] ?? PAL.gil
}

/** Pílula (border-radius maior que a altura → semicírculos nas pontas). */
function pilula(x: number, y: number, w: number, h: number): Cmd[] {
  const r = h / 2
  return [['M', x + r, y], ['L', x + w - r, y], ['A', x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2],
    ['L', x + r, y + h], ['A', x + r, y + r, r, Math.PI / 2, Math.PI * 1.5], ['Z']]
}

export function zona(c: Contexto): Saida {
  const { p, W, H, av, fontes } = c
  const pal = paletaZona(p)
  const itens: Item[] = []
  const comFoto = (p.variacao ?? (p.foto ? 'foto' : 'desenho')) === 'foto'
  const foto = comFoto ? fotoCover(p, 0, 0, W, H, { tipo: 'css', ops: [['saturar', 1.6], ['contraste', 1.15]] }) : null
  if (comFoto && !foto) av.push('este formato pede foto: sem foto, usei os raios')
  if (foto) {
    itens.push(foto)
  } else {
    // 28 raios saindo do centro (polígonos até 120% da peça), girados 4° e ampliados 1,6× no centro
    const N = 28
    const cx = W / 2
    const cy = H / 2
    const ang = 4 * Math.PI / 180
    const tr = (x: number, y: number): [number, number] => {
      const dx = (x - cx) * 1.6
      const dy = (y - cy) * 1.6
      return [cx + dx * Math.cos(ang) - dy * Math.sin(ang), cy + dx * Math.sin(ang) + dy * Math.cos(ang)]
    }
    const pt = (g: number) => tr(W * (0.5 + 1.2 * Math.cos(g * Math.PI / 180)), H * (0.5 + 1.2 * Math.sin(g * Math.PI / 180)))
    for (let j = 0; j < N; j++) {
      const [ax, ay] = pt(j / N * 360)
      const [bx, by] = pt((j + 1) / N * 360)
      itens.push({ tipo: 'forma', cor: j % 2 ? pal.a : pal.b, cmds: [['M', cx, cy], ['L', ax, ay], ['L', bx, by], ['Z']] })
    }
    // a onda: 13 curvas, faixa de 60 px com fio claro de 14 px
    const onda: Cmd[] = [['M', 0, 250]]
    for (let j = 0; j < 13; j++) onda.push(['Q', j * 90 + 45, 250 + (j % 2 ? 60 : -60), (j + 1) * 90, 250])
    itens.push({ tipo: 'forma', cmds: onda, cor: pal.wave, traco: 60 })
    itens.push({ tipo: 'forma', cmds: onda, cor: pal.white, traco: 14 })
  }
  // a zona neutra: 900 × 600 com borda de 12 px por dentro (o Remotion usa box-sizing: border-box)
  itens.push({ tipo: 'forma', cmds: pilula(90, 430, 900, 600), cor: pal.wave })
  itens.push({ tipo: 'forma', cmds: pilula(102, 442, 876, 576), cor: pal.dark })

  // a zona calma é onde a letra mora: CTA e assinatura também ficam dentro da pílula, abaixo do texto
  const cta = p.el.cta ? 64 : 0
  const ass = p.el.assinatura && (p.marca.perfil || p.marca.nome) ? 40 : 0
  const h = E3.h - cta - ass
  const ws = palavrasCss(limpaTexto(p.campos.texto ?? '', av), true)
  const altura = (t: number) => quebraCss(fontes, 'cut', t, ws, E3.w).length * t
  const max = Math.round(E3.fontSize * p.k)
  const tam = encaixa(max, E3.min, t => altura(t) <= h)
  let linhas = quebraCss(fontes, 'cut', tam ?? E3.min, ws, E3.w)
  const t = tam ?? E3.min
  if (tam === null) {
    linhas = linhas.slice(0, Math.floor(h / t))
    av.push('texto longo demais para este formato: foi cortado — dividir em 2 posts ou encurtar')
  }
  // flex + align-items center: o bloco (texto + CTA + assinatura) fica no meio da caixa; cada linha centralizada
  const bloco = linhas.length * t + cta + ass
  const y0 = E3.y + (E3.h - bloco) / 2
  const b0 = baseCss(fontes, 'cut', t, t)
  linhas.forEach((l, k) => {
    const lw = largLinhaCss(fontes, 'cut', t, l)
    itens.push(...linhaCss(fontes, 'cut', t, l, E3.x + (E3.w - lw) / 2, y0 + k * t + b0, pal.white, pal.acc))
  })
  let yb = y0 + linhas.length * t
  if (cta) {
    const b = new Bloco(fontes, limpaTexto(p.cta, av), 'grot-bold', E3.w, 56, 36, 24, { lh: 1.15, maxLinhas: 1 })
    itens.push(...b.desenha(E3.x, yb + 14, pal.acc, { alinhar: 'centro', wbox: E3.w }))
    yb += cta
  }
  if (ass) {
    const s = (p.marca.perfil || p.marca.nome || '').toUpperCase()
    const f = 22
    const tr = 0.08 * f
    const larg = [...s].reduce((a, ch) => a + fontes['grot-med'].largura(ch, f) + tr, 0) - tr
    let x = E3.x + (E3.w - larg) / 2
    for (const ch of s) {
      itens.push({ tipo: 'texto', fonte: 'grot-med', tam: f, x, y: yb + 30, texto: ch, cor: mistura(pal.dark, pal.white, 0.7) })
      x += fontes['grot-med'].largura(ch, f) + tr
    }
  }
  itens.push(...elementos(c, 72, 72, W - 72, H - 72, { tinta: pal.white, acc: pal.acc }, { cta: false }))
  return { fundo: pal.dark, itens, travas: { contraste: contraste(pal.white, pal.dark), corpoPx: t } }
}

