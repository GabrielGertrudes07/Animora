import type { CollectionConfig } from 'payload'

import { blockDeleteIfPublished } from '../hooks/blockDeleteIfPublished'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: { useAsTitle: 'name' },
  hooks: { beforeDelete: [blockDeleteIfPublished('esta marca', ['brand'])] },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug' },
  ],
}
