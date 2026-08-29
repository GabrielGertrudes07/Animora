import { describe, expect, it, vi } from 'vitest'

import { consultarShopify, ShopifyError } from './cliente'

// Lidas a cada chamada, não na carga do módulo — por isso basta pô-las aqui.
process.env.SHOPIFY_LOJA = 'exemplo.myshopify.com'
process.env.SHOPIFY_ADMIN_TOKEN = 'shpat-teste'

const OK = (dados: unknown) =>
  new Response(JSON.stringify({ data: dados }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const ESTRANGULADO = () =>
  new Response(JSON.stringify({ errors: [{ extensions: { code: 'THROTTLED' } }] }), { status: 200 })

describe('consultarShopify', () => {
  it('envia o token e a versao da API no endereco', async () => {
    const buscar = vi.fn<typeof fetch>(async () => OK({ shop: { name: 'Animora' } }))

    await consultarShopify('{ shop { name } }', {}, buscar)

    const [url, opcoes] = buscar.mock.calls[0]!
    expect(String(url)).toBe('https://exemplo.myshopify.com/admin/api/2025-07/graphql.json')
    expect(opcoes?.method).toBe('POST')
    const cabecalhos = opcoes?.headers as Record<string, string>
    expect(cabecalhos['X-Shopify-Access-Token']).toBe('shpat-teste')
  })

  it('devolve o campo data e nao o envelope', async () => {
    const buscar = vi.fn<typeof fetch>(async () => OK({ shop: { name: 'Animora' } }))

    const resultado = await consultarShopify<{ shop: { name: string } }>(
      '{ shop { name } }',
      {},
      buscar,
    )

    expect(resultado).toEqual({ shop: { name: 'Animora' } })
  })

  it('atira quando a resposta traz erros de GraphQL, mesmo com estado 200', async () => {
    const buscar = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ errors: [{ message: 'Campo desconhecido: bananas' }] }), {
          status: 200,
        }),
    )

    await expect(
      consultarShopify('{ bananas }', {}, buscar),
    ).rejects.toThrow(/bananas/)
  })

  it('atira quando o estado HTTP nao e ok', async () => {
    const buscar = vi.fn<typeof fetch>(async () => new Response('nao autorizado', { status: 401 }))

    await expect(
      consultarShopify('{ shop { name } }', {}, buscar),
    ).rejects.toThrow(/401/)
  })

  it('repete quando o Shopify estrangula e acaba por devolver os dados', async () => {
    const buscar = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ESTRANGULADO())
      .mockResolvedValueOnce(OK({ shop: { name: 'Animora' } }))

    const resultado = await consultarShopify<{ shop: { name: string } }>(
      '{ shop { name } }',
      {},
      buscar,
    )

    expect(resultado).toEqual({ shop: { name: 'Animora' } })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('desiste depois de tres tentativas estranguladas', async () => {
    const buscar = vi.fn<typeof fetch>(async () => ESTRANGULADO())

    await expect(
      consultarShopify('{ shop { name } }', {}, buscar),
    ).rejects.toBeInstanceOf(ShopifyError)
    expect(buscar).toHaveBeenCalledTimes(3)
  })
})
