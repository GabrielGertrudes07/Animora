import { describe, it, expect } from 'vitest'
import { parseFilters, filtersToQuery } from './filters'

describe('parseFilters', () => {
  it('devolve valores por omissão quando nao ha nada na query', () => {
    expect(parseFilters({})).toEqual({ ordem: 'relevancia' })
  })

  it('lê uma marca simples', () => {
    expect(parseFilters({ marca: 'happypaws' }).marca).toEqual(['happypaws'])
  })

  it('lê várias marcas', () => {
    expect(parseFilters({ marca: ['happypaws', 'petnest'] }).marca).toEqual([
      'happypaws',
      'petnest',
    ])
  })

  it('lê o intervalo de preço em euros e converte para cêntimos', () => {
    const f = parseFilters({ preco: '10-50' })
    expect(f.precoMin).toBe(1000)
    expect(f.precoMax).toBe(5000)
  })

  it('ignora intervalos de preço malformados', () => {
    expect(parseFilters({ preco: 'abc' }).precoMin).toBeUndefined()
    expect(parseFilters({ preco: '10-' }).precoMin).toBeUndefined()
    expect(parseFilters({ preco: '-5-10' }).precoMin).toBeUndefined()
  })

  it('troca os limites se vierem ao contrário', () => {
    const f = parseFilters({ preco: '50-10' })
    expect(f.precoMin).toBe(1000)
    expect(f.precoMax).toBe(5000)
  })

  it('aceita apenas chaves de ordenação conhecidas', () => {
    expect(parseFilters({ ordem: 'preco-asc' }).ordem).toBe('preco-asc')
    expect(parseFilters({ ordem: 'inventada' }).ordem).toBe('relevancia')
  })

  it('ignora parâmetros que nao sao filtros públicos', () => {
    const f = parseFilters({ fornecedor: 'x', costCents: '100' }) as Record<string, unknown>
    expect(f.fornecedor).toBeUndefined()
    expect(f.costCents).toBeUndefined()
  })
})

describe('filtersToQuery', () => {
  it('omite a ordenação por omissão', () => {
    expect(filtersToQuery({ ordem: 'relevancia' })).toBe('')
  })

  it('escreve marcas e preço', () => {
    const q = filtersToQuery({ ordem: 'preco-asc', marca: ['happypaws'], precoMin: 1000, precoMax: 5000 })
    expect(q).toContain('marca=happypaws')
    expect(q).toContain('preco=10-50')
    expect(q).toContain('ordem=preco-asc')
  })

  it('faz a viagem de ida e volta', () => {
    const original = { ordem: 'preco-desc' as const, marca: ['a', 'b'], precoMin: 500, precoMax: 12000 }
    const sp = Object.fromEntries(new URLSearchParams(filtersToQuery(original)))
    const voltou = parseFilters({ ...sp, marca: ['a', 'b'] })
    expect(voltou).toEqual(original)
  })
})
