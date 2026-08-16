import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'
import { mergeVariants } from '@animora/core'

import { linhaDoCore, opcoesDoCore, variantesDoProduto } from './syncVariants'
import type { OpcaoDoPainel } from './syncVariants'

/**
 * Recusa publicar produtos incompletos.
 *
 * Rascunhos não passam por aqui de propósito: quem está a meio de carregar um
 * produto não deve ser interrompido.
 *
 * ## Porquê `beforeChange` e porque é que isso não repete o defeito antigo
 *
 * Este hook já esteve em `beforeChange` e foi movido para `afterChange` por um
 * motivo real: lia a tabela de variantes ANTES de o `syncVariants` a reescrever,
 * portanto um pedido que publicasse e mudasse as opções ao mesmo tempo validava
 * o conjunto velho e deixava passar um produto publicado com a variante nova a
 * 0 cêntimos.
 *
 * Correr em `afterChange` resolveu isso mas assentava numa garantia que só
 * existe no caminho de documento único: o `killTransaction` que faz rollback
 * quando um hook rebenta. Na atualização em massa (`PATCH ?where=...`, que é o
 * botão "Publicar" da lista do painel) o adaptador Postgres não define
 * `bulkOperationsSingleTransaction`, logo não há transação por documento — o
 * erro do `afterChange` é apanhado, empurrado para `errors[]` e a transação
 * exterior faz **commit** (`payload/dist/collections/operations/update.js`).
 * Resultado verificado: produto publicado à mesma, variante antiga apagada pelo
 * `syncVariants` e a nova a 0 cêntimos. A recusa gravava exatamente aquilo que
 * dizia estar a recusar.
 *
 * A saída não é escolher entre os dois momentos: é validar o estado FINAL antes
 * de escrever seja o que for. `mergeVariants` é uma função pura, e é ela que
 * decide o que o `syncVariants` vai deixar na tabela — logo o conjunto final é
 * calculável aqui, sem depender de nada já gravado. Lê-se a tabela como ela
 * está, aplica-se-lhe as opções que ESTE pedido traz, e valida-se o resultado.
 * Não é o "conjunto antigo" do defeito original: é o mesmo `mergeVariants(
 * existentes, opções)` que o `syncVariants` corre a seguir, com as mesmas
 * entradas, pelas mesmas funções partilhadas (`variantesDoProduto`,
 * `linhaDoCore`, `opcoesDoCore`) — se divergissem, divergiam as duas.
 *
 * Com a validação antes da escrita, uma recusa não deixa nada gravado em
 * nenhum dos dois caminhos, e por motivos diferentes: no documento único porque
 * o `killTransaction` faz rollback; na operação em massa porque para aquele
 * documento nunca chegou a haver escrita nenhuma — o `beforeChange` corre antes
 * do `db.updateOne` e do `saveVersion`
 * (`payload/dist/collections/operations/utilities/update.js`).
 *
 * Num lote misto o documento válido é publicado e o inválido é recusado, com o
 * id do recusado em `errors[]`. É o comportamento certo: cada produto é
 * independente, e recusar o lote inteiro por causa de um obrigaria a repetir o
 * trabalho já bom dos outros.
 *
 * O que ficou de fora, e porquê:
 * - **Bloquear as operações em massa que publicam.** Fechava o buraco sem
 *   resolver a causa, e tirava o botão "Publicar" da lista do painel, que é
 *   legítimo e útil para produtos já precificados.
 * - **Manter a validação em `afterChange` e rebentar a transação à mão** (por
 *   ex. chamar `killTransaction`). Na operação em massa isso apagaria também o
 *   trabalho dos documentos válidos do mesmo lote, e o Payload continuaria a
 *   devolver 200 com os documentos "atualizados" que afinal não ficaram
 *   gravados — pior do que o defeito.
 * - **Validar nos dois sítios.** Duas cópias da mesma regra, uma delas
 *   inalcançável quando a outra funciona.
 */
export const validatePublish: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  // Numa gravação de rascunho o Payload põe `data._status = 'draft'` antes dos
  // hooks. Num PATCH que só muda campos de um produto já publicado, `_status`
  // nem vem nos dados — o estado final é o que o documento já tinha.
  const estadoFinal = data._status ?? originalDoc?._status
  if (estadoFinal !== 'published') return data

  // `data` é só o que o pedido traz (na operação em massa é literalmente
  // `{_status:'published'}`); o resto do documento vem do `originalDoc`.
  const campo = <T,>(nome: string): T | undefined =>
    (data[nome] ?? originalDoc?.[nome]) as T | undefined

  const problems: string[] = []

  if ((campo<unknown[]>('categories') ?? []).length === 0) {
    problems.push('Escolha pelo menos uma categoria.')
  }

  if (!campo('brand')) {
    problems.push('Escolha uma marca.')
  }

  if ((campo<unknown[]>('gallery') ?? []).length === 0) {
    problems.push('Adicione pelo menos uma imagem.')
  }

  // Na criação não há id nem variantes: `mergeVariants` devolve tudo a zero e a
  // publicação é recusada, que é o correto — as variantes só nascem depois de o
  // produto existir, portanto nenhum produto pode nascer já publicado.
  const id = originalDoc?.id as number | string | undefined
  const existentes = id ? (await variantesDoProduto(id, req)).map(linhaDoCore) : []
  const finais = mergeVariants(existentes, opcoesDoCore(campo<OpcaoDoPainel[]>('options')))

  if (!finais.some((v) => v.active && v.priceCents > 0)) {
    problems.push(
      'É preciso pelo menos uma variante ativa com preço acima de zero. As variantes só ' +
        'existem depois de o produto estar gravado: grave-o como rascunho, preencha o preço ' +
        'de pelo menos uma variante em /admin/collections/variants, e publique depois. Se ' +
        'este pedido também muda as opções, as variantes que deixam de existir levam o preço ' +
        'com elas — mude as opções primeiro, preencha os preços, e só depois publique.',
    )
  }

  if (problems.length > 0) {
    throw new APIError(`Não é possível publicar:\n• ${problems.join('\n• ')}`, 400)
  }

  return data
}
