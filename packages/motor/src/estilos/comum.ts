import { BRANCO, contraste, type Cor, type Tema } from '../cor'
import type { Item, Travas } from '../cena'
import type { Fontes } from '../fontes'
import type { Elemento, Zona } from '../ajustes'
import { recorteCover, type Enquadramento, type Filtro, type MetaFoto } from '../foto'
import { Bloco, fonte, largura, limpaTexto, px, ret, texto } from '../texto'

export type Formato = 'post' | 'story'

export interface Marca {
  nome?: string
  perfil?: string
  cor?: string
  contato?: string
  /** Tamanho do logo (px). A imagem fica com o app, como a foto. */
  logo?: { largura: number, altura: number }
}

/** O que cada Estilo recebe: campos já separados, tema resolvido e onde anotar avisos. */
export interface Pedido {
  campos: { texto?: string, titulo?: string, subtitulo?: string, numero?: string, objeto?: string }
  formato: Formato
  marca: Marca
  modo?: 'claro' | 'escuro'
  foto?: MetaFoto
  enquadramento: Enquadramento
  /** Escala da letra (Ajuste P/M/G; 1 = publi). */
  k: number
  /** Zona do texto escolhida; sem valor, a do Estilo. */
  zona?: Zona
  el: Record<Elemento, boolean>
  cta: string
  reforco: boolean
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
  travas: Omit<Travas, 'avisos'>
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
    if (it.tipo === 'foto' || it.tipo === 'degrade' || it.tipo === 'imagem') continue
    if (it.cor.some((v, i) => v !== cor[i])) continue
    if (it.tipo === 'texto') soma += fontes[it.fonte].tinta(it.texto, it.tam)
    else if (it.tipo === 'circulo') soma += Math.PI * it.r * it.r
    else soma += it.w * it.h
  }
  return soma / (W * H) * 100
}

/** Foto em cover na caixa (x0, y0, x1, y1), como o `tela.foto` do publi (tamanho medido em 2x). */
export function fotoCover(p: Pedido, x0: number, y0: number, x1: number, y1: number, filtro?: Filtro): Item | null {
  if (!p.foto) return null
  const w = px(x1 - x0)
  const h = px(y1 - y0)
  return { tipo: 'foto', x: px(x0) / 2, y: px(y0) / 2, w: w / 2, h: h / 2, recorte: recorteCover(p.foto, w, h, p.enquadramento), filtro }
}

/** Contraste mínimo (WCAG para letra grande). Abaixo disso, a Trava de contraste dispara. */
export const CONTRASTE_MIN = 3

// ------------------------------------------------------------------ Elementos opcionais (fora do publi)
/** Espaço que os Elementos tiram da área do texto: logo/selo em cima, CTA embaixo. */
export function reserva(p: Pedido): { topo: number, base: number } {
  return { topo: p.el.logo || p.el.selo ? 110 : 0, base: p.el.cta ? 100 : 0 }
}

/** Topo do bloco de texto (alto `alto`) na zona pedida, dentro da área já sem as reservas. */
export function yZona(zona: Zona, y0: number, y1: number, alto: number, centro: number): number {
  if (zona === 'topo') return y0 + 40
  if (zona === 'base') return y1 - alto - 90
  return centro
}

const iniciais = (s: string) => s.replace(/^@/, '').split(/[\s._-]+/u).filter(Boolean).slice(0, 2).map(w => [...w][0]!.toUpperCase()).join('')

/**
 * Logo (topo esq.), selo (topo dir.), CTA (acima da linha de base) e contato (na linha de base, do lado
 * oposto ao da assinatura). Mesmo lugar em todo Estilo: o Cliente liga e desliga, não move.
 */
export function elementos({ p, av, fontes }: Contexto, x0: number, y0: number, x1: number, y1: number,
  cores: { tinta: Cor, sutil: Cor, acc: Cor }, ladoAssinatura: 'esq' | 'dir' | null): Item[] {
  const itens: Item[] = []
  const m = p.marca
  if (p.el.logo && m.logo) {
    const k = Math.min(240 / m.logo.largura, 80 / m.logo.altura)
    itens.push({ tipo: 'imagem', chave: 'logo', x: x0, y: y0, w: m.logo.largura * k, h: m.logo.altura * k })
  }
  const nome = m.nome || m.perfil || ''
  if (p.el.selo && nome) {
    const r = 46
    const cx = x1 - r
    const cy = y0 + r
    itens.push({ tipo: 'circulo', cx, cy, r, cor: cores.acc })
    const s = iniciais(nome)
    const f = fonte(fontes, 'grot-xbold', px(34))
    const quase: Cor = [18, 18, 18]
    const cor = contraste(BRANCO, cores.acc) >= contraste(quase, cores.acc) ? BRANCO : quase
    const [sobe, desce] = f.fonte.caixa(s, f.tam)
    itens.push(texto('grot-xbold', f.tam, px(cx) - largura(f, s) / 2, px(cy) - (sobe + desce) / 2, s, cor))
  }
  if (p.el.cta) {
    const b = new Bloco(fontes, limpaTexto(p.cta, av), 'grot-bold', x1 - x0, 100, 40, 28, { lh: 1.15, maxLinhas: 2 })
    const y = y1 - 52 - b.alto
    itens.push(ret(px(x0), px(y - 14), px(x0 + 56), px(y - 8), cores.acc)) // barrinha acima, como chamada
    itens.push(...b.desenha(x0, y, cores.acc))
  }
  if (p.el.contato && m.contato) {
    const f = fonte(fontes, 'grot-med', px(26))
    const s = m.contato
    const x = ladoAssinatura === 'esq' ? px(x1) - largura(f, s) : px(x0)
    itens.push(texto('grot-med', f.tam, x, px(y1 - 6), s, cores.sutil))
  }
  return itens
}
