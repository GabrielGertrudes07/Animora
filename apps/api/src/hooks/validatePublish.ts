import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

/**
 * Recusa publicar produtos incompletos.
 *
 * Rascunhos não passam por aqui de propósito: quem está a meio de
 * carregar um produto não deve ser interrompido.
 */
export const validatePublish: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  if (data._status !== 'published') return data

  const problems: string[] = []

  if (!data.categories || data.categories.length === 0) {
    problems.push('Escolha pelo menos uma categoria.')
  }

  if (!data.brand) {
    problems.push('Escolha uma marca.')
  }

  const gallery = data.gallery ?? []
  if (gallery.length === 0) {
    problems.push('Adicione pelo menos uma imagem.')
  }

  const productId = originalDoc?.id ?? data.id
  if (productId) {
    const variants = await req.payload.find({
      collection: 'variants',
      where: {
        and: [
          { product: { equals: productId } },
          { active: { equals: true } },
          { priceCents: { greater_than: 0 } },
        ],
      },
      limit: 1,
      req,
    })

    if (variants.totalDocs === 0) {
      problems.push('É preciso pelo menos uma variante ativa com preço acima de zero.')
    }
  }

  if (problems.length > 0) {
    throw new APIError(`Não é possível publicar:\n• ${problems.join('\n• ')}`, 400)
  }

  return data
}
