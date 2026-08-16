import { describe, it, expect } from 'vitest'
import {
  precoBounds,
  marcasDisponiveis,
  computeAttributeFacets,
  filtrarPorAtributos,
} from './facets'
import type { AttributeDef, PublicProduct } from './types'

function produto(over: Partial<PublicProduct> & { id: number }): PublicProduct {
  return {
    title: 'Produto',
    slug: `produto-${over.id}`,
    brand: { id: 1, name: 'Marca A', slug: 'marca-a' },
    categories: [],
    gallery: [],
    variants: [],
    ...over,
  }
}

describe('precoBounds', () => {
  it('devolve undefined quando não há variantes — nunca uma constante emprestada', () => {
    expect(precoBounds([])).toBeUndefined()
  })

  it('lê os limites reais, não um valor fixo tipo 0-1500', () => {
    const produtos = [
      produto({ id: 1, variants: [{ id: 1, sku: 'A', combination: {}, priceCents: 990, stock: 1 }] }),
      produto({ id: 2, variants: [{ id: 2, sku: 'B', combination: {}, priceCents: 7600, stock: 1 }] }),
    ]
    expect(precoBounds(produtos)).toEqual({ min: 990, max: 7600 })
  })
})

describe('marcasDisponiveis', () => {
  it('só lista marcas que existem nos produtos dados, sem duplicar', () => {
    const produtos = [
      produto({ id: 1, brand: { id: 1, name: 'Zeta', slug: 'zeta' } }),
      produto({ id: 2, brand: { id: 1, name: 'Zeta', slug: 'zeta' } }),
      produto({ id: 3, brand: { id: 2, name: 'Alfa', slug: 'alfa' } }),
    ]
    expect(marcasDisponiveis(produtos)).toEqual([
      { nome: 'Alfa', slug: 'alfa' },
      { nome: 'Zeta', slug: 'zeta' },
    ])
  })
})

const tamanho: AttributeDef = {
  id: 1,
  nome: 'Tamanho',
  chave: 'tamanho',
  tipo: 'multiselect',
  controlo: 'caixas',
  ordem: 1,
  abertoPorOmissao: true,
}

const peso: AttributeDef = {
  id: 2,
  nome: 'Peso do saco',
  chave: 'peso-do-saco',
  tipo: 'intervalo',
  controlo: 'intervalo',
  ordem: 2,
  abertoPorOmissao: false,
}

describe('computeAttributeFacets', () => {
  it('um atributo sem nenhum valor real nos produtos não aparece', () => {
    const produtos = [produto({ id: 1, variants: [{ id: 1, sku: 'A', combination: {}, priceCents: 100, stock: 1 }] })]
    expect(computeAttributeFacets(produtos, [tamanho])).toEqual([])
  })

  it('junta os valores distintos de combination, casando pela chave normalizada', () => {
    const produtos = [
      produto({
        id: 1,
        variants: [
          { id: 1, sku: 'A', combination: { Tamanho: 'S' }, priceCents: 100, stock: 1 },
          { id: 2, sku: 'B', combination: { Tamanho: 'M' }, priceCents: 100, stock: 1 },
        ],
      }),
      produto({
        id: 2,
        variants: [{ id: 3, sku: 'C', combination: { Tamanho: 'S' }, priceCents: 100, stock: 1 }],
      }),
    ]
    const facetas = computeAttributeFacets(produtos, [tamanho])
    expect(facetas).toHaveLength(1)
    expect(facetas[0]?.valores).toEqual(['M', 'S'])
  })

  it('tipo intervalo calcula min/max numéricos a partir dos valores em combination', () => {
    const produtos = [
      produto({
        id: 1,
        variants: [
          { id: 1, sku: 'A', combination: { 'Peso do saco': '2' }, priceCents: 100, stock: 1 },
          { id: 2, sku: 'B', combination: { 'Peso do saco': '10' }, priceCents: 100, stock: 1 },
        ],
      }),
    ]
    const facetas = computeAttributeFacets(produtos, [peso])
    expect(facetas).toEqual([{ ...peso, valores: ['2', '10'], min: 2, max: 10 }])
  })

  it('tipo intervalo sem nenhum valor numérico não aparece', () => {
    const produtos = [
      produto({
        id: 1,
        variants: [{ id: 1, sku: 'A', combination: { 'Peso do saco': 'não é número' }, priceCents: 100, stock: 1 }],
      }),
    ]
    expect(computeAttributeFacets(produtos, [peso])).toEqual([])
  })

  it('ordena as facetas pela ordem do atributo', () => {
    const produtos = [
      produto({
        id: 1,
        variants: [
          { id: 1, sku: 'A', combination: { Tamanho: 'S', 'Peso do saco': '5' }, priceCents: 100, stock: 1 },
        ],
      }),
    ]
    const facetas = computeAttributeFacets(produtos, [peso, tamanho])
    expect(facetas.map((f) => f.chave)).toEqual(['tamanho', 'peso-do-saco'])
  })
})

describe('filtrarPorAtributos', () => {
  const produtos = [
    produto({
      id: 1,
      title: 'Coleira pequena',
      variants: [{ id: 1, sku: 'A', combination: { Tamanho: 'S' }, priceCents: 100, stock: 1 }],
    }),
    produto({
      id: 2,
      title: 'Coleira grande',
      variants: [{ id: 2, sku: 'B', combination: { Tamanho: 'L' }, priceCents: 100, stock: 1 }],
    }),
  ]

  it('reduz mesmo os resultados quando o valor escolhido existe só nalguns produtos', () => {
    const filtrados = filtrarPorAtributos(produtos, { tamanho: ['S'] }, [tamanho])
    expect(filtrados.map((p) => p.id)).toEqual([1])
  })

  it('ignora em silêncio uma chave que não é atributo ativo — nunca filtra por ela', () => {
    const filtrados = filtrarPorAtributos(produtos, { fornecedor: ['x'] }, [tamanho])
    expect(filtrados).toHaveLength(2)
  })

  it('tipo intervalo filtra por min/max numérico', () => {
    const comPeso = [
      produto({ id: 1, variants: [{ id: 1, sku: 'A', combination: { 'Peso do saco': '2' }, priceCents: 100, stock: 1 }] }),
      produto({ id: 2, variants: [{ id: 2, sku: 'B', combination: { 'Peso do saco': '10' }, priceCents: 100, stock: 1 }] }),
    ]
    const filtrados = filtrarPorAtributos(comPeso, { 'peso-do-saco': ['0', '5'] }, [peso])
    expect(filtrados.map((p) => p.id)).toEqual([1])
  })
})
