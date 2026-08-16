import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { reservar, serializarGuarda } from './serializar'

/** Variantes que ESTE pedido já decidiu deixar de vender. Ver `serializar.ts`. */
const SEM_VENDA = 'variantesSemVenda'

/**
 * Os produtos que ESTE pedido está a apagar por inteiro.
 *
 * O `deleteVariantsOfProduct` apaga as variantes de propósito, e aí a
 * invariante não faz sentido: o produto publicado também vai desaparecer.
 *
 * É um conjunto de ids e não um booleano: um interruptor ligado uma vez e nunca
 * desligado desativava a guarda para o **pedido inteiro**, incluindo variantes
 * de produtos que não estão a ser apagados. Hoje nenhum caminho mistura as duas
 * coisas no mesmo pedido, portanto era seguro — mas seguro por coincidência, e a
 * coincidência não está escrita em lado nenhum. Guardar os ids custa a mesma
 * linha e passa a ser seguro por construção. Reaproveita o `reservar`, que é
 * exatamente "o que este pedido já decidiu sobre estes ids".
 */
export const A_APAGAR_PRODUTO = 'aApagarProduto'

/** Uma relação vem populada ou como id, conforme o `depth` do pedido. */
export const idDaRelacao = (valor: unknown): number | string | undefined =>
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
 *
 * ## Contar não chega
 *
 * Contar as irmãs e decidir a seguir é atravessado pelos dois lados: por dois
 * pedidos em paralelo, e pelos documentos de uma mesma operação em massa, que o
 * Payload corre intercalados sobre a mesma transação. Nos dois casos cada
 * verificação via as outras variantes ainda vendáveis, todas passavam, e o
 * produto ficava publicado com zero — com 200 e sem erro nenhum. Medido em 6 de
 * 6 corridas nos dois caminhos. Ver `serializar.ts` para o mecanismo; aqui
 * ficam as duas linhas que o usam: a reserva antes do primeiro `await`, e a
 * contagem que exclui tudo o que este pedido já reservou em vez de excluir só
 * esta variante.
 */
const assegurarQueSobraVenda = async (
  produto: number | string | undefined,
  variante: number | string,
  req: PayloadRequest,
): Promise<void> => {
  if (produto === undefined || produto === null) return

  // Só o produto que está mesmo a ser apagado, não o pedido todo.
  const aApagar = req.context[A_APAGAR_PRODUTO]
  if (aApagar instanceof Set && aApagar.has(String(produto))) return

  // Antes de contar: as guardas dos documentos irmãos do lote correm
  // intercaladas com esta, e só veem esta decisão se ela já cá estiver.
  const reservadas = reservar(req, SEM_VENDA, variante)

  // Antes de ler o estado do produto, e não só antes de contar as variantes: um
  // pedido que publique ao mesmo tempo que este tira o preço tem de ficar de um
  // dos lados da linha. Ver `validatePublish`, que pega no mesmo lock.
  await serializarGuarda(req)

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
        { id: { not_in: [...reservadas] } },
      ],
    },
    req,
  })
  if (outras.totalDocs > 0) return

  throw new APIError(
    'Esta é a última variante ativa com preço de um produto publicado. Sem ela o produto ' +
      'ficava publicado na loja sem nada para vender, e nem sequer se conseguia voltar a ' +
      'gravar — a publicação exige exatamente a variante que este pedido tira. Preencha o ' +
      'preço de outra variante primeiro, ou despublique o produto — a ação "Despublicar"; ' +
      'gravar como rascunho não despublica nada, a versão publicada continua no ar e esta ' +
      'recusa mantém-se.',
    400,
  )
}

/** Apagar a última variante vendável de um produto publicado. */
export const blockUnsellableDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const variante = await req.payload.findByID({ collection: 'variants', id, depth: 0, req })
  await assegurarQueSobraVenda(idDaRelacao(variante.product), id, req)
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
    idDaRelacao(originalDoc.product),
    originalDoc.id as number | string,
    req,
  )

  return data
}
