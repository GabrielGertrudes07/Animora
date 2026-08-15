import type { CollectionConfig, NumberFieldSingleValidation } from 'payload'
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
      admin: { description: 'Ex.: { "Tamanho": "S", "Cor": "Preto" }' },
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
        { name: 'ean', type: 'text', label: 'EAN' },
        { name: 'warehouseLocation', type: 'text', label: 'Localização em armazém' },
        { name: 'shippingWeightG', type: 'number', min: 0, label: 'Peso para portes (g)' },
      ],
    },
  ],
}
