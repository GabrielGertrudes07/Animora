import { describe, it, expect } from 'vitest'
import {
  parseFilters,
  filtersToQuery,
  resolveActiveAttributeDefs,
  restringirAtributosAtivos,
} from './filters'
import type { AttributeDef } from './types'

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

  it('lê qualquer outra chave como um possível filtro de atributo — a decisão real fica para resolveActiveAttributeDefs/filtrarPorAtributos', () => {
    const f = parseFilters({ fornecedor: 'x', tamanho: ['S', 'M'] })
    expect(f.atributos).toEqual({ fornecedor: ['x'], tamanho: ['S', 'M'] })
  })
})

describe('resolveActiveAttributeDefs', () => {
  const tamanho: AttributeDef = {
    id: 1,
    nome: 'Tamanho',
    chave: 'tamanho',
    tipo: 'multiselect',
    controlo: 'caixas',
    ordem: 1,
    abertoPorOmissao: false,
  }
  const peso: AttributeDef = {
    id: 2,
    nome: 'Peso',
    chave: 'peso',
    tipo: 'intervalo',
    controlo: 'intervalo',
    ordem: 2,
    abertoPorOmissao: false,
  }
  const defs = [tamanho, peso]

  it('sem categoria, usa "padrao" e respeita a ordem das linhas', () => {
    const config = { padrao: [{ atributo: 2, visivel: true }, { atributo: 1, visivel: true }] }
    expect(resolveActiveAttributeDefs(defs, config).map((d) => d.chave)).toEqual(['peso', 'tamanho'])
  })

  it('visivel: false tira o atributo da lista', () => {
    const config = { padrao: [{ atributo: 1, visivel: false }, { atributo: 2, visivel: true }] }
    expect(resolveActiveAttributeDefs(defs, config).map((d) => d.chave)).toEqual(['peso'])
  })

  it('uma categoria com substituição ignora "padrao" por completo', () => {
    const config = {
      padrao: [{ atributo: 1, visivel: true }],
      porCategoria: [{ categoria: 9, atributos: [{ atributo: 2, visivel: true }] }],
    }
    expect(resolveActiveAttributeDefs(defs, config, 9).map((d) => d.chave)).toEqual(['peso'])
  })

  it('uma categoria sem substituição cai para "padrao"', () => {
    const config = {
      padrao: [{ atributo: 1, visivel: true }],
      porCategoria: [{ categoria: 9, atributos: [{ atributo: 2, visivel: true }] }],
    }
    expect(resolveActiveAttributeDefs(defs, config, 777).map((d) => d.chave)).toEqual(['tamanho'])
  })

  it('um id que não corresponde a nenhum atributo conhecido — como um interno, que nunca chega aqui — desaparece em silêncio', () => {
    const config = { padrao: [{ atributo: 999, visivel: true }, { atributo: 1, visivel: true }] }
    expect(resolveActiveAttributeDefs(defs, config).map((d) => d.chave)).toEqual(['tamanho'])
  })

  it('aceita a relação já populada (objeto com id), não só o id cru', () => {
    const config = { padrao: [{ atributo: { id: 1, nome: 'Tamanho' }, visivel: true }] }
    expect(resolveActiveAttributeDefs(defs, config).map((d) => d.chave)).toEqual(['tamanho'])
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

describe('restringirAtributosAtivos', () => {
  const tamanho: AttributeDef = {
    id: 1,
    nome: 'Tamanho',
    chave: 'tamanho',
    tipo: 'multiselect',
    controlo: 'caixas',
    ordem: 1,
    abertoPorOmissao: false,
  }

  it('tira do objeto uma chave que não é atributo ativo — nunca chega ao HTML/estado do cliente', () => {
    const f = parseFilters({ 'margem-alvo': '1-100', tamanho: 'S' })
    const restrito = restringirAtributosAtivos(f, [tamanho])
    expect(restrito.atributos).toEqual({ tamanho: ['S'] })
    expect(JSON.stringify(restrito)).not.toContain('margem-alvo')
  })

  it('sem nenhum atributo ativo remove "atributos" por completo, em vez de o deixar vazio', () => {
    const f = parseFilters({ 'margem-alvo': '1-100' })
    const restrito = restringirAtributosAtivos(f, [])
    expect(restrito.atributos).toBeUndefined()
  })

  it('não mexe no resto dos filtros (marca, preço, ordem)', () => {
    const f = parseFilters({ marca: 'happypaws', preco: '10-50', ordem: 'preco-asc' })
    expect(restringirAtributosAtivos(f, [])).toEqual(f)
  })
})
