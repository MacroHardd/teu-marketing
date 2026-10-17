import type { Cor } from './cor'
import type { NomeFonte } from './fontes'
import type { Filtro, Recorte } from './foto'

/** Cor com opacidade (0–1). */
export type CorA = readonly [number, number, number, number]

/** Comando de caminho: M/L (ponto), Q (controle + ponto), A (arco: centro, raio, ângulos em rad), Z (fecha). */
export type Cmd =
  | readonly ['M' | 'L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['A', number, number, number, number, number]
  | readonly ['Z']

/** Tudo em px da peça final (1080 de largura), com fração. O Desenhista só desenha isto. */
export type Item =
  /**
   * `kern` = com kerning (como o texto do navegador); `clip` = só desenha dentro deste polígono;
   * `traco` = contorno da letra (px, centrado, como o -webkit-text-stroke); `risco` = textura arranhada da Riscada.
   */
  | { tipo: 'texto', fonte: NomeFonte, tam: number, x: number, y: number, texto: string, cor: Cor, kern?: boolean, clip?: [number, number][], traco?: number, risco?: Risco }
  /** Forma livre: preenchida, ou só o contorno quando tem `traco` (largura da linha). */
  | { tipo: 'forma', cmds: Cmd[], cor: Cor, traco?: number }
  | { tipo: 'circulo', cx: number, cy: number, r: number, cor: Cor }
  | { tipo: 'ret', x: number, y: number, w: number, h: number, cor: Cor }
  /** A foto do Cliente: `recorte` (px da foto) vai para a caixa x/y/w/h, com `filtro` opcional. */
  | { tipo: 'foto', x: number, y: number, w: number, h: number, recorte: Recorte, filtro?: Filtro }
  /** Imagem da marca (o logo), em contain na caixa. O app entrega a imagem pela `chave`. */
  | { tipo: 'imagem', chave: 'logo', x: number, y: number, w: number, h: number }
  /** Luz radial: de `de` no centro (cx, cy) até `ate` no raio `r`, pintada só dentro da caixa x/y/w/h. */
  | { tipo: 'radial', x: number, y: number, w: number, h: number, cx: number, cy: number, r: number, de: CorA, ate: CorA }
  /** Sombra suave de um retângulo (desfoque gaussiano de desvio `blur`). */
  | { tipo: 'sombra', x: number, y: number, w: number, h: number, blur: number, cor: CorA }
  /** Degradê vertical de `de` (topo) até `ate` (base). */
  | { tipo: 'degrade', x: number, y: number, w: number, h: number, de: CorA, ate: CorA }

/**
 * Letra arranhada (o `Scratch` da skill tipografia-igor): a caixa do bloco de texto (x, y, w, h) define a área do
 * filtro (−10% / −20% em volta) e a origem do ruído. Feito à mão no Desenhista (feTurbulence + deslocamento + furos).
 */
export interface Risco {
  x: number
  y: number
  w: number
  h: number
  semente: number
}

export interface Travas {
  /** % da área da peça pintada com a cor de acento. */
  acentoAreaPct?: number
  /** Luminância média (0–255) atrás do texto, calculada pelo metadado da foto. */
  luminanciaAtras?: number
  /** Cor de letra escolhida sobre a foto. */
  letra?: 'clara' | 'escura'
  /** Tamanho do título (Foto e legenda). */
  tituloPx?: number
  /** Tamanho do corpo (Manchete). */
  corpoPx?: number
  /** Tamanho do número (Número). */
  numeroPx?: number
  /** Área do objeto, em % da peça (Vazio). */
  objetoAreaPct?: number
  /** Onde a citação ficou (Depoimento). */
  citacaoEm?: 'cima' | 'baixo'
  /** Contraste (WCAG) entre a letra e o que está atrás dela; com foto, no pior trecho relevante. */
  contraste?: number
  avisos: string[]
}

export interface Cena {
  largura: number
  altura: number
  fundo: Cor
  itens: Item[]
  travas: Travas
}
