import type { CollectionBeforeValidateHook } from 'payload'

/** Mesmo teto do `freeSku` em `syncVariants.ts` — mesmo problema (sufixo incremental
 * até encontrar um livre), por isso o mesmo número, para o projeto ser coerente. */
const MAX_ATTEMPTS = 999

/**
 * Ao criar (incluindo ao duplicar), garante que o slug não colide.
 * Sufixa -copia, -copia-2, -copia-3 até encontrar um livre.
 *
 * Sem isto, duplicar um produto rebenta com um erro de unicidade da
 * base de dados, que não diz nada a quem está a usar o painel.
 *
 * ponytail: entre o `exists()` e a gravação há uma janela de corrida — dois pedidos de
 * duplicação quase simultâneos do mesmo produto podem escolher o mesmo candidato. Ao
 * contrário do SKU em `syncVariants` (onde a colisão levava a um 500 por causa do
 * `killTransaction`), aqui o `slug` continua `unique` na base de dados: se a corrida
 * acontecer, o pior caso é o 400 seguro de sempre ("Valor deve ser único"), com rollback,
 * exatamente como seria sem este hook. Duplicar é uma ação manual e deliberada no painel,
 * não um caminho de alto débito — não vale a pena um lock consultivo só para isto agora.
 * Se um dia isto disparar na prática, seguir o padrão de `lockSkuAllocation`.
 */
export const uniqueSlug: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
  collection,
}) => {
  if (operation !== 'create' || !data?.slug) return data

  const exists = async (slug: string): Promise<boolean> => {
    const found = await req.payload.find({
      collection: collection.slug as 'products',
      where: { slug: { equals: slug } },
      limit: 1,
      req,
    })
    return found.totalDocs > 0
  }

  if (!(await exists(data.slug))) return data

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 1 ? `${data.slug}-copia` : `${data.slug}-copia-${attempt}`
    if (!(await exists(candidate))) return { ...data, slug: candidate }
  }

  throw new Error(
    `Não foi possível gerar um slug livre a partir de "${data.slug}" (${MAX_ATTEMPTS} tentativas). Escolha outro slug à mão.`,
  )
}
