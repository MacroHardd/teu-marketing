import opentype from 'opentype.js'

/** Fontes do publi (OFL). O Motor mede e o Desenhista desenha com os mesmos arquivos. */
export const NOMES_FONTES = ['cut', 'grot', 'grot-med', 'grot-semi', 'grot-bold', 'grot-xbold', 'thin', 'thin-reg', 'hand'] as const
export type NomeFonte = (typeof NOMES_FONTES)[number]

interface Glifo {
  avanco: number
  caixa: [number, number] | null // yMin, yMax em unidades da fonte
  tinta: number // área pintada do glifo, em unidades²
}

/** Área do contorno (shoelace com as curvas achatadas). Contornos internos têm o sentido oposto e descontam. */
function areaPath(cmds: opentype.PathCommand[]): number {
  let soma = 0
  let x0 = 0, y0 = 0, x = 0, y = 0
  const seg = (nx: number, ny: number) => {
    soma += x * ny - nx * y
    x = nx
    y = ny
  }
  for (const c of cmds) {
    if (c.type === 'M') {
      x = x0 = c.x
      y = y0 = c.y
    } else if (c.type === 'L') {
      seg(c.x, c.y)
    } else if (c.type === 'Q') {
      const [ax, ay] = [x, y]
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, u = 1 - t
        seg(u * u * ax + 2 * u * t * c.x1 + t * t * c.x, u * u * ay + 2 * u * t * c.y1 + t * t * c.y)
      }
    } else if (c.type === 'C') {
      const [ax, ay] = [x, y]
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, u = 1 - t
        seg(u ** 3 * ax + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x,
          u ** 3 * ay + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y)
      }
    } else if (c.type === 'Z') {
      seg(x0, y0)
    }
  }
  return Math.abs(soma / 2)
}

export class Fonte {
  readonly upm: number
  private glifos = new Map<string, Glifo>()

  constructor(readonly nome: NomeFonte, readonly ot: opentype.Font) {
    this.upm = ot.unitsPerEm
  }

  glifo(c: string): Glifo {
    let g = this.glifos.get(c)
    if (!g) {
      const og = this.ot.glyphs.get(this.ot.charToGlyphIndex(c))
      const vazio = !og.numberOfContours && !(og as unknown as { isComposite?: boolean }).isComposite
      g = {
        avanco: og.advanceWidth ?? 0,
        caixa: vazio || og.yMin === undefined ? null : [og.yMin!, og.yMax!],
        tinta: areaPath(og.getPath(0, 0, this.upm).commands),
      }
      this.glifos.set(c, g)
    }
    return g
  }

  /** Largura linear (sem hinting) em px, no tamanho inteiro `tam`. */
  largura(s: string, tam: number): number {
    let soma = 0
    for (const c of s) soma += this.glifo(c).avanco
    return soma * tam / this.upm
  }

  /** Área pintada em px² no tamanho `tam`. É assim que o Motor mede cor sem ler pixel. */
  tinta(s: string, tam: number): number {
    let soma = 0
    for (const c of s) soma += this.glifo(c).tinta
    return soma * (tam / this.upm) ** 2
  }

  /** Caixa vertical em relação à linha de base (âncora "ls" do Pillow): [topo, base], topo negativo. */
  caixa(s: string, tam: number): [number, number] {
    let min = Infinity
    let max = -Infinity
    for (const c of s) {
      const cx = this.glifo(c).caixa
      if (!cx) continue
      min = Math.min(min, cx[0])
      max = Math.max(max, cx[1])
    }
    if (min === Infinity) return [0, 0]
    const esc = tam / this.upm
    return [-max * esc, -min * esc]
  }
}

export type Fontes = Record<NomeFonte, Fonte>

/** Recebe os .ttf (browser: fetch; Node: readFile) e devolve as fontes prontas. */
export function carregaFontes(arquivos: Record<NomeFonte, ArrayBuffer>): Fontes {
  const out = {} as Fontes
  for (const nome of NOMES_FONTES) out[nome] = new Fonte(nome, opentype.parse(arquivos[nome]))
  return out
}
