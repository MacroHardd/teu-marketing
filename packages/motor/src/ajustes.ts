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
  /** Cor da paleta: uma paleta aprovada do Estilo (ou tema curado, nos Estilos do publi) ou a cor do Perfil de Marca. */
  cor?: NomeTema | 'marca' | (string & {})
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
  acento: { tamanho: ['P', 'M', 'G'], zona: true, cor: true, modo: false },
  manchete: { tamanho: ['P', 'M', 'G'], zona: true, cor: true, modo: true },
  zona: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
  sincope: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
  fina: { tamanho: ['P', 'M'], zona: true, cor: false, modo: false },
  ogilvy: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: true },
  numero: { tamanho: ['P', 'M', 'G'], zona: true, cor: true, modo: true },
  heroi: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
  selo: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
  duotom: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
  vazio: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: true },
  citacao: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
  riscada: { tamanho: ['P', 'M', 'G'], zona: false, cor: true, modo: false },
}

/** Zona em que cada Estilo põe o texto quando o Cliente não escolhe. Acento: a posição do estático da skill. */
export const ZONA_PADRAO: Partial<Record<TipoEstilo, Zona>> = { manchete: 'centro', fina: 'topo', numero: 'centro' }

/** Paletas que o Ajuste de cor oferece em cada Estilo (além da cor da marca). Os do publi usam os temas curados. */
export const PALETAS_ESTILO: Partial<Record<TipoEstilo, string[]>> = {
  acento: ['villela', 'noite', 'verde'],
  zona: ['gil', 'neon'],
  sincope: ['villela', 'azul'],
  riscada: ['se7en'],
}

export interface Variacao {
  id: string
  nome: string
  /** Só aparece com foto. */
  foto?: boolean
}

/** Variações de layout de cada Estilo (as aprovadas na skill tipografia-igor). A primeira é a padrão. */
export const VARIACOES: Partial<Record<TipoEstilo, Variacao[]>> = {
  zona: [{ id: 'desenho', nome: 'Raios' }, { id: 'foto', nome: 'Com a foto', foto: true }],
  sincope: [{ id: 'bloco', nome: 'Com bloco' }, { id: 'sem-bloco', nome: 'Sem bloco' }],
  fina: [{ id: 'pb', nome: 'Preto e branco' }, { id: 'duotom', nome: 'Duotom' }],
  duotom: [{ id: 'faixa', nome: 'Faixa', foto: true }, { id: 'janela', nome: 'Janela', foto: true }],
  riscada: [{ id: 'mono', nome: 'Sem cor' }, { id: 'acento', nome: 'Com acento' }],
}

/** Variação que vale quando o Cliente não escolheu (Zona calma usa a foto, se houver; Riscada, a cor da marca). */
export function variacaoPadrao(estilo: TipoEstilo, temFoto: boolean, temCorMarca = false): string | undefined {
  if (estilo === 'zona') return temFoto ? 'foto' : 'desenho'
  if (estilo === 'riscada') return temCorMarca ? 'acento' : 'mono'
  return VARIACOES[estilo]?.[0]?.id
}

/** Fator de escala da letra. M = publi. */
export const ESCALA: Record<Tamanho, number> = { P: 0.8, M: 1, G: 1.18 }
