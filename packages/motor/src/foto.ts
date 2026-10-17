// Foto: analisada UMA vez no upload (pixels → MetaFoto). Depois disso o Motor só usa o metadado.
// O Desenhista é quem toca nos pixels (recorte e filtro), nunca o Motor (ADR 0001).

/** Metadado da foto, guardado com o Post. `lum` = luminância média (0–255, "L" do Pillow) por célula da grade. */
export interface MetaFoto {
  largura: number
  altura: number
  cols: number
  lins: number
  lum: number[]
}

/** Ajuste de enquadramento: centro do recorte (0–1, 0,5 = meio) e zoom (1 = cobre exato). */
export interface Enquadramento {
  x: number
  y: number
  zoom: number
}

export const ENQUADRAMENTO_PADRAO: Enquadramento = { x: 0.5, y: 0.5, zoom: 1 }

/** Pedaço da foto (em px da foto) que vai para a caixa de destino. */
export interface Recorte {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** Preto e branco com contraste em volta da média (o filtro do publi). `media` = média de luminância do recorte. */
export interface FiltroCinza {
  tipo: 'cinza'
  media: number
  contraste: number
  brilho: number
}

/**
 * Funções de `filter` do CSS, na ordem (como o navegador aplica nos estáticos da skill tipografia-igor),
 * mais `multiplica` (camada de cor com mix-blend-mode: multiply, o duotom).
 */
export type OpCss = readonly ['cinza' | 'saturar' | 'contraste' | 'brilho', number] | readonly ['multiplica', readonly [number, number, number]]
export interface FiltroCss {
  tipo: 'css'
  ops: OpCss[]
}

export type Filtro = FiltroCinza | FiltroCss

/** Luminância "L" do Pillow (ITU-R 601, inteiro). */
export const lumL = (r: number, g: number, b: number) => (r * 19595 + g * 38470 + b * 7471 + 0x8000) >> 16

/** Pixels RGBA → grade de luminância. Roda no browser, no upload. */
export function analisaFoto(rgba: ArrayLike<number>, largura: number, altura: number, n = 32): MetaFoto {
  const cols = Math.min(n, largura)
  const lins = Math.min(n, altura)
  const soma = new Float64Array(cols * lins)
  const cont = new Float64Array(cols * lins)
  for (let y = 0; y < altura; y++) {
    const ly = Math.min(lins - 1, Math.floor(y * lins / altura))
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4
      const c = ly * cols + Math.min(cols - 1, Math.floor(x * cols / largura))
      soma[c]! += lumL(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!)
      cont[c]! += 1
    }
  }
  const lum = Array.from(soma, (s, i) => Math.round(s / cont[i]!))
  return { largura, altura, cols, lins, lum }
}

/** ImageOps.fit do Pillow (cover, centralizado em `enq`), com zoom. `dw/dh` só importam pela proporção. */
export function recorteCover(foto: { largura: number, altura: number }, dw: number, dh: number, enq: Enquadramento = ENQUADRAMENTO_PADRAO): Recorte {
  const fw = foto.largura
  const fh = foto.altura
  const rf = fw / fh
  const ro = dw / dh
  let sw = fw
  let sh = fh
  if (rf > ro) sw = ro * fh
  else if (rf < ro) sh = fw / ro
  const z = Math.max(1, enq.zoom)
  sw /= z
  sh /= z
  const cx = Math.min(1, Math.max(0, enq.x))
  const cy = Math.min(1, Math.max(0, enq.y))
  return { sx: (fw - sw) * cx, sy: (fh - sh) * cy, sw, sh }
}

/** Luminância da foto (sem filtro) num ponto em px da foto: bilinear entre os centros das células. */
export function lumEm(m: MetaFoto, sx: number, sy: number): number {
  const gx = Math.min(m.cols - 1, Math.max(0, sx / m.largura * m.cols - 0.5))
  const gy = Math.min(m.lins - 1, Math.max(0, sy / m.altura * m.lins - 0.5))
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const x1 = Math.min(m.cols - 1, x0 + 1)
  const y1 = Math.min(m.lins - 1, y0 + 1)
  const fx = gx - x0
  const fy = gy - y0
  const v = (x: number, y: number) => m.lum[y * m.cols + x]!
  return (v(x0, y0) * (1 - fx) + v(x1, y0) * fx) * (1 - fy) + (v(x0, y1) * (1 - fx) + v(x1, y1) * fx) * fy
}

/** Média de luminância do recorte inteiro (amostrada na grade). */
export function mediaRecorte(m: MetaFoto, r: Recorte, passos = 48): number {
  let soma = 0
  for (let j = 0; j < passos; j++) {
    for (let i = 0; i < passos; i++) soma += lumEm(m, r.sx + (i + 0.5) / passos * r.sw, r.sy + (j + 0.5) / passos * r.sh)
  }
  return soma / (passos * passos)
}

const lim = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

/** Um pixel (0–255) pelas funções de filtro do CSS (matrizes da especificação Filter Effects). */
function pixelCss(r: number, g: number, b: number, ops: OpCss[]): [number, number, number] {
  for (const op of ops) {
    if (op[0] === 'multiplica') {
      const t = op[1]
      r = r * t[0] / 255
      g = g * t[1] / 255
      b = b * t[2] / 255
    } else if (op[0] === 'cinza' || op[0] === 'saturar') {
      const s = op[0] === 'cinza' ? 1 - op[1] : op[1]
      const nr = (0.2126 + 0.7874 * s) * r + (0.7152 - 0.7152 * s) * g + (0.0722 - 0.0722 * s) * b
      const ng = (0.2126 - 0.2126 * s) * r + (0.7152 + 0.2848 * s) * g + (0.0722 - 0.0722 * s) * b
      const nb = (0.2126 - 0.2126 * s) * r + (0.7152 - 0.7152 * s) * g + (0.0722 + 0.9278 * s) * b
      r = lim(nr)
      g = lim(ng)
      b = lim(nb)
    } else if (op[0] === 'contraste') {
      r = lim((r - 127.5) * op[1] + 127.5)
      g = lim((g - 127.5) * op[1] + 127.5)
      b = lim((b - 127.5) * op[1] + 127.5)
    } else {
      r = lim(r * op[1])
      g = lim(g * op[1])
      b = lim(b * op[1])
    }
  }
  return [r, g, b]
}

/** Um valor de luminância passando pelo filtro (mesma conta do `aplicaFiltro`). */
export function filtraLum(v: number, f: Filtro): number {
  if (f.tipo === 'css') {
    const [r, g, b] = pixelCss(v, v, v, f.ops)
    return lumL(r, g, b)
  }
  const c = Math.min(255, Math.max(0, f.media + f.contraste * (v - f.media)))
  return Math.trunc(Math.trunc(c) * f.brilho)
}

/**
 * Aplica o filtro nos pixels RGBA (no lugar). Quem chama é o app/teste, uma vez por foto e filtro,
 * e entrega o resultado ao Desenhista. Feito à mão: `ctx.filter` não funciona igual no Safari.
 */
export function aplicaFiltro(rgba: Uint8ClampedArray | Uint8Array, f: Filtro): void {
  if (f.tipo === 'css') {
    for (let i = 0; i < rgba.length; i += 4) {
      const [r, g, b] = pixelCss(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!, f.ops)
      rgba[i] = Math.round(r)
      rgba[i + 1] = Math.round(g)
      rgba[i + 2] = Math.round(b)
    }
    return
  }
  const tab = new Uint8Array(256)
  for (let v = 0; v < 256; v++) tab[v] = filtraLum(v, f)
  for (let i = 0; i < rgba.length; i += 4) {
    const g = tab[lumL(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!)]!
    rgba[i] = g
    rgba[i + 1] = g
    rgba[i + 2] = g
  }
}

export const chaveFiltro = (f?: Filtro) =>
  !f ? 'original' : f.tipo === 'css' ? `css:${JSON.stringify(f.ops)}` : `${f.tipo}:${Math.round(f.media)}:${f.contraste}:${f.brilho}`
