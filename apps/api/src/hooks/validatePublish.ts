import type { CollectionAfterChangeHook } from 'payload'
import { APIError } from 'payload'

/**
 * Recusa publicar produtos incompletos.
 *
 * Rascunhos não passam por aqui de propósito: quem está a meio de
 * carregar um produto não deve ser interrompido.
 *
 * Corre em `afterChange`, DEPOIS do `syncVariants`, e não em `beforeChange`.
 * Em `beforeChange` a validação lia a tabela de variantes antes de o
 * `syncVariants` a reescrever, e portanto validava um conjunto que já não
 * existiria no fim do pedido: um PATCH que publicasse e mudasse as opções ao
 * mesmo tempo passava a olhar para as variantes velhas, e o produto acabava
 * publicado com a variante nova a 0 cêntimos. Na criação era pior — não havia
 * `id` (`originalDoc?.id ?? data.id` é `undefined` no create) e a verificação
 * de variantes era saltada por inteiro, além de as variantes ainda nem
 * existirem nessa altura.
 *
 * Correr depois resolve as duas coisas de uma vez, porque valida o estado
 * final em vez de um estado intermédio. Recusar aqui não deixa nada gravado:
 * a operação apanha o erro e chama `killTransaction`, que faz rollback da
 * transação do pedido inteiro — incluindo as variantes que o `syncVariants`
 * acabou de mexer.
 */
export const validatePublish: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (doc._status !== 'published') return doc

  const problems: string[] = []

  if (!doc.categories || doc.categories.length === 0) {
    problems.push('Escolha pelo menos uma categoria.')
  }

  if (!doc.brand) {
    problems.push('Escolha uma marca.')
  }

  const gallery = doc.gallery ?? []
  if (gallery.length === 0) {
    problems.push('Adicione pelo menos uma imagem.')
  }

  const variants = await req.payload.find({
    collection: 'variants',
    where: {
      and: [
        { product: { equals: doc.id } },
        { active: { equals: true } },
        { priceCents: { greater_than: 0 } },
      ],
    },
    limit: 1,
    depth: 0,
    req,
  })

  if (variants.totalDocs === 0) {
    problems.push(
      'É preciso pelo menos uma variante ativa com preço acima de zero. As variantes só ' +
        'existem depois de o produto estar gravado: grave-o como rascunho, preencha o preço ' +
        'de pelo menos uma variante em /admin/collections/variants, e publique depois.',
    )
  }

  if (problems.length > 0) {
    throw new APIError(`Não é possível publicar:\n• ${problems.join('\n• ')}`, 400)
  }

  return doc
}
