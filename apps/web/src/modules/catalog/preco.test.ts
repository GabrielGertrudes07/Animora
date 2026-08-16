import { describe, it, expect } from 'vitest'
import { precoDeMostra } from './preco'
import type { PublicVariant } from './types'

const variante = (priceCents: number, extra: Partial<PublicVariant> = {}): PublicVariant => ({
  id: priceCents,
  sku: `SKU-${priceCents}`,
  combination: {},
  priceCents,
  stock: 1,
  ...extra,
})

describe('precoDeMostra', () => {
  it('marca "desde" quando as variantes têm preços diferentes', () => {
    // O cenário exato do defeito: S a 29,90 € e M a 32,90 €, com o M listado
    // primeiro. Sem o "desde", a ficha anunciava 29,90 € por cima do M.
    const p = precoDeMostra([variante(3290), variante(2990)])
    expect(p).toEqual({ cents: 2990, old: null, desde: true })
  })

  it('não marca "desde" quando todas custam o mesmo', () => {
    const p = precoDeMostra([variante(1990), variante(1990), variante(1990)])
    expect(p.desde).toBe(false)
    expect(p.cents).toBe(1990)
  })

  it('não marca "desde" com uma variante só', () => {
    expect(precoDeMostra([variante(1990)]).desde).toBe(false)
  })

  it('mantém o preço anterior quando não há divergência', () => {
    const p = precoDeMostra([variante(1990, { oldPriceCents: 2490 })])
    expect(p).toEqual({ cents: 1990, old: 2490, desde: false })
  })

  it('deixa cair o preço anterior quando há divergência', () => {
    // Um riscado sobre um "desde" promete um desconto sobre uma variante que
    // o leitor não consegue identificar.
    const p = precoDeMostra([variante(2990, { oldPriceCents: 3990 }), variante(3290)])
    expect(p).toEqual({ cents: 2990, old: null, desde: true })
  })

  it('o mais baixo é o mais baixo, independentemente da ordem de chegada', () => {
    for (const ordem of [
      [2990, 3290, 3990],
      [3990, 2990, 3290],
      [3290, 3990, 2990],
    ]) {
      expect(precoDeMostra(ordem.map((c) => variante(c))).cents).toBe(2990)
    }
  })

  it('zero é um preço como outro qualquer e não é confundido com ausência', () => {
    expect(precoDeMostra([variante(0), variante(2990)])).toEqual({
      cents: 0,
      old: null,
      desde: true,
    })
  })
})
