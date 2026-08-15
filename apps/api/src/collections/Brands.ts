import type { CollectionConfig } from 'payload'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug' },
  ],
}
