import type { Cor, Tema } from '../cor'
import type { Item } from '../cena'
import type { Fontes } from '../fontes'
import { fonte, largura, px, texto } from '../texto'

export type Formato = 'post' | 'story'

export interface Marca {
  nome?: string
  perfil?: string
  cor?: string
}

/** O que cada Estilo recebe: campos já separados, tema resolvido e onde anotar avisos. */
export interface Pedido {
  campos: { texto?: string, titulo?: string, subtitulo?: string, numero?: string, objeto?: string }
  formato: Formato
  marca: Marca
  modo?: 'claro' | 'escuro'
}

export interface Contexto {
  p: Pedido
  W: number
  H: number
  t: Tema
  av: string[]
  fontes: Fontes
}

export interface Saida {
  fundo: Cor
  itens: Item[]
  travas: { acentoAreaPct?: number }
}

/** Retângulo útil (x0, y0, x1, y1): margem 72; no story, fora da interface do Instagram. */
export function area(H: number, formato: Formato): [number, number, number, number] {
  return formato === 'story' ? [72, 250, 1008, 1920 - 340] : [72, 72, 1008, H - 72]
}

/** Elipse do Pillow numa caixa inclusiva [px(c-r), px(c+r)] em 2x: centro e raio crescem ¼ px em 1x. */
export function circulo(cx: number, cy: number, r: number, cor: Cor): Item {
  return { tipo: 'circulo', cx: (px(cx - r) + px(cx + r) + 1) / 4, cy: (px(cy - r) + px(cy + r) + 1) / 4, r: (px(cx + r) - px(cx - r) + 1) / 4, cor }
}

export function assinatura(fontes: Fontes, t: Tema, marca: Marca, x: number, y: number, cor?: Cor, centroW?: number): Item[] {
  let s = marca.perfil || marca.nome
  if (!s) return []
  const f = fonte(fontes, 'grot-semi', px(26))
  s = s.toUpperCase()
  const tr = 0.08 * px(26)
  const w = [...s].reduce((a, ch) => a + largura(f, ch) + tr, 0) - tr
  let xx = px(x) + (centroW ? (px(centroW) - w) / 2 : 0)
  const itens: Item[] = []
  for (const ch of s) {
    itens.push(texto('grot-semi', f.tam, xx, px(y), ch, cor ?? t.sutil))
    xx += largura(f, ch) + tr
  }
  return itens
}

/** Área pintada com `cor` (texto e círculos), em % da peça. */
export function areaDaCor(itens: Item[], cor: Cor, fontes: Fontes, W: number, H: number): number {
  let soma = 0
  for (const it of itens) {
    if (it.cor.some((v, i) => v !== cor[i])) continue
    if (it.tipo === 'texto') soma += fontes[it.fonte].tinta(it.texto, it.tam)
    else if (it.tipo === 'circulo') soma += Math.PI * it.r * it.r
    else soma += it.w * it.h
  }
  return soma / (W * H) * 100
}
