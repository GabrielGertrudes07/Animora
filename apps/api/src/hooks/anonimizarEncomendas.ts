import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * Apagar uma conta anonimiza as encomendas dela, em vez de as apagar ou de dar
 * 500.
 *
 * ## O que estava partido
 *
 * `orders.cliente_id` era `NOT NULL` e a chave estrangeira que o adaptador gera
 * é `ON DELETE SET NULL`:
 *
 * ```
 * DELETE /api/customers/<id com encomendas>  →  500 "Something went wrong"
 * null value in column "cliente_id" of relation "orders" violates not-null constraint
 * ```
 *
 * É a mesma armadilha que o `deleteVariantsOfProduct` fecha em `products →
 * variants`. Sem conta com encomendas apagava bem, o que a fazia parecer
 * resolvida.
 *
 * ## Porque anonimizar e não apagar
 *
 * As duas exigências parecem opostas e não são. O RGPD manda apagar os **dados
 * pessoais**; a contabilidade manda guardar a **venda** — em Portugal os
 * documentos de faturação guardam-se anos. Apagar as encomendas com o cliente
 * destruía registo contabilístico (e a receita do dashboard mudava de valor
 * conforme quem pede o apagamento); guardá-las como estão não apagava nada.
 *
 * Fica o que é da loja — número, linhas, quantidades, preços, custos, estado,
 * datas — e sai o que é da pessoa: a ligação à conta, o email e a morada de
 * envio. O que resta não identifica ninguém e continua a somar para as contas.
 *
 * Por isso é que `cliente` deixou de ser `required`: "sem cliente" passou a ser
 * um estado legítimo de uma encomenda, e o único que existe é este. A regra de
 * leitura não muda de sentido — `proprioOuStaff` filtra por `cliente`, logo uma
 * encomenda anonimizada deixa de ser de alguém e fica só visível ao staff.
 *
 * Corre em `beforeDelete`, dentro da transação do pedido: ou a conta desaparece
 * e as encomendas ficam anónimas, ou não acontece nada. Se a eliminação falhar
 * mais à frente, o rollback repõe os dados pessoais.
 *
 * ponytail: o que sai é substituído por marcadores fixos, não guardado em lado
 * nenhum. Não há "desfazer" — é a intenção de um pedido de apagamento. Se um dia
 * for preciso emitir a fatura de uma encomenda anonimizada, o nome tem de vir do
 * documento fiscal já emitido, não daqui.
 */
const ANONIMO = {
  nomeDestinatario: 'Cliente apagado',
  linha1: 'Morada apagada (RGPD)',
  linha2: null,
  codigoPostal: '0000-000',
  localidade: 'Apagada',
  telefone: null,
}

export const anonimizarEncomendas: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { docs } = await req.payload.find({
    collection: 'orders',
    where: { cliente: { equals: id } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    req,
  })

  for (const encomenda of docs) {
    await req.payload.update({
      collection: 'orders',
      id: encomenda.id,
      // `update` é do staff; quem apaga a conta já é staff, mas este caminho
      // corre com o mesmo `req` de um `DELETE` e não de um `PATCH`.
      overrideAccess: true,
      req,
      data: {
        cliente: null,
        // O email é obrigatório e é por onde o staff procura uma encomenda; fica
        // um endereço que não entrega em lado nenhum e não identifica ninguém.
        email: `apagado-${String(encomenda.numero).toLowerCase()}@rgpd.invalido`,
        moradaEnvio: ANONIMO,
      },
    })
  }
}
