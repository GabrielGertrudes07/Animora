import type { Field } from 'payload'

/**
 * A única ligação entre este projeto e o Shopify.
 *
 * `unique` não é decoração: é o que torna o upsert do sync seguro. Sem ele,
 * um backfill interrompido a meio e recomeçado duplicava o catálogo inteiro
 * em vez de o reencontrar.
 *
 * Guarda o GID completo (`gid://shopify/Product/123`) e não o número: é o que
 * as respostas da API devolvem e o que as mutações aceitam, e converter nos
 * dois sentidos é uma oportunidade de enganar-se sem nada em troca.
 */
export const campoShopifyId: Field = {
  name: 'shopifyId',
  type: 'text',
  unique: true,
  index: true,
  label: 'ID Shopify',
  admin: {
    readOnly: true,
    description: 'Preenchido pela sincronização. Não editar.',
  },
}
