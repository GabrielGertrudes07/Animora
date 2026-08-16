import type { CollectionBeforeDeleteHook, Where } from 'payload'
import { APIError } from 'payload'

import { serializarGuarda } from './serializar'

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
 *
 * ## As duas vias de uma guarda que conta antes de decidir
 *
 * **Dentro do mesmo pedido é segura sem mecanismo nenhum**, ao contrário das
 * outras guardas desta família. Numa eliminação em lote (`DELETE ?where=`) os
 * documentos correm intercalados sobre a mesma transação, mas apagar a marca A
 * não muda quantos produtos publicados usam a marca B — os irmãos do lote não
 * mexem no conjunto que cada guarda conta. Por isso não há aqui a reserva em
 * `req.context` que o `blockUnsellable` e o `protectLastOwner` precisam de ter.
 * Confirmado por medição, 6 de 6 corridas em `brands`, `categories` e `media`.
 *
 * **Entre pedidos furava.** A contagem via o estado anterior às escritas do
 * outro pedido: um `DELETE` em lote contava zero produtos publicados a usar a
 * marca (o produto ainda era rascunho), uma publicação a entrar entre essa
 * contagem e a eliminação da linha confirmava primeiro, e a chave estrangeira
 * `ON DELETE SET NULL` punha `brand` a null num produto já publicado. Estado
 * final medido: produto `published` com `brand: null`, à venda e impossível de
 * gravar — mudar só o título dava 400 "Escolha uma marca.". É textualmente o
 * que este ficheiro diz evitar. Reproduzido por HTTP em 5 de 6 corridas nas
 * três coleções; a janela desloca-se com a duração do pedido, por isso só
 * aparece varrendo o desfasamento (era invisível a 0 e a 50 ms).
 *
 * Fecha-se com a linha abaixo, o mesmo lock consultivo das outras guardas. A
 * ordem deixa de ter estados intermédios: ou a publicação confirma primeiro e a
 * contagem vê-a (400 limpo, nada apagado), ou a eliminação confirma primeiro e
 * a publicação falha ao escrever a referência que já não existe — 500 com
 * rollback, por violação de chave estrangeira ou por `deadlock detected` quando
 * as duas transações já se cruzaram nas linhas dos produtos. Nenhum dos dois é
 * bonito, mas nenhum deixa um produto publicado partido.
 */
export const blockDeleteIfPublished =
  (nome: string, campos: string[]): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    const usada: Where = { or: campos.map((campo) => ({ [campo]: { equals: id } })) }

    // Antes de contar: sem isto a contagem lê o estado anterior a uma publicação
    // concorrente e autoriza apagar aquilo que ela acabou de tornar obrigatório.
    await serializarGuarda(req)

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
