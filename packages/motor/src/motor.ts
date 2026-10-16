import type { Cena } from './cena'
import { tema, type NomeTema } from './cor'
import { escolhe, separa, type Campos, type TipoEstilo } from './campos'
import type { Fontes } from './fontes'
import { acento } from './estilos/acento'
import type { Contexto, Formato, Marca, Saida } from './estilos/comum'

const ESTILOS: Partial<Record<TipoEstilo, (c: Contexto) => Saida>> = { acento }

export const estilosPortados = () => Object.keys(ESTILOS) as TipoEstilo[]

export interface Entrada {
  /** EXATAMENTE o que o Cliente escreveu. */
  texto: string
  /** Sem Estilo, o Motor sugere um. */
  estilo?: TipoEstilo
  formato?: Formato
  marca?: Marca
  modo?: 'claro' | 'escuro'
  tema?: NomeTema
  destaque?: boolean
  foto?: boolean
}

export interface Resultado {
  estilo: TipoEstilo
  campos: Campos
  cena: Cena
}

/** Função pura: mesma Entrada → mesma Cena. Não lê pixel, não toca DOM. */
export function motor(e: Entrada, fontes: Fontes): Resultado {
  const texto = (e.texto ?? '').replaceAll('\r', '').trim()
  const foto = !!e.foto
  const estilo = e.estilo ?? escolhe(texto, foto)
  const c = separa(estilo, texto, e.destaque ?? true, foto)
  const desenha = ESTILOS[estilo]
  if (!desenha) throw new Error(`Estilo ainda não portado: ${estilo}`)
  const formato = e.formato ?? 'post'
  const W = 1080
  const H = formato === 'story' ? 1920 : 1350
  const marca = e.marca ?? {}
  const av: string[] = []
  const t = tema({ cor: marca.cor, modo: e.modo, tema: e.tema })
  const s = desenha({ p: { campos: c, formato, marca, modo: e.modo }, W, H, t, av, fontes })
  return {
    estilo,
    campos: c,
    cena: { largura: W, altura: H, fundo: s.fundo, itens: s.itens, travas: { ...s.travas, avisos: [...new Set(av)].sort() } },
  }
}
