import type { CollectionConfig } from 'payload'

import { deleteVariantsOfProduct, syncVariants } from '../hooks/syncVariants'
import { validatePublish } from '../hooks/validatePublish'
import { uniqueSlug } from '../hooks/uniqueSlug'

export const Products: CollectionConfig = {
  slug: 'products',
  versions: { drafts: true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', '_status'],
  },
  hooks: {
    beforeValidate: [uniqueSlug],
    // A ordem é o próprio mecanismo: o `validatePublish` lê a tabela de variantes
    // que o `syncVariants` reescreve, por isso tem de correr a seguir a ele, e não
    // antes (era `beforeChange`, e validava um conjunto de variantes que o pedido
    // ainda ia substituir). Não trocar a ordem nem separar os dois.
    afterChange: [syncVariants, validatePublish],
    // Sem isto nenhum produto se consegue apagar: o adaptador gera ON DELETE SET
    // NULL sobre `variants.product_id`, que é NOT NULL.
    beforeDelete: [deleteVariantsOfProduct],
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
            // O custo de compra vive na variante, não aqui: a ração de 2 kg e a
            // de 10 kg são variantes do mesmo produto e custam valores
            // diferentes. O fornecedor fica no produto porque é o mesmo para
            // todas as variantes.
            { name: 'supplier', type: 'text', label: 'Fornecedor' },
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
