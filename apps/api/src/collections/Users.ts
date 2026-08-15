import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      options: [
        { label: 'Proprietário', value: 'owner' },
        { label: 'Administrador', value: 'admin' },
      ],
      access: {
        // Só o proprietário pode definir ou alterar papéis. Sem isto, um admin
        // cria-se (ou promove-se) a owner — quer no create, quer no update.
        create: ({ req }) => req.user?.role === 'owner',
        update: ({ req }) => req.user?.role === 'owner',
      },
    },
  ],
}
