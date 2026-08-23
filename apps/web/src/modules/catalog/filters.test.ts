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

/**
 * A pesquisa vive na query string, como os filtros — é o que a torna
 * partilhável, indexável e capaz de sobreviver ao botão "voltar" do browser,
 * que não faz nada mais do que repor o endereço anterior.
 */
describe('pesquisa na query string', () => {
  /** Query string → o `searchParams` que o Next entrega a uma página. */
  const comoSearchParams = (query: string): Record<string, string | string[]> => {
    const sp: Record<string, string | string[]> = {}
    for (const [k, v] of new URLSearchParams(query)) {
      const atual = sp[k]
      if (atual === undefined) sp[k] = v
      else sp[k] = Array.isArray(atual) ? [...atual, v] : [atual, v]
    }
    return sp
  }

  it('lê o termo pesquisado', () => {
    expect(parseFilters({ q: 'coleira' }).q).toBe('coleira')
  })

  it('`?q=` vazio ou só com espaços é não haver pesquisa nenhuma', () => {
    expect(parseFilters({ q: '' }).q).toBeUndefined()
    expect(parseFilters({ q: '   ' }).q).toBeUndefined()
    expect(parseFilters({}).q).toBeUndefined()
  })

  it('dois `q` ficam pelo primeiro', () => {
    expect(parseFilters({ q: ['coleira', 'racao'] }).q).toBe('coleira')
  })

  it('`q` não é lido como filtro de atributo', () => {
    expect(parseFilters({ q: 'coleira' }).atributos).toBeUndefined()
  })

  it('escreve o termo de volta, e primeiro', () => {
    expect(filtersToQuery({ ordem: 'relevancia', q: 'coleira' })).toBe('q=coleira')
    expect(filtersToQuery({ ordem: 'relevancia', q: 'coleira', marca: ['petnest'] })).toBe(
      'q=coleira&marca=petnest',
    )
  })

  it('o endereço sobrevive à ida e volta — é o que o "voltar" e o partilhar precisam', () => {
    const filtros = {
      ordem: 'preco-asc' as const,
      q: 'ração para cão',
      marca: ['petnest', 'happypaws'],
      precoMin: 1000,
      precoMax: 5000,
      atributos: { tamanho: ['M', 'L'] },
    }
    expect(parseFilters(comoSearchParams(filtersToQuery(filtros)))).toEqual(filtros)
  })

  it('um acento no termo atravessa o endereço intacto', () => {
    const query = filtersToQuery({ ordem: 'relevancia', q: 'ração' })
    expect(query).toBe('q=ra%C3%A7%C3%A3o')
    expect(parseFilters(comoSearchParams(query)).q).toBe('ração')
  })

  it('restringir os atributos ativos não leva a pesquisa à frente', () => {
    const f = parseFilters({ q: 'coleira', tamanho: 'M' })
    expect(restringirAtributosAtivos(f, []).q).toBe('coleira')
  })
})
