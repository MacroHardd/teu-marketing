// Paletas aprovadas da skill tipografia-igor (presets.ts, PAL, v0.1.0) e como a cor da marca do Cliente entra nelas.
// Regra do usuário (2026-10-16): a paleta do Cliente manda; a regra do Estilo é aplicada sobre a marca dele.
import { BRANCO, contraste, hexrgb, lum, mistura, PRETO, type Cor } from './cor'

const h = hexrgb
export const PAL = {
  villela: { paper: h('#efefef'), ink: h('#050505'), acc: h('#e10e1b') },
  noite: { paper: h('#0f1720'), ink: h('#ece8df'), acc: h('#ffd400') },
  verde: { paper: h('#e6e2d3'), ink: h('#1d2b22'), acc: h('#00a65a') },
  gil: { dark: h('#0e0503'), a: h('#59891c'), b: h('#fef701'), wave: h('#dc1812'), white: h('#fcf5fc'), acc: h('#fef701') },
  neon: { dark: h('#120024'), a: h('#7b2cff'), b: h('#ff8a00'), wave: h('#ff2e88'), white: h('#f6f1ff'), acc: h('#ff8a00') },
  azul: { paper: h('#2b3cff'), ink: h('#f4f1ea') },
}

export type Neutros = { paper: Cor, ink: Cor, acc: Cor }
export type PaletaZona = (typeof PAL)['gil']

/** Nome que aparece para o Cliente. */
export const NOMES_PALETA: Record<string, string> = {
  villela: 'Villela', noite: 'Noite', verde: 'Verde', gil: 'Gil', neon: 'Neon', azul: 'Azul',
}

/** Duas cores para a amostra da paleta na tela (fundo e acento). */
export function amostraPaleta(nome: string): [Cor, Cor] | null {
  const p = PAL[nome as keyof typeof PAL]
  if (!p) return null
  if ('dark' in p) return [p.a, p.b]
  return 'acc' in p ? [p.paper, p.acc] : [p.paper, p.ink]
}

/** Letra mais legível sobre `fundo` (branco sujo ou quase preto). */
export const letraSobre = (fundo: Cor, clara: Cor = [244, 241, 234], escura: Cor = [5, 5, 5]): Cor =>
  contraste(clara, fundo) >= contraste(escura, fundo) ? clara : escura

/** Escurece (ou clareia) `c` até ter contraste `min` com `fundo`. */
export function comContraste(c: Cor, fundo: Cor, min: number): Cor {
  const alvo = lum(fundo) > 0.4 ? PRETO : BRANCO
  let x = c
  for (let k = 0; k < 20 && contraste(x, fundo) < min; k++) x = mistura(x, alvo, 0.12)
  return x
}

/** Zona calma na cor da marca: raios na cor e num tom claro dela, faixa e acento na cor. */
export function zonaDaMarca(cor: Cor): PaletaZona {
  const base = PAL.gil
  return { ...base, a: cor, b: mistura(cor, BRANCO, 0.6), wave: mistura(cor, PRETO, 0.25), acc: comContraste(cor, base.dark, 3) }
}
