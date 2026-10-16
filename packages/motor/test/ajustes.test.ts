// Ajustes (lista fechada) e Elementos opcionais. Sem Ajuste, a Cena é a do publi (regressão).
import { describe, expect, it } from 'vitest'
import { motor, SUPORTE, type Ajustes, type Entrada, type Item, type TipoEstilo } from '../src'
import { foto, fontes } from './util'

const marca = { nome: 'Studio Lua', perfil: '@studiolua', contato: '(11) 99999-0000', logo: { largura: 400, altura: 200 } }
const roda = (estilo: TipoEstilo, ajustes?: Ajustes, extra: Partial<Entrada> = {}) =>
  motor({ texto: 'Menos ruído, mais resultado para o seu negócio', estilo, marca, ajustes, ...extra }, fontes())
const textos = (itens: Item[]) => itens.filter(i => i.tipo === 'texto') as Extract<Item, { tipo: 'texto' }>[]
/** Tamanho médio da letra do texto principal (sem os Elementos, que são pequenos). */
const maiorLetra = (itens: Item[]) => {
  const ts = textos(itens).filter(i => i.tam > 34).map(i => i.tam)
  return ts.reduce((a, b) => a + b, 0) / ts.length
}
const primeiraLinha = (itens: Item[]) => Math.min(...textos(itens).map(i => i.y))

describe('sem Ajuste = publi', () => {
  it.each(['acento', 'manchete', 'ogilvy', 'fina'] as TipoEstilo[])('%s: {} e M/padrão não mudam a Cena', (e) => {
    const base = motor({ texto: 'Menos ruído, mais resultado', estilo: e, marca: { perfil: '@x' } }, fontes())
    expect(motor({ texto: 'Menos ruído, mais resultado', estilo: e, marca: { perfil: '@x' }, ajustes: {} }, fontes())).toEqual(base)
    expect(motor({ texto: 'Menos ruído, mais resultado', estilo: e, marca: { perfil: '@x' }, ajustes: { tamanho: 'M' } }, fontes())).toEqual(base)
  })
})

describe('P/M/G', () => {
  it.each(['acento', 'manchete', 'ogilvy', 'fina'] as TipoEstilo[])('%s: cada tamanho oferecido muda a letra na ordem', (e) => {
    const ts = SUPORTE[e]!.tamanho.map(tamanho => maiorLetra(roda(e, { tamanho }).cena.itens))
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]!)
  })
})

describe('zona', () => {
  it.each(['acento', 'manchete', 'fina'] as TipoEstilo[])('%s: topo acima de centro acima de base', (e) => {
    const y = (zona: 'topo' | 'centro' | 'base') => primeiraLinha(roda(e, { zona, elementos: { contato: false, assinatura: false, logo: false } }).cena.itens)
    expect(y('topo')).toBeLessThan(y('centro'))
    expect(y('centro')).toBeLessThan(y('base'))
  })
})

describe('Elementos opcionais', () => {
  it('ligam sozinhos quando o dado existe; selo e CTA só quando pedidos/escritos', () => {
    const it0 = roda('acento').cena.itens
    expect(it0.some(i => i.tipo === 'imagem')).toBe(true)
    expect(textos(it0).some(i => i.texto === '(11) 99999-0000')).toBe(true)
    expect(textos(it0).some(i => i.texto === 'SL')).toBe(false)
    const it1 = roda('acento', { elementos: { selo: true }, cta: 'Agende pelo link da bio' }).cena.itens
    expect(textos(it1).some(i => i.texto === 'SL')).toBe(true)
    expect(textos(it1).map(i => i.texto).join(' ')).toContain('Agende pelo link da bio')
  })
  it('desligar tira o Elemento', () => {
    const itens = roda('manchete', { elementos: { logo: false, contato: false, assinatura: false } }).cena.itens
    expect(itens.some(i => i.tipo === 'imagem')).toBe(false)
    expect(textos(itens).some(i => i.texto.includes('99999') || i.texto.includes('@studiolua'))).toBe(false)
  })
  it('sem o dado, não liga nem se pedir', () => {
    const r = motor({ texto: 'Oi', estilo: 'acento', ajustes: { elementos: { logo: true, contato: true, selo: true, cta: true } } }, fontes())
    expect(r.cena.itens.some(i => i.tipo === 'imagem')).toBe(false)
    expect(textos(r.cena.itens).length).toBe(1)
  })
  it('CTA é exatamente o que o Cliente escreveu (palavra por palavra)', () => {
    const cta = 'Chama no direct: vagas até sexta!'
    const ws = textos(roda('ogilvy', { cta }).cena.itens).map(i => i.texto)
    for (const w of cta.split(' ')) expect(ws).toContain(w)
  })
  it.each(['acento', 'manchete', 'fina', 'ogilvy'] as TipoEstilo[])('%s: texto não invade CTA nem logo', (e) => {
    for (const zona of ['topo', 'centro', 'base'] as const) {
      const cta = 'Agende pelo link da bio'
      const its = roda(e, { zona, cta, elementos: { selo: true } }, { texto: 'Quando você entende o que seu cliente sente de verdade a venda vira consequência' }).cena.itens
      const ctaY = Math.min(...textos(its).filter(i => cta.split(' ').includes(i.texto)).map(i => i.y - i.tam))
      const logo = its.find(i => i.tipo === 'imagem')!
      const corpo = textos(its).filter(i => !cta.split(' ').includes(i.texto) && i.texto !== 'SL' && !i.texto.includes('99999') && i.tam > 40)
      for (const t of corpo) {
        expect(t.y + t.tam * 0.25, `${e}/${zona}: "${t.texto}" encosta no CTA`).toBeLessThan(ctaY - 20)
        expect(t.y - t.tam * 0.75, `${e}/${zona}: "${t.texto}" sobe no logo`).toBeGreaterThan(logo.y + logo.h)
      }
    }
  })
})

describe('Trava de contraste', () => {
  it('reforço escurece o fundo atrás da letra e aumenta o contraste', () => {
    const f = foto('clara.png').meta
    const a = motor({ texto: 'Feito à mão, feito pra você', estilo: 'fina', foto: f }, fontes()).cena.travas
    const b = motor({ texto: 'Feito à mão, feito pra você', estilo: 'fina', foto: f, ajustes: { reforco: true } }, fontes()).cena.travas
    expect(b.luminanciaAtras!).toBeLessThan(a.luminanciaAtras!)
    expect(b.contraste!).toBeGreaterThan(a.contraste!)
  })
  it('Estilos sem foto sempre passam (tema com contraste garantido)', () => {
    for (const e of ['acento', 'manchete', 'ogilvy'] as TipoEstilo[]) {
      expect(roda(e).cena.travas.contraste!).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('cor da paleta', () => {
  it('tema escolhido vence a cor da marca; "marca" usa a cor do Perfil', () => {
    const m = { ...marca, cor: '#1f8a70' }
    const marcaCor = motor({ texto: 'Oi gente', estilo: 'manchete', marca: m, ajustes: { cor: 'marca' } }, fontes()).cena.fundo
    const cobalto = motor({ texto: 'Oi gente', estilo: 'manchete', marca: m, ajustes: { cor: 'cobalto' } }, fontes()).cena.fundo
    expect(marcaCor).toEqual([31, 138, 112])
    expect(cobalto).toEqual([36, 67, 214])
  })
})
