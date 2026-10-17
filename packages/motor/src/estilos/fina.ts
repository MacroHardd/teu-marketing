// Regra 9 · letra fina sobre imagem (Pablo Ferro, Dr. Strangelove 1964), pelo estático E9 da skill tipografia-igor.
// Trava: letra fina, condensada, grande, sem caixa nem sombra; a imagem continua visível.
// Cor da letra: oposta ao tom DA ÁREA ATRÁS DO TEXTO (não da foto inteira).
import { contraste, hexrgb, mistura, PRETO, type Cor } from '../cor'
import type { Item } from '../cena'
import { filtraLum, lumEm, lumL, type FiltroCss } from '../foto'
import type { NomeFonte } from '../fontes'
import { split } from '../py'
import { limpaTexto } from '../texto'
import { CONTRASTE_MIN, elementos, fotoCover, reserva, type Contexto, type Saida } from './comum'
import { baseCss, creditoCss, largCss, palavrasCss } from './css'

/** Estático: margem 60 × 50, até 9 letras por linha, letra = 80% do tamanho que ocupa a largura (máx. 420). */
const E9 = { x: 60, y: 50, maxLetras: 9, lh: 0.9, max: 420, esc: 0.8 }
const CLARA: Cor = [244, 244, 240]
const ESCURA: Cor = [17, 17, 17]
const AMARELA: Cor = [255, 225, 77]
const AZUL: Cor = [42, 60, 255]
/** Véu da correção de contraste (Ajuste `reforco`): preto a 62% atrás do texto. */
const VEU = 0.62
const PASSO = 6

/** Linhas de até 9 letras (rowsOf do kit). */
function linhasDe(texto: string, max: number): string[] {
  const rows: string[] = []
  for (const w of split(texto)) {
    const r = rows[rows.length - 1]
    if (r === undefined || r.length + 1 + w.length > max) rows.push(w)
    else rows[rows.length - 1] = r + ' ' + w
  }
  return rows
}

export function fina(c: Contexto): Saida {
  const { p, W, H, av, fontes } = c
  const res = reserva(p)
  const duotom = p.variacao === 'duotom'
  const tinta = duotom && p.marca.cor ? hexrgb(p.marca.cor) : AZUL
  const filtro: FiltroCss = { tipo: 'css', ops: [['cinza', 1], ['contraste', 1.35], ['brilho', 0.75], ...(duotom ? [['multiplica', tinta] as const] : [])] }
  const itens: Item[] = []
  let lumFundo: (x: number, y: number) => number
  const foto = fotoCover(p, 0, 0, W, H, filtro)
  if (foto && foto.tipo === 'foto' && p.foto) {
    const meta = p.foto
    const r = foto.recorte
    itens.push(foto)
    const tab = Array.from({ length: 256 }, (_, v) => filtraLum(v, filtro)) // o filtro, 1 vez por valor de luz
    lumFundo = (x, y) => tab[Math.round(lumEm(meta, r.sx + x / W * r.sw, r.sy + y / H * r.sh))]!
  } else {
    av.push('este formato pede foto: sem foto, usei fundo escuro')
    const c0 = mistura(duotom ? tinta : [90, 90, 90], PRETO, 0.55)
    itens.push({ tipo: 'degrade', x: 0, y: 0, w: W, h: H, de: [...c0, 1], ate: [...PRETO, 1] })
    lumFundo = (_x, y) => {
      const k = 1 - y / H
      return lumL(c0[0] * k, c0[1] * k, c0[2] * k)
    }
  }

  // cada linha no tamanho que ocupa a largura (fitText do kit: 960 px), pesos alternados como os créditos do Ferro
  // a marcação (*palavra*) não aparece: nesta regra não há acento
  const linhas = linhasDe(palavrasCss(limpaTexto(p.campos.texto ?? '', av), true).map(([w]) => w).join(' '), E9.maxLetras)
  const larg = W - 2 * E9.x
  const L = linhas.map((l, k) => {
    const nome: NomeFonte = k % 2 ? 'thin-reg' : 'thin'
    return { l, nome, fs: Math.min(larg / largCss(fontes, nome, 1, l), E9.max) * E9.esc * Math.min(1, p.k) }
  })
  // texto longo: tudo encolhe junto até caber (o estático não precisa: lá o Igor escolhe as linhas)
  const topo = E9.y + res.topo
  const limite = H - 50 - (p.el.cta ? res.base + 40 : 0) - (p.el.assinatura ? 60 : 0)
  const total = L.reduce((a, x) => a + x.fs * E9.lh, 0)
  // a letra alta passa da caixa de linha (line-height 0,9): a última linha precisa dessa sobra embaixo
  const sobra = (t: number) => {
    const ult = L[L.length - 1]
    if (!ult) return 0
    const m = fontes[ult.nome].metricas(t)
    return Math.max(0, (m.sobe + m.desce - t * E9.lh) / 2) + m.desce * 0.5
  }
  let k = Math.min(1, (limite - topo) / Math.max(total, 1))
  if (L.length) k = Math.min(k, (limite - topo - sobra(L[L.length - 1]!.fs * k)) / total)
  const alto = total * k
  const zona = p.zona ?? 'topo'
  const ini = zona === 'topo' ? topo : zona === 'base' ? limite - alto : topo + (limite - topo - alto) / 2
  const fim = ini + alto

  // véu só quando o Cliente pede a correção de contraste
  let veu = (_y: number) => 0
  if (p.reforco) {
    const va = Math.max(0, ini - 160)
    const vb = Math.min(H, fim + 160)
    const meio = (va + vb) / 2
    itens.push({ tipo: 'degrade', x: 0, y: va, w: W, h: meio - va, de: [0, 0, 0, 0], ate: [0, 0, 0, VEU] })
    itens.push({ tipo: 'degrade', x: 0, y: meio, w: W, h: vb - meio, de: [0, 0, 0, VEU], ate: [0, 0, 0, 0] })
    veu = y => (y > va && y < vb ? VEU * (1 - Math.abs(y - meio) / (meio - va)) : 0)
  }
  // luz média atrás do texto (pelo metadado; ninguém lê pixel)
  let soma = 0
  let n = 0
  for (let y = ini + PASSO / 2; y < fim; y += PASSO) {
    for (let x = E9.x + PASSO / 2; x < W - E9.x; x += PASSO) {
      soma += lumFundo(x, y) * (1 - veu(y))
      n++
    }
  }
  const fundoL = Math.round(n ? soma / n : 0)
  const atras: Cor = [fundoL, fundoL, fundoL]
  const opcoes = duotom ? [AMARELA, CLARA, ESCURA] : [CLARA, ESCURA]
  // com o véu (correção de contraste), a letra é sempre clara
  const ink = duotom && !p.marca.cor ? AMARELA : p.reforco ? CLARA : opcoes.reduce((a, b) => (contraste(b, atras) > contraste(a, atras) ? b : a))
  let y = ini
  for (const { l, nome, fs } of L) {
    const t = fs * k
    itens.push({ tipo: 'texto', fonte: nome, tam: t, x: E9.x, y: y + baseCss(fontes, nome, t, t * E9.lh), texto: l, cor: ink, kern: true })
    y += t * E9.lh
  }
  itens.push(...creditoCss(c, ink, atras))
  itens.push(...elementos(c, 72, 72, W - 72, H - 72, { tinta: ink, acc: ink }))
  const ctr = contraste(ink, atras)
  if (ctr < CONTRASTE_MIN) av.push('pouco contraste entre a letra e a foto')
  return { fundo: PRETO, itens, travas: { letra: ink === ESCURA ? 'escura' : 'clara', luminanciaAtras: fundoL, contraste: ctr } }
}
