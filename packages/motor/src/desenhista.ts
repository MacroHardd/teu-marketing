import type { Cena, CorA, Item, Risco } from './cena'
import type { Cor } from './cor'
import type { Fontes } from './fontes'
import type { Filtro } from './foto'
import { fractal, ruido } from './turbulencia'

/** O mínimo de Canvas 2D que o Desenhista usa: serve para o browser e para o @napi-rs/canvas. */
export interface Ctx2D {
  fillStyle: unknown
  save(): void
  restore(): void
  scale(x: number, y: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void
  arc(x: number, y: number, r: number, a0: number, a1: number): void
  fill(): void
  stroke(): void
  clip(): void
  lineWidth: number
  strokeStyle: unknown
  lineJoin: string
  lineCap: string
  imageSmoothingEnabled: boolean
  imageSmoothingQuality: string
  drawImage(img: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(o: number, cor: string): void }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(o: number, cor: string): void }
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  globalAlpha: number
  globalCompositeOperation: string
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray, width: number, height: number }
  putImageData(d: { data: Uint8ClampedArray, width: number, height: number }, x: number, y: number): void
  createImageData(w: number, h: number): { data: Uint8ClampedArray, width: number, height: number }
}

/** Cria uma tela fora da peça (OffscreenCanvas / canvas no browser, createCanvas no Node), para efeito feito à mão. */
export type FabricaTela = (w: number, h: number) => { getContext(tipo: '2d'): unknown }

/**
 * A foto já carregada, pronta para `drawImage`, com o filtro aplicado (ou a original, sem filtro).
 * Quem chama guarda em cache por filtro (`chaveFiltro`). Sem foto, a caixa fica com a cor de fundo.
 */
export type ProvedorFoto = (filtro?: Filtro) => unknown

const css = (c: Cor) => `rgb(${c[0]},${c[1]},${c[2]})`
const cssA = (c: CorA) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`

/** Textura do catálogo já carregada (imagem para `drawImage`), pelo id. */
export type ProvedorTextura = (id: string) => { width: number, height: number } | undefined

export interface OpcoesDesenha {
  /** px do canvas por px da peça (1 na Exportação 1080×1350). */
  escala?: number
  foto?: ProvedorFoto
  /** A imagem do logo do Perfil de Marca, já carregada. */
  logo?: unknown
  /** Tela fora da peça, para os efeitos feitos à mão (Riscada). */
  tela?: FabricaTela
  textura?: ProvedorTextura
}

interface Op { escala: number, foto?: ProvedorFoto, logo?: unknown, tela?: FabricaTela, letra?: { img: unknown, forca: number, W: number, H: number } }

/**
 * Único Desenhista: preview e Exportação passam por aqui. Texto vira contorno de glifo, sem depender da fonte
 * do sistema. A textura da Cena (fundo ou letra) multiplica por cima, com a opacidade da força.
 */
export function desenha(ctx: Ctx2D, cena: Cena, fontes: Fontes, { escala = 1, foto, logo, tela, textura }: OpcoesDesenha = {}): void {
  ctx.save()
  ctx.scale(escala, escala)
  ctx.fillStyle = css(cena.fundo)
  ctx.fillRect(0, 0, cena.largura, cena.altura)
  const t = cena.textura
  const tx = t && textura?.(t.id)
  if (tx && t.onde === 'fundo') multiplica(ctx, tx, cena.largura, cena.altura, t.forca)
  const letra = tx && t.onde === 'letra' ? { img: tx, forca: t.forca, W: cena.largura, H: cena.altura } : undefined
  for (const it of cena.itens) item(ctx, it, fontes, { escala, foto, logo, tela, letra })
  ctx.restore()
}

/** Textura em cover na peça (W × H), multiplicada com opacidade (dentro do recorte atual, se houver). */
function multiplica(ctx: Ctx2D, img: unknown, W: number, H: number, forca: number) {
  const { width: tw, height: th } = img as { width: number, height: number }
  const k = Math.max(W / tw, H / th)
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = forca
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, 0, 0, tw, th, (W - tw * k) / 2, (H - th * k) / 2, tw * k, th * k)
  ctx.restore()
}

/** A sombra é desenhada por um retângulo fora da peça: só o desfoque cai dentro. */
const LONGE = 100000

function item(ctx: Ctx2D, it: Item, fontes: Fontes, { escala, foto, logo, tela, letra }: Op) {
  if (it.tipo === 'imagem') {
    const img = logo as { width: number, height: number } | undefined
    if (!img) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, img.width, img.height, it.x, it.y, it.w, it.h)
    return
  }
  if (it.tipo === 'foto') {
    const img = foto?.(it.filtro)
    if (!img) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const r = it.recorte
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, it.x, it.y, it.w, it.h)
    return
  }
  if (it.tipo === 'radial') {
    const g = ctx.createRadialGradient(it.cx, it.cy, 0, it.cx, it.cy, it.r)
    g.addColorStop(0, cssA(it.de))
    g.addColorStop(1, cssA(it.ate))
    ctx.fillStyle = g
    ctx.fillRect(it.x, it.y, it.w, it.h)
    return
  }
  if (it.tipo === 'sombra') {
    // shadowBlur = 2 × desvio, e sombra (desfoque e deslocamento) não segue o scale do contexto
    ctx.save()
    ctx.shadowColor = cssA(it.cor)
    ctx.shadowBlur = it.blur * 2 * escala
    ctx.shadowOffsetX = LONGE * escala
    ctx.shadowOffsetY = 0
    ctx.fillStyle = '#000'
    ctx.fillRect(it.x - LONGE, it.y, it.w, it.h)
    ctx.restore()
    return
  }
  if (it.tipo === 'degrade') {
    const g = ctx.createLinearGradient(0, it.y, 0, it.y + it.h)
    g.addColorStop(0, cssA(it.de))
    g.addColorStop(1, cssA(it.ate))
    ctx.fillStyle = g
    ctx.fillRect(it.x, it.y, it.w, it.h)
    return
  }
  ctx.fillStyle = css(it.cor)
  if (it.tipo === 'forma') {
    ctx.beginPath()
    for (const c of it.cmds) {
      if (c[0] === 'M') ctx.moveTo(c[1], c[2])
      else if (c[0] === 'L') ctx.lineTo(c[1], c[2])
      else if (c[0] === 'Q') ctx.quadraticCurveTo(c[1], c[2], c[3], c[4])
      else if (c[0] === 'A') ctx.arc(c[1], c[2], c[3], c[4], c[5])
      else ctx.closePath()
    }
    if (it.traco) {
      ctx.strokeStyle = css(it.cor)
      ctx.lineWidth = it.traco
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
      ctx.stroke()
    } else {
      ctx.fill()
    }
  } else if (it.tipo === 'ret') {
    ctx.fillRect(it.x, it.y, it.w, it.h)
  } else if (it.tipo === 'circulo') {
    ctx.beginPath()
    ctx.arc(it.cx, it.cy, it.r, 0, Math.PI * 2)
    ctx.fill()
  } else {
    if (it.clip) {
      ctx.save()
      ctx.beginPath()
      it.clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.clip()
    }
    if (it.risco && tela) {
      riscado(ctx, it, fontes, tela)
    } else {
      glifos(ctx, it, fontes, it.x, it.y)
      if (it.traco) {
        ctx.strokeStyle = css(it.cor)
        ctx.lineWidth = it.traco
        ctx.lineJoin = 'miter'
        ctx.stroke()
      }
      if (letra) { // textura na letra: só dentro do contorno dos glifos
        ctx.save()
        ctx.clip()
        multiplica(ctx, letra.img, letra.W, letra.H, letra.forca)
        ctx.restore()
      }
    }
    if (it.clip) ctx.restore()
  }
}

type ItemTexto = Item & { tipo: 'texto' }

/** Contorno dos glifos como caminho atual, preenchido. */
function glifos(ctx: Ctx2D, it: ItemTexto, fontes: Fontes, x: number, y: number) {
  const path = fontes[it.fonte].ot.getPath(it.texto, x, y, it.tam, { kerning: !!it.kern, features: { liga: false, rlig: false } })
  ctx.beginPath()
  for (const c of path.commands) {
    if (c.type === 'M') ctx.moveTo(c.x, c.y)
    else if (c.type === 'L') ctx.lineTo(c.x, c.y)
    else if (c.type === 'Q') ctx.quadraticCurveTo(c.x1, c.y1, c.x, c.y)
    else if (c.type === 'C') ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y)
    else ctx.closePath()
  }
  ctx.fill()
}

/**
 * Letra arranhada (filtro `Scratch` da skill): feTurbulence (0,03, 2 oitavas) desloca o traço até ±5 px e um 2º ruído
 * (0,02 × 0,7) abre riscos horizontais que comem a letra. O Chrome amostra o ruído em (x+1, y+1) do pixel, a partir
 * do canto do bloco. Tudo em px da peça: com `escala`, a tela pronta é ampliada.
 */
function riscado(ctx: Ctx2D, it: ItemTexto, fontes: Fontes, tela: FabricaTela) {
  const r = it.risco as Risco
  // área do filtro (−10% / −20% em volta do bloco), cortada à caixa dos glifos + o alcance do deslocamento
  const D = 6
  const bb = fontes[it.fonte].ot.getPath(it.texto, it.x, it.y, it.tam, { kerning: !!it.kern, features: { liga: false, rlig: false } }).getBoundingBox()
  const m = (it.traco ?? 0) / 2 + 1 + D
  const x0 = Math.max(Math.floor(r.x - 0.1 * r.w), Math.floor(bb.x1 - m))
  const y0 = Math.max(Math.floor(r.y - 0.2 * r.h), Math.floor(bb.y1 - m))
  const w = Math.min(Math.ceil(r.x + 1.1 * r.w), Math.ceil(bb.x2 + m)) - x0
  const h = Math.min(Math.ceil(r.y + 1.2 * r.h), Math.ceil(bb.y2 + m)) - y0
  if (w <= 0 || h <= 0) return
  const t = tela(w, h)
  const o = t.getContext('2d') as Ctx2D
  o.fillStyle = css(it.cor)
  glifos(o, it, fontes, it.x - x0, it.y - y0)
  if (it.traco) {
    o.strokeStyle = css(it.cor)
    o.lineWidth = it.traco
    o.lineJoin = 'miter'
    o.stroke()
  }
  const src = o.getImageData(0, 0, w, h).data
  const img = o.createImageData(w, h)
  const out = img.data
  const campo = campoRisco(r.semente)
  const [cr, cg, cb] = it.cor
  // só perto da letra: o deslocamento é de no máximo ±5 px. Máscara da tinta alargada D px (2 passadas de soma móvel)
  const lin = new Uint16Array(w * h)
  for (let y = 0; y < h; y++) {
    let n = 0
    const b0 = y * w
    for (let x = -D; x < w; x++) {
      if (x + D < w && src[(b0 + x + D) * 4 + 3]) n++
      if (x - D - 1 >= 0 && src[(b0 + x - D - 1) * 4 + 3]) n--
      if (x >= 0) lin[b0 + x] = n
    }
  }
  const perto = new Uint8Array(w * h)
  for (let x = 0; x < w; x++) {
    let n = 0
    for (let y = -D; y < h; y++) {
      if (y + D < h) n += lin[(y + D) * w + x]!
      if (y - D - 1 >= 0) n -= lin[(y - D - 1) * w + x]!
      if (y >= 0 && n) perto[y * w + x] = 1
    }
  }
  // o Chrome encaixa a origem do filtro no pixel: o ruído fica num campo fixo (coordenada do bloco)
  const ox = x0 - Math.round(r.x) + 1
  const oy = y0 - Math.round(r.y) + 1
  for (let y = 0; y < h; y++) {
    for (let x = 0, k = y * w; x < w; x++, k++) {
      if (!perto[k]) continue
      const [buraco, ddx, ddy] = campo(ox + x, oy + y)
      if (buraco <= 0) continue
      const sx = Math.trunc(x + ddx)
      const sy = Math.trunc(y + ddy)
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
      const a = src[(sy * w + sx) * 4 + 3]! * buraco
      if (!a) continue
      const q = k * 4
      out[q] = cr
      out[q + 1] = cg
      out[q + 2] = cb
      out[q + 3] = Math.round(a)
    }
  }
  o.putImageData(img, 0, 0)
  ctx.drawImage(t, 0, 0, w, h, x0, y0, w, h)
}

/** Domínio do campo (coordenada do bloco, px) e passo da grade. */
const C = { x0: -200, y0: -200, w: 1600, h: 800, P: 4 }
const _campos = new Map<number, (lx: number, ly: number) => [number, number, number]>()
const _saida: [number, number, number] = [0, 0, 0]

/**
 * Ruído do risco num ponto inteiro do bloco: [furo 0–1, deslocamento x, deslocamento y]. O deslocamento (0,03, período
 * ~30 px) vem de uma grade de 4 px interpolada; os furos (0,02 × 0,7) são exatos por linha e a cada 4 px em x.
 * Calculado sob demanda e guardado: o preview não paga o ruído de novo a cada quadro.
 */
function campoRisco(semente: number) {
  let f = _campos.get(semente)
  if (f) return f
  const n = ruido(semente)
  const g = ruido(semente + 7)
  const { x0, y0, w, h, P } = C
  const gw = w / P + 2
  const dx = new Float32Array(gw * (h / P + 2)).fill(NaN)
  const dy = new Float32Array(dx.length)
  const furo = new Float32Array(gw * h).fill(NaN)
  const grade = (i: number, j: number) => {
    const k = j * gw + i
    if (Number.isNaN(dx[k]!)) {
      dx[k] = 10 * (fractal(n, 0, x0 + i * P, y0 + j * P, 0.03, 0.03, 2) - 0.5)
      dy[k] = 10 * (fractal(n, 1, x0 + i * P, y0 + j * P, 0.03, 0.03, 2) - 0.5)
    }
    return k
  }
  const furoEm = (i: number, ly: number) => {
    const k = (ly - y0) * gw + i
    if (Number.isNaN(furo[k]!)) furo[k] = Math.min(1, Math.max(0, -3.2 * fractal(g, 3, x0 + i * P, ly, 0.02, 0.7, 1) + 2.5))
    return furo[k]!
  }
  f = (lx, ly) => {
    if (lx < x0 || ly < y0 || lx >= x0 + w || ly >= y0 + h) { // fora do campo (não acontece no 1080 px): conta direto
      _saida[0] = Math.min(1, Math.max(0, -3.2 * fractal(g, 3, lx, ly, 0.02, 0.7, 1) + 2.5))
      _saida[1] = 10 * (fractal(n, 0, lx, ly, 0.03, 0.03, 2) - 0.5)
      _saida[2] = 10 * (fractal(n, 1, lx, ly, 0.03, 0.03, 2) - 0.5)
      return _saida
    }
    const u = (lx - x0) / P
    const i = Math.floor(u)
    const fx = u - i
    const f0 = furoEm(i, ly)
    _saida[0] = f0 + (furoEm(i + 1, ly) - f0) * fx
    if (_saida[0] <= 0) return _saida
    const v = (ly - y0) / P
    const j = Math.floor(v)
    const fy = v - j
    const k00 = grade(i, j)
    const k10 = grade(i + 1, j)
    const k01 = grade(i, j + 1)
    const k11 = grade(i + 1, j + 1)
    _saida[1] = (dx[k00]! * (1 - fx) + dx[k10]! * fx) * (1 - fy) + (dx[k01]! * (1 - fx) + dx[k11]! * fx) * fy
    _saida[2] = (dy[k00]! * (1 - fx) + dy[k10]! * fx) * (1 - fy) + (dy[k01]! * (1 - fx) + dy[k11]! * fx) * fy
    return _saida
  }
  _campos.set(semente, f)
  return f
}
