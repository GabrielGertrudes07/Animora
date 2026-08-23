import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiGetMock = vi.fn()

vi.mock('../../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}))

import { getAvaliacaoProduto, getAvaliacaoLoja } from './avaliacoes'

function paginated<T>(docs: T[]) {
  return { docs, totalDocs: docs.length }
}

beforeEach(() => {
  apiGetMock.mockReset()
})

describe('getAvaliacaoProduto', () => {
  it('pede só as avaliações aprovadas deste produto', async () => {
    apiGetMock.mockResolvedValue(paginated([{ estrelas: 5 }, { estrelas: 4 }]))

    await getAvaliacaoProduto(42)

    const url = decodeURIComponent(apiGetMock.mock.calls[0]?.[0] as string)
    expect(url).toContain('where[produto][equals]=42')
    expect(url).toContain('where[estado][equals]=aprovada')
  })

  it('agrega as estrelas devolvidas pela API', async () => {
    apiGetMock.mockResolvedValue(paginated([{ estrelas: 5 }, { estrelas: 3 }]))

    const resumo = await getAvaliacaoProduto(1)

    expect(resumo).toEqual({ media: 40, total: 2 })
  })

  it('devolve média nula sem avaliações — nunca zero', async () => {
    apiGetMock.mockResolvedValue(paginated([]))

    const resumo = await getAvaliacaoProduto(1)

    expect(resumo.media).toBeNull()
    expect(resumo.total).toBe(0)
  })
})

describe('getAvaliacaoLoja', () => {
  it('agrega as avaliações aprovadas de toda a loja, sem filtrar por produto', async () => {
    apiGetMock.mockResolvedValue(paginated([{ estrelas: 5 }, { estrelas: 5 }, { estrelas: 4 }]))

    const resumo = await getAvaliacaoLoja()

    const url = decodeURIComponent(apiGetMock.mock.calls[0]?.[0] as string)
    expect(url).not.toContain('produto')
    expect(url).toContain('where[estado][equals]=aprovada')
    expect(resumo).toEqual({ media: 47, total: 3 })
  })
})
