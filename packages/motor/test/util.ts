import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createCanvas, type Canvas } from '@napi-rs/canvas'
import { PNG } from 'pngjs'
import { analisaFoto, aplicaFiltro, carregaFontes, chaveFiltro, desenha, NOMES_FONTES, type Cena, type Ctx2D, type Filtro, type Fontes,
  type MetaFoto, type NomeFonte, type NomeTema, type ProvedorFoto, type TipoEstilo } from '../src'

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

export interface FotoTeste {
  meta: MetaFoto
  provedor: ProvedorFoto
}

const _fotos = new Map<string, FotoTeste>()
/** Foto de teste do oráculo: metadado (como no upload) + provedor com cache por filtro (como no app). */
export function foto(arquivo: string): FotoTeste {
  let f = _fotos.get(arquivo)
  if (!f) {
    const img = PNG.sync.read(readFileSync(join(ORACULO, 'fotos', arquivo)))
    const dados = { data: new Uint8ClampedArray(img.data) }
    const meta = analisaFoto(dados.data, img.width, img.height)
    const cache = new Map<string, Canvas>()
    const provedor = (filtro?: Filtro) => {
      const k = chaveFiltro(filtro)
      if (!cache.has(k)) {
        const c = createCanvas(img.width, img.height)
        const d = c.getContext('2d').createImageData(img.width, img.height)
        d.data.set(dados.data)
        if (filtro) aplicaFiltro(d.data, filtro)
        c.getContext('2d').putImageData(d, 0, 0)
        cache.set(k, c)
      }
      return cache.get(k)
    }
    f = { meta, provedor }
    _fotos.set(arquivo, f)
  }
  return f
}

export function renderiza(cena: Cena, provedor?: ProvedorFoto) {
  const cv = createCanvas(cena.largura, cena.altura)
  desenha(cv.getContext('2d') as unknown as Ctx2D, cena, fontes(), { foto: provedor, tela: (w, h) => createCanvas(w, h) })
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
  variacao?: string
  /** Arquivo em packages/oraculo/fotos. */
  foto?: string
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
export const entrada = (c: Caso) => ({ ...c, estilo: c.tipo as TipoEstilo | undefined, foto: c.foto ? foto(c.foto).meta : undefined })

/** Caso dos Estilos da skill tipografia-igor (packages/oraculo/casos/tipografia.json). */
export interface CasoT { id: string, estilo: TipoEstilo, variacao?: string, texto: string, paleta?: string, foto?: string, ink?: string, marca?: { perfil?: string, nome?: string } }
export const casosT = (): CasoT[] => JSON.parse(readFileSync(join(ORACULO, 'casos', 'tipografia.json'), 'utf8'))
export const entradaT = (c: CasoT) => ({
  texto: c.texto, estilo: c.estilo, variacao: c.variacao, marca: c.marca,
  ajustes: c.paleta ? { cor: c.paleta } : undefined,
  foto: c.foto ? foto(c.foto).meta : undefined,
})
