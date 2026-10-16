// Equivalentes exatos do Python que o publi usa. A paridade com o oráculo depende deles.

/** round() do Python: meio vai para o par (2.5 → 2, 3.5 → 4). */
export function round(v: number): number {
  const f = Math.floor(v)
  const d = v - f
  if (d < 0.5) return f
  if (d > 0.5) return f + 1
  return f % 2 === 0 ? f : f + 1
}

/** len() do Python: conta code points, não unidades UTF-16. */
export function len(s: string): number {
  return [...s].length
}

/** str.split() sem argumento. */
export function split(s: string): string[] {
  const t = s.trim()
  return t ? t.split(/\s+/u) : []
}

/** str.strip(chars). */
export function strip(s: string, chars: string): string {
  let a = 0
  let b = s.length
  while (a < b && chars.includes(s[a]!)) a++
  while (b > a && chars.includes(s[b - 1]!)) b--
  return s.slice(a, b)
}

export function rstrip(s: string, chars?: string): string {
  if (chars === undefined) return s.replace(/\s+$/u, '')
  let b = s.length
  while (b > 0 && chars.includes(s[b - 1]!)) b--
  return s.slice(0, b)
}

/** "".join(c for c in p.lower() if c.isalnum()) */
export function limpa(p: string): string {
  return [...p.toLowerCase()].filter(c => /[\p{L}\p{N}]/u.test(c)).join('')
}

export function isDigit(s: string): boolean {
  return s.length > 0 && /^\p{Nd}+$/u.test(s)
}
