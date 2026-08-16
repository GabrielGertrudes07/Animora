import type { PayloadRequest } from 'payload'

/**
 * As duas metades de uma guarda que conta antes de decidir.
 *
 * ## O defeito
 *
 * Uma guarda com a forma "contar os irmãos e depois decidir" é atravessada por
 * duas vias diferentes, e precisa de resposta para as duas:
 *
 * 1. **Entre pedidos.** Dois pedidos concorrentes correm em transações
 *    distintas. Com `read committed`, cada um conta o estado anterior às
 *    escritas do outro, ambos concluem que sobra alguém, ambos escrevem, e a
 *    invariante cai. Verificado: dois `PATCH /api/variants/<id>
 *    {"priceCents":0}` em paralelo deixavam o produto publicado sem nada
 *    vendável em 6 de 6 corridas.
 *
 * 2. **Dentro do mesmo pedido.** Numa operação em massa (`?where=`) o Payload
 *    processa os documentos com `docs.map(...)` + `Promise.all`
 *    (`payload/dist/collections/operations/update.js` e `delete.js`). O
 *    adaptador Postgres não define `bulkOperationsSingleTransaction`, portanto
 *    não há transação nem serialização por documento: as guardas de todos os
 *    documentos correm intercaladas, todas contam antes de qualquer escrita, e
 *    todas passam. Também 6 de 6.
 *
 * ## Porque é preciso um mecanismo para cada
 *
 * `pg_advisory_xact_lock` é por **sessão**: dentro de uma transação é
 * reentrante, e numa operação em massa todos os documentos partilham a mesma
 * transação. O lock resolve (1) e não faz absolutamente nada em (2).
 *
 * A reserva é em `req.context`, que é o mesmo objeto para todos os documentos
 * de um pedido e diferente entre pedidos. Resolve (2) e não faz nada em (1).
 *
 * Não é a mesma escolha do `validatePublish`, que fecha o caso (2) calculando o
 * conjunto futuro com uma função pura em vez de contar: ali as opções do
 * produto chegam todas no mesmo documento, portanto o estado final é
 * calculável. Aqui o que decide está espalhado pelos documentos irmãos do lote,
 * que a guarda não vê — só sabe deles à medida que passam por ela. Daí registar
 * o que já se decidiu tirar, em vez de o calcular.
 *
 * ## Uma chave só
 *
 * `pg_advisory_xact_lock` com uma chave única para o projeto inteiro: atribuição
 * de SKU, publicação, e as guardas de eliminação. Dois locks adquiridos por
 * ordens diferentes é deadlock; com um só, a ordem não existe e o ciclo é
 * impossível por construção. Larga sozinho no commit e no rollback.
 *
 * ponytail: um lock global para todas as guardas. Serializa gravações de
 * catálogo sem relação entre si durante os milissegundos de cada transação —
 * teto assumido, porque estas são gravações de painel de administração (um
 * punhado por minuto), não caminho de cliente. Se um dia incomodar, passa a uma
 * chave por entidade (`hashtext` do id do produto, da marca, 'users'), mas aí é
 * obrigatório fixar uma ordem de aquisição única e respeitá-la em todos os
 * caminhos — em particular no `syncVariants`, que já apaga variantes (guarda da
 * variante) antes de atribuir SKUs.
 */
const CHAVE = 918273

/**
 * Serializa este pedido contra os outros até ao fim da transação.
 *
 * Falha alto quando não há transação, em vez de retornar em silêncio: sem ela a
 * proteção desaparecia sem nada no log a explicar porquê, e a corrida voltava.
 * Assim, desativar transações passa a ser uma decisão consciente.
 */
export async function serializarGuarda(req: PayloadRequest): Promise<void> {
  const transactionID = await req.transactionID
  const session = transactionID ? req.payload.db.sessions?.[String(transactionID)] : undefined

  if (!session) {
    throw new Error(
      'Sem transação não é possível serializar as guardas do catálogo: duas gravações ao ' +
        'mesmo tempo contam ambas o estado anterior e passam ambas — dois produtos escolhem o ' +
        'mesmo SKU, o último par de variantes vendáveis desaparece de um produto publicado, ou ' +
        'o último proprietário é apagado. Desativar transações (`disableTransaction` na ' +
        'gravação, ou `transactionOptions: false` no adaptador) reabre essas corridas — ou se ' +
        'grava dentro da transação do pedido, ou se garante a invariante à mão.',
    )
  }

  const db = session.db as { execute: (query: string) => Promise<unknown> }
  await db.execute(`select pg_advisory_xact_lock(${CHAVE})`)
}

/**
 * Regista que este pedido já decidiu tirar `id`, e devolve tudo o que ele já
 * decidiu tirar até agora — incluindo este.
 *
 * Tem de ser chamada **antes do primeiro `await` da guarda**. É o que garante
 * que, num lote, a última guarda a correr vê as decisões de todas as outras: o
 * conjunto só cresce, portanto quem chega ao fim conta zero e recusa. Se duas
 * se cruzarem antes de qualquer contagem, recusam as duas — mais conservador do
 * que o caminho de documento único, e do lado certo.
 */
export function reservar(
  req: PayloadRequest,
  chave: string,
  id: number | string,
): Set<string> {
  const atual = req.context[chave]
  const reservados = atual instanceof Set ? (atual as Set<string>) : new Set<string>()
  req.context[chave] = reservados
  reservados.add(String(id))
  return reservados
}
