import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { carregaFontes, desenha, NOMES_FONTES, type Cena, type Ctx2D, type Fontes, type NomeFonte, type NomeTema, type TipoEstilo } from '../src'

export const RAIZ = join(import.meta.dirname, '..')
export const ORACULO = join(RAIZ, '..', 'oraculo')

let _fontes: Fontes | undefined
export function fontes(): Fontes {
  if (!_fontes) {
    const arq = {} as Record<NomeFonte, ArrayBuffer>
    for (const n of NOMES_FONTES) {
      const b = readFileSync(join(RAIZ, 'fontes', `${n}.ttf`))
      arq[n] = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
    }
    _fontes = carregaFontes(arq)
  }
  return _fontes
}

export function renderiza(cena: Cena) {
  const cv = createCanvas(cena.largura, cena.altura)
  desenha(cv.getContext('2d') as unknown as Ctx2D, cena, fontes())
  return cv
}

export interface Caso {
  id: string
  texto: string
  tipo?: string
  formato?: 'post' | 'story'
  marca?: { nome?: string, perfil?: string, cor?: string }
  modo?: 'claro' | 'escuro'
  tema?: NomeTema
  destaque?: boolean
}

export function casos(conjunto: string): Caso[] {
  return JSON.parse(readFileSync(join(ORACULO, 'casos', `${conjunto}.json`), 'utf8'))
}

export function referencia(conjunto: string, id: string) {
  const dir = join(ORACULO, 'saida', conjunto)
  if (!existsSync(join(dir, `${id}.png`))) return null
  return { png: readFileSync(join(dir, `${id}.png`)), json: JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')) }
}

export const temSaida = (conjunto: string) => existsSync(join(ORACULO, 'saida', conjunto)) && readdirSync(join(ORACULO, 'saida', conjunto)).length > 0

/** Caso do oráculo → Entrada do Motor (o `tipo` do caso força o Estilo). */
export const entrada = (c: Caso) => ({ ...c, estilo: c.tipo as TipoEstilo | undefined })
