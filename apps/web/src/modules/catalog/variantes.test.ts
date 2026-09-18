import { describe, expect, it } from 'vitest'
import { agruparPorAtributo, encontrarVariante } from './variantes'

// Fixtures de teste — nenhum produto real semeado tem mais de uma variante
// hoje (ver docs/CURRENT_STATE.md), por isso esta lógica só pode ser
// verificada com dados construídos, nunca em navegador contra o catálogo
// real. É a mesma disciplina de `carrinho.test.ts`: lógica pura, testada com
// exemplos, sem precisar de base de dados nenhuma.

describe('agruparPorAtributo', () => {
  it('devolve null com 0 ou 1 variante — nada para agrupar', () => {
    expect(agruparPorAtributo([])).toBeNull()
    expect(agruparPorAtributo([{ combination: { Tamanho: 'M' } }])).toBeNull()
  })

  it('agrupa uma matriz regular (Tamanho × Cor) em grupos por chave', () => {
    const variantes = [
      { combination: { Tamanho: 'S', Cor: 'Preto' } },
      { combination: { Tamanho: 'M', Cor: 'Preto' } },
      { combination: { Tamanho: 'M', Cor: 'Branco' } },
    ]

    expect(agruparPorAtributo(variantes)).toEqual([
      { chave: 'Cor', valores: ['Preto', 'Branco'] },
      { chave: 'Tamanho', valores: ['S', 'M'] },
    ])
  })

  it('devolve null quando as variantes não têm as mesmas chaves — grelha irregular', () => {
    const variantes: { combination: Record<string, string> }[] = [
      { combination: { Tamanho: 'S' } },
      { combination: { Tamanho: 'M', Cor: 'Preto' } },
    ]
    expect(agruparPorAtributo(variantes)).toBeNull()
  })

  it('devolve null quando nenhuma variante tem combination nenhuma', () => {
    expect(agruparPorAtributo([{ combination: {} }, { combination: {} }])).toBeNull()
  })
})

describe('encontrarVariante', () => {
  const variantes = [
    { id: 1, combination: { Tamanho: 'S', Cor: 'Preto' } },
    { id: 2, combination: { Tamanho: 'M', Cor: 'Preto' } },
    { id: 3, combination: { Tamanho: 'M', Cor: 'Branco' } },
  ]

  it('encontra a variante que bate exatamente com a seleção', () => {
    expect(encontrarVariante(variantes, { Tamanho: 'M', Cor: 'Branco' })?.id).toBe(3)
  })

  it('devolve undefined para uma combinação que não existe no catálogo', () => {
    expect(encontrarVariante(variantes, { Tamanho: 'S', Cor: 'Branco' })).toBeUndefined()
  })
})
