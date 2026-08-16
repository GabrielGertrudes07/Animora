import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'

/**
 * Marca, no pedido, que é o produto inteiro que está a ser apagado.
 *
 * O `deleteVariantsOfProduct` apaga as variantes de propósito, e aí a
 * invariante não faz sentido: o produto publicado também vai desaparecer.
 */
export const A_APAGAR_PRODUTO = 'aApagarProduto'

/** O campo `product` da variante vem populado ou como id, conforme o `depth`. */
const idDoProduto = (valor: unknown): number | string | undefined =>
  typeof valor === 'object' && valor !== null
    ? (valor as { id?: number | string }).id
    : (valor as number | string | undefined)

/**
 * Recusa deixar um produto **publicado** sem nenhuma variante ativa com preço.
 *
 * A invariante "publicado ⇒ pelo menos uma variante ativa com preço acima de
 * zero" era imposta só ao gravar o produto. Pelo lado da variante não havia
 * nada: apagar a única variante com preço devolvia 200 e deixava o produto
 * publicado com zero variantes; pôr-lhe `priceCents: 0` ou `active: false`
 * também. A partir daí qualquer gravação do produto dava 400 — publicado,
 * inválido, e impossível de gravar sem primeiro despublicar.
 *
 * É a mesma armadilha que o `blockDeleteIfPublished` já fecha em `brands`,
 * `categories` e `media`, e fecha-se da mesma maneira: recusar o gesto que
 * partiria o produto, em vez de despublicar em cascata. Despublicar em silêncio
 * tirava artigos da loja sem ninguém pedir e sem lista de quais foram.
 *
 * Na fase 2 a versão sem guarda é um artigo publicado a 0 €, ou sem variante
 * nenhuma, à vista do cliente.
 *
 * Só se aplica a produtos publicados. Num rascunho mexe-se à vontade — é para
 * isso que serve, e a publicação valida o resultado.
 */
const assegurarQueSobraVenda = async (
  produto: number | string | undefined,
  variante: number | string,
  req: PayloadRequest,
): Promise<void> => {
  if (produto === undefined || produto === null) return
  if (req.context[A_APAGAR_PRODUTO]) return

  const publicado = await req.payload.count({
    collection: 'products',
    where: { and: [{ id: { equals: produto } }, { _status: { equals: 'published' } }] },
    req,
  })
  if (publicado.totalDocs === 0) return

  const outras = await req.payload.count({
    collection: 'variants',
    where: {
      and: [
        { product: { equals: produto } },
        { active: { equals: true } },
        { priceCents: { greater_than: 0 } },
        { id: { not_equals: variante } },
      ],
    },
    req,
  })
  if (outras.totalDocs > 0) return

  throw new APIError(
    'Esta é a última variante ativa com preço de um produto publicado. Sem ela o produto ' +
      'ficava publicado na loja sem nada para vender, e nem sequer se conseguia voltar a ' +
      'gravar — a publicação exige exatamente a variante que este pedido tira. Preencha o ' +
      'preço de outra variante primeiro, ou despublique o produto (grave-o como rascunho) ' +
      'antes de mexer nesta.',
    400,
  )
}

/** Apagar a última variante vendável de um produto publicado. */
export const blockUnsellableDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const variante = await req.payload.findByID({ collection: 'variants', id, depth: 0, req })
  await assegurarQueSobraVenda(idDoProduto(variante.product), id, req)
}

/** Zerar o preço ou desativar a última variante vendável de um produto publicado. */
export const blockUnsellableChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) return data

  const ativa = (data.active ?? originalDoc.active) as boolean
  const preco = (data.priceCents ?? originalDoc.priceCents) as number
  if (ativa && preco > 0) return data

  // ponytail: mudar a variante de produto (`data.product`) não é verificado — a
  // linha continua vendável, só que noutro sítio, e mover variantes entre
  // produtos não é fluxo do painel. Se um dia for, verificar também o produto
  // de origem aqui.
  await assegurarQueSobraVenda(
    idDoProduto(originalDoc.product),
    originalDoc.id as number | string,
    req,
  )

  return data
}
