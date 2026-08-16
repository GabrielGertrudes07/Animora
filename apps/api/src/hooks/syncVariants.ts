import type { CollectionAfterChangeHook, CollectionBeforeDeleteHook, PayloadRequest } from 'payload'
import { mergeVariants, buildSku, combinationKey } from '@animora/core'
import type { Combination, VariantOption, VariantRow } from '@animora/core'

import { A_APAGAR_PRODUTO } from './blockUnsellable'
import { serializarGuarda } from './serializar'

/**
 * Fecha a janela entre escolher o SKU e gravá-lo.
 *
 * `count` e `create` não são atómicos: dois pedidos concorrentes contavam ambos zero,
 * escolhiam o mesmo SKU e o segundo levava com 400 "Valor deve ser único" sem razão
 * aparente para quem está no painel.
 *
 * Apanhar a violação de unicidade e repetir com o sufixo seguinte não funciona neste
 * Payload: a operação `create` aninhada trata o erro com `killTransaction`, que faz
 * rollback da transação do pedido inteiro e apaga a sessão. A repetição passaria a
 * escrever fora de qualquer transação, onde o produto ainda não existe, e o 400
 * virava um 500 por chave estrangeira. Confirmado a correr — ver o relatório.
 *
 * Logo: em vez de recuperar da colisão, serializa-se quem pode atribuir SKU. O lock
 * consultivo está em `serializar.ts`, partilhado com as outras guardas que contam
 * antes de decidir — uma chave só para o projeto inteiro, para não haver ordem de
 * aquisição e portanto não haver deadlock possível.
 *
 * Primeiro SKU livre a partir do sugerido: `HAP-COL`, `HAP-COL-2`, `HAP-COL-3`, ...
 *
 * `buildSku` é só uma sugestão — a unicidade é da base de dados. Dois produtos da
 * mesma marca com títulos parecidos ("Coleira azul", "Coleira antipulgas") produzem
 * o mesmo prefixo e a criação rebentava com erro de unicidade. Corre dentro da
 * transação do pedido, por isso vê as variantes criadas neste mesmo `save`.
 */
async function freeSku(base: string, req: PayloadRequest): Promise<string> {
  for (let n = 1; n <= 999; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const { totalDocs } = await req.payload.count({
      collection: 'variants',
      where: { sku: { equals: candidate } },
      req,
    })
    if (totalDocs === 0) return candidate
  }
  throw new Error(`Não foi possível gerar um SKU livre a partir de "${base}". Defina-o à mão.`)
}

/** Uma linha do array `options` do produto, como o painel a grava. */
export type OpcaoDoPainel = { name: string; values?: { value: string }[] | null }

/**
 * O Payload devolve `values` como [{ id, value }]; o core espera string[].
 * Sem este mapeamento, `mergeVariants` gera combinações erradas em silêncio.
 * Exportado para o `validatePublish` derivar as combinações exatamente da
 * mesma maneira que este hook — se as duas leituras divergirem, a validação
 * volta a aprovar um conjunto de variantes diferente do que fica gravado.
 */
export const opcoesDoCore = (options?: OpcaoDoPainel[] | null): VariantOption[] =>
  (options ?? []).map((o) => ({
    name: o.name,
    values: (o.values ?? []).map((v) => v.value),
  }))

/**
 * Todas as variantes do produto, sem paginação.
 *
 * `limit: 0` é mesmo "sem limite" (`@payloadcms/drizzle/dist/find/findMany.js`:
 * `if (limit === 0) { limit = undefined }`). Com o limite por defeito de 10, as
 * variantes acima da décima seriam tratadas como inexistentes e recriadas a
 * zero — perda de preços silenciosa em qualquer produto com duas opções
 * (4 tamanhos × 3 cores já são 12). Não tirar.
 */
export const variantesDoProduto = async (
  produto: number | string,
  req: PayloadRequest,
): Promise<Record<string, unknown>[]> => {
  const { docs } = await req.payload.find({
    collection: 'variants',
    where: { product: { equals: produto } },
    limit: 0,
    depth: 0,
    req,
  })
  return docs as unknown as Record<string, unknown>[]
}

/** A linha da base de dados na forma que o core conhece. */
export const linhaDoCore = (d: Record<string, unknown>): VariantRow => ({
  combination: d.combination as Combination,
  sku: d.sku as string,
  priceCents: d.priceCents as number,
  stock: d.stock as number,
  active: d.active as boolean,
})

/**
 * Mantém a tabela de variantes alinhada com as opções do produto.
 *
 * Preserva preço e stock das combinações que continuam a existir — não por as
 * reescrever com os valores certos, mas por nunca lhes tocar: só cria as que
 * faltam e apaga as que deixaram de ser possíveis. É a Task 4 do core aplicada
 * à base de dados.
 *
 * Num rascunho, cria mas nunca apaga. Uma gravação de rascunho não escreve na
 * tabela `products` — o Payload só grava a versão (`if (!isSavingDraft)` em
 * `payload/dist/collections/operations/utilities/update.js`), logo as opções
 * publicadas ficam intactas. Apagar variantes aí destruía preço e stock de
 * combinações que a versão publicada continua a anunciar, sem recuperação
 * possível: `variants` não tem versões. Criar é inofensivo e necessário — é o
 * que permite preencher os preços das combinações novas ANTES de publicar,
 * agora que publicar exige pelo menos uma variante ativa com preço acima de
 * zero. Ao publicar, o hook corre por inteiro e a matriz volta a ficar
 * exatamente igual às opções publicadas.
 */
export const syncVariants: CollectionAfterChangeHook = async ({ doc, req }) => {
  const options = opcoesDoCore(doc.options)

  const existingDocs = await variantesDoProduto(doc.id, req)
  const existing: VariantRow[] = existingDocs.map(linhaDoCore)

  const merged = mergeVariants(existing, options)
  const mergedKeys = new Set(merged.map((r) => combinationKey(r.combination)))
  const existingKeys = new Set(existing.map((r) => combinationKey(r.combination)))

  // Apagar as que deixaram de ser possíveis — nunca em rascunho (ver acima)
  if (doc._status !== 'draft') {
    for (const d of existingDocs) {
      if (!mergedKeys.has(combinationKey(d.combination as Combination))) {
        await req.payload.delete({ collection: 'variants', id: d.id as number, req })
      }
    }
  }

  const missing = merged.filter((r) => !existingKeys.has(combinationKey(r.combination)))
  if (missing.length === 0) return doc

  await serializarGuarda(req)

  // A marca vem populada, como id, ou pode nem existir ainda — é obrigatória para publicar
  // (ver validatePublish) mas não para gravar rascunho, e "título escrito, marca por
  // escolher" é o rascunho a meio mais comum do painel. Resolver por id só quando há
  // mesmo um id: se a marca existe mas veio só como id (conforme o `depth` do pedido),
  // continua a ser preciso o `findByID` — uma ronda anterior tirou daqui um literal 'GEN'
  // fixo precisamente porque ele fazia o mesmo produto gerar prefixos diferentes conforme
  // o depth. Não reintroduzir esse caso: o 'GEN' abaixo só entra quando `doc.brand` é
  // null/undefined (sem marca nenhuma), nunca quando é um id por resolver.
  const brandName =
    typeof doc.brand === 'object' && doc.brand !== null
      ? String(doc.brand.name)
      : doc.brand
        ? String(
            (await req.payload.findByID({ collection: 'brands', id: doc.brand, depth: 0, req }))
              .name,
          )
        : 'GEN'

  for (const row of missing) {
    await req.payload.create({
      collection: 'variants',
      data: {
        product: doc.id,
        combination: row.combination,
        sku: await freeSku(buildSku(brandName, String(doc.title), row.combination), req),
        priceCents: 0,
        stock: 0,
        active: true,
      },
      req,
    })
  }

  return doc
}

/**
 * Apaga as variantes do produto antes de o produto desaparecer.
 *
 * O campo `product` das variantes é `required: true`, mas o adaptador Postgres
 * gera `ON DELETE SET NULL` na chave estrangeira. Apagar um produto tentava pôr
 * `variants.product_id` a NULL numa coluna NOT NULL e rebentava com 500
 * (`null value in column "product_id" ... violates not-null constraint`). Como
 * `generateCombinations([])` devolve `[{}]`, todo o produto tem sempre pelo
 * menos uma variante — o erro disparava em todas as eliminações, sem exceção.
 *
 * `beforeDelete` corre dentro da transação do pedido, antes do `deleteOne` do
 * produto (`payload/dist/collections/operations/deleteByID.js`), por isso as
 * variantes já não existem quando a chave estrangeira é avaliada. Se a
 * eliminação do produto falhar mais à frente, o rollback repõe as variantes.
 */
export const deleteVariantsOfProduct: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // O guarda da coleção `variants` recusa apagar a última variante vendável de
  // um produto publicado. Aqui é para apagar mesmo: o produto vai desaparecer
  // com elas, e sem esta marca nenhum produto publicado e precificado se
  // conseguiria apagar.
  req.context[A_APAGAR_PRODUTO] = true

  await req.payload.delete({
    collection: 'variants',
    where: { product: { equals: id } },
    req,
  })
}
