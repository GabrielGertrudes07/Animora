import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

/**
 * Impede que a tabela de utilizadores fique sem proprietário.
 *
 * Não é redundante com o `access.delete` abaixo: sem isto o próprio owner
 * apaga-se a si mesmo, a tabela fica vazia, e `POST /api/users/first-register`
 * volta a estar disponível — e essa operação corre com `overrideAccess: true`
 * (`payload/dist/auth/operations/registerFirstUser.js`), logo honra o `role`
 * submetido, contornando o `access` do campo `role`. Quem quer que consiga
 * esvaziar a tabela consegue nomear-se owner.
 */
const protectLastOwner: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { role: { equals: 'owner' } },
    limit: 0,
    depth: 0,
    req,
  })

  if (docs.length === 1 && docs.every((d) => String(d.id) === String(id))) {
    throw new APIError(
      'Não é possível apagar o último proprietário. A tabela de utilizadores ficaria vazia e ' +
        'o arranque do sistema (/api/users/first-register) voltaria a aceitar qualquer papel, ' +
        'incluindo owner, sem autenticação. Promova outro utilizador a proprietário antes de ' +
        'apagar este.',
      400,
    )
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  // Sem bloco `access`, o Payload aplica o `defaultAccess` — `Boolean(req.user)`,
  // em `payload/dist/auth/defaultAccess.js` — a todas as operações. Qualquer
  // autenticado apagava e alterava qualquer conta. O `access` do campo `role`
  // (mais abaixo) protege o campo `role`, não a conta inteira.
  access: {
    // Apagar contas é do proprietário. Um admin apagava o owner, apagava-se a si
    // próprio e voltava pelo `first-register` já como owner.
    delete: ({ req }) => req.user?.role === 'owner',
    // Um admin fazia PATCH na password do owner e entrava na conta dele — escalada
    // completa sem tocar no campo `role`. Cada um trata da sua conta; mexer nas dos
    // outros é do proprietário.
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'owner') return true
      return { id: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeDelete: [protectLastOwner],
  },
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
