import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { ehStaff, soStaff, soStaffCampo } from '../access/staff'
import { idDaRelacao } from '../hooks/blockUnsellable'
import { serializarGuarda } from '../hooks/serializar'
import { validarCodigoPostal, validarInteiro } from '../validacoes'

/**
 * O cliente vê as suas encomendas; o staff vê todas; mais ninguém vê nenhuma.
 *
 * Como nos `customers`, devolver um `Where` faz a regra valer também para o
 * `findByID`: pedir o id da encomenda de outra pessoa dá "não encontrado" em vez
 * dos dados dela.
 */
const proprioOuStaff: Access = ({ req }) => {
  const u = req.user
  if (!u) return false
  if (ehStaff(u)) return true
  if (u.collection !== 'customers') return false
  return { cliente: { equals: u.id } }
}

/**
 * O total gravado tem de ser a soma das linhas mais os portes.
 *
 * O checkout calcula os três números com o `calcularTotais` e nunca grava um
 * conjunto incoerente. Isto é a rede por baixo: uma encomenda corrigida à mão no
 * painel, ou um segundo caminho de escrita amanhã, não podem gravar um total que
 * não corresponde ao que lá está — é o número que o cliente paga.
 *
 * **Não impõe a regra de portes** (grátis a partir de 5000, senão 499): essa é
 * do `calcularTotais` e do checkout. Fixá-la aqui também impediria o staff de
 * oferecer portes numa encomenda concreta, que é um gesto comercial legítimo, e
 * duplicaria a regra em dois sítios que podem divergir. O que aqui se protege é
 * a aritmética, não a política de preços.
 *
 * Corre em `beforeChange`, que é **antes** da validação dos campos
 * (`collections/operations/create.js`: hooks de coleção, depois campos). Daí o
 * teto do `Number.isInteger`: com um decimal ou um `null` no meio, quem tem a
 * mensagem certa é o `validarInteiro`, e esta guarda cala-se para não a tapar —
 * o valor é recusado à mesma, logo a seguir.
 *
 * Numa atualização, `data` traz só o que mudou: os campos ausentes vêm do
 * documento atual, senão mudar o estado de uma encomenda recalculava-a a zero.
 */
const totaisCoerentes: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const linhas = (data.linhas ?? originalDoc?.linhas ?? []) as {
    quantidade?: unknown
    precoUnitarioCents?: unknown
  }[]
  const subtotal = data.subtotalCents ?? originalDoc?.subtotalCents
  const portes = data.portesCents ?? originalDoc?.portesCents
  const total = data.totalCents ?? originalDoc?.totalCents

  const numeros = [
    subtotal,
    portes,
    total,
    ...linhas.flatMap((l) => [l.quantidade, l.precoUnitarioCents]),
  ]
  if (!numeros.every((n) => Number.isInteger(n))) return data

  const somaDasLinhas = linhas.reduce(
    (soma, l) => soma + (l.quantidade as number) * (l.precoUnitarioCents as number),
    0,
  )

  if (subtotal !== somaDasLinhas || total !== (subtotal as number) + (portes as number)) {
    throw new APIError(
      `Totais incoerentes: as linhas somam ${somaDasLinhas} cêntimos e a encomenda declara um ` +
        `subtotal de ${String(subtotal)} com portes de ${String(portes)} e um total de ` +
        `${String(total)}. O total tem de ser a soma das linhas mais os portes — é o valor que o ` +
        `cliente paga.`,
      400,
    )
  }

  return data
}

/**
 * Cancelar devolve ao catálogo o stock que a encomenda tinha reservado.
 *
 * O stock desce quando a encomenda nasce, e a encomenda nasce por pagar. Sem
 * este caminho, cancelar deixava as unidades presas para sempre: medido, uma
 * encomenda de 2 unidades cancelada deixava o stock 2 abaixo do real, e nenhum
 * gesto no painel o repunha. Qualquer pessoa registada esvaziava o catálogo em
 * segundos, e ele não voltava.
 *
 * Escreve pelo mesmo canal do checkout (`ajusteStock`, ver
 * `hooks/ajustarStock.ts`): dentro da transação deste pedido e com o mesmo lock
 * consultivo, portanto uma reposição e uma venda simultâneas ficam em fila em
 * vez de se sobreporem.
 *
 * Duas decisões:
 *
 * - **A releitura debaixo do lock** é o que impede a dupla reposição. Dois
 *   pedidos a cancelar a mesma encomenda ao mesmo tempo liam ambos
 *   `a-aguardar-pagamento` no `originalDoc` (que o Payload lê antes dos hooks e
 *   sem lock) e repunham o stock os dois.
 * - **Sair de `cancelado` é recusado.** O stock já foi devolvido e pode ter sido
 *   vendido a outra pessoa; "descancelar" voltaria a prometer unidades que já
 *   não existem. Uma encomenda cancelada fica cancelada — quem quer vender
 *   outra vez faz uma encomenda nova.
 */
const reporStockAoCancelar: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) return data

  const seguinte = (data.estado ?? originalDoc.estado) as string

  if (originalDoc.estado === 'cancelado' && seguinte !== 'cancelado') {
    throw new APIError(
      'Uma encomenda cancelada não volta atrás: o stock já foi devolvido ao catálogo e pode ' +
        'entretanto ter sido vendido a outra pessoa. Para vender outra vez, faça uma encomenda ' +
        'nova.',
      400,
    )
  }

  if (seguinte !== 'cancelado' || originalDoc.estado === 'cancelado') return data

  await serializarGuarda(req)

  const atual = await req.payload.findByID({
    collection: 'orders',
    id: originalDoc.id as number | string,
    depth: 0,
    overrideAccess: true,
    req,
  })
  // Outro pedido cancelou primeiro e já repôs o stock.
  if (atual.estado === 'cancelado') return data

  for (const linha of atual.linhas ?? []) {
    // A variante pode já não existir: `orders_linhas.variante_id` é ON DELETE
    // SET NULL. A encomenda cancela-se à mesma; não há a que repor stock.
    const variante = idDaRelacao(linha.variante)
    if (variante === undefined || variante === null) continue

    await req.payload.update({
      collection: 'variants',
      id: variante,
      data: { ajusteStock: linha.quantidade },
      overrideAccess: true,
      req,
    })
  }

  return data
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  hooks: { beforeChange: [totaisCoerentes, reporStockAoCancelar] },
  admin: {
    useAsTitle: 'numero',
    defaultColumns: ['numero', 'cliente', 'estado', 'totalCents', 'createdAt'],
  },
  access: {
    read: proprioOuStaff,
    // As encomendas nascem só pelo endpoint de checkout, que corre com
    // `overrideAccess`. Um `POST /api/orders` com sessão de cliente é recusado:
    // quem escolhesse os totais escolheria o que paga.
    create: () => false,
    update: soStaff,
    // O histórico de uma loja não se apaga — nem pelo painel. Cancelar é um
    // estado, não uma eliminação.
    delete: () => false,
  },
  fields: [
    { name: 'numero', type: 'text', required: true, unique: true, label: 'Número' },
    {
      name: 'cliente',
      type: 'relationship',
      relationTo: 'customers',
      // Não é `required`, e é a única razão: apagar a conta (RGPD) deixa a
      // encomenda sem dono, para o histórico de vendas sobreviver ao
      // apagamento. Nenhum caminho de escrita cria encomendas sem cliente — o
      // checkout é o único que cria, e põe-no sempre. Ver
      // `hooks/anonimizarEncomendas.ts`.
      label: 'Cliente',
      admin: { description: 'Vazio quando a conta do cliente foi apagada a pedido dele.' },
    },
    { name: 'email', type: 'email', required: true, label: 'Email' },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'a-aguardar-pagamento',
      label: 'Estado',
      options: [
        { label: 'A aguardar pagamento', value: 'a-aguardar-pagamento' },
        { label: 'Pago', value: 'pago' },
        { label: 'Enviado', value: 'enviado' },
        { label: 'Entregue', value: 'entregue' },
        { label: 'Cancelado', value: 'cancelado' },
      ],
    },
    {
      name: 'linhas',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Linhas',
      admin: {
        description:
          'Cópia congelada no momento da compra. Alterar um produto no catálogo NÃO altera encomendas passadas — é essa a intenção.',
      },
      fields: [
        {
          name: 'variante',
          type: 'relationship',
          relationTo: 'variants',
          label: 'Variante (referência)',
        },
        { name: 'titulo', type: 'text', required: true, label: 'Título' },
        { name: 'sku', type: 'text', required: true, label: 'SKU' },
        { name: 'opcoes', type: 'json', label: 'Opções' },
        {
          name: 'quantidade',
          type: 'number',
          required: true,
          min: 1,
          label: 'Quantidade',
          validate: validarInteiro,
        },
        {
          name: 'precoUnitarioCents',
          type: 'number',
          required: true,
          min: 0,
          label: 'Preço unitário (cêntimos)',
          validate: validarInteiro,
        },
        {
          name: 'custoUnitarioCents',
          type: 'number',
          min: 0,
          label: 'Custo unitário (cêntimos)',
          validate: validarInteiro,
          // Margem. O cliente nunca pode ler isto — foi o erro da fase 2, e o
          // teste "o cliente não vê o custo em linha nenhuma" prova-o com o
          // documento inteiro serializado, não campo a campo: com `depth`, a
          // linha traz também a variante populada, que é o segundo caminho para
          // o mesmo número.
          access: { read: soStaffCampo },
        },
      ],
    },
    {
      name: 'subtotalCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Subtotal (cêntimos)',
      validate: validarInteiro,
    },
    {
      name: 'portesCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Portes (cêntimos)',
      validate: validarInteiro,
    },
    {
      name: 'totalCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Total (cêntimos)',
      validate: validarInteiro,
    },
    {
      name: 'moradaEnvio',
      type: 'group',
      label: 'Morada de envio',
      fields: [
        { name: 'nomeDestinatario', type: 'text', required: true, label: 'Destinatário' },
        { name: 'linha1', type: 'text', required: true, label: 'Morada' },
        { name: 'linha2', type: 'text', label: 'Morada (cont.)' },
        {
          name: 'codigoPostal',
          type: 'text',
          required: true,
          label: 'Código postal',
          admin: { description: 'Formato português: 1234-567' },
          validate: validarCodigoPostal,
        },
        { name: 'localidade', type: 'text', required: true, label: 'Localidade' },
        { name: 'telefone', type: 'text', label: 'Telefone' },
      ],
    },
  ],
}
