import type { CollectionConfig } from 'payload'

import { soStaff } from '../access/staff'
import { blockDeleteIfPublished } from '../hooks/blockDeleteIfPublished'

export const Brands: CollectionConfig = {
  slug: 'brands',
  // Sem isto, o `defaultAccess` do Payload (`Boolean(req.user)`) aplica-se
  // também à leitura, e a loja pública — sem sessão — levava 403 em tudo.
  // Só a leitura fica aberta; escrita continua a exigir sessão.
  access: { read: () => true, create: soStaff, update: soStaff, delete: soStaff },
  admin: { useAsTitle: 'name' },
  hooks: { beforeDelete: [blockDeleteIfPublished('esta marca', ['brand'])] },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug' },
  ],
}
