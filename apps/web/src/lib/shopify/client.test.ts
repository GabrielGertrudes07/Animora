import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('shopifyFetch', () => {
  const env = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...env }
  })
  afterEach(() => {
    process.env = env
    vi.unstubAllGlobals()
  })

  it('lança ShopifyConfigError se faltar SHOPIFY_STORE_DOMAIN', async () => {
    delete process.env.SHOPIFY_STORE_DOMAIN
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token-teste'
    const { shopifyFetch, ShopifyConfigError } = await import('./client')
    await expect(shopifyFetch('query { shop { name } }')).rejects.toBeInstanceOf(ShopifyConfigError)
  })

  it('envia a query, as variáveis e o token de acesso corretos', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'animora-teste.myshopify.com'
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token-teste'
    process.env.SHOPIFY_STOREFRONT_API_VERSION = '2026-07'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { shop: { name: 'Animora' } } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { shopifyFetch } = await import('./client')
    const resultado = await shopifyFetch<{ shop: { name: string } }>(
      'query { shop { name } }',
      { primeiro: 10 },
    )

    expect(resultado).toEqual({ shop: { name: 'Animora' } })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://animora-teste.myshopify.com/api/2026-07/graphql.json')
    expect(init.headers['X-Shopify-Storefront-Access-Token']).toBe('token-teste')
    expect(JSON.parse(init.body)).toEqual({ query: 'query { shop { name } }', variables: { primeiro: 10 } })
  })

  it('lança ShopifyApiError se a resposta trouxer errors[]', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'animora-teste.myshopify.com'
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token-teste'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ errors: [{ message: 'campo inválido' }] }) }),
    )
    const { shopifyFetch, ShopifyApiError } = await import('./client')
    await expect(shopifyFetch('query { invalido }')).rejects.toBeInstanceOf(ShopifyApiError)
  })
})
