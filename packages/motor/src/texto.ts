import type { Cor } from './cor'
import type { Item } from './cena'
import type { Fonte, Fontes, NomeFonte } from './fontes'
import { round, rstrip, split } from './py'

/** O publi desenha em 2x e reduz no fim. Medidas e decisões ficam em 2x para bater 1:1 com ele. */
export const S = 2
export const px = (v: number) => round(v * S)

/** Fonte num tamanho inteiro em px 2x (o `fonte(nome, px(tam))` do publi). */
export interface F {
  fonte: Fonte
  tam: number
}

export function fonte(fontes: Fontes, nome: NomeFonte, tam: number): F {
  return { fonte: fontes[nome], tam: Math.max(1, Math.trunc(tam)) }
}

export const largura = (f: F, s: string) => f.fonte.largura(s, f.tam)

// ------------------------------------------------------------------ texto com marcação
// *palavra* = destaque (acento) · ~~palavra~~ = riscado · \n = quebra forçada
const EMOJI = /[\u{1F000}-\u{1FAFF}☀-➿️‍⬀-⯿]/gu

export function limpaTexto(s: string, avisos: string[]): string {
  const s2 = (s ?? '').replace(EMOJI, '')
  if (s2 !== (s ?? '')) avisos.push('emoji removido (a fonte não desenha emoji; o visual fica mais limpo sem)')
  return s2.replace(/[ \t]+/g, ' ').trim()
}

/** '' normal · 'a' acento · 'r' riscado · '\n' quebra forçada */
export type Estilo = '' | 'a' | 'r' | '\n'
export type Ficha = [string, Estilo]

const ESPACO = /^\s/u

export function fichas(txt: string): Ficha[] {
  const out: Ficha[] = []
  txt.split('\n').forEach((par, i) => {
    if (i) out.push(['\n', '\n'])
    let cola = false
    for (let seg of par.split(/(\*[^*]+\*|~~[^~]+~~)/)) {
      if (!seg) continue
      // pontuação logo depois de um destaque ("*acabar*.") gruda na palavra, sem espaço
      if (cola && !ESPACO.test(seg[0]!) && out.length && out[out.length - 1]![1] !== '\n') {
        const m = /^(\S+)([\s\S]*)$/u.exec(seg)!
        const ult = out[out.length - 1]!
        out[out.length - 1] = [ult[0] + m[1], ult[1]]
        seg = m[2]!
      }
      cola = seg ? !/^\s+$/u.test(seg.slice(-1)) : true
      if (!seg.trim()) continue
      let st: Estilo = ''
      if (seg.startsWith('~~') && seg.endsWith('~~') && seg.length > 4) {
        seg = seg.slice(2, -2)
        st = 'r'
      } else if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2) {
        seg = seg.slice(1, -1)
        st = 'a'
      }
      for (const w of split(seg)) out.push([w, st])
    }
  })
  return out
}

export function quebraFichas(fs: Ficha[], f: F, wmax: number): Ficha[][] {
  const linhas: Ficha[][] = []
  let atual: Ficha[] = []
  let larg = 0
  const esp = largura(f, ' ')
  for (const [w, st] of fs) {
    if (st === '\n') {
      linhas.push(atual)
      atual = []
      larg = 0
      continue
    }
    const lw = largura(f, w)
    if (atual.length && larg + esp + lw > wmax) {
      linhas.push(atual)
      atual = []
      larg = 0
    }
    larg += (atual.length ? esp : 0) + lw
    atual.push([w, st])
  }
  linhas.push(atual)
  while (linhas.length && !linhas[linhas.length - 1]!.length) linhas.pop()
  return linhas
}

const juntaLinha = (l: Ficha[]) => l.map(([w]) => w).join(' ')
export const largLinha = (l: Ficha[], f: F) => (l.length ? largura(f, juntaLinha(l)) : 0)

export interface OpcoesBloco {
  lh?: number
  maxLinhas?: number
  avisos?: string[]
  maiusc?: boolean
  equilibrar?: boolean
}

export interface OpcoesDesenho {
  corA?: Cor
  alinhar?: 'esq' | 'centro' | 'dir'
  wbox?: number
  marca?: Cor
  risco?: Cor
  track?: number
}

/** Texto já quebrado num tamanho que cabe na caixa (medido em unidades base, não 2x). */
export class Bloco {
  readonly nome: NomeFonte
  readonly lh: number
  readonly tam: number
  readonly linhas: Ficha[][]
  readonly f: F
  readonly cortado: boolean
  readonly sobe: number
  readonly bases: number[]
  readonly alto: number
  readonly largura: number

  constructor(fontes: Fontes, txt: string, nome: NomeFonte, wmax: number, hmax: number, smax: number, smin: number,
    { lh = 1.25, maxLinhas, avisos, maiusc = false, equilibrar = true }: OpcoesBloco = {}) {
    this.nome = nome
    this.lh = lh
    txt = maiusc ? txt.toUpperCase() : txt
    const fs = fichas(txt)
    let cortado = false
    let tam = smax
    let f: F
    let linhas: Ficha[][]
    let cabe: boolean
    for (;;) {
      f = fonte(fontes, nome, px(tam))
      linhas = quebraFichas(fs, f, px(wmax))
      const alto = linhas.length * tam * lh
      cabe = alto <= hmax && linhas.every(l => largLinha(l, f) <= px(wmax))
      if (maxLinhas) cabe = cabe && linhas.length <= maxLinhas
      if (cabe || tam <= smin) break
      tam -= 1
    }
    if (!cabe) { // nem no mínimo: corta e avisa (a pessoa deve dividir o texto)
      let n = Math.max(1, Math.floor(hmax / (tam * lh)))
      if (maxLinhas) n = Math.min(n, maxLinhas)
      if (linhas.length > n) {
        linhas = linhas.slice(0, n)
        const ult = linhas[n - 1]!
        if (ult.length) {
          const [w, st] = ult[ult.length - 1]!
          ult[ult.length - 1] = [rstrip(w, '.,;:') + '…', st]
        }
        cortado = true
        avisos?.push('texto longo demais para este formato: foi cortado — dividir em 2 posts ou encurtar')
      }
    }
    f = fonte(fontes, nome, px(tam))
    // quebra equilibrada: menor largura que mantém o nº de linhas (sem palavra sobrando sozinha)
    if (equilibrar && linhas.length > 1 && !cortado && !fs.some(([, st]) => st === '\n')) {
      const n = linhas.length
      let lo = px(wmax) * 0.5
      let hi = px(wmax)
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2
        if (quebraFichas(fs, f, mid).length === n) hi = mid
        else lo = mid
      }
      linhas = quebraFichas(fs, f, hi + 1)
    }
    this.tam = tam
    this.linhas = linhas
    this.f = f
    this.cortado = cortado
    this.sobe = -f.fonte.caixa('ÁÉHg', f.tam)[0] / S
    // linhas de base medidas: abre só onde acento de baixo tocaria descida/cedilha de cima
    this.bases = [0]
    for (let i = 1; i < linhas.length; i++) {
      const desce = f.fonte.caixa(juntaLinha(linhas[i - 1]!) || 'x', f.tam)[1]
      const sobe = f.fonte.caixa(juntaLinha(linhas[i]!) || 'x', f.tam)[0]
      this.bases.push(this.bases[i - 1]! + Math.max(tam * lh, (desce - sobe) / S + tam * 0.05))
    }
    this.alto = this.bases[this.bases.length - 1]! + this.sobe + tam * 0.24
    this.largura = Math.max(0, ...linhas.map(l => largLinha(l, f))) / S
  }

  /** marca = cor de marca-texto atrás das palavras *destacadas* (em vez de pintar a letra). */
  desenha(x: number, y: number, cor: Cor, { corA, alinhar = 'esq', wbox = 0, marca, risco, track = 0 }: OpcoesDesenho = {}): Item[] {
    const itens: Item[] = []
    const f = this.f
    const esp = largura(f, ' ')
    this.linhas.forEach((l, i) => {
      const yb = px(y + this.sobe + this.bases[i]!)
      const lw = largLinha(l, f) + track * px(this.tam) * Math.max(0, l.reduce((s, [w]) => s + [...w].length, 0))
      let xx = alinhar === 'centro' ? px(x) + (px(wbox) - lw) / 2 : alinhar === 'dir' ? px(x) + px(wbox) - lw : px(x)
      for (const [w, st] of l) {
        let ww = largura(f, w)
        if (st === 'a' && marca) {
          const y0 = yb - px(this.tam * 0.62)
          itens.push(ret(xx - px(6), y0, xx + ww + px(6), yb + px(this.tam * 0.14), marca))
        }
        const c = st === 'a' && corA && !marca ? corA : cor
        if (track) {
          let cx = xx
          for (const ch of w) {
            itens.push(texto(this.nome, f.tam, cx, yb, ch, c))
            cx += largura(f, ch) + track * px(this.tam)
          }
          ww = cx - xx
        } else {
          itens.push(texto(this.nome, f.tam, xx, yb, w, c))
        }
        if (st === 'r') {
          const yy = yb - px(this.tam * 0.3)
          const larg = px(Math.max(3, this.tam * 0.07))
          itens.push(ret(xx - px(4), yy - larg / 2, xx + ww + px(4), yy + larg / 2, risco ?? c))
        }
        xx += ww + esp
      }
    })
    return itens
  }
}

/** Linha única: encolhe até `smin` e, se ainda não couber, corta com reticências (`uma_linha` do publi). */
export function umaLinha(fontes: Fontes, s: string, nome: NomeFonte, tam: number, wmax: number, smin?: number): [string, F, number] {
  while (smin && tam > smin && largura(fonte(fontes, nome, px(tam)), s) > px(wmax)) tam -= 1
  const f = fonte(fontes, nome, px(tam))
  if (largura(f, s) > px(wmax)) {
    while (s && largura(f, s + '…') > px(wmax)) s = s.slice(0, -1)
    s = s.trimEnd() + '…'
  }
  return [s, f, tam]
}

// ------------------------------------------------------------------ itens da Cena (entrada em 2x, saída em 1x)
export function texto(fonte: NomeFonte, tam2x: number, x2x: number, yb2x: number, s: string, cor: Cor): Item {
  return { tipo: 'texto', fonte, tam: tam2x / S, x: x2x / S, y: yb2x / S, texto: s, cor }
}

export function ret(x0: number, y0: number, x1: number, y1: number, cor: Cor): Item {
  return { tipo: 'ret', x: x0 / S, y: y0 / S, w: (x1 - x0) / S, h: (y1 - y0) / S, cor }
}

/** 1ª frase (até . ! ? : ou quebra de linha) e o resto, sem trocar palavra (`separa_frase` do publi). */
export function separaFrase(texto: string): [string, string] {
  const t = texto.trim()
  if (t.includes('\n')) {
    const i = t.indexOf('\n')
    return [t.slice(0, i).trim(), split(t.slice(i + 1)).join(' ')]
  }
  const m = /^([\s\S]+?[.!?:])\s+(\S[\s\S]*)$/u.exec(t)
  if (m) return [m[1]!.trim(), m[2]!.trim()]
  return [t, '']
}
