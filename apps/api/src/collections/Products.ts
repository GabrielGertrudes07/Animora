import type { CollectionConfig, NumberFieldSingleValidation } from 'payload'
import { validations } from 'payload'

// Dinheiro é sempre em cêntimos inteiros — sem isto o Postgres aceita 29.9
// e o cálculo de lucro do dashboard corrompe-se silenciosamente.
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

export const Products: CollectionConfig = {
  slug: 'products',
  versions: { drafts: true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', '_status'],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Geral',
          fields: [
            { name: 'title', type: 'text', required: true, label: 'Título' },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Slug',
              admin: { description: 'Aparece no endereço. Ex.: coleira-ajustavel-caes' },
            },
            { name: 'description', type: 'richText', label: 'Descrição' },
            {
              name: 'brand',
              type: 'relationship',
              relationTo: 'brands',
              required: true,
              label: 'Marca',
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
              required: true,
              label: 'Categorias',
            },
            {
              name: 'options',
              type: 'array',
              label: 'Opções de variante',
              admin: {
                description:
                  'Ex.: Tamanho com S, M, L. As combinações são geradas a partir daqui.',
              },
              fields: [
                { name: 'name', type: 'text', required: true, label: 'Nome da opção' },
                {
                  name: 'values',
                  type: 'array',
                  required: true,
                  label: 'Valores',
                  fields: [{ name: 'value', type: 'text', required: true, label: 'Valor' }],
                },
              ],
            },
          ],
        },
        {
          label: 'Imagens',
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: 'Galeria',
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'Imagem',
                },
              ],
            },
            {
              name: 'primaryImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem principal',
              admin: { description: 'É esta que aparece no catálogo' },
            },
          ],
        },
        {
          label: 'Interno',
          fields: [
            { name: 'supplier', type: 'text', label: 'Fornecedor' },
            {
              name: 'costCents',
              type: 'number',
              min: 0,
              label: 'Custo de compra (cêntimos)',
              admin: { description: 'Usado no cálculo de lucro. Nunca sai para o site.' },
              validate: validateInteger,
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text', label: 'Meta título' },
            { name: 'metaDescription', type: 'textarea', label: 'Meta descrição' },
            {
              name: 'shareImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem de partilha',
            },
          ],
        },
      ],
    },
  ],
}
