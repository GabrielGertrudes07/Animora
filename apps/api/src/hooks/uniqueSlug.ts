import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Ao criar (incluindo ao duplicar), garante que o slug não colide.
 * Sufixa -copia, -copia-2, -copia-3 até encontrar um livre.
 *
 * Sem isto, duplicar um produto rebenta com um erro de unicidade da
 * base de dados, que não diz nada a quem está a usar o painel.
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

  let attempt = 1
  let candidate = `${data.slug}-copia`

  while (await exists(candidate)) {
    attempt += 1
    candidate = `${data.slug}-copia-${attempt}`
  }

  return { ...data, slug: candidate }
}
