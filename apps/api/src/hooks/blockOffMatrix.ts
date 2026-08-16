import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'
import { combinationKey, generateCombinations } from '@animora/core'
import type { Combination } from '@animora/core'

import { idDaRelacao } from './blockUnsellable'
import { opcoesDoCore } from './syncVariants'
import type { OpcaoDoPainel } from './syncVariants'

/** `{ Tamanho: 'S' }` → `Tamanho: S`. */
const legivel = (c: Combination): string =>
  Object.entries(c)
    .map(([nome, valor]) => `${nome}: ${valor}`)
    .join(', ') || '(sem opções)'

/** O campo JSON chega como texto quando vem da caixa do painel. */
const tentarLer = (texto: string): unknown => {
  try {
    return JSON.parse(texto)
  } catch {
    return undefined
  }
}

/**
 * Recusa mudar a combinação de uma variante para fora da matriz do produto.
 *
 * `PATCH /api/variants/<id> {"combination":{"Tamanho":"XL"}}` num produto cujas
 * opções são só `[S]` devolvia 200. O produto ficava publicado, com uma variante
 * ativa e com preço — e à mesma encravado: `mergeVariants` gera a matriz a
 * partir das opções, a linha XL não corresponde a nenhuma, portanto não conta
 * para a publicação e é apagada (com preço e stock) na gravação seguinte do
 * produto. A partir daí toda a gravação dava 400. Recupera-se repondo a
 * combinação à mão, se alguém perceber que é isso que falta.
 *
 * Só na **alteração** de uma combinação já existente, e só quando ela muda
 * mesmo:
 *
 * - o `syncVariants` nunca altera combinações (só cria e apaga), portanto não
 *   passa por aqui;
 * - gravar o preço de uma variante submete a combinação inalterada, e sai na
 *   comparação de chaves — incluindo o caso do rascunho que reduziu as opções e
 *   ficou com variantes da versão publicada, que continuam a poder ser editadas.
 *   Era esta a maneira de partir o fluxo de rascunho, e não parte;
 * - a criação fica de fora de propósito: quem cria é o `syncVariants`, sempre
 *   dentro da matriz, e apertar aí arriscava recusar gravações legítimas de
 *   produto sem fechar nenhum caminho que a edição não feche.
 *
 * A matriz é lida com `draft: true`, como o `validateCombination` da coleção:
 * conta a versão mais recente do produto, que é a que o utilizador tem à frente.
 *
 * Lê o produto e decide sem serialização, que é a forma das guardas que furaram
 * — analisado, e aqui não bloqueia: o pior que uma gravação de produto em
 * paralelo produz é uma combinação aceite contra a matriz de um instante antes,
 * e essa é exatamente a decisão que a gravação do produto já toma sozinha (o
 * `syncVariants` repõe a matriz na gravação seguinte). Não há invariante de
 * produto publicado a proteger deste lado — a que existe é a do `blockUnsellable`,
 * que serializa.
 */
export const blockOffMatrix: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) return data

  // O campo é JSON: pode chegar como objeto ou como texto. O que não for um
  // objeto simples é problema do `validateCombination`, que dá a mensagem certa.
  const bruto: unknown =
    typeof data.combination === 'string' ? tentarLer(data.combination) : data.combination
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return data

  const nova = bruto as Combination
  const anterior = originalDoc.combination as Combination
  if (combinationKey(nova) === combinationKey(anterior)) return data

  const produto = idDaRelacao(data.product ?? originalDoc.product)
  if (produto === undefined || produto === null) return data

  const pai = await req.payload.findByID({
    collection: 'products',
    id: produto,
    depth: 0,
    draft: true,
    req,
  })

  const matriz = generateCombinations(opcoesDoCore(pai.options as OpcaoDoPainel[] | null))
  if (matriz.some((c) => combinationKey(c) === combinationKey(nova))) return data

  throw new APIError(
    `A combinação "${legivel(nova)}" não corresponde a nenhuma opção de "${String(pai.title)}". ` +
      `As combinações possíveis são: ${matriz.map(legivel).join(' / ')}. Uma variante fora ` +
      `desta matriz não conta para a publicação e é apagada, com preço e stock, na gravação ` +
      `seguinte do produto — o produto ficaria publicado e impossível de gravar. Para vender ` +
      `esta combinação, acrescente-a às opções do produto primeiro: a variante é criada ` +
      `sozinha, e é essa que se precifica.`,
    400,
  )
}
