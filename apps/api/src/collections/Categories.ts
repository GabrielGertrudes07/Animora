import type { CollectionConfig } from 'payload'

import { blockDeleteIfPublished } from '../hooks/blockDeleteIfPublished'

export const Categories: CollectionConfig = {
  slug: 'categories',
  // Sem isto, o `defaultAccess` do Payload (`Boolean(req.user)`) aplica-se
  // também à leitura, e a loja pública — sem sessão — levava 403 em tudo.
  // Só a leitura fica aberta; escrita continua a exigir sessão.
  access: { read: () => true },
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
