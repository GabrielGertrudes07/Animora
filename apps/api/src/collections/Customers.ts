import type { Access, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { ehStaff } from '../access/staff'
import { anonimizarEncomendas } from '../hooks/anonimizarEncomendas'
import { validarCodigoPostal } from '../validacoes'

/**
 * Oito caracteres. O Payload aceita três (`minLength = 3` fixo em
 * `fields/validations.js`, com as opções construídas à mão em
 * `generatePasswordSaltHash` — a configuração da coleção nem é lida), e o
 * registo aqui é aberto a qualquer pessoa.
 *
 * Corre em `beforeValidate`, que é onde a palavra-passe em claro ainda está no
 * `data` — o `registerLocalStrategy` só a transforma em hash depois
 * (`collections/operations/create.js`). Vale para o registo, para a mudança de
 * palavra-passe e para o `reset-password`, que corre os mesmos hooks antes de
 * gravar.
 */
const MINIMO_PALAVRA_PASSE = 8

const palavraPasseDecente: CollectionBeforeValidateHook = ({ data }) => {
  const p: unknown = data?.password
  if (typeof p === 'string' && p.length < MINIMO_PALAVRA_PASSE) {
    throw new APIError(
      `A palavra-passe tem de ter pelo menos ${MINIMO_PALAVRA_PASSE} caracteres.`,
      400,
    )
  }
  return data
}

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
  hooks: {
    beforeValidate: [palavraPasseDecente],
    // Sem isto, apagar uma conta com encomendas dava 500 e o pedido de RGPD não
    // tinha caminho nenhum. Ver o ficheiro.
    beforeDelete: [anonimizarEncomendas],
  },
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
