// Estilos da skill tipografia-igor: decisões do usuário (2026-10-16) além do que o oráculo cobre.
import { describe, expect, it } from 'vitest'
import { motor, VARIACOES, type Item, type TipoEstilo } from '../src'
import { foto, fontes } from './util'

const textos = (its: Item[]) => its.filter(i => i.tipo === 'texto') as Extract<Item, { tipo: 'texto' }>[]
const ESTILOS: TipoEstilo[] = ['acento', 'zona', 'sincope', 'fina']

describe('texto do Cliente intacto', () => {
  it.each(ESTILOS)('%s: desenha exatamente as palavras escritas (em maiúsculas)', (e) => {
    const texto = 'Ação, atenção e *coração* no detalhe!'
    const r = motor({ texto, estilo: e, foto: e === 'fina' ? foto('mista.png').meta : undefined, ajustes: { elementos: { assinatura: false } } }, fontes())
    const desenhadas = [...new Set(textos(r.cena.itens).map(i => i.texto))].join(' ').split(/\s+/)
    for (const w of texto.replace(/\*/g, '').toUpperCase().split(' ')) expect(desenhadas).toContain(w)
  })
})

describe('a palavra marcada pelo Cliente manda', () => {
  it('Síncope: a marcada sai da coluna; sem marcação, alternadas', () => {
    const x = (texto: string) => textos(motor({ texto, estilo: 'sincope', variacao: 'sem-bloco' }, fontes()).cena.itens).map(i => i.x)
    expect(x('eu *nasci* assim hoje')).toEqual([80, 300, 80, 80])
    expect(x('eu nasci assim hoje')).toEqual([80, 300, 80, 300])
  })
  it('Acento: destaque marcado grande demais não vira aviso (o automático vira)', () => {
    const marcado = motor({ texto: '*Menos ruído, mais resultado*', estilo: 'acento' }, fontes())
    expect(marcado.cena.travas.acentoAreaPct!).toBeGreaterThan(7)
    expect(marcado.cena.travas.avisos.some(a => /destaque grande/.test(a))).toBe(false)
  })
})

describe('a cor da marca manda', () => {
  const marca = { cor: '#1f8a70' }
  it('Acento: acento na cor da marca', () => {
    const r = motor({ texto: 'Menos *ruído*', estilo: 'acento', marca }, fontes())
    expect(textos(r.cena.itens).some(i => i.cor.join() === '31,138,112')).toBe(true)
  })
  it('Síncope sem bloco: fundo cheio na cor da marca', () => {
    expect(motor({ texto: 'eu nasci assim', estilo: 'sincope', variacao: 'sem-bloco', marca }, fontes()).cena.fundo).toEqual([31, 138, 112])
  })
  it('Zona calma: raios na cor da marca', () => {
    const r = motor({ texto: 'Oi', estilo: 'zona', marca }, fontes())
    expect(r.cena.itens.some(i => i.tipo === 'forma' && i.cor.join() === '31,138,112')).toBe(true)
  })
  it('Fina duotom: a foto é tingida na cor da marca', () => {
    const r = motor({ texto: 'Oi', estilo: 'fina', variacao: 'duotom', marca, foto: foto('mista.png').meta }, fontes())
    const f = r.cena.itens.find(i => i.tipo === 'foto')!
    expect(JSON.stringify(f.tipo === 'foto' && f.filtro)).toContain('[31,138,112]')
  })
  it('paleta escolhida pelo Cliente vence a da marca', () => {
    const r = motor({ texto: 'Menos *ruído*', estilo: 'acento', marca, ajustes: { cor: 'noite' } }, fontes())
    expect(r.cena.fundo).toEqual([15, 23, 32])
  })
})

describe('Variações', () => {
  it('inválida ou ausente → a padrão; Zona calma usa a foto quando há', () => {
    expect(motor({ texto: 'Oi', estilo: 'sincope', variacao: 'xyz' }, fontes()).variacao).toBe('bloco')
    expect(motor({ texto: 'Oi', estilo: 'zona' }, fontes()).variacao).toBe('desenho')
    expect(motor({ texto: 'Oi', estilo: 'zona', foto: foto('mista.png').meta }, fontes()).variacao).toBe('foto')
    expect(motor({ texto: 'Oi', estilo: 'acento' }, fontes()).variacao).toBeUndefined()
  })
  it.each(Object.entries(VARIACOES))('%s: toda Variação desenha', (e, vs) => {
    for (const v of vs!) {
      const r = motor({ texto: 'Feito à mão', estilo: e as TipoEstilo, variacao: v.id, foto: foto('mista.png').meta }, fontes())
      expect(r.variacao).toBe(v.id)
      expect(textos(r.cena.itens).length).toBeGreaterThan(0)
    }
  })
})

describe('texto longo encolhe até caber', () => {
  it.each(ESTILOS)('%s: 30 palavras cabem sem cortar', (e) => {
    const texto = 'Quando você entende o que o seu cliente sente de verdade a venda deixa de ser um empurrão e passa a ser consequência natural de uma conversa honesta com calma'
    const r = motor({ texto, estilo: e, foto: foto('escura.png').meta }, fontes())
    expect(r.cena.travas.avisos.some(a => /cortado/.test(a))).toBe(false)
  })
})
