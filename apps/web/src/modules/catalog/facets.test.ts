import { describe, it, expect } from 'vitest'
import {
  precoBounds,
  marcasDisponiveis,
  computeAttributeFacets,
  filtrarPorAtributos,
} from './facets'
import { resolveActiveAttributeDefs, type ConfiguracaoFiltrosRaw } from './filters'
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

  /**
   * O que este teste fixava antes era o defeito: a função reordenava por
   * `attr.ordem` e desfazia a ordem que lhe chegava — a do ecrã de
   * configuração. A ordem de entrada é a ordem de saída.
   */
  it('mantém a ordem que recebe — nunca reordena pelo `ordem` do atributo', () => {
    const produtos = [
      produto({
        id: 1,
        variants: [
          { id: 1, sku: 'A', combination: { Tamanho: 'S', 'Peso do saco': '5' }, priceCents: 100, stock: 1 },
        ],
      }),
    ]
    // `peso.ordem` é 2 e `tamanho.ordem` é 1: pela ordem do atributo sairia ao
    // contrário nos dois casos.
    expect(computeAttributeFacets(produtos, [peso, tamanho]).map((f) => f.chave)).toEqual([
      'peso-do-saco',
      'tamanho',
    ])
    expect(computeAttributeFacets(produtos, [tamanho, peso]).map((f) => f.chave)).toEqual([
      'tamanho',
      'peso-do-saco',
    ])
  })
})

/**
 * O caminho inteiro que a loja percorre: configuração → atributos ativos →
 * facetas. É aqui que se vê o defeito fechado de ponta a ponta — arrastar as
 * linhas no painel muda mesmo a ordem dos filtros na loja.
 */
describe('a ordem dos filtros na loja é a da configuração', () => {
  const cor: AttributeDef = { ...tamanho, id: 3, nome: 'Cor', chave: 'cor', ordem: 2 }
  // `listAttributeDefs` pede `sort=ordem` à API, por isso os defs chegam sempre
  // por `ordem`: Tamanho (1) antes de Cor (2). É a omissão de quem não está
  // configurado — e é exatamente o que a configuração tem de conseguir inverter.
  const defs = [tamanho, cor]
  const produtos = [
    produto({
      id: 1,
      variants: [{ id: 1, sku: 'A', combination: { Tamanho: 'S', Cor: 'Azul' }, priceCents: 100, stock: 1 }],
    }),
  ]

  const naLoja = (config: ConfiguracaoFiltrosRaw): string[] =>
    computeAttributeFacets(produtos, resolveActiveAttributeDefs(defs, config)).map((f) => f.chave)

  it('config [Cor, Tamanho] mostra Cor primeiro, mesmo com Tamanho.ordem = 1', () => {
    expect(naLoja({ padrao: [{ atributo: 3, visivel: true }, { atributo: 1, visivel: true }] })).toEqual([
      'cor',
      'tamanho',
    ])
  })

  it('inverter a configuração inverte a loja', () => {
    expect(naLoja({ padrao: [{ atributo: 1, visivel: true }, { atributo: 3, visivel: true }] })).toEqual([
      'tamanho',
      'cor',
    ])
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
