'use server'

import { listProductsByIds } from './queries'
import type { PublicProduct } from './types'

/**
 * Único ponto do catálogo pensado para ser chamado a partir de um Client
 * Component. "Vistos recentemente" vive no `localStorage` do browser — só
 * sabe ids, e na ordem de quem viu por último primeiro — e os produtos em
 * si vêm daqui, pela mesma leitura sanitizada (publicado, com variante) que
 * o resto da loja usa. A ordem de `ids` é preservada; um id que já não
 * resolve a produto real (apagado, despublicado) sai da lista em silêncio,
 * como já acontece nos favoritos.
 */
export async function produtosPorIds(ids: number[]): Promise<PublicProduct[]> {
  const produtos = await listProductsByIds(ids)
  const porId = new Map(produtos.map((p) => [p.id, p]))
  return ids.map((id) => porId.get(id)).filter((p): p is PublicProduct => p !== undefined)
}
