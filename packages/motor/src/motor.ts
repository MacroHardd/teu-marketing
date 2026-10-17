import type { Cena } from './cena'
import { tema, type NomeTema } from './cor'
import { escolhe, separa, type Campos, type TipoEstilo } from './campos'
import type { Fontes } from './fontes'
import { acento } from './estilos/acento'
import { fina } from './estilos/fina'
import { manchete } from './estilos/manchete'
import { ogilvy } from './estilos/ogilvy'
import { ENQUADRAMENTO_PADRAO, type Enquadramento, type MetaFoto } from './foto'
import type { Contexto, Formato, Marca, Saida } from './estilos/comum'
import { ELEMENTOS, ESCALA, type Ajustes, type Elemento } from './ajustes'

const ESTILOS: Partial<Record<TipoEstilo, (c: Contexto) => Saida>> = { acento, manchete, fina, ogilvy }

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
  ajustes?: Ajustes
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
  const aj = e.ajustes ?? {}
  const av: string[] = []
  const modo = aj.modo ?? e.modo
  // cor da paleta: tema curado escolhido > cor da marca > tema da Entrada
  const cor = aj.cor && aj.cor !== 'marca' ? undefined : marca.cor
  const t = tema({ cor, modo, tema: aj.cor && aj.cor !== 'marca' ? aj.cor : e.tema })
  const enquadramento = e.enquadramento ?? ENQUADRAMENTO_PADRAO
  const cta = (aj.cta ?? '').trim()
  const tem: Record<Elemento, boolean> = {
    assinatura: !!(marca.perfil || marca.nome), logo: !!marca.logo, selo: false, cta: !!cta,
  }
  // um Elemento só liga se o dado existe
  const el = Object.fromEntries(ELEMENTOS.map(k => [k, (aj.elementos?.[k] ?? tem[k]) && (k === 'selo' ? !!(marca.nome || marca.perfil) : tem[k])])) as Record<Elemento, boolean>
  const p = {
    campos: c, formato, marca, modo, foto: e.foto, enquadramento,
    k: ESCALA[aj.tamanho ?? 'M'], zona: aj.zona, el, cta, reforco: !!aj.reforco,
  }
  const s = desenha({ p, W, H, t, av, fontes })
  return {
    estilo,
    campos: c,
    cena: { largura: W, altura: H, fundo: s.fundo, itens: s.itens, travas: { ...s.travas, avisos: [...new Set(av)].sort() } },
  }
}
