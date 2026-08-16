import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import { serializarGuarda } from './serializar'

/**
 * O stock nunca é escrito em absoluto: só se lhe soma um ajuste.
 *
 * ## O defeito que isto fecha
 *
 * O formulário do painel submete o documento inteiro, com o `stock` que leu
 * quando abriu. Basta uma venda entre abrir e gravar para a gravação repor o
 * número antigo — e não é uma corrida, é o tempo que o formulário fica aberto:
 *
 * ```
 * gestor abre o formulário da variante  → vê stock 5
 * 3 clientes compram 1 unidade cada     → stock real 2, 3 encomendas
 * gestor grava, só corrigiu o EAN       → stock volta a 5
 * ```
 *
 * A loja passa a anunciar e a vender três unidades que não existem. Medido: 24
 * de 24 corridas, com 0, 5, 50 e 500 ms entre a leitura e a gravação, sem
 * concorrência nenhuma. O lock consultivo não protegia nada porque não há
 * corrida a serializar — há um valor velho a sobrepor-se a um novo.
 *
 * ## O mecanismo
 *
 * Um valor absoluto submetido por quem quer que seja é **descartado**: o que
 * fica gravado é sempre `stock atual + ajuste`, com o "atual" lido aqui dentro,
 * debaixo do lock, e não o que o cliente do formulário trouxe. Quem quer mexer
 * no stock a sério diz **quanto muda** (`ajusteStock`: 10 se recebeu
 * mercadoria, −1 se partiu uma unidade), e um delta está certo independentemente
 * do que o formulário mostrava — é a única forma de escrita que a passagem do
 * tempo não corrompe.
 *
 * O checkout desce o stock pelo mesmo canal (`ajusteStock: -quantidade`) e o
 * cancelamento repõe-no da mesma maneira. Um caminho só, sem exceções: se
 * houvesse um segundo caminho a escrever valores absolutos, era esse que voltava
 * a ressuscitar vendas.
 *
 * ## Porquê o lock em TODAS as gravações da variante
 *
 * O Payload lê o documento (`originalDoc`) antes dos hooks e escreve a linha
 * inteira no fim, incluindo colunas que ninguém tocou. Sem lock, uma venda que
 * confirme entre essa leitura e essa escrita era outra vez desfeita — a janela
 * passa de minutos para milissegundos, mas continua lá. Com o lock pedido antes
 * da releitura, ninguém pode escrever stock entre ler e gravar: o checkout
 * precisa do mesmo lock e só o larga no commit.
 *
 * ponytail: é o lock global de `serializar.ts`, agora também no caminho de
 * gravar uma variante (mudar o título ou o EAN passa a esperar por ele durante
 * os milissegundos de cada transação). Teto assumido: são gravações de painel.
 * O caminho de evolução é o mesmo — chave por variante via `hashtext`, e aí é
 * obrigatório fixar uma ordem de aquisição única.
 */
export const ajustarStock: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const pedido: unknown = data.ajusteStock
  // Nunca fica gravado: é uma ordem de movimento, não um estado da variante.
  data.ajusteStock = null

  // Na criação não há valor velho possível — a variante ainda não existia.
  if (operation !== 'update' || !originalDoc) return data

  const ajuste = pedido === null || pedido === undefined ? 0 : pedido
  if (typeof ajuste !== 'number' || !Number.isInteger(ajuste)) {
    throw new APIError(
      `Ajuste de stock inválido: ${JSON.stringify(ajuste)}. Tem de ser um número inteiro de ` +
        'unidades — 10 se recebeu mercadoria, -1 se partiu uma unidade.',
      400,
    )
  }

  // Antes de reler o stock, e não só antes de o escrever. Ver o cabeçalho.
  await serializarGuarda(req)

  const atual = await req.payload.findByID({
    collection: 'variants',
    id: originalDoc.id as number | string,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const novo = (atual.stock as number) + ajuste

  if (novo < 0) {
    throw new APIError(
      `O stock não pode ficar negativo: há ${String(atual.stock)} unidades e o ajuste pedido é ` +
        `de ${ajuste}.`,
      400,
    )
  }

  data.stock = novo
  return data
}
