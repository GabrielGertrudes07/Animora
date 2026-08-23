import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiGetMock = vi.fn()

vi.mock('../../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}))

import { filtrarPorTexto, normalizarTexto, pesquisarProdutos } from './pesquisa'
import type { PublicProduct } from './types'

const produto = (
  id: number,
  title: string,
  marca: string,
  categorias: string[] = [],
): PublicProduct => ({
  id,
  title,
  slug: `p-${id}`,
  brand: { id, name: marca, slug: marca.toLowerCase().replace(/[^a-z]+/gi, '-') },
  categories: categorias.map((nome, i) => ({
    id: i,
    name: nome,
    slug: nome.toLowerCase().replace(/[^a-z]+/gi, '-'),
  })),
  gallery: [],
  variants: [],
})

const CATALOGO: PublicProduct[] = [
  produto(1, 'Coleira Ajustável Trela Certa Classic', 'Trela Certa', ['Cães', 'Acessórios']),
  produto(2, 'Ração Focinho Feliz Cão Sénior Salmão', 'Focinho Feliz', ['Cães', 'Alimentação']),
  produto(3, 'Ração Miau Gato Adulto Peixe', 'Miau & Companhia', ['Gatos', 'Alimentação']),
  produto(4, 'Filtro Interior AquaVida 200L', 'AquaVida', ['Aquário']),
  produto(5, 'Peitoral Anti-puxão VidaCão', 'VidaCão', ['Cães', 'Acessórios']),
]

const ids = (ps: PublicProduct[]) => ps.map((p) => p.id).sort((a, b) => a - b)

describe('normalizarTexto', () => {
  it('tira os acentos e baixa as maiúsculas', () => {
    expect(normalizarTexto('Ração')).toBe('racao')
    expect(normalizarTexto('RAÇÃO')).toBe('racao')
    expect(normalizarTexto('VidaCão')).toBe('vidacao')
    expect(normalizarTexto('Pássaros')).toBe('passaros')
    expect(normalizarTexto('Sénior')).toBe('senior')
  })

  it('deixa igual o que já está sem acentos', () => {
    expect(normalizarTexto('racao')).toBe('racao')
  })
})

describe('filtrarPorTexto — o essencial', () => {
  it('encontra por título, sem distinguir maiúsculas', () => {
    expect(ids(filtrarPorTexto(CATALOGO, 'coleira'))).toEqual([1])
    expect(ids(filtrarPorTexto(CATALOGO, 'COLEIRA'))).toEqual([1])
    expect(ids(filtrarPorTexto(CATALOGO, 'CoLeIrA'))).toEqual([1])
  })

  it('encontra por marca', () => {
    expect(ids(filtrarPorTexto(CATALOGO, 'aquavida'))).toEqual([4])
    expect(ids(filtrarPorTexto(CATALOGO, 'focinho feliz'))).toEqual([2])
  })

  it('encontra por categoria — mesmo quando a palavra não está no título', () => {
    // Nenhum destes títulos diz "Aquário" nem "Gatos".
    expect(ids(filtrarPorTexto(CATALOGO, 'aquario'))).toEqual([4])
    expect(ids(filtrarPorTexto(CATALOGO, 'gatos'))).toEqual([3])
  })

  it('uma pesquisa vazia devolve tudo, e não zero', () => {
    expect(ids(filtrarPorTexto(CATALOGO, ''))).toEqual([1, 2, 3, 4, 5])
    expect(ids(filtrarPorTexto(CATALOGO, '   '))).toEqual([1, 2, 3, 4, 5])
  })

  it('uma pesquisa sem correspondência devolve lista vazia', () => {
    expect(filtrarPorTexto(CATALOGO, 'xpto')).toEqual([])
  })
})

describe('filtrarPorTexto — acentos', () => {
  it('com e sem acento encontram os mesmos produtos', () => {
    for (const par of [
      ['ração', 'racao'],
      ['cães', 'caes'],
      ['aquário', 'aquario'],
      ['vidacão', 'vidacao'],
      ['sénior', 'senior'],
    ]) {
      const [comAcento, semAcento] = par as [string, string]
      expect(ids(filtrarPorTexto(CATALOGO, comAcento))).toEqual(
        ids(filtrarPorTexto(CATALOGO, semAcento)),
      )
    }
  })

  it('e encontram mesmo alguma coisa — senão a igualdade acima era de dois vazios', () => {
    expect(ids(filtrarPorTexto(CATALOGO, 'ração'))).toEqual([2, 3])
    expect(ids(filtrarPorTexto(CATALOGO, 'racao'))).toEqual([2, 3])
  })

  it('o acento na base também é encontrado por quem escreve sem ele', () => {
    // "Sénior" só existe no catálogo com acento; a pessoa escreve sem.
    expect(ids(filtrarPorTexto(CATALOGO, 'senior'))).toEqual([2])
  })
})

describe('filtrarPorTexto — vários termos', () => {
  it('vários termos são um "e": estreitam em vez de alargar', () => {
    expect(ids(filtrarPorTexto(CATALOGO, 'racao'))).toEqual([2, 3])
    expect(ids(filtrarPorTexto(CATALOGO, 'racao gato'))).toEqual([3])
  })

  it('a ordem das palavras não conta', () => {
    expect(ids(filtrarPorTexto(CATALOGO, 'gato racao'))).toEqual(
      ids(filtrarPorTexto(CATALOGO, 'racao gato')),
    )
  })

  it('espaços a mais não partem a pesquisa', () => {
    expect(ids(filtrarPorTexto(CATALOGO, '  racao   gato  '))).toEqual([3])
  })
})

describe('pesquisarProdutos — combina com os filtros', () => {
  const cru = (p: PublicProduct) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    brand: p.brand,
    categories: p.categories,
    gallery: [],
  })

  beforeEach(() => {
    apiGetMock.mockReset()
    apiGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/products')) {
        // `URLSearchParams.toString()` codifica os parênteses retos, por isso a
        // consulta chega como `where%5Bbrand.slug%5D%5Bin%5D=…`.
        const marcas = [
          ...decodeURIComponent(path).matchAll(/where\[brand\.slug\]\[in\]=([^&]+)/g),
        ].map((m) => m[1]!)
        const docs = CATALOGO.filter(
          (p) => marcas.length === 0 || marcas.includes(p.brand.slug),
        ).map(cru)
        return { docs, totalDocs: docs.length }
      }
      if (path.startsWith('/api/variants')) {
        return { docs: [{ id: 1, sku: 'S', combination: {}, priceCents: 1000, stock: 3 }], totalDocs: 1 }
      }
      return { docs: [], totalDocs: 0 }
    })
  })

  it('a pesquisa aplica-se por cima do filtro de marca, não em vez dele', async () => {
    const so = await pesquisarProdutos('racao', { ordem: 'relevancia', marca: ['focinho-feliz'] })
    expect(ids(so)).toEqual([2])

    // Controlo: a mesma marca sem pesquisa traz o que ela tem.
    const semQ = await pesquisarProdutos('', { ordem: 'relevancia', marca: ['focinho-feliz'] })
    expect(ids(semQ)).toEqual([2])

    // E a pesquisa sozinha traz as duas rações.
    const soQ = await pesquisarProdutos('racao', { ordem: 'relevancia' })
    expect(ids(soQ)).toEqual([2, 3])
  })

  it('pesquisa e filtro que não se cruzam dão vazio, não o filtro sozinho', async () => {
    const nada = await pesquisarProdutos('aquario', {
      ordem: 'relevancia',
      marca: ['focinho-feliz'],
    })
    expect(nada).toEqual([])
  })
})
