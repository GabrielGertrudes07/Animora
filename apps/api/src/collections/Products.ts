import type { CollectionConfig } from 'payload'

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
              label: 'Custo de compra (cêntimos)',
              admin: { description: 'Usado no cálculo de lucro. Nunca sai para o site.' },
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
