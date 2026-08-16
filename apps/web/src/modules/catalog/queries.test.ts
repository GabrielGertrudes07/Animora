import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiGetMock = vi.fn()

// `vi.mock` é elevado para o topo do ficheiro pelo Vitest, por isso o import
// abaixo já recebe a versão mockada, mesmo vindo depois na leitura do ficheiro.
vi.mock('../../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}))

import { listProducts, getCategoryBySlug, getProductBySlug } from './queries'

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
