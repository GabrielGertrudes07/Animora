import { describe, it, expect } from 'vitest'
import { generateCombinations, combinationKey } from './variants'

describe('generateCombinations', () => {
  it('devolve uma combinação vazia quando nao ha opções', () => {
    expect(generateCombinations([])).toEqual([{}])
  })

  it('gera uma combinação por valor com uma só opção', () => {
    const result = generateCombinations([{ name: 'Tamanho', values: ['S', 'M', 'L'] }])
    expect(result).toEqual([
      { Tamanho: 'S' },
      { Tamanho: 'M' },
      { Tamanho: 'L' },
    ])
  })

  it('faz o produto cartesiano de duas opções', () => {
    const result = generateCombinations([
      { name: 'Tamanho', values: ['S', 'M'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
    ])
    expect(result).toHaveLength(4)
    expect(result).toEqual([
      { Tamanho: 'S', Cor: 'Preto' },
      { Tamanho: 'S', Cor: 'Azul' },
      { Tamanho: 'M', Cor: 'Preto' },
      { Tamanho: 'M', Cor: 'Azul' },
    ])
  })

  it('faz o produto cartesiano de tres opções', () => {
    const result = generateCombinations([
      { name: 'Tamanho', values: ['S', 'M'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
      { name: 'Material', values: ['Nylon', 'Couro'] },
    ])
    expect(result).toHaveLength(8)
  })

  it('ignora opções sem valores', () => {
    const result = generateCombinations([
      { name: 'Tamanho', values: ['S'] },
      { name: 'Cor', values: [] },
    ])
    expect(result).toEqual([{ Tamanho: 'S' }])
  })
})

describe('combinationKey', () => {
  it('produz a mesma chave independentemente da ordem das opções', () => {
    const a = combinationKey({ Tamanho: 'S', Cor: 'Preto' })
    const b = combinationKey({ Cor: 'Preto', Tamanho: 'S' })
    expect(a).toBe(b)
  })

  it('produz chaves diferentes para combinações diferentes', () => {
    expect(combinationKey({ Tamanho: 'S' })).not.toBe(combinationKey({ Tamanho: 'M' }))
  })

  it('nao colide quando um valor contém os separadores usados internamente', () => {
    expect(combinationKey({ p: 'q|r=s' })).not.toBe(combinationKey({ p: 'q', r: 's' }))
  })
})

import { mergeVariants, type VariantRow } from './variants'

const row = (
  combination: Record<string, string>,
  priceCents: number,
  stock: number,
): VariantRow => ({ combination, sku: 'SKU-' + stock, priceCents, stock, active: true })

describe('mergeVariants', () => {
  it('cria linhas novas quando nao havia nenhuma', () => {
    const result = mergeVariants([], [{ name: 'Tamanho', values: ['S', 'M'] }])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ combination: { Tamanho: 'S' }, priceCents: 0, stock: 0 })
  })

  it('preserva preço e stock das linhas que ja existiam', () => {
    const existing = [row({ Tamanho: 'S' }, 2990, 12)]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S', 'M'] }])

    const s = result.find((r) => r.combination.Tamanho === 'S')
    expect(s?.priceCents).toBe(2990)
    expect(s?.stock).toBe(12)
  })

  it('cria as linhas novas a zero sem tocar nas antigas', () => {
    const existing = [row({ Tamanho: 'S' }, 2990, 12)]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S', 'M'] }])

    const m = result.find((r) => r.combination.Tamanho === 'M')
    expect(m?.priceCents).toBe(0)
    expect(m?.stock).toBe(0)
  })

  it('preserva dados ao acrescentar uma segunda opção', () => {
    const existing = [row({ Tamanho: 'S' }, 2990, 12)]
    const result = mergeVariants(existing, [
      { name: 'Tamanho', values: ['S'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
    ])

    // A combinação antiga {Tamanho: S} deixa de existir tal e qual,
    // por isso as novas nascem a zero — mas nenhuma linha antiga foi silenciosamente reescrita.
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.combination)).toEqual([
      { Tamanho: 'S', Cor: 'Preto' },
      { Tamanho: 'S', Cor: 'Azul' },
    ])
  })

  it('preserva dados quando se acrescenta um valor a uma opção existente', () => {
    const existing = [
      row({ Tamanho: 'S', Cor: 'Preto' }, 2990, 12),
      row({ Tamanho: 'S', Cor: 'Azul' }, 2990, 4),
    ]
    const result = mergeVariants(existing, [
      { name: 'Tamanho', values: ['S', 'M'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
    ])

    expect(result).toHaveLength(4)
    const sPreto = result.find(
      (r) => r.combination.Tamanho === 'S' && r.combination.Cor === 'Preto',
    )
    expect(sPreto?.priceCents).toBe(2990)
    expect(sPreto?.stock).toBe(12)
  })

  it('remove linhas cuja combinação deixou de ser possível', () => {
    const existing = [
      row({ Tamanho: 'S' }, 2990, 12),
      row({ Tamanho: 'XL' }, 3990, 3),
    ]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S', 'M'] }])

    expect(result.map((r) => r.combination.Tamanho)).toEqual(['S', 'M'])
  })

  it('preserva o estado desativado de uma linha', () => {
    const existing: VariantRow[] = [
      { combination: { Tamanho: 'S' }, sku: 'X', priceCents: 2990, stock: 0, active: false },
    ]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S'] }])
    expect(result[0]?.active).toBe(false)
  })

  it('nao contamina uma combinação com dados de outra quando um valor contém separadores internos', () => {
    const existing = [row({ p: 'q|r=s' }, 9900, 7)]
    const result = mergeVariants(existing, [
      { name: 'p', values: ['q'] },
      { name: 'r', values: ['s'] },
    ])

    const target = result.find((r) => r.combination.p === 'q' && r.combination.r === 's')
    expect(target?.priceCents).toBe(0)
    expect(target?.stock).toBe(0)
  })
})
