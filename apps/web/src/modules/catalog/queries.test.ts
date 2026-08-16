import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiGetMock = vi.fn()

// `vi.mock` é elevado para o topo do ficheiro pelo Vitest, por isso o import
// abaixo já recebe a versão mockada, mesmo vindo depois na leitura do ficheiro.
vi.mock('../../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}))

import { listProducts, getCategoryBySlug } from './queries'

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
