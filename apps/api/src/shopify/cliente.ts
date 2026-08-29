/**
 * O cliente da Admin API do Shopify.
 *
 * É um POST com JSON e um header de token. Um SDK para isto seria uma
 * dependência, uma cadência de atualizações e uma camada de tipos gerados por
 * cima de trinta linhas de `fetch`.
 *
 * `buscar` é injetável só para os testes poderem observar o pedido sem rede.
 * Em produção é sempre o `fetch` global.
 */
export const VERSAO_API = '2025-07'

/** Quantas vezes se insiste quando o Shopify estrangula o pedido. */
const TENTATIVAS = 3

export class ShopifyError extends Error {
  constructor(
    message: string,
    readonly estado?: number,
  ) {
    super(message)
    this.name = 'ShopifyError'
  }
}

type Envelope<T> = {
  data?: T
  errors?: { message?: string; extensions?: { code?: string } }[]
}

function ambiente(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new ShopifyError(`Falta a variável de ambiente ${nome}`)
  }
  return valor
}

const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

export async function consultarShopify<T>(
  consulta: string,
  variaveis: Record<string, unknown> = {},
  buscar: typeof fetch = fetch,
): Promise<T> {
  const url = `https://${ambiente('SHOPIFY_LOJA')}/admin/api/${VERSAO_API}/graphql.json`

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const resposta = await buscar(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ambiente('SHOPIFY_ADMIN_TOKEN'),
      },
      body: JSON.stringify({ query: consulta, variables: variaveis }),
    })

    if (!resposta.ok) {
      throw new ShopifyError(`Shopify devolveu ${resposta.status}`, resposta.status)
    }

    const envelope = (await resposta.json()) as Envelope<T>

    // O GraphQL responde 200 mesmo quando falha: os erros vêm no corpo, e um
    // cliente que só olhe para o estado HTTP grava `undefined` no espelho.
    if (envelope.errors?.length) {
      const estrangulado = envelope.errors.some((e) => e.extensions?.code === 'THROTTLED')

      if (estrangulado && tentativa < TENTATIVAS) {
        await espera(2 ** tentativa * 500)
        continue
      }

      const mensagens = envelope.errors.map((e) => e.message ?? e.extensions?.code).join('; ')
      throw new ShopifyError(`Shopify recusou a consulta: ${mensagens}`)
    }

    if (!envelope.data) {
      throw new ShopifyError('Shopify respondeu sem dados nem erros')
    }

    return envelope.data
  }

  throw new ShopifyError(`Shopify estrangulou ${TENTATIVAS} tentativas seguidas`)
}
