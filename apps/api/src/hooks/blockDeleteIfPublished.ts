import type { CollectionBeforeDeleteHook, Where } from 'payload'
import { APIError } from 'payload'

/**
 * Recusa apagar um documento que produtos publicados ainda usam.
 *
 * Sem isto, `DELETE /api/brands/1` devolve 200 mesmo com produtos publicados a
 * apontar-lhe: o adaptador põe `brand` a null, `categories` a vazio e
 * `gallery[].image` a null, o produto **continua publicado**, e a partir daí
 * toda a gravação é recusada com 400 pelo `validatePublish` — que exige
 * exatamente aquilo que a eliminação acabou de tirar. Produto partido e
 * imutável ao mesmo tempo, sem forma de o desfazer pelo painel.
 *
 * Recusar em vez de despublicar automaticamente:
 *
 * - as referências são apagadas de qualquer maneira, publicado ou não.
 *   Despublicar só evitava a metade "imutável" do problema; recusar evita a
 *   perda de dados, que é a outra metade e a que não tem volta.
 * - despublicar em cascata tira produtos da loja em silêncio. Quem apaga uma
 *   marca que já não trabalha não espera que quarenta artigos desapareçam do
 *   catálogo, e não fica com lista nenhuma de quais foram para os repor.
 * - apagar uma marca é um gesto raro e deliberado. Custa-lhe um passo a mais;
 *   perder vendas de artigos que sumiram do catálogo custa bastante mais.
 *
 * O bloqueio é só para produtos **publicados**. Um rascunho que perde a marca
 * não está à venda, corrige-se antes de publicar, e a validação de publicação
 * apanha-o.
 */
export const blockDeleteIfPublished =
  (nome: string, campos: string[]): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    const usada: Where = { or: campos.map((campo) => ({ [campo]: { equals: id } })) }

    const { totalDocs } = await req.payload.count({
      collection: 'products',
      where: { and: [{ _status: { equals: 'published' } }, usada] },
      req,
    })

    if (totalDocs > 0) {
      throw new APIError(
        `Não é possível apagar ${nome}: ${totalDocs} ${
          totalDocs === 1 ? 'produto publicado usa-a' : 'produtos publicados usam-na'
        }. Apagá-la deixava esses produtos publicados na loja mas inválidos — sem a ` +
          `referência que a publicação exige — e impossíveis de gravar até serem ` +
          `corrigidos. Corrija-os ou despublique-os primeiro.`,
        400,
      )
    }
  }
