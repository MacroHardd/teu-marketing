// P4 · letra fina sobre foto (com foto) — princípio dos títulos de Pablo Ferro
import { contraste, mistura, PRETO, type Cor } from '../cor'
import type { Item } from '../cena'
import { filtraLum, lumEm, lumL, mediaRecorte, type Filtro } from '../foto'
import { fonte, largura, limpaTexto, px, S, texto } from '../texto'
import { len, split } from '../py'
import type { NomeFonte } from '../fontes'
import { area, assinatura, CONTRASTE_MIN, elementos, fotoCover, reserva, type Contexto, type Saida } from './comum'

/** Véu do publi: degradê preto de 62% (158/255 no Pillow) no topo até 0 no fim do texto. */
const VEU = Math.trunc(255 * 0.62) / 255
/** Véu da correção de contraste (Ajuste `reforco`). */
const VEU_FORTE = Math.trunc(255 * 0.85) / 255
/** Passo (px da peça) da amostragem de luminância atrás do texto. */
const PASSO = 6

export function fina(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const [x0, y0, x1, y1] = area(H, p.formato)
  const res = reserva(p)
  const veuMax = p.reforco ? VEU_FORTE : VEU
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
  const wmax = x1 - x0
  const topo = y0 + 30 + res.topo
  const limite = y1 - 60 - res.base

  /** Linhas de até `porLinha` letras, cada uma no tamanho que ocupa a largura, encolhidas até caber. */
  const monta = (porLinha: number) => {
    let linhas: string[] = []
    let atual = ''
    for (const w of palavras) { // linhas curtas: cada uma vira um bloco que ocupa a largura
      if (atual && len(atual) + 1 + len(w) > porLinha) {
        linhas.push(atual)
        atual = w
      } else {
        atual = (atual + ' ' + w).trim()
      }
    }
    if (atual) linhas.push(atual)
    const longo = linhas.length > 6
    if (longo) linhas = linhas.slice(0, 6)
    const tams: [NomeFonte, number][] = linhas.map((l, k) => {
      const nome: NomeFonte = k % 2 === 0 ? 'thin' : 'thin-reg'
      let tt = 420
      while (tt > 40 && largura(fonte(fontes, nome, px(tt)), l) > px(wmax)) tt -= 4
      return [nome, tt * 0.86]
    })
    const empilha = (esc: number, ini: number): [number[], number] => {
      const bases: number[] = []
      let y = ini
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
    let [, fim] = empilha(esc, topo)
    while (fim > limite && esc > 0.3) {
      esc *= 0.95;
      [, fim] = empilha(esc, topo)
    }
    // maior = tamanho médio da letra
    return { linhas, tams, esc, longo, empilha, maior: tams.length ? tams.reduce((a, [, tt]) => a + tt, 0) * esc / tams.length : 0 }
  }
  // M = publi (11 letras por linha; a letra já ocupa a largura, por isso não há G).
  // P = linhas mais longas e no máximo 80% da letra do M.
  const m = monta(11)
  let l = m
  if (p.k < 1) {
    l = monta(14)
    if (l.maior > m.maior * p.k) l.esc *= m.maior * p.k / l.maior
  }
  const { linhas, tams, esc, empilha } = l
  if (l.longo) av.push('texto longo para letra fina: até ~8 palavras fica melhor')
  let [bases, fim] = empilha(esc, topo)
  const zona = p.zona ?? 'topo'
  /** Onde começa a faixa medida atrás do texto (no topo, como o publi: desde a margem). */
  let ini = y0
  if (zona !== 'topo' && bases.length) { // mesma pilha, deslocada
    const alto = fim - topo
    ini = zona === 'base' ? limite - alto : topo + (limite - topo - alto) / 2;
    [bases, fim] = empilha(esc, ini)
  }
  // foto de leigo tem claro e escuro misturados atrás do texto: véu suave em volta do texto,
  // letra sempre clara (legível em qualquer foto, sem caixa nem sombra)
  let veu: (y: number) => number
  if (zona === 'topo') {
    const vh = Math.min(H, fim + 160)
    itens.push({ tipo: 'degrade', x: 0, y: 0, w: W, h: px(vh) / S, de: [0, 0, 0, veuMax], ate: [0, 0, 0, 0] })
    veu = y => (y < vh ? veuMax * (1 - y / vh) : 0)
  } else if (zona === 'base') {
    const va = Math.max(0, ini - 160)
    itens.push({ tipo: 'degrade', x: 0, y: va, w: W, h: H - va, de: [0, 0, 0, 0], ate: [0, 0, 0, veuMax] })
    veu = y => (y > va ? veuMax * (y - va) / (H - va) : 0)
  } else {
    const va = Math.max(0, ini - 160)
    const vb = Math.min(H, fim + 160)
    const meio = (va + vb) / 2
    itens.push({ tipo: 'degrade', x: 0, y: va, w: W, h: meio - va, de: [0, 0, 0, 0], ate: [0, 0, 0, veuMax] })
    itens.push({ tipo: 'degrade', x: 0, y: meio, w: W, h: vb - meio, de: [0, 0, 0, veuMax], ate: [0, 0, 0, 0] })
    veu = y => (y > va && y < vb ? veuMax * (1 - Math.abs(y - meio) / (meio - va)) : 0)
  }
  // luminância atrás do texto, pelo metadado (o publi mede o pixel; aqui ninguém lê pixel)
  const yf = Math.max(ini + 10, fim)
  let soma = 0
  let n = 0
  for (let y = ini + PASSO / 2; y < yf; y += PASSO) {
    const k = 1 - veu(y)
    for (let x = x0 + PASSO / 2; x < x1; x += PASSO) {
      soma += lumFundo(x, y) * k
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
  if (p.el.assinatura) itens.push(...assinatura(fontes, t, p.marca, x0, y1 - 6, tinta))
  itens.push(...elementos(c, x0, y0, x1, y1, { tinta, sutil: tinta, acc: tinta }, p.el.assinatura ? 'esq' : null))
  const g = Math.round(fundoL)
  const ctr = contraste(tinta, [g, g, g])
  if (ctr < CONTRASTE_MIN) av.push('pouco contraste entre a letra e a foto')
  return { fundo: PRETO, itens, travas: { letra: clara ? 'clara' : 'escura', luminanciaAtras: g, contraste: ctr } }
}
