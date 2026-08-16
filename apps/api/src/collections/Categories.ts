import type { CollectionConfig } from 'payload'

import { blockDeleteIfPublished } from '../hooks/blockDeleteIfPublished'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'parent', 'slug'] },
  hooks: { beforeDelete: [blockDeleteIfPublished('esta categoria', ['categories'])] },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: { description: 'Aparece no endereço da página. Ex.: coleiras' },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Categoria mãe',
      admin: { description: 'Deixar vazio para categoria de topo' },
    },
  ],
}
