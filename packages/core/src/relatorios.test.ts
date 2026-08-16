import { describe, it, expect } from 'vitest'
import { agregarVendas } from './relatorios'
import type { LinhaVendida } from './relatorios'

const linha = (
  precoUnitarioCents: number,
  custoUnitarioCents: number | null,
  quantidade = 1,
): LinhaVendida => ({ quantidade, precoUnitarioCents, custoUnitarioCents })

describe('agregarVendas', () => {
  /**
   * Antes daqui saía `margemPercent: 0`, e o painel escrevia "0,00 %" — uma
   * loja no primeiro mês lia "a tua margem é zero". Não é: não há margem
   * nenhuma, que é a mesma distinção que o custo desconhecido já fazia.
   */
  it('sem linhas dá tudo a zero e margem desconhecida — nunca 0,00 %', () => {
    expect(agregarVendas([])).toEqual({
      faturacaoCents: 0,
      custoCents: 0,
      lucroCents: 0,
      margemPercent: null,
      unidades: 0,
      unidadesSemCustoConhecido: 0,
    })
  })

  it('faturação zero com custo conhecido também não tem margem — não há por que dividir', () => {
    // Uma oferta: preço 0, custo 5,00 €. O prejuízo está no lucro; a margem
    // seria uma divisão por zero, e -∞ não se escreve num painel.
    const r = agregarVendas([linha(0, 500)])
    expect(r.lucroCents).toBe(-500)
    expect(r.margemPercent).toBeNull()
  })

  it('uma linha com custo conhecido calcula lucro e margem', () => {
    // preço 30,00 €, custo 20,00 € -> lucro 10,00 €, margem 33,33%
    const r = agregarVendas([linha(3000, 2000)])
    expect(r.faturacaoCents).toBe(3000)
    expect(r.custoCents).toBe(2000)
    expect(r.lucroCents).toBe(1000)
    expect(r.margemPercent).toBe(3333) // 33,33% em centésimos de ponto percentual
    expect(r.unidades).toBe(1)
    expect(r.unidadesSemCustoConhecido).toBe(0)
  })

  it('várias linhas com quantidades diferentes soma tudo', () => {
    const r = agregarVendas([linha(1000, 600, 3), linha(2500, 1500, 2)])
    expect(r.faturacaoCents).toBe(1000 * 3 + 2500 * 2)
    expect(r.custoCents).toBe(600 * 3 + 1500 * 2)
    expect(r.lucroCents).toBe((1000 - 600) * 3 + (2500 - 1500) * 2)
    expect(r.unidades).toBe(5)
    expect(r.unidadesSemCustoConhecido).toBe(0)
  })

  it('custo nulo em algumas linhas não infla o lucro e recusa a margem', () => {
    // linha 1: preço 10,00 €, custo desconhecido -> não pode contar como lucro 100%
    // linha 2: preço 20,00 €, custo 12,00 € -> lucro conhecido 8,00 €
    const r = agregarVendas([linha(1000, null, 1), linha(2000, 1200, 1)])
    expect(r.faturacaoCents).toBe(3000) // faturação é sempre conhecida (vem do preço de venda)
    expect(r.custoCents).toBe(1200) // só soma custo das linhas com custo registado
    expect(r.lucroCents).toBe(800) // só soma lucro das linhas com custo registado, nunca preço - 0
    expect(r.margemPercent).toBeNull() // recusa-se a calcular margem com dados incompletos
    expect(r.unidades).toBe(2)
    expect(r.unidadesSemCustoConhecido).toBe(1) // diz exatamente quantas unidades ficam de fora
  })

  it('todas as linhas com custo nulo: sem lucro conhecido, margem desconhecida', () => {
    const r = agregarVendas([linha(1000, null, 2), linha(2000, null, 1)])
    expect(r.faturacaoCents).toBe(1000 * 2 + 2000 * 1)
    expect(r.custoCents).toBe(0)
    expect(r.lucroCents).toBe(0)
    expect(r.margemPercent).toBeNull()
    expect(r.unidades).toBe(3)
    expect(r.unidadesSemCustoConhecido).toBe(3)
  })

  it('margem com dízima não pode arredondar para um valor errado', () => {
    // faturação 300, custo 200 -> lucro 100 -> 100/300 = 33,333...%
    const r = agregarVendas([linha(300, 200)])
    expect(r.margemPercent).toBe(3333)
  })

  it('venda com prejuízo dá lucro negativo, não zero', () => {
    // preço abaixo do custo: vendeu a 10,00 € algo que custou 15,00 €
    const r = agregarVendas([linha(1000, 1500)])
    expect(r.lucroCents).toBe(-500)
    expect(r.margemPercent).toBe(-5000) // -50,00%
  })

  it('todos os valores numéricos são inteiros, sempre', () => {
    const casos: LinhaVendida[][] = [
      [linha(333, 111, 7)],
      [linha(999, null, 3), linha(777, 250, 5)],
      [linha(1, 1)],
      [linha(300, 200)],
    ]
    for (const linhas of casos) {
      const r = agregarVendas(linhas)
      expect(Number.isInteger(r.faturacaoCents)).toBe(true)
      expect(Number.isInteger(r.custoCents)).toBe(true)
      expect(Number.isInteger(r.lucroCents)).toBe(true)
      expect(Number.isInteger(r.unidades)).toBe(true)
      expect(Number.isInteger(r.unidadesSemCustoConhecido)).toBe(true)
      if (r.margemPercent !== null) expect(Number.isInteger(r.margemPercent)).toBe(true)
    }
  })

  it('recusa quantidade zero, negativa ou decimal', () => {
    expect(() => agregarVendas([linha(1000, 500, 0)])).toThrow()
    expect(() => agregarVendas([linha(1000, 500, -1)])).toThrow()
    expect(() => agregarVendas([linha(1000, 500, 1.5)])).toThrow()
  })

  it('recusa preço negativo ou decimal', () => {
    expect(() => agregarVendas([linha(-1, 0)])).toThrow()
    expect(() => agregarVendas([linha(29.9, 0)])).toThrow()
  })

  it('recusa custo negativo ou decimal (mas aceita null)', () => {
    expect(() => agregarVendas([linha(1000, -1)])).toThrow()
    expect(() => agregarVendas([linha(1000, 19.9)])).toThrow()
    expect(() => agregarVendas([linha(1000, null)])).not.toThrow()
  })
})
