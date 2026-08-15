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
        // Só o proprietário pode alterar papéis. Sem isto, um admin promove-se a si próprio.
        update: ({ req }) => req.user?.role === 'owner',
      },
    },
  ],
}
