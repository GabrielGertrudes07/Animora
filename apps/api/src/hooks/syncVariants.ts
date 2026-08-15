import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { mergeVariants, buildSku, combinationKey } from '@animora/core'
import type { Combination, VariantOption, VariantRow } from '@animora/core'

/** Chave do lock consultivo. Arbitrária — só tem de ser sempre a mesma. */
const SKU_LOCK_KEY = 918273

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
 * Logo: em vez de recuperar da colisão, serializa-se quem pode atribuir SKU.
 * `pg_advisory_xact_lock` larga sozinho no commit ou no rollback, sem limpeza nem
 * esperas. Com `read committed`, quem espera vê as linhas de quem confirmou antes.
 *
 * ponytail: um lock único para toda a atribuição de SKU. Serializa gravações de
 * produtos diferentes durante os milissegundos da transação — para uma loja com um
 * punhado de gravações por minuto chega. Se um dia incomodar, passa a lock por
 * marca (`hashtext` do prefixo), mas aí é preciso ordenar as chaves para não haver
 * deadlock entre pedidos que tocam nas mesmas marcas.
 */
async function lockSkuAllocation(req: PayloadRequest): Promise<void> {
  const transactionID = await req.transactionID
  const session = transactionID ? req.payload.db.sessions?.[String(transactionID)] : undefined

  // Sem transação (ex.: `disableTransaction`) não há nada para serializar.
  if (!session) return

  const db = session.db as { execute: (query: string) => Promise<unknown> }
  await db.execute(`select pg_advisory_xact_lock(${SKU_LOCK_KEY})`)
}

/**
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

/**
 * Mantém a tabela de variantes alinhada com as opções do produto.
 *
 * Preserva preço e stock das combinações que continuam a existir — não por as
 * reescrever com os valores certos, mas por nunca lhes tocar: só cria as que
 * faltam e apaga as que deixaram de ser possíveis. É a Task 4 do core aplicada
 * à base de dados.
 */
export const syncVariants: CollectionAfterChangeHook = async ({ doc, req }) => {
  // O Payload devolve `values` como [{ id, value }]; o core espera string[].
  // Sem este mapeamento, mergeVariants gera combinações erradas em silêncio.
  const options: VariantOption[] = (doc.options ?? []).map(
    (o: { name: string; values?: { value: string }[] | null }) => ({
      name: o.name,
      values: (o.values ?? []).map((v) => v.value),
    }),
  )

  const { docs: existingDocs } = await req.payload.find({
    collection: 'variants',
    where: { product: { equals: doc.id } },
    limit: 0,
    depth: 0,
    req,
  })

  const existing: VariantRow[] = existingDocs.map((d) => ({
    combination: d.combination as Combination,
    sku: d.sku as string,
    priceCents: d.priceCents as number,
    stock: d.stock as number,
    active: d.active as boolean,
  }))

  const merged = mergeVariants(existing, options)
  const mergedKeys = new Set(merged.map((r) => combinationKey(r.combination)))
  const existingKeys = new Set(existing.map((r) => combinationKey(r.combination)))

  // Apagar as que deixaram de ser possíveis
  for (const d of existingDocs) {
    if (!mergedKeys.has(combinationKey(d.combination as Combination))) {
      await req.payload.delete({ collection: 'variants', id: d.id, req })
    }
  }

  const missing = merged.filter((r) => !existingKeys.has(combinationKey(r.combination)))
  if (missing.length === 0) return doc

  await lockSkuAllocation(req)

  // A marca vem populada ou como id, conforme o `depth` do pedido. Sem resolver o id,
  // o SKU saía "GEN-..." em metade das gravações.
  const brand =
    typeof doc.brand === 'object' && doc.brand !== null
      ? doc.brand
      : await req.payload.findByID({ collection: 'brands', id: doc.brand, depth: 0, req })

  for (const row of missing) {
    await req.payload.create({
      collection: 'variants',
      data: {
        product: doc.id,
        combination: row.combination,
        sku: await freeSku(buildSku(String(brand.name), String(doc.title), row.combination), req),
        priceCents: 0,
        stock: 0,
        active: true,
      },
      req,
    })
  }

  return doc
}
