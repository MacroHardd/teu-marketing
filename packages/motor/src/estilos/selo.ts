// P5 · foto que fala (com foto) — princípio de Toscani (Benetton) e do "Umbigo" da DM9: a foto é a mensagem
import { BRANCO, contraste, mistura, PRETO, type Cor } from '../cor'
import type { Item } from '../cena'
import { split } from '../py'
import { Bloco, largura, limpaTexto, px, ret, S, texto, umaLinha } from '../texto'
import { area, CONTRASTE_MIN, elementos, fotoCover, luzAtras, type Contexto, type Saida } from './comum'

/** Véu preto na base (opacidade máxima); com a correção de contraste, mais forte. */
const VEU = 0.72
const VEU_REFORCO = 0.9

export function selo(c: Contexto): Saida {
  const { p, W, H, t, av, fontes } = c
  const [x0, y0, x1, y1] = area(H, p.formato)
  const itens: Item[] = []
  const foto = fotoCover(p, 0, 0, W, H)
  if (foto) {
    itens.push(foto)
  } else {
    av.push('este formato pede foto: sem foto, usei a cor da marca')
    itens.push({ tipo: 'degrade', x: 0, y: 0, w: W, h: H, de: [...t.acento, 1], ate: [...mistura(t.acento, PRETO, 0.4), 1] })
  }
  const txt = limpaTexto(p.campos.texto ?? '', av)
  if (split(txt).length > 8) av.push('aqui a foto é a mensagem: texto de até 6–8 palavras fica melhor')
  // véu escuro só na base, para a frase ler em qualquer foto
  const vh = H * 0.42
  const forte = p.reforco ? VEU_REFORCO : VEU
  const vy = px(H - vh) / S
  itens.push({ tipo: 'degrade', x: 0, y: vy, w: W, h: px(vh) / S, de: [0, 0, 0, 0], ate: [0, 0, 0, forte] })
  // selo: retângulo na cor da marca com o nome (sem nome, sem selo: a Plataforma não inventa)
  const nome = p.el.assinatura ? (p.marca.nome || p.marca.perfil || '') : ''
  const sy1 = y1 - 6 - (p.el.cta ? 100 : 0)
  if (nome) {
    const [sn, fs] = umaLinha(fontes, nome, 'grot-bold', 34, (x1 - x0) * 0.7, 24)
    const sw = largura(fs, sn) / S + 56
    itens.push(ret(px(x0), px(sy1 - 76), px(x0 + sw) + 1, px(sy1) + 1, t.acento))
    itens.push(texto('grot-bold', fs.tam, px(x0 + 28), px(sy1 - 26), sn, t.sobreAcento))
  }
  let ctr = 21
  let luz = 0
  if (txt) {
    const b = new Bloco(fontes, txt, 'grot-xbold', x1 - x0, 300, (p.formato === 'story' ? 84 : 74) * p.k, 44, { lh: 1.1, maxLinhas: 3, avisos: av })
    const by = sy1 - 76 - 40 - b.alto
    itens.push(...b.desenha(x0, by, BRANCO))
    // luz atrás da frase (foto + véu), pelo metadado
    const veu = (y: number) => (y < vy ? 0 : forte * (y - vy) / (H - vy))
    if (foto && foto.tipo === 'foto') luz = luzAtras(p, foto, x0, by, x0 + b.largura, by + b.alto, veu)
    else luz = mistura(t.acento, PRETO, 0.4 * (by + b.alto / 2) / H).reduce((a, v) => a + v, 0) / 3 * (1 - veu(by + b.alto / 2))
    const atras: Cor = [Math.round(luz), Math.round(luz), Math.round(luz)]
    ctr = contraste(BRANCO, atras)
    if (ctr < CONTRASTE_MIN) av.push('pouco contraste entre a letra e a foto')
  }
  itens.push(...elementos(c, x0, y0, x1, y1, { tinta: BRANCO, acc: t.acento }))
  return { fundo: t.fundo, itens, travas: { luminanciaAtras: Math.round(luz), contraste: ctr } }
}
