// Layout de texto como o navegador faz nos estáticos da skill tipografia-igor (Remotion = HTML/CSS):
// quebra gulosa por palavra, linha de base dentro da caixa de `line-height`, kerning ligado.
// Os números de cada regra são os do kit (presets.ts / estaticos.tsx da skill, v0.1.0).
import { mistura, type Cor } from '../cor'
import type { Item } from '../cena'
import type { Fontes, NomeFonte } from '../fontes'
import { fichas, type Ficha } from '../texto'
import type { Contexto } from './comum'

/** Linha de base a partir do topo da caixa de linha (line-height em px), como o Chrome. */
export function baseCss(fontes: Fontes, nome: NomeFonte, tam: number, lh: number): number {
  const m = fontes[nome].metricas(tam)
  return (lh - (m.sobe + m.desce)) / 2 + m.sobe
}

/** Palavras do Cliente com marcação (*destaque*), em maiúsculas se pedido (text-transform). */
export function palavrasCss(texto: string, maiusc: boolean): Ficha[] {
  return fichas(maiusc ? texto.toUpperCase() : texto).filter(([, st]) => st !== '\n')
}

export const largCss = (fontes: Fontes, nome: NomeFonte, tam: number, s: string) => fontes[nome].larguraKern(s, tam)

/** Quebra gulosa: palavra que não cabe vai para a linha de baixo (o espaço do fim da linha não conta). */
export function quebraCss(fontes: Fontes, nome: NomeFonte, tam: number, ws: Ficha[], largura: number): Ficha[][] {
  const esp = largCss(fontes, nome, tam, ' ')
  const linhas: Ficha[][] = []
  let atual: Ficha[] = []
  let w = 0
  for (const f of ws) {
    const lw = largCss(fontes, nome, tam, f[0])
    if (atual.length && w + esp + lw > largura + 0.01) {
      linhas.push(atual)
      atual = []
      w = 0
    }
    w += (atual.length ? esp : 0) + lw
    atual.push(f)
  }
  if (atual.length) linhas.push(atual)
  return linhas
}

export const largLinhaCss = (fontes: Fontes, nome: NomeFonte, tam: number, l: Ficha[]) =>
  l.reduce((a, [w], i) => a + largCss(fontes, nome, tam, w) + (i ? largCss(fontes, nome, tam, ' ') : 0), 0)

/** Desenha uma linha a partir de x (palavras com cor própria quando destacadas). */
export function linhaCss(fontes: Fontes, nome: NomeFonte, tam: number, l: Ficha[], x: number, yb: number,
  cor: Cor, corA?: Cor, clip?: [number, number][]): Item[] {
  const esp = largCss(fontes, nome, tam, ' ')
  const itens: Item[] = []
  for (const [w, st] of l) {
    itens.push({ tipo: 'texto', fonte: nome, tam, x, y: yb, texto: w, cor: st === 'a' && corA ? corA : cor, kern: true, ...(clip ? { clip } : {}) })
    x += largCss(fontes, nome, tam, w) + esp
  }
  return itens
}

/**
 * Crédito da skill (o @ ou o nome): Inter 500, 26 px, maiúsculas, espaçamento 0,08 em, 70% de opacidade,
 * a 80 px da esquerda e 70 px da base.
 */
export function creditoCss({ p, H, fontes }: Contexto, tinta: Cor, fundo: Cor): Item[] {
  const s = (p.marca.perfil || p.marca.nome || '').toUpperCase()
  if (!s || !p.el.assinatura) return []
  const tam = 26
  const m = fontes['grot-med'].metricas(tam)
  const yb = H - 70 - m.entre / 2 - m.desce
  const tr = 0.08 * tam
  const cor = mistura(fundo, tinta, 0.7)
  const itens: Item[] = []
  let x = 80
  for (const ch of s) {
    itens.push({ tipo: 'texto', fonte: 'grot-med', tam, x, y: yb, texto: ch, cor })
    x += fontes['grot-med'].largura(ch, tam) + tr
  }
  return itens
}

/** Maior tamanho (passo de 2 px, de `max` até `min`) em que as linhas cabem na altura; null se nem no mínimo. */
export function encaixa(max: number, min: number, cabe: (tam: number) => boolean): number | null {
  for (let t = max; t >= min; t -= 2) if (cabe(t)) return t
  return null
}
