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
})
