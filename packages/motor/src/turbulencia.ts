// feTurbulence do SVG (código de referência da especificação Filter Effects), feito à mão: o Motor não usa
// filtro SVG nem `ctx.filter` (ADR 0001). Usado pela textura da Riscada (o `Scratch` da skill tipografia-igor).

const BSize = 0x100
const BM = 0xff
const PerlinN = 0x1000
const RAND_m = 2147483647
const RAND_a = 16807
const RAND_q = 127773
const RAND_r = 2836

function random(s: number): number {
  let r = RAND_a * (s % RAND_q) - RAND_r * Math.trunc(s / RAND_q)
  if (r <= 0) r += RAND_m
  return r
}

export interface Ruido {
  lattice: Int32Array
  /** gradiente[canal][i] = [x, y] */
  grad: Float64Array[]
}

const _ruidos = new Map<number, Ruido>()

/** Tabelas do ruído para a semente (init() da especificação). */
export function ruido(semente: number): Ruido {
  const r0 = _ruidos.get(semente)
  if (r0) return r0
  let s = Math.round(semente)
  if (s <= 0) s = -(s % (RAND_m - 1)) + 1
  if (s > RAND_m - 1) s = RAND_m - 1
  const lattice = new Int32Array(BSize + BSize + 2)
  const grad = [0, 1, 2, 3].map(() => new Float64Array((BSize + BSize + 2) * 2))
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < BSize; i++) {
      lattice[i] = i
      for (let j = 0; j < 2; j++) {
        s = random(s)
        grad[k]![i * 2 + j] = ((s % (BSize + BSize)) - BSize) / BSize
      }
      const g = grad[k]!
      const n = Math.sqrt(g[i * 2]! * g[i * 2]! + g[i * 2 + 1]! * g[i * 2 + 1]!)
      g[i * 2] = g[i * 2]! / n
      g[i * 2 + 1] = g[i * 2 + 1]! / n
    }
  }
  for (let i = BSize - 1; i > 0; i--) {
    const k = lattice[i]!
    s = random(s)
    const j = s % BSize
    lattice[i] = lattice[j]!
    lattice[j] = k
  }
  for (let i = 0; i < BSize + 2; i++) {
    lattice[BSize + i] = lattice[i]!
    for (let k = 0; k < 4; k++) {
      grad[k]![(BSize + i) * 2] = grad[k]![i * 2]!
      grad[k]![(BSize + i) * 2 + 1] = grad[k]![i * 2 + 1]!
    }
  }
  const r = { lattice, grad }
  _ruidos.set(semente, r)
  return r
}

const curva = (t: number) => t * t * (3 - 2 * t)

function noise2({ lattice, grad }: Ruido, canal: number, vx: number, vy: number): number {
  let t = vx + PerlinN
  const bx0 = Math.trunc(t) & BM
  const bx1 = (bx0 + 1) & BM
  const rx0 = t - Math.trunc(t)
  const rx1 = rx0 - 1
  t = vy + PerlinN
  const by0 = Math.trunc(t) & BM
  const by1 = (by0 + 1) & BM
  const ry0 = t - Math.trunc(t)
  const ry1 = ry0 - 1
  const i = lattice[bx0]!
  const j = lattice[bx1]!
  const g = grad[canal]!
  const b00 = lattice[i + by0]! * 2
  const b10 = lattice[j + by0]! * 2
  const b01 = lattice[i + by1]! * 2
  const b11 = lattice[j + by1]! * 2
  const sx = curva(rx0)
  const sy = curva(ry0)
  let u = rx0 * g[b00]! + ry0 * g[b00 + 1]!
  let v = rx1 * g[b10]! + ry0 * g[b10 + 1]!
  const a = u + sx * (v - u)
  u = rx0 * g[b01]! + ry1 * g[b01 + 1]!
  v = rx1 * g[b11]! + ry1 * g[b11 + 1]!
  const b = u + sx * (v - u)
  return a + sy * (b - a)
}

/** fractalNoise num ponto (espaço do filtro), canal 0–3 (R, G, B, A), em 0–1. */
export function fractal(r: Ruido, canal: number, x: number, y: number, fx: number, fy: number, oitavas: number): number {
  let soma = 0
  let vx = x * fx
  let vy = y * fy
  let razao = 1
  for (let o = 0; o < oitavas; o++) {
    soma += noise2(r, canal, vx, vy) / razao
    vx *= 2
    vy *= 2
    razao *= 2
  }
  const c = (soma * 255 + 255) / 2 / 255
  return c < 0 ? 0 : c > 1 ? 1 : c
}
