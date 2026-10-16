import type { Cor } from './cor'
import type { NomeFonte } from './fontes'

/** Tudo em px da peça final (1080 de largura), com fração. O Desenhista só desenha isto. */
export type Item =
  | { tipo: 'texto', fonte: NomeFonte, tam: number, x: number, y: number, texto: string, cor: Cor }
  | { tipo: 'circulo', cx: number, cy: number, r: number, cor: Cor }
  | { tipo: 'ret', x: number, y: number, w: number, h: number, cor: Cor }

export interface Travas {
  /** % da área da peça pintada com a cor de acento. */
  acentoAreaPct?: number
  avisos: string[]
}

export interface Cena {
  largura: number
  altura: number
  fundo: Cor
  itens: Item[]
  travas: Travas
}
