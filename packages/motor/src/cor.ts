import { round } from './py'

export type Cor = readonly [number, number, number]

export const BRANCO: Cor = [255, 255, 255]
export const PRETO: Cor = [0, 0, 0]

export function hexrgb(h: string): Cor {
  const s = h.replace(/^#+/, '')
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)) as unknown as Cor
}

export function lum(rgb: Cor): number {
  const c = (v: number) => {
    v = v / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * c(rgb[0]) + 0.7152 * c(rgb[1]) + 0.0722 * c(rgb[2])
}

export function contraste(a: Cor, b: Cor): number {
  const [la, lb] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (la + 0.05) / (lb + 0.05)
}

export function saturacao(rgb: Cor): number {
  const mx = Math.max(...rgb) / 255
  const mn = Math.min(...rgb) / 255
  return mx === 0 ? 0 : (mx - mn) / mx
}

/** t=0 → a, t=1 → b */
export function mistura(a: Cor, b: Cor, t: number): Cor {
  return [0, 1, 2].map(i => round(a[i]! + (b[i]! - a[i]!) * t)) as unknown as Cor
}

/** Temas curados: todos com contraste de texto ≥ 7:1 na superfície. */
export const TEMAS = {
  creme: { fundo: '#f2ede3', sup: '#ffffff', tinta: '#171512', sutil: '#7a736a', acento: '#e0472b' },
  noite: { fundo: '#0e1014', sup: '#1a1d23', tinta: '#f3f1ec', sutil: '#8e939c', acento: '#ffcf40' },
  salvia: { fundo: '#dfe5d8', sup: '#ffffff', tinta: '#16211a', sutil: '#66715f', acento: '#2f6b4f' },
  cobalto: { fundo: '#2443d6', sup: '#ffffff', tinta: '#10131c', sutil: '#6a7080', acento: '#2443d6' },
  rosa: { fundo: '#f5dcd5', sup: '#ffffff', tinta: '#2a1612', sutil: '#8a6a63', acento: '#c2185b' },
  papel: { fundo: '#eceae6', sup: '#ffffff', tinta: '#111111', sutil: '#7b7b78', acento: '#111111' },
} as const

export type NomeTema = keyof typeof TEMAS

export interface Tema {
  fundo: Cor
  sup: Cor
  tinta: Cor
  sutil: Cor
  acento: Cor
  acentoTxt: Cor
  sobreAcento: Cor
  escuro: boolean
}

/** Tema curado, ou derivado de 1 cor da marca com contraste garantido. */
export function tema(p: { cor?: string, modo?: 'claro' | 'escuro', tema?: NomeTema }): Tema {
  const escuro = p.modo === 'escuro'
  let t: Omit<Tema, 'acentoTxt' | 'sobreAcento' | 'escuro'>
  if (p.cor) {
    const a = hexrgb(p.cor)
    const base = escuro
      ? { fundo: mistura(a, PRETO, 0.86), sup: mistura(a, PRETO, 0.78), tinta: [243, 241, 236] as Cor }
      : { fundo: mistura(a, BRANCO, 0.86), sup: BRANCO, tinta: mistura(a, PRETO, 0.9) }
    t = { ...base, sutil: mistura(base.tinta, base.sup, 0.5), acento: a }
  } else {
    const def = TEMAS[p.tema ?? (escuro ? 'noite' : 'creme')] ?? TEMAS.creme
    t = {
      fundo: hexrgb(def.fundo), sup: hexrgb(def.sup), tinta: hexrgb(def.tinta),
      sutil: hexrgb(def.sutil), acento: hexrgb(def.acento),
    }
  }
  // acento usado como TEXTO precisa de contraste ≥ 3 com a superfície e com o fundo
  let at = t.acento
  for (const base of [t.sup, t.fundo]) {
    const alvo = lum(base) > 0.4 ? PRETO : BRANCO
    let k = 0
    while (contraste(at, base) < 3 && k < 20) {
      at = mistura(at, alvo, 0.12)
      k++
    }
  }
  const quasePreto: Cor = [18, 18, 18]
  return {
    ...t,
    acentoTxt: at,
    sobreAcento: contraste(BRANCO, t.acento) >= contraste(quasePreto, t.acento) ? BRANCO : quasePreto,
    escuro: lum(t.sup) < 0.2,
  }
}

/** 2 neutros (fundo + tinta) do tema; se o fundo do tema for cor saturada, usa a superfície. */
export function neutros(t: Tema): [Cor, Cor] {
  const fundo = saturacao(t.fundo) < 0.3 ? t.fundo : t.sup
  return [fundo, contraste(t.tinta, fundo) >= 7 ? t.tinta : (lum(fundo) > 0.4 ? PRETO : BRANCO)]
}

export function acentoSobre(t: Tema, fundo: Cor): Cor {
  if (contraste(t.acento, fundo) >= 3) return t.acento
  return contraste(t.acentoTxt, fundo) >= 3 ? t.acentoTxt : (lum(fundo) > 0.4 ? PRETO : BRANCO)
}
