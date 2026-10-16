// Escolha de Estilo e separação do texto do Cliente em campos. Porta de _escolhe/_campos do publi.
// Regra inviolável: só separa, nunca troca, tira ou acrescenta palavra (ver `confere`).
import { len, limpa, isDigit, split, strip } from './py'

export type TipoEstilo =
  | 'acento' | 'manchete' | 'numero' | 'fina' | 'selo' | 'duotom' | 'vazio'
  | 'ogilvy' | 'heroi' | 'citacao' | 'zona' | 'sincope' | 'riscada'

export interface Campos {
  texto?: string
  titulo?: string
  subtitulo?: string
  numero?: string
  objeto?: string
}

// \b do Python é Unicode; o do JS só conhece ASCII.
const W = '[\\p{L}\\p{N}_]'
const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`
const re = (src: string, flags = '') => new RegExp(src.replaceAll('\\b', B), 'u' + flags)

const STOP = new Set(split(`a o as os um uma uns umas de do da dos das no na nos nas em por pra para pro com sem e ou que se
não nao é e foi ser ter tem mais menos muito muita seu sua seus suas meu minha nosso nossa você voce vocês voces
eu ele ela eles elas isso isto esse essa este esta aquele aquela ao aos à às já ja só so também tambem quando
como onde porque mas nem até ate lhe te me nós nos vai vou está esta estão estao`))
const MESES = 'jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez'
const DATA_SRC = '\\b\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?\\b|\\b\\d{1,2}h\\d{0,2}\\b|\\b\\d{1,2}:\\d{2}\\b|'
  + '\\b(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?\\b|'
  + `\\b\\d{1,2}\\s+de\\s+(?:${MESES})[a-zç]*\\b`
const DATA = re(DATA_SRC, 'i')
const DATA_FORTE = re(`\\b\\d{1,2}/\\d{1,2}\\b|\\b\\d{1,2}h\\d{0,2}\\b|\\b\\d{1,2}:\\d{2}\\b|\\b\\d{1,2}\\s+de\\s+(?:${MESES})`, 'i')
const NUM = re('(?:R\\$\\s?)?\\d[\\d.,]*\\s?(?:%|mil\\b|mi\\b|k\\b|anos\\b|meses\\b|dias\\b|horas\\b|kg\\b|km\\b|x\\b)?', 'gi')
const PRECO = re('R\\$\\s?\\d|\\d+\\s?%\\s?(?:off|de desconto)|\\bleve\\s+\\d+\\b|\\bpor apenas\\b|\\bpromo', 'i')
const ESCURO = re('\\b(?:medo|cansa[çc]o|cansad[ao]|dor|dores|raiva|ansiedade|ansios[ao]|sozinh[ao]|solid[ãa]o|luto|'
  + 'chorei|chorar|perdi|morte|escuro|desisti[ru]?|exaust[ao]|burnout|culpa|vergonha)\\b', 'i')
const ASPAS = re('^\\s*["“].+["”]|\\s[—–-]\\s*\\S+.{0,40}$', 's')
const PREP = re('(?:\\b(?:no|na|nos|nas|dia|em|neste|nesta|próximo|próxima|proximo|proxima|às|as|a partir de)\\s+)+$', 'i')
const PONTAS = ' ,.:;-–—'

export function palavras(s: string): string[] {
  return split(s.replace(/[*~]/g, '')).map(limpa).filter(Boolean).sort()
}

/** Escolhe 1 palavra da própria pessoa para o acento: a mais longa que não é palavra vazia (empate: a última). */
export function destaque(texto: string): string {
  if (texto.includes('*')) return texto
  const ws = split(texto)
  let melhor: number | null = null
  ws.forEach((w, i) => {
    const n = limpa(w)
    if (len(n) < 4 || STOP.has(n) || isDigit(n)) return
    if (melhor === null || len(n) >= len(limpa(ws[melhor]!))) melhor = i
  })
  if (melhor === null) return texto
  const w = ws[melhor]!
  const m = /^([^\p{L}\p{N}_À-ÿ]*)([\p{L}\p{N}_À-ÿ-]+)(.*)$/u.exec(w)
  ws[melhor] = m ? `${m[1]}*${m[2]}*${m[3]}` : `*${w}*`
  return ws.join(' ')
}

/** Primeiro número exato do texto (com unidade curta), ou null. */
export function numero(texto: string): string | null {
  const data = new RegExp(DATA.source, 'iuy')
  for (const m of texto.matchAll(NUM)) {
    const s = m[0].trim().replace(/[.,]+$/, '')
    data.lastIndex = m.index
    if (/\d/.test(s) && !data.test(texto)) return s
  }
  return null
}

export function escolhe(texto: string, foto: boolean): TipoEstilo {
  const n = split(texto).length
  const linhas = texto.split('\n').filter(l => l.trim())
  const aspas = ASPAS.test(texto) && n >= 4
  if (foto && aspas) return 'citacao'
  if (PRECO.test(texto)) return 'heroi'
  if (DATA_FORTE.test(texto) || (DATA.test(texto) && !aspas && n <= 12)) return 'duotom'
  if (foto) {
    if (n <= 3) return 'selo'
    return n <= 10 ? 'fina' : 'ogilvy'
  }
  if (ESCURO.test(texto) && n <= 14) return 'riscada'
  if (numero(texto) && n <= 25) return 'numero'
  if (linhas.length >= 3 && linhas.every(l => split(l).length <= 3)) return 'sincope'
  return n <= 9 ? 'acento' : 'manchete'
}

/** Texto da pessoa → campos do Estilo. Só separa; nunca troca palavra. */
export function campos(tipo: TipoEstilo, texto: string, comDestaque: boolean, foto = false): Campos {
  if (tipo === 'numero') {
    const num = numero(texto) ?? ''
    return { numero: num, texto: num ? strip(texto.replace(num, ''), PONTAS) : texto }
  }
  if (tipo === 'duotom') {
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)
    let tit: string
    let sub: string
    if (linhas.length > 1) {
      tit = linhas[0]!
      sub = linhas.slice(1).join(' · ')
    } else {
      const m = DATA.exec(texto)
      let ini = m ? m.index : texto.length
      // puxa junto preposição/artigo e dia da semana logo antes da data ("no sábado 20/11")
      const k = PREP.exec(texto.slice(0, ini))
      if (k) ini = k.index
      tit = strip(texto.slice(0, ini), PONTAS)
      sub = texto.slice(ini).trim()
      if (!tit) {
        tit = texto
        sub = ''
      }
    }
    if (comDestaque) tit = destaque(tit)
    return { titulo: tit, subtitulo: sub }
  }
  if (tipo === 'heroi' && !foto) {
    const num = numero(texto) ?? ''
    return { objeto: num, texto: num ? strip(texto.replace(num, ''), PONTAS) : texto }
  }
  if (['acento', 'vazio', 'zona', 'ogilvy'].includes(tipo) && comDestaque) texto = destaque(texto)
  return { texto }
}

/**
 * O que o Motor usa: separa e, se a separação mexeu em alguma palavra, devolve o texto inteiro
 * num campo só. Garante a regra inviolável mesmo com bug em `campos` (ex.: `numero` em "20/11").
 */
export function separa(tipo: TipoEstilo, texto: string, comDestaque: boolean, foto = false): Campos {
  const c = campos(tipo, texto, comDestaque, foto)
  if (confere(texto, c)) return c
  return tipo === 'duotom' ? { titulo: texto, subtitulo: '' } : { texto }
}

/** Confere que os campos têm exatamente as palavras do texto original. */
export function confere(texto: string, c: Campos): boolean {
  const usado = (['texto', 'titulo', 'subtitulo', 'numero', 'objeto'] as const)
    .filter(k => k in c).map(k => c[k]).join(' ')
  return palavras(usado).join('\u0000') === palavras(texto).join('\u0000')
}
