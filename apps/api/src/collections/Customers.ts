import type { Access, CollectionConfig } from 'payload'

import { ehStaff } from '../access/staff'
import { validarCodigoPostal } from '../validacoes'

/**
 * Um cliente só se vê a si próprio. O staff vê todos. Ninguém mais vê nada.
 *
 * Devolver um `Where` em vez de `true`/`false` é o que faz a regra valer também
 * para o `findByID` e para as consultas com `where`: a condição entra na
 * consulta (`combineQueries`), por isso pedir o id de outra pessoa dá "não
 * encontrado" em vez de os dados dela. Um `false` seco protegia a lista mas
 * obrigava a uma segunda regra para o documento único.
 *
 * Aqui não há campos "internos" a proteger um a um como no catálogo: numa
 * coleção de clientes é o documento inteiro que é sensível — morada, email,
 * telefone e o que a pessoa comprou.
 */
const proprioOuStaff: Access = ({ req }) => {
  const u = req.user
  if (!u) return false
  if (ehStaff(u)) return true
  // Um utilizador autenticado noutra coleção qualquer não é este cliente.
  if (u.collection !== 'customers') return false
  return { id: { equals: u.id } }
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: true,
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'nome', 'createdAt'] },
  access: {
    read: proprioOuStaff,
    update: proprioOuStaff,
    delete: ({ req }) => ehStaff(req.user),
    // Qualquer pessoa se pode registar; é o que "criar conta" significa.
    create: () => true,
    // `access.admin` não é preciso: o Payload só o consulta para a coleção
    // declarada em `admin.user` (`getAccessResults.js` — para as outras devolve
    // `canAccessAdmin: false` sem sequer chamar a regra).
  },
  fields: [
    { name: 'nome', type: 'text', required: true, label: 'Nome' },
    {
      name: 'moradas',
      type: 'array',
      label: 'Moradas',
      fields: [
        { name: 'etiqueta', type: 'text', label: 'Etiqueta', admin: { description: 'Casa, Trabalho…' } },
        { name: 'nomeDestinatario', type: 'text', required: true, label: 'Destinatário' },
        { name: 'linha1', type: 'text', required: true, label: 'Morada' },
        { name: 'linha2', type: 'text', label: 'Morada (cont.)' },
        {
          name: 'codigoPostal',
          type: 'text',
          required: true,
          label: 'Código postal',
          admin: { description: 'Formato português: 1234-567' },
          validate: validarCodigoPostal,
        },
        { name: 'localidade', type: 'text', required: true, label: 'Localidade' },
        { name: 'telefone', type: 'text', label: 'Telefone' },
      ],
    },
    {
      name: 'favoritos',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Favoritos',
    },
  ],
}
