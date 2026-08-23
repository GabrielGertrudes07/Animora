import { apiGet } from '../../lib/api'
import { agregarAvaliacoes, type ResumoAvaliacoes } from '@animora/core'

type Paginated<T> = { docs: T[]; totalDocs: number }

/**
 * As avaliações não se inventam (é regra da própria especificação da loja,
 * `apps/api/src/collections/Reviews.ts`) — por isso este módulo só lê o que a
 * API já filtrou como aprovado e nunca escreve um número por adivinhação.
 * `agregarAvaliacoes` (`@animora/core`) devolve `media: null` sem avaliação
 * nenhuma; quem chama decide então não mostrar estrelas nenhumas, nunca um
 * zero.
 */

/**
 * Resumo de avaliações de um produto.
 *
 * ponytail: uma leitura por produto (N+1 numa grelha de destaques/ofertas).
 * Chega para as poucas dezenas de produtos de uma grelha; um endpoint de
 * agregação em lote é o caminho se a loja crescer muito para além disso.
 */
export async function getAvaliacaoProduto(produtoId: number): Promise<ResumoAvaliacoes> {
  const res = await apiGet<Paginated<{ estrelas: number }>>(
    `/api/reviews?limit=0&depth=0&where[produto][equals]=${produtoId}&where[estado][equals]=aprovada`,
  )
  return agregarAvaliacoes(res.docs.map((d) => d.estrelas))
}

/** Resumo de avaliações de toda a loja, para a prova social da home. */
export async function getAvaliacaoLoja(): Promise<ResumoAvaliacoes> {
  const res = await apiGet<Paginated<{ estrelas: number }>>(
    `/api/reviews?limit=0&depth=0&where[estado][equals]=aprovada`,
  )
  return agregarAvaliacoes(res.docs.map((d) => d.estrelas))
}
