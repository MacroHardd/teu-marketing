// Tratamento de imagem do Ativo: uma receita (lista fechada) aplicada sobre o original, sempre do zero.
// Não destrutivo: o original fica guardado e a receita pode ser trocada ou desfeita a qualquer hora.
// Roda FORA do Motor (no provedor de foto do app/teste), como os filtros: o Motor só recebe o metadado
// da imagem tratada (ADR 0001 e 0004). Tudo feito à mão sobre os pixels: nada de `ctx.filter` (Safari).
import { hexrgb, mistura, PRETO, type Cor } from './cor'
import { lumL } from './foto'

export type Efeito = 'duotom' | 'pixel' | 'velho'
export type Forca = 'leve' | 'forte'

/** Retângulo em fração (0–1) da imagem original. */
export interface Corte {
  x: number
  y: number
  w: number
  h: number
}

export interface Receita {
  corte?: Corte
  /** Um efeito por vez (80/20): duotom, pixelar ou envelhecer. */
  efeito?: Efeito
  /** Duotom: cor clara ('marca' = cor do Perfil de Marca, ou uma das cores prontas). */
  cor?: string
  /** Pixelar: tamanho do bloco. Envelhecer: intensidade. */
  nivel?: 'P' | 'M' | 'G'
  forca?: Forca
  /** Textura por cima da foto (id do catálogo). */
  textura?: string
  texturaForca?: Forca
}

/** Cores prontas do duotom (as paletas aprovadas da skill tipografia-igor). */
export const CORES_DUOTOM: Record<string, string> = {
  azul: '#2b3cff', vermelho: '#e10e1b', verde: '#00a65a', amarelo: '#ffd400',
}

/** Pixelar: blocos por largura da imagem (P = bloco pequeno). */
const BLOCOS = { P: 96, M: 48, G: 24 } as const
/** Opacidade da textura por cima da foto. */
export const FORCA_TEXTURA: Record<Forca, number> = { leve: 0.35, forte: 0.7 }

/** Pixels RGBA + tamanho, como o ImageData. */
export interface Imagem {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Corte em px inteiros da imagem (o retângulo sempre fica dentro dela, com pelo menos 1 px). */
export function cortePx(c: Corte | undefined, w: number, h: number): { x: number, y: number, w: number, h: number } {
  if (!c) return { x: 0, y: 0, w, h }
  const x = Math.min(w - 1, Math.max(0, Math.round(c.x * w)))
  const y = Math.min(h - 1, Math.max(0, Math.round(c.y * h)))
  return { x, y, w: Math.max(1, Math.min(w - x, Math.round(c.w * w))), h: Math.max(1, Math.min(h - y, Math.round(c.h * h))) }
}

/** Recorta os pixels (cópia). */
export function corta(img: Imagem, c?: Corte): Imagem {
  const r = cortePx(c, img.width, img.height)
  if (r.x === 0 && r.y === 0 && r.w === img.width && r.h === img.height) return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height }
  const out = new Uint8ClampedArray(r.w * r.h * 4)
  for (let y = 0; y < r.h; y++) {
    const de = ((r.y + y) * img.width + r.x) * 4
    out.set(img.data.subarray(de, de + r.w * 4), y * r.w * 4)
  }
  return { data: out, width: r.w, height: r.h }
}

/** Duotom: a luz da foto vira uma rampa do quase preto (tingido) até a cor. Contraste 1,15 em volta do meio. */
export function duotom(d: Uint8ClampedArray, cor: Cor): void {
  const escuro = mistura(cor, PRETO, 0.85)
  const tab = new Uint8ClampedArray(256 * 3)
  for (let v = 0; v < 256; v++) {
    const t = Math.min(1, Math.max(0, (v - 127.5) * 1.15 / 255 + 0.5))
    for (let i = 0; i < 3; i++) tab[v * 3 + i] = escuro[i]! + (cor[i]! - escuro[i]!) * t
  }
  for (let i = 0; i < d.length; i += 4) {
    const v = lumL(d[i]!, d[i + 1]!, d[i + 2]!) * 3
    d[i] = tab[v]!
    d[i + 1] = tab[v + 1]!
    d[i + 2] = tab[v + 2]!
  }
}

/** Pixelar: média de cada bloco quadrado. */
export function pixela(img: Imagem, nivel: keyof typeof BLOCOS): void {
  const { data: d, width: w, height: h } = img
  const b = Math.max(2, Math.round(w / BLOCOS[nivel]))
  for (let by = 0; by < h; by += b) {
    for (let bx = 0; bx < w; bx += b) {
      let r = 0
      let g = 0
      let bl = 0
      let n = 0
      const y1 = Math.min(h, by + b)
      const x1 = Math.min(w, bx + b)
      for (let y = by; y < y1; y++) {
        for (let x = bx, i = (y * w + bx) * 4; x < x1; x++, i += 4) {
          r += d[i]!
          g += d[i + 1]!
          bl += d[i + 2]!
          n++
        }
      }
      r /= n
      g /= n
      bl /= n
      for (let y = by; y < y1; y++) {
        for (let x = bx, i = (y * w + bx) * 4; x < x1; x++, i += 4) {
          d[i] = r
          d[i + 1] = g
          d[i + 2] = bl
        }
      }
    }
  }
}

/** Ruído determinístico 0–1 por pixel (mesma imagem → mesmo grão em qualquer browser). */
const grao = (x: number, y: number) => {
  let n = (x * 374761393 + y * 668265263) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

/** Envelhecer: sépia, contraste e preto lavados, vinheta e grão. */
export function envelhece(img: Imagem, forca: Forca): void {
  const { data: d, width: w, height: h } = img
  const k = forca === 'forte' ? 1 : 0.6
  const cx = w / 2
  const cy = h / 2
  const rmax = Math.sqrt(cx * cx + cy * cy)
  // contraste menor e preto lavado (papel velho não tem preto puro): v → piso + ((v − 127,5)·c + 127,5)·(255 − piso)/255
  const c = 1 - 0.2 * k
  const piso = 28 * k
  const pisoB = piso * 0.8
  const ea = c * (255 - piso) / 255
  const eb = piso + 127.5 * (1 - c) * (255 - piso) / 255
  const fa = c * (255 - pisoB) / 255
  const fb = pisoB + 127.5 * (1 - c) * (255 - pisoB) / 255
  const vk = 0.45 * k / 0.55
  for (let y = 0; y < h; y++) {
    const dy2 = (y - cy) * (y - cy)
    for (let x = 0, i = y * w * 4; x < w; x++, i += 4) {
      const r = d[i]!
      const g = d[i + 1]!
      const b = d[i + 2]!
      // sépia (matriz clássica), misturada pela força
      const sr = r + (0.393 * r + 0.769 * g + 0.189 * b - r) * k
      const sg = g + (0.349 * r + 0.686 * g + 0.168 * b - g) * k
      const sb = b + (0.272 * r + 0.534 * g + 0.131 * b - b) * k
      // vinheta suave nas bordas
      const t = Math.sqrt((x - cx) * (x - cx) + dy2) / rmax - 0.45
      const v = t > 0 ? 1 - vk * t : 1
      // grão
      const n = (grao(x, y) - 0.5) * 28 * k
      d[i] = (eb + sr * ea) * v + n
      d[i + 1] = (eb + sg * ea) * v + n
      d[i + 2] = (fb + sb * fa) * v + n
    }
  }
}

/** Textura em cover sobre a imagem, por multiplicação com opacidade `a` (o papel escurece onde tem fibra). */
export function texturiza(img: Imagem, tex: Imagem, a: number): void {
  const { data: d, width: w, height: h } = img
  // cover: a textura cobre a imagem inteira, centralizada
  const k = Math.max(w / tex.width, h / tex.height)
  const ox = (tex.width * k - w) / 2
  const oy = (tex.height * k - h) / 2
  for (let y = 0; y < h; y++) {
    const ty = Math.min(tex.height - 1, Math.floor((y + oy) / k))
    for (let x = 0, i = y * w * 4; x < w; x++, i += 4) {
      const tx = Math.min(tex.width - 1, Math.floor((x + ox) / k))
      const j = (ty * tex.width + tx) * 4
      d[i] = d[i]! * (1 - a + a * tex.data[j]! / 255)
      d[i + 1] = d[i + 1]! * (1 - a + a * tex.data[j + 1]! / 255)
      d[i + 2] = d[i + 2]! * (1 - a + a * tex.data[j + 2]! / 255)
    }
  }
}

/** Cor do duotom: a da marca (se pedida e existir) ou uma das prontas. */
export function corDuotom(r: Receita, corMarca?: string): Cor {
  if (r.cor === 'marca' && corMarca) return hexrgb(corMarca)
  return hexrgb(CORES_DUOTOM[r.cor ?? ''] ?? CORES_DUOTOM.azul!)
}

/**
 * Aplica a receita no original e devolve a imagem tratada (nova). `textura` = os pixels da textura escolhida,
 * já carregados (sem ela, a textura é ignorada). Ordem fixa: corte → efeito → textura.
 */
export function trata(original: Imagem, r: Receita, op: { corMarca?: string, textura?: Imagem } = {}): Imagem {
  const img = corta(original, r.corte)
  if (r.efeito === 'duotom') duotom(img.data, corDuotom(r, op.corMarca))
  else if (r.efeito === 'pixel') pixela(img, r.nivel ?? 'M')
  else if (r.efeito === 'velho') envelhece(img, r.forca ?? 'leve')
  if (r.textura && op.textura) texturiza(img, op.textura, FORCA_TEXTURA[r.texturaForca ?? 'leve'])
  return img
}

/** Chave estável da receita (cache do provedor de foto). A cor da marca entra quando o duotom usa ela. */
export const chaveReceita = (r: Receita | undefined, corMarca?: string) =>
  !r ? '' : JSON.stringify([r.corte, r.efeito, r.efeito === 'duotom' ? (r.cor === 'marca' ? corMarca : r.cor) : null,
    r.efeito === 'pixel' ? r.nivel : r.efeito === 'velho' ? r.forca : null, r.textura ?? null, r.textura ? r.texturaForca : null])

/** A receita não muda nada? */
export const receitaVazia = (r?: Receita) => !r || (!r.corte && !r.efeito && !r.textura)
