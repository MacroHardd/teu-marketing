import type { Cena } from './cena'
import { tema, type NomeTema } from './cor'
import { escolhe, separa, type Campos, type TipoEstilo } from './campos'
import type { Fontes } from './fontes'
import { acento } from './estilos/acento'
import { fina } from './estilos/fina'
import { ogilvy } from './estilos/ogilvy'
import { ENQUADRAMENTO_PADRAO, type Enquadramento, type MetaFoto } from './foto'
import type { Contexto, Formato, Marca, Saida } from './estilos/comum'

const ESTILOS: Partial<Record<TipoEstilo, (c: Contexto) => Saida>> = { acento, fina, ogilvy }

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
  /** Metadado da foto (analisada no upload). O Motor nunca vê os pixels. */
  foto?: MetaFoto
  enquadramento?: Enquadramento
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
  const enquadramento = e.enquadramento ?? ENQUADRAMENTO_PADRAO
  const s = desenha({ p: { campos: c, formato, marca, modo: e.modo, foto: e.foto, enquadramento }, W, H, t, av, fontes })
  return {
    estilo,
    campos: c,
    cena: { largura: W, altura: H, fundo: s.fundo, itens: s.itens, travas: { ...s.travas, avisos: [...new Set(av)].sort() } },
  }
}
