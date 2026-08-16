import type { Access, CollectionConfig } from 'payload'

import { ehStaff, soStaff, soStaffCampo } from '../access/staff'
import { validarCodigoPostal, validarInteiro } from '../validacoes'

/**
 * O cliente vê as suas encomendas; o staff vê todas; mais ninguém vê nenhuma.
 *
 * Como nos `customers`, devolver um `Where` faz a regra valer também para o
 * `findByID`: pedir o id da encomenda de outra pessoa dá "não encontrado" em vez
 * dos dados dela.
 */
const proprioOuStaff: Access = ({ req }) => {
  const u = req.user
  if (!u) return false
  if (ehStaff(u)) return true
  if (u.collection !== 'customers') return false
  return { cliente: { equals: u.id } }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'numero',
    defaultColumns: ['numero', 'cliente', 'estado', 'totalCents', 'createdAt'],
  },
  access: {
    read: proprioOuStaff,
    // As encomendas nascem só pelo endpoint de checkout, que corre com
    // `overrideAccess`. Um `POST /api/orders` com sessão de cliente é recusado:
    // quem escolhesse os totais escolheria o que paga.
    create: () => false,
    update: soStaff,
    // O histórico de uma loja não se apaga — nem pelo painel. Cancelar é um
    // estado, não uma eliminação.
    delete: () => false,
  },
  fields: [
    { name: 'numero', type: 'text', required: true, unique: true, label: 'Número' },
    {
      name: 'cliente',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      label: 'Cliente',
    },
    { name: 'email', type: 'email', required: true, label: 'Email' },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'a-aguardar-pagamento',
      label: 'Estado',
      options: [
        { label: 'A aguardar pagamento', value: 'a-aguardar-pagamento' },
        { label: 'Pago', value: 'pago' },
        { label: 'Enviado', value: 'enviado' },
        { label: 'Entregue', value: 'entregue' },
        { label: 'Cancelado', value: 'cancelado' },
      ],
    },
    {
      name: 'linhas',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Linhas',
      admin: {
        description:
          'Cópia congelada no momento da compra. Alterar um produto no catálogo NÃO altera encomendas passadas — é essa a intenção.',
      },
      fields: [
        {
          name: 'variante',
          type: 'relationship',
          relationTo: 'variants',
          label: 'Variante (referência)',
        },
        { name: 'titulo', type: 'text', required: true, label: 'Título' },
        { name: 'sku', type: 'text', required: true, label: 'SKU' },
        { name: 'opcoes', type: 'json', label: 'Opções' },
        {
          name: 'quantidade',
          type: 'number',
          required: true,
          min: 1,
          label: 'Quantidade',
          validate: validarInteiro,
        },
        {
          name: 'precoUnitarioCents',
          type: 'number',
          required: true,
          min: 0,
          label: 'Preço unitário (cêntimos)',
          validate: validarInteiro,
        },
        {
          name: 'custoUnitarioCents',
          type: 'number',
          min: 0,
          label: 'Custo unitário (cêntimos)',
          validate: validarInteiro,
          // Margem. O cliente nunca pode ler isto — foi o erro da fase 2, e o
          // teste "o cliente não vê o custo em linha nenhuma" prova-o com o
          // documento inteiro serializado, não campo a campo: com `depth`, a
          // linha traz também a variante populada, que é o segundo caminho para
          // o mesmo número.
          access: { read: soStaffCampo },
        },
      ],
    },
    {
      name: 'subtotalCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Subtotal (cêntimos)',
      validate: validarInteiro,
    },
    {
      name: 'portesCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Portes (cêntimos)',
      validate: validarInteiro,
    },
    {
      name: 'totalCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Total (cêntimos)',
      validate: validarInteiro,
    },
    {
      name: 'moradaEnvio',
      type: 'group',
      label: 'Morada de envio',
      fields: [
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
  ],
}
