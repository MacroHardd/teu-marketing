// Ajustes: a lista fechada de controles do Cliente (docs/mvp.md). Nada de fonte livre, color picker ou mover elemento.
// Sem Ajuste, o Motor desenha exatamente como o publi (é isso que a regressão confere).
import type { NomeTema } from './cor'
import type { TipoEstilo } from './campos'

export type Tamanho = 'P' | 'M' | 'G'
export type Zona = 'topo' | 'centro' | 'base'

/** Elementos opcionais: itens de marca que ligam/desligam, sempre no mesmo lugar. */
export const ELEMENTOS = ['assinatura', 'logo', 'selo', 'cta'] as const
export type Elemento = (typeof ELEMENTOS)[number]

export interface Ajustes {
  tamanho?: Tamanho
  zona?: Zona
  /** Cor da paleta: um tema curado ou a cor do Perfil de Marca. */
  cor?: NomeTema | 'marca'
  modo?: 'claro' | 'escuro'
  /** Liga/desliga. Sem valor: liga quando o dado existe no Perfil de Marca (o CTA, quando foi escrito). */
  elementos?: Partial<Record<Elemento, boolean>>
  /** CTA escrito pelo Cliente. A Plataforma nunca preenche. */
  cta?: string
  /** Correção da Trava de contraste: fundo mais escuro atrás do texto, nos Estilos com foto. */
  reforco?: boolean
}

/** Quais Ajustes cada Estilo oferece (os outros nem aparecem na tela). */
export interface Suporte {
  tamanho: Tamanho[]
  zona: boolean
  cor: boolean
  modo: boolean
}

export const SUPORTE: Partial<Record<TipoEstilo, Suporte>> = {
  acento: { tamanho: ['P', 'M', 'G'], zona: true, cor: true, modo: true },
  manchete: { tamanho: ['P', 'M', 'G'], zona: true, cor: true, modo: true },
  fina: { tamanho: ['P', 'M'], zona: true, cor: false, modo: false },
  ogilvy: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: true },
}

/** Zona em que cada Estilo põe o texto quando o Cliente não escolhe (a do publi). */
export const ZONA_PADRAO: Partial<Record<TipoEstilo, Zona>> = { acento: 'centro', manchete: 'centro', fina: 'topo' }

/** Fator de escala da letra. M = publi. */
export const ESCALA: Record<Tamanho, number> = { P: 0.8, M: 1, G: 1.18 }
