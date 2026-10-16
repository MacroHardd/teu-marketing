import type { Cena, CorA, Item } from './cena'
import type { Cor } from './cor'
import type { Fontes } from './fontes'
import type { Filtro } from './foto'

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
  imageSmoothingEnabled: boolean
  imageSmoothingQuality: string
  drawImage(img: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(o: number, cor: string): void }
}

/**
 * A foto já carregada, pronta para `drawImage`, com o filtro aplicado (ou a original, sem filtro).
 * Quem chama guarda em cache por filtro (`chaveFiltro`). Sem foto, a caixa fica com a cor de fundo.
 */
export type ProvedorFoto = (filtro?: Filtro) => unknown

const css = (c: Cor) => `rgb(${c[0]},${c[1]},${c[2]})`
const cssA = (c: CorA) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`

/**
 * Único Desenhista: preview e Exportação passam por aqui. `escala` = px do canvas por px da peça
 * (1 na Exportação 1080×1350). Texto vira contorno de glifo, sem depender da fonte do sistema.
 * `logo` = a imagem do logo do Perfil de Marca, já carregada.
 */
export function desenha(ctx: Ctx2D, cena: Cena, fontes: Fontes, escala = 1, foto?: ProvedorFoto, logo?: unknown): void {
  ctx.save()
  ctx.scale(escala, escala)
  ctx.fillStyle = css(cena.fundo)
  ctx.fillRect(0, 0, cena.largura, cena.altura)
  for (const it of cena.itens) item(ctx, it, fontes, foto, logo)
  ctx.restore()
}

function item(ctx: Ctx2D, it: Item, fontes: Fontes, foto?: ProvedorFoto, logo?: unknown) {
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
  if (it.tipo === 'degrade') {
    const g = ctx.createLinearGradient(0, it.y, 0, it.y + it.h)
    g.addColorStop(0, cssA(it.de))
    g.addColorStop(1, cssA(it.ate))
    ctx.fillStyle = g
    ctx.fillRect(it.x, it.y, it.w, it.h)
    return
  }
  ctx.fillStyle = css(it.cor)
  if (it.tipo === 'ret') {
    ctx.fillRect(it.x, it.y, it.w, it.h)
  } else if (it.tipo === 'circulo') {
    ctx.beginPath()
    ctx.arc(it.cx, it.cy, it.r, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const path = fontes[it.fonte].ot.getPath(it.texto, it.x, it.y, it.tam, { kerning: false, features: { liga: false, rlig: false } })
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
}
