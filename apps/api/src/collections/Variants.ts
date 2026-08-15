import type { CollectionConfig } from 'payload'

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
    },
    {
      name: 'oldPriceCents',
      type: 'number',
      min: 0,
      label: 'Preço anterior (cêntimos)',
    },
    {
      name: 'stock',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      label: 'Stock',
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
