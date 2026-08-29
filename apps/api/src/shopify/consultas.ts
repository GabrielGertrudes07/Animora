/**
 * As consultas GraphQL, como constantes.
 *
 * Uma página são 250 produtos, o máximo que a Admin API dá de uma vez. As
 * variantes vêm aninhadas: 100 por produto chega folgadamente para este
 * catálogo e evita uma segunda ronda de pedidos por produto.
 *
 * ponytail: paginação simples com cursor. Teto: um catálogo de dezenas de
 * milhares de produtos torna o backfill lento (uma página de cada vez).
 * Quando isso doer, passa a `bulkOperationRunQuery`, que devolve um JSONL de
 * uma vez — mais código e mais estados, sem valor nenhum a esta escala.
 */
export const CONSULTA_PRODUTOS = /* GraphQL */ `
  query Produtos($cursor: String) {
    products(first: 250, after: $cursor, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        descriptionHtml
        vendor
        status
        seo {
          title
          description
        }
        options {
          name
          optionValues {
            name
          }
        }
        collections(first: 20) {
          nodes {
            id
            title
            handle
          }
        }
        media(first: 20) {
          nodes {
            ... on MediaImage {
              id
              alt
              image {
                url
                width
                height
              }
            }
          }
        }
        metafields(first: 20, namespace: "animora") {
          nodes {
            key
            value
          }
        }
        variants(first: 100) {
          nodes {
            id
            sku
            barcode
            price
            compareAtPrice
            inventoryQuantity
            selectedOptions {
              name
              value
            }
            inventoryItem {
              id
              unitCost {
                amount
              }
              measurement {
                weight {
                  value
                  unit
                }
              }
            }
          }
        }
      }
    }
  }
`

export type ImagemShopify = {
  id: string
  alt: string | null
  image: { url: string; width: number | null; height: number | null } | null
}

export type VarianteShopify = {
  id: string
  sku: string | null
  barcode: string | null
  price: string
  compareAtPrice: string | null
  inventoryQuantity: number | null
  selectedOptions: { name: string; value: string }[]
  inventoryItem: {
    id: string
    unitCost: { amount: string } | null
    measurement: { weight: { value: number; unit: string } | null } | null
  } | null
}

export type ProdutoShopify = {
  id: string
  title: string
  handle: string
  descriptionHtml: string | null
  vendor: string | null
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'
  seo: { title: string | null; description: string | null } | null
  options: { name: string; optionValues: { name: string }[] }[]
  collections: { nodes: { id: string; title: string; handle: string }[] }
  media: { nodes: (ImagemShopify | Record<string, never>)[] }
  metafields: { nodes: { key: string; value: string }[] }
  variants: { nodes: VarianteShopify[] }
}

export type PaginaProdutos = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
    nodes: ProdutoShopify[]
  }
}
