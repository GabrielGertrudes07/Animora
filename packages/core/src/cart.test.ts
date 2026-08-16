import { describe, it, expect } from 'vitest'
import { calcularTotais, ENVIO_GRATIS_ACIMA_DE, PORTES_CENTS } from './cart'

const linha = (unitPriceCents: number, qty = 1, variantId = 1) => ({ variantId, qty, unitPriceCents })

describe('calcularTotais', () => {
  it('carrinho vazio nao tem portes nem total', () => {
    expect(calcularTotais([])).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      faltaParaEnvioGratisCents: ENVIO_GRATIS_ACIMA_DE,
    })
  })

  it('soma preço vezes quantidade', () => {
    expect(calcularTotais([linha(2990, 2)]).subtotalCents).toBe(5980)
  })

  it('soma várias linhas', () => {
    const t = calcularTotais([linha(1990, 1, 1), linha(2990, 2, 2)])
    expect(t.subtotalCents).toBe(1990 + 5980)
  })

  it('cobra portes abaixo do limiar', () => {
    const t = calcularTotais([linha(1990)])
    expect(t.shippingCents).toBe(PORTES_CENTS)
    expect(t.totalCents).toBe(1990 + PORTES_CENTS)
  })

  it('nao cobra portes exatamente no limiar', () => {
    const t = calcularTotais([linha(ENVIO_GRATIS_ACIMA_DE)])
    expect(t.shippingCents).toBe(0)
    expect(t.totalCents).toBe(ENVIO_GRATIS_ACIMA_DE)
  })

  it('nao cobra portes acima do limiar', () => {
    expect(calcularTotais([linha(9999)]).shippingCents).toBe(0)
  })

  it('cobra portes um cêntimo abaixo do limiar', () => {
    expect(calcularTotais([linha(ENVIO_GRATIS_ACIMA_DE - 1)]).shippingCents).toBe(PORTES_CENTS)
  })

  it('diz quanto falta para o envio grátis', () => {
    expect(calcularTotais([linha(3000)]).faltaParaEnvioGratisCents).toBe(2000)
  })

  it('diz zero quando o envio já é grátis', () => {
    expect(calcularTotais([linha(6000)]).faltaParaEnvioGratisCents).toBe(0)
  })

  it('todos os valores sao inteiros, sempre', () => {
    for (const linhas of [[linha(1)], [linha(4999, 3)], [linha(333, 7), linha(777, 3)]]) {
      const t = calcularTotais(linhas)
      for (const v of Object.values(t)) expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('recusa quantidade zero ou negativa', () => {
    expect(() => calcularTotais([linha(1000, 0)])).toThrow()
    expect(() => calcularTotais([linha(1000, -1)])).toThrow()
  })

  it('recusa preço negativo', () => {
    expect(() => calcularTotais([linha(-1)])).toThrow()
  })

  it('recusa valores nao inteiros', () => {
    expect(() => calcularTotais([linha(29.9)])).toThrow()
    expect(() => calcularTotais([linha(1000, 1.5)])).toThrow()
  })
})
