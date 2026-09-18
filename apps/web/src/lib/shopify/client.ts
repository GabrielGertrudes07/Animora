/**
 * Scaffold do cliente Storefront GraphQL — spec
 * `docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md` §4.
 * Sem loja Shopify real ligada ainda: nenhum componente consome isto até
 * existirem credenciais reais e um plano de "catálogo real" à parte.
 */
export class ShopifyConfigError extends Error {}
export class ShopifyApiError extends Error {
  constructor(message: string, public readonly erros: unknown) {
    super(message)
  }
}

function variavelObrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new ShopifyConfigError(`Variável de ambiente obrigatória em falta: ${nome}`)
  }
  return valor
}

export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const dominio = variavelObrigatoria('SHOPIFY_STORE_DOMAIN')
  const token = variavelObrigatoria('SHOPIFY_STOREFRONT_ACCESS_TOKEN')
  const versao = process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '2026-07'

  const resposta = await fetch(`https://${dominio}/api/${versao}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!resposta.ok) {
    throw new ShopifyApiError(`Storefront API devolveu ${resposta.status}`, null)
  }

  const corpo = (await resposta.json()) as { data?: T; errors?: unknown[] }
  if (corpo.errors) {
    throw new ShopifyApiError('Storefront API devolveu errors[]', corpo.errors)
  }
  return corpo.data as T
}
