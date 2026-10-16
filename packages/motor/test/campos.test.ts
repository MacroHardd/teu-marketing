import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { campos, confere, destaque, escolhe, motor, separa, type TipoEstilo } from '../src'
import { numero } from '../src/campos'
import { fontes, ORACULO } from './util'

const TEXTOS: string[] = JSON.parse(readFileSync(join(ORACULO, 'casos', 'textos.json'), 'utf8'))
const TIPOS: TipoEstilo[] = ['acento', 'manchete', 'numero', 'fina', 'selo', 'duotom', 'vazio', 'ogilvy', 'heroi', 'citacao', 'zona', 'sincope', 'riscada']
const SAIDA = join(ORACULO, 'saida', 'textos.json')

describe('regra inviolável: o Motor nunca altera o texto do Cliente', () => {
  for (const texto of TEXTOS) {
    it(texto, () => {
      for (const tipo of TIPOS) {
        for (const foto of [false, true]) expect(confere(texto, separa(tipo, texto, true, foto)), tipo).toBe(true)
      }
    })
  }

  it('bug herdado do publi: `numero` corta data ("20/11" → "11"); `separa` segura', () => {
    const t = 'Workshop no sábado 20/11'
    expect(confere(t, campos('numero', t, true))).toBe(false)
    expect(separa('numero', t, true)).toEqual({ texto: t })
  })

  it('confere pega palavra trocada, tirada ou acrescentada', () => {
    expect(confere('Menos ruído, mais resultado', { texto: 'Menos ruído, mais *lucro*' })).toBe(false)
    expect(confere('Menos ruído, mais resultado', { texto: 'Menos ruído' })).toBe(false)
    expect(confere('Menos ruído', { texto: 'Menos ruído agora' })).toBe(false)
  })

  it('o Motor entrega exatamente as palavras do Cliente', () => {
    for (const texto of TEXTOS) expect(confere(texto, motor({ texto, estilo: 'acento' }, fontes()).campos)).toBe(true)
  })
})

describe.skipIf(!existsSync(SAIDA))('igual ao publi (oráculo)', () => {
  const ref: { texto: string, escolhido: string, escolhido_foto: string, numero: string | null, destaque: string, campos: Record<string, object> }[]
    = existsSync(SAIDA) ? JSON.parse(readFileSync(SAIDA, 'utf8')) : []
  for (const r of ref) {
    it(r.texto, () => {
      expect(escolhe(r.texto, false)).toBe(r.escolhido)
      expect(escolhe(r.texto, true)).toBe(r.escolhido_foto)
      expect(numero(r.texto)).toBe(r.numero)
      expect(destaque(r.texto)).toBe(r.destaque)
      for (const tipo of TIPOS) expect(campos(tipo, r.texto, true), tipo).toEqual(r.campos[tipo])
    })
  }
})
