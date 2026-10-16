import type { Cor } from './cor'
import type { NomeFonte } from './fontes'
import type { Filtro, Recorte } from './foto'

/** Cor com opacidade (0–1). */
export type CorA = readonly [number, number, number, number]

/** Tudo em px da peça final (1080 de largura), com fração. O Desenhista só desenha isto. */
export type Item =
  | { tipo: 'texto', fonte: NomeFonte, tam: number, x: number, y: number, texto: string, cor: Cor }
  | { tipo: 'circulo', cx: number, cy: number, r: number, cor: Cor }
  | { tipo: 'ret', x: number, y: number, w: number, h: number, cor: Cor }
  /** A foto do Cliente: `recorte` (px da foto) vai para a caixa x/y/w/h, com `filtro` opcional. */
  | { tipo: 'foto', x: number, y: number, w: number, h: number, recorte: Recorte, filtro?: Filtro }
  /** Degradê vertical de `de` (topo) até `ate` (base). */
  | { tipo: 'degrade', x: number, y: number, w: number, h: number, de: CorA, ate: CorA }

export interface Travas {
  /** % da área da peça pintada com a cor de acento. */
  acentoAreaPct?: number
  /** Luminância média (0–255) atrás do texto, calculada pelo metadado da foto. */
  luminanciaAtras?: number
  /** Cor de letra escolhida sobre a foto. */
  letra?: 'clara' | 'escura'
  /** Tamanho do título (Foto e legenda). */
  tituloPx?: number
  avisos: string[]
}

export interface Cena {
  largura: number
  altura: number
  fundo: Cor
  itens: Item[]
  travas: Travas
}
