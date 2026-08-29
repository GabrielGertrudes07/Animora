import type { CollectionConfig } from 'payload'

import { soPublicadosSemSessao } from '../access/leitura'
import { soStaff, soStaffCampo } from '../access/staff'
import { deleteVariantsOfProduct, syncVariants } from '../hooks/syncVariants'
import { validatePublish } from '../hooks/validatePublish'
import { uniqueSlug } from '../hooks/uniqueSlug'
import { apagarAvaliacoesDe } from './Reviews'
import { campoShopifyId } from '../shopify/campos'

export const Products: CollectionConfig = {
  slug: 'products',
  versions: { drafts: true },
  // Sem isto, o `defaultAccess` do Payload (`Boolean(req.user)`) aplica-se
  // também à leitura, e a loja pública — sem sessão — levava 403 em tudo.
  // Só a leitura fica aberta; escrita continua a exigir sessão. E aberta apenas
  // ao que está publicado: com `() => true` bastava um `GET /api/products` para
  // ler o que ainda não saiu do painel.
  // Escrever é do staff, explicitamente. Sem `create`/`update`/`delete` o
  // Payload aplica o `defaultAccess` (`Boolean(req.user)`) — e desde que existem
  // clientes com sessão isso queria dizer "qualquer pessoa registada na loja".
  access: {
    read: soPublicadosSemSessao,
    create: soStaff,
    update: soStaff,
    delete: soStaff,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', '_status'],
  },
  hooks: {
    beforeValidate: [uniqueSlug],
    // O `validatePublish` corre ANTES de qualquer escrita e valida o conjunto de
    // variantes que o `syncVariants` vai deixar na tabela, calculando-o com o
    // mesmo `mergeVariants`. Não é a versão antiga do hook (essa lia o conjunto
    // velho e deixava publicar a 0 €), nem a de `afterChange` (essa dependia do
    // rollback, que a atualização em massa não faz). Ver o cabeçalho do ficheiro.
    beforeChange: [validatePublish],
    afterChange: [syncVariants],
    // Sem isto nenhum produto se consegue apagar: o adaptador gera ON DELETE SET
    // NULL sobre `variants.product_id`, que é NOT NULL. As avaliações têm o
    // mesmo problema em `reviews.produto_id` — ver `Reviews.ts`.
    beforeDelete: [deleteVariantsOfProduct, apagarAvaliacoesDe('produto')],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Geral',
          admin: {
            description:
              'Para publicar precisa de: categoria, marca, pelo menos uma imagem na galeria, e ' +
              'pelo menos uma variante ativa com preço acima de zero. As variantes só existem ' +
              'depois de o produto estar gravado — grave como rascunho, defina o preço em ' +
              '/admin/collections/variants, e só depois publique.',
          },
          fields: [
            { name: 'title', type: 'text', required: true, label: 'Título' },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Slug',
              admin: { description: 'Aparece no endereço. Ex.: coleira-ajustavel-caes' },
            },
            { name: 'description', type: 'richText', label: 'Descrição' },
            {
              name: 'brand',
              type: 'relationship',
              relationTo: 'brands',
              required: true,
              label: 'Marca',
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
              required: true,
              label: 'Categorias',
            },
            {
              name: 'options',
              type: 'array',
              label: 'Opções de variante',
              admin: {
                description:
                  'Ex.: Tamanho com S, M, L. As combinações são geradas a partir daqui.',
              },
              fields: [
                { name: 'name', type: 'text', required: true, label: 'Nome da opção' },
                {
                  name: 'values',
                  type: 'array',
                  required: true,
                  label: 'Valores',
                  fields: [{ name: 'value', type: 'text', required: true, label: 'Valor' }],
                },
              ],
            },
          ],
        },
        {
          label: 'Imagens',
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: 'Galeria',
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'Imagem',
                },
              ],
            },
            {
              name: 'primaryImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem principal',
              admin: { description: 'É esta que aparece no catálogo' },
            },
          ],
        },
        {
          label: 'Interno',
          fields: [
            // O custo de compra vive na variante, não aqui: a ração de 2 kg e a
            // de 10 kg são variantes do mesmo produto e custam valores
            // diferentes. O fornecedor fica no produto porque é o mesmo para
            // todas as variantes.
            {
              name: 'supplier',
              type: 'text',
              label: 'Fornecedor',
              access: { read: soStaffCampo },
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text', label: 'Meta título' },
            { name: 'metaDescription', type: 'textarea', label: 'Meta descrição' },
            {
              name: 'shareImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem de partilha',
            },
          ],
        },
      ],
    },
    campoShopifyId,
  ],
}
