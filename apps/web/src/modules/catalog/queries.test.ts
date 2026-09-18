import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiGetMock = vi.fn()

// `vi.mock` é elevado para o topo do ficheiro pelo Vitest, por isso o import
// abaixo já recebe a versão mockada, mesmo vindo depois na leitura do ficheiro.
vi.mock('../../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}))

import {
  listProducts,
  getCategoryBySlug,
  getProductBySlug,
  listAttributeDefs,
  getConfiguracaoFiltros,
} from './queries'

function paginated<T>(docs: T[]) {
  return { docs, totalDocs: docs.length }
}

const produtoCru = {
  id: 1,
  title: 'Produto teste',
  slug: 'produto-teste',
  brand: { id: 1, name: 'Marca', slug: 'marca' },
  categories: [],
  gallery: [],
}

const varianteCrua = {
  id: 1,
  sku: 'SKU-1',
  combination: {},
  priceCents: 1000,
  stock: 5,
}

beforeEach(() => {
  apiGetMock.mockReset()
})

function urlDeProdutos(): string {
  const chamada = apiGetMock.mock.calls
    .map((c) => c[0] as string)
    .find((p) => p.startsWith('/api/products'))
  if (!chamada) throw new Error('listProducts não chamou /api/products')
  return decodeURIComponent(chamada)
}

describe('listProducts — filtro por categoria', () => {
  it('inclui a categoria na consulta quando categoriaId é dado', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/products')) return paginated([produtoCru])
      if (path.startsWith('/api/variants')) return paginated([varianteCrua])
      return paginated([])
    })

    await listProducts({ ordem: 'relevancia' }, 6)

    expect(urlDeProdutos()).toContain('where[categories][equals]=6')
  })

  it('não filtra por nenhuma categoria quando categoriaId é omitido — é o caso da página inicial', async () => {
    apiGetMock.mockImplementation(async () => paginated([]))

    await listProducts({ ordem: 'relevancia' })

    expect(urlDeProdutos()).not.toContain('categories')
  })
})

describe('listProducts — ordenação por recência', () => {
  it('"recentes" ordena pelo createdAt real, do mais novo ao mais velho', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/products'))
        return paginated([
          { ...produtoCru, id: 1, createdAt: '2026-01-01T00:00:00.000Z' },
          { ...produtoCru, id: 2, createdAt: '2026-06-01T00:00:00.000Z' },
          { ...produtoCru, id: 3, createdAt: '2026-03-01T00:00:00.000Z' },
        ])
      return paginated([varianteCrua])
    })

    const produtos = await listProducts({ ordem: 'recentes' })
    expect(produtos.map((p) => p.id)).toEqual([2, 3, 1])
  })
})

describe('listProducts — filtro por atributo', () => {
  const tamanho = {
    id: 1,
    nome: 'Tamanho',
    chave: 'tamanho',
    tipo: 'multiselect' as const,
    controlo: 'caixas' as const,
    ordem: 0,
    abertoPorOmissao: false,
  }

  it('reduz mesmo os resultados quando um valor de atributo é escolhido', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/products'))
        return paginated([
          { ...produtoCru, id: 1 },
          { ...produtoCru, id: 2 },
        ])
      return paginated([{ ...varianteCrua, combination: { Tamanho: 'S' } }])
    })

    const semFiltro = await listProducts({ ordem: 'relevancia' }, undefined, [tamanho])
    expect(semFiltro).toHaveLength(2)

    const comFiltro = await listProducts({ ordem: 'relevancia', atributos: { tamanho: ['M'] } }, undefined, [
      tamanho,
    ])
    expect(comFiltro).toHaveLength(0)
  })

  it('sem atributosAtivos, um filtro de atributo não tem efeito nenhum (allowlist fecha por omissão)', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/products')) return paginated([produtoCru])
      if (path.startsWith('/api/variants')) return paginated([{ ...varianteCrua, combination: { Tamanho: 'S' } }])
      return paginated([])
    })

    const produtos = await listProducts({ ordem: 'relevancia', atributos: { tamanho: ['M'] } })
    expect(produtos).toHaveLength(1)
  })
})

describe('listAttributeDefs', () => {
  it('mapeia os campos e ordena pelo que a API já devolveu', async () => {
    apiGetMock.mockResolvedValue(
      paginated([
        {
          id: 5,
          nome: 'Cor',
          chave: 'cor',
          tipo: 'select',
          controlo: 'amostras',
          ordem: 2,
          abertoPorOmissao: true,
          alcance: 'filtro',
        },
      ]),
    )
    const defs = await listAttributeDefs()
    expect(defs).toEqual([
      { id: 5, nome: 'Cor', chave: 'cor', tipo: 'select', controlo: 'amostras', ordem: 2, abertoPorOmissao: true },
    ])
    const chamada = apiGetMock.mock.calls[0]?.[0] as string
    expect(chamada).toContain('/api/attributes')
  })

  it('descarta um atributo de alcance "ficha" — aparece na ficha, não filtra', async () => {
    apiGetMock.mockResolvedValue(
      paginated([
        {
          id: 6,
          nome: 'Material',
          chave: 'material',
          tipo: 'select',
          controlo: 'caixas',
          ordem: 1,
          abertoPorOmissao: false,
          alcance: 'ficha',
        },
      ]),
    )
    expect(await listAttributeDefs()).toEqual([])
  })
})

describe('getConfiguracaoFiltros', () => {
  it('lê o global correto', async () => {
    apiGetMock.mockResolvedValue({ padrao: [], porCategoria: [] })
    await getConfiguracaoFiltros()
    expect(apiGetMock.mock.calls[0]?.[0]).toContain('/api/globals/configuracao-filtros')
  })
})

describe('getCategoryBySlug', () => {
  it('devolve null quando a categoria não existe — distingue de categoria vazia', async () => {
    apiGetMock.mockResolvedValue(paginated([]))
    expect(await getCategoryBySlug('inventada')).toBeNull()
  })

  it('devolve a categoria (com nome real) quando existe', async () => {
    apiGetMock.mockResolvedValue(paginated([{ id: 6, name: 'Ração', slug: 'racao' }]))
    expect(await getCategoryBySlug('racao')).toEqual({ id: 6, name: 'Ração', slug: 'racao' })
  })
})

/**
 * Os `params` do App Router chegam percent-encoded. Estes testes olham para o
 * endereço que sai para a API, e não para o resultado, porque o defeito era
 * exatamente esse: a consulta ia bem formada para o servidor errado de si
 * própria — `%25C3%25A7` em vez de `%C3%A7` — e devolvia zero resultados sem
 * erro nenhum. Numa loja portuguesa `ração`, `cão` e `pássaros` são slugs de
 * esperar, e era o próprio cabeçalho a emitir os links que davam 404.
 */
describe('slugs com acentos', () => {
  const RACAO_AGUA_CODIFICADO = 'ra%C3%A7%C3%A3o-%C3%A1gua'
  const RACAO_AGUA_LEGIVEL = 'ração-água'

  function urlPara(prefixo: string): string {
    const chamada = apiGetMock.mock.calls
      .map((c) => c[0] as string)
      .find((p) => p.startsWith(prefixo))
    if (!chamada) throw new Error(`nenhuma chamada a ${prefixo}`)
    return chamada
  }

  beforeEach(() => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/variants')) return paginated([varianteCrua])
      return paginated([])
    })
  })

  it('categoria: o slug codificado do URL chega à API codificado UMA vez', async () => {
    await getCategoryBySlug(RACAO_AGUA_CODIFICADO)
    const url = urlPara('/api/categories')
    expect(url).toContain(`where[slug][equals]=${RACAO_AGUA_CODIFICADO}`)
    expect(url).not.toContain('%25')
    expect(decodeURIComponent(url)).toContain(`where[slug][equals]=${RACAO_AGUA_LEGIVEL}`)
  })

  it('categoria: o mesmo slug já legível dá o mesmo endereço', async () => {
    await getCategoryBySlug(RACAO_AGUA_LEGIVEL)
    expect(urlPara('/api/categories')).toContain(`where[slug][equals]=${RACAO_AGUA_CODIFICADO}`)
  })

  it('ficha de produto: idem, é o outro caminho e tinha o mesmo defeito', async () => {
    await getProductBySlug('ra%C3%A7%C3%A3o-premium-para-c%C3%A3es')
    const url = urlPara('/api/products')
    expect(url).not.toContain('%25')
    expect(decodeURIComponent(url)).toContain('where[slug][equals]=ração-premium-para-cães')
  })

  it('slugs sem acentos continuam a passar intactos', async () => {
    await getCategoryBySlug('coleiras')
    expect(urlPara('/api/categories')).toContain('where[slug][equals]=coleiras')
  })

  it('um % solto no endereço dá 404 em vez de rebentar a página', async () => {
    await expect(getCategoryBySlug('ra%ao')).resolves.toBeNull()
    expect(urlPara('/api/categories')).toContain('where[slug][equals]=ra%25ao')
  })
})
