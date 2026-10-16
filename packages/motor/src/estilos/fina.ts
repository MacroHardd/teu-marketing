// P4 · letra fina sobre foto (com foto) — princípio dos títulos de Pablo Ferro
import { mistura, PRETO, type Cor } from '../cor'
import type { Item } from '../cena'
import { filtraLum, lumEm, lumL, mediaRecorte, type Filtro } from '../foto'
import { fonte, largura, limpaTexto, px, S, texto } from '../texto'
import { len, split } from '../py'
import type { NomeFonte } from '../fontes'
import { area, assinatura, fotoCover, type Contexto, type Saida } from './comum'

/** Véu do publi: degradê preto de 62% (158/255 no Pillow) no topo até 0 no fim do texto. */
const VEU = Math.trunc(255 * 0.62) / 255
/** Passo (px da peça) da amostragem de luminância atrás do texto. */
const PASSO = 6

export function fina({ p, W, H, t, av, fontes }: Contexto): Saida {
  const [x0, y0, x1, y1] = area(H, p.formato)
  const itens: Item[] = []
  let lumFundo: (x: number, y: number) => number
  const foto = fotoCover(p, 0, 0, W, H)
  if (foto && foto.tipo === 'foto' && p.foto) {
    const meta = p.foto
    const r = foto.recorte
    const filtro: Filtro = { tipo: 'cinza', media: Math.trunc(mediaRecorte(meta, r) + 0.5), contraste: 1.3, brilho: 0.85 }
    itens.push({ ...foto, filtro })
    lumFundo = (x, y) => filtraLum(lumEm(meta, r.sx + x / W * r.sw, r.sy + y / H * r.sh), filtro)
  } else {
    av.push('este formato pede foto: sem foto, usei fundo escuro')
    const c0 = mistura(t.acento, PRETO, 0.55)
    itens.push({ tipo: 'degrade', x: 0, y: 0, w: W, h: H, de: [...c0, 1], ate: [...PRETO, 1] })
    lumFundo = (_x, y) => {
      const k = 1 - y / H
      return lumL(c0[0] * k, c0[1] * k, c0[2] * k)
    }
  }
  const palavras = split(limpaTexto(p.campos.texto ?? '', av).toUpperCase())
  let linhas: string[] = []
  let atual = ''
  for (const w of palavras) { // linhas curtas: cada uma vira um bloco que ocupa a largura
    if (atual && len(atual) + 1 + len(w) > 11) {
      linhas.push(atual)
      atual = w
    } else {
      atual = (atual + ' ' + w).trim()
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length > 6) {
    av.push('texto longo para letra fina: até ~8 palavras fica melhor')
    linhas = linhas.slice(0, 6)
  }
  const wmax = x1 - x0
  const tams: [NomeFonte, number][] = linhas.map((l, k) => {
    const nome: NomeFonte = k % 2 === 0 ? 'thin' : 'thin-reg'
    let tt = 420
    while (tt > 40 && largura(fonte(fontes, nome, px(tt)), l) > px(wmax)) tt -= 4
    return [nome, tt * 0.86]
  })

  const empilha = (esc: number): [number[], number] => {
    const bases: number[] = []
    let y = y0 + 30
    let descAnt: number | null = null
    tams.forEach(([nome, tt], i) => {
      const f = fonte(fontes, nome, px(tt * esc))
      const [sobe, desce] = f.fonte.caixa(linhas[i]!, f.tam).map(v => v / S) as [number, number]
      y = descAnt === null ? y - sobe : y + Math.max(tt * esc * 0.9, descAnt - sobe + tt * esc * 0.04)
      bases.push(y)
      descAnt = desce
    })
    return [bases, bases.length ? y + descAnt! : y0]
  }
  let esc = 1
  let [bases, fim] = empilha(esc)
  while (fim > y1 - 60 && esc > 0.3) {
    esc *= 0.95;
    [bases, fim] = empilha(esc)
  }
  // foto de leigo tem claro e escuro misturados atrás do texto: véu suave de cima até o fim do texto,
  // letra sempre clara (legível em qualquer foto, sem caixa nem sombra)
  const vh = Math.min(H, fim + 160)
  itens.push({ tipo: 'degrade', x: 0, y: 0, w: W, h: px(vh) / S, de: [0, 0, 0, VEU], ate: [0, 0, 0, 0] })
  // luminância atrás do texto, pelo metadado (o publi mede o pixel; aqui ninguém lê pixel)
  const yf = Math.max(y0 + 10, fim)
  let soma = 0
  let n = 0
  for (let y = y0 + PASSO / 2; y < yf; y += PASSO) {
    const veu = y < vh ? 1 - VEU * (1 - y / vh) : 1
    for (let x = x0 + PASSO / 2; x < x1; x += PASSO) {
      soma += lumFundo(x, y) * veu
      n++
    }
  }
  const fundoL = n ? soma / n : 0
  const clara = fundoL < 150
  const tinta: Cor = clara ? [246, 244, 238] : [14, 16, 20]
  tams.forEach(([nome, tt], i) => {
    const f = fonte(fontes, nome, px(tt * esc))
    itens.push(texto(nome, f.tam, px(x0), px(bases[i]!), linhas[i]!, tinta))
  })
  itens.push(...assinatura(fontes, t, p.marca, x0, y1 - 6, tinta))
  return { fundo: PRETO, itens, travas: { letra: clara ? 'clara' : 'escura', luminanciaAtras: Math.round(fundoL) } }
}
