import type { CollectionConfig, JSONFieldValidation, NumberFieldSingleValidation } from 'payload'
import { validations } from 'payload'

// Dinheiro é sempre em cêntimos inteiros; stock é sempre um número inteiro de unidades.
// Sem isto, o Postgres aceita 29.9 ou 3.5 e a loja só rebenta mais tarde, quando
// packages/core tentar formatar o preço (MoneyError: "Cêntimos têm de ser inteiros").
// Corre primeiro a validação nativa do Payload (required/min/max) — um `validate`
// custom substitui a nativa por inteiro, por isso reaproveita-se `validations.number`
// em vez de reimplementar min/max/required aqui.
const validateInteger: NumberFieldSingleValidation = (value, options) => {
  const defaultResult = validations.number(value, options)
  if (defaultResult !== true) return defaultResult
  return value === null || value === undefined || Number.isInteger(value)
    ? true
    : 'Tem de ser um número inteiro'
}

const EXEMPLO = 'Ex.: { "Tamanho": "S", "Cor": "Preto" }'

/**
 * `combination` é JSON livre e editável à mão no painel — a descrição do campo
 * até convida a isso. Sem validação de forma o Payload só recusa uma string
 * escalar: `["S","M"]`, `{"Tamanho":5}`, `{"Tamanho":{"a":1}}` e
 * `{"Tamanho":"S","Cor":null}` eram todos aceites.
 *
 * Não é cosmético. `combinationKey` serializa o que lá estiver, por isso
 * `{"Tamanho":5}` produz uma chave diferente da que o produto gera a partir das
 * suas opções (`{"Tamanho":"5"}`). Na gravação seguinte do produto o
 * `syncVariants` não reconhece a linha, apaga-a com preço e stock, e cria outra
 * a zero. Quem escreve `38` em vez de `"38"` na caixa de tamanhos perde o preço
 * da variante sem aviso nenhum.
 *
 * `{}` é legítimo — e só — para um produto sem opções utilizáveis:
 * `generateCombinations([])` devolve `[{}]` de propósito, para que carrinho e
 * stock tenham sempre a mesma forma. É por isso que a regra do "não vazio"
 * pergunta ao produto em vez de recusar `{}` à cabeça, e só pergunta quando o
 * objeto está mesmo vazio — uma consulta por produto sem opções, zero para
 * todos os outros. O produto é lido com `draft: true` para ver a versão mais
 * recente: um rascunho que acabou de remover todas as opções tem de conseguir
 * gravar (a versão já está escrita quando este código corre — `saveVersion`
 * antes dos `afterChange` em `collections/operations/utilities/update.js`).
 *
 * `validations.json` corre primeiro porque um `validate` custom SUBSTITUI o
 * nativo — sem ele perdia-se o `required` e o aviso de JSON mal formado.
 */
const validateCombination: JSONFieldValidation = async (value, options) => {
  const nativo = await validations.json(value, options)
  if (nativo !== true) return nativo

  const combination: unknown = value

  if (typeof combination !== 'object' || combination === null || Array.isArray(combination)) {
    return `A combinação tem de ser um objeto com uma opção por chave. ${EXEMPLO}`
  }

  for (const [nome, escolha] of Object.entries(combination)) {
    if (nome.trim() === '') {
      return `A combinação tem um nome de opção vazio. ${EXEMPLO}`
    }
    if (typeof escolha !== 'string') {
      return `O valor da opção "${nome}" tem de ser texto entre aspas. Um tamanho como 38 escreve-se "38". ${EXEMPLO}`
    }
  }

  if (Object.keys(combination).length > 0) return true

  const { data, req } = options
  const produto = (data as { product?: unknown } | undefined)?.product
  const productId =
    typeof produto === 'object' && produto !== null
      ? (produto as { id?: number | string }).id
      : (produto as number | string | undefined)

  // Sem produto não há com que comparar; o campo `product` é obrigatório e falha sozinho.
  if (productId === undefined || productId === null) return true

  const parent = await req.payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    draft: true,
    req,
  })

  // Mesmo critério do `generateCombinations`: opções sem valores não contam.
  const usadas = ((parent.options ?? []) as { name?: string; values?: unknown[] | null }[]).filter(
    (o) => (o.values ?? []).length > 0,
  )

  if (usadas.length === 0) return true

  return (
    `A combinação não pode ficar vazia: o produto tem as opções ${usadas
      .map((o) => o.name)
      .join(', ')}. Uma variante sem combinação deixa de corresponder a qualquer ` +
    `opção e é apagada, com preço e stock, na gravação seguinte do produto. ${EXEMPLO}`
  )
}

export const Variants: CollectionConfig = {
  slug: 'variants',
  admin: {
    useAsTitle: 'sku',
    defaultColumns: ['sku', 'product', 'priceCents', 'stock', 'active'],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Produto',
    },
    {
      name: 'combination',
      type: 'json',
      required: true,
      label: 'Combinação',
      admin: {
        description: `${EXEMPLO} — os valores são sempre texto entre aspas, mesmo os numéricos ("38").`,
      },
      validate: validateCombination,
    },
    {
      name: 'sku',
      type: 'text',
      required: true,
      unique: true,
      label: 'SKU',
      admin: { description: 'Sugerido automaticamente. Tem de ser único.' },
    },
    {
      name: 'priceCents',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      label: 'Preço (cêntimos)',
      admin: { description: '2990 = 29,90 €' },
      validate: validateInteger,
    },
    {
      name: 'oldPriceCents',
      type: 'number',
      min: 0,
      label: 'Preço anterior (cêntimos)',
      validate: validateInteger,
    },
    {
      name: 'stock',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      label: 'Stock',
      validate: validateInteger,
    },
    { name: 'active', type: 'checkbox', defaultValue: true, label: 'Ativa' },
    {
      type: 'collapsible',
      label: 'Dimensões',
      fields: [
        { name: 'lengthCm', type: 'number', min: 0, label: 'Comprimento (cm)' },
        { name: 'widthCm', type: 'number', min: 0, label: 'Largura (cm)' },
        { name: 'heightCm', type: 'number', min: 0, label: 'Altura (cm)' },
        { name: 'weightG', type: 'number', min: 0, label: 'Peso (g)' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Interno',
      fields: [
        {
          // Aqui e não no produto: a ração de 2 kg e a de 10 kg são variantes do
          // mesmo artigo com custos de compra completamente diferentes. Com um
          // único custo partilhado, o "receita − custo das mercadorias vendidas"
          // do dashboard saía errado no tipo de produto mais comum de uma pet
          // shop. O fornecedor continua no produto, que é onde não varia.
          name: 'costCents',
          type: 'number',
          min: 0,
          label: 'Custo de compra (cêntimos)',
          admin: { description: 'Usado no cálculo de lucro. Nunca sai para o site.' },
          validate: validateInteger,
        },
        { name: 'ean', type: 'text', label: 'EAN' },
        { name: 'warehouseLocation', type: 'text', label: 'Localização em armazém' },
        { name: 'shippingWeightG', type: 'number', min: 0, label: 'Peso para portes (g)' },
      ],
    },
  ],
}
