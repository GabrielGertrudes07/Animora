import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'
import sharp from 'sharp'

import { Users } from './src/collections/Users'
import { Categories } from './src/collections/Categories'
import { Brands } from './src/collections/Brands'
import { Media } from './src/collections/Media'
import { Products } from './src/collections/Products'
import { Variants } from './src/collections/Variants'
import { Customers } from './src/collections/Customers'
import { Orders } from './src/collections/Orders'
import { Attributes } from './src/collections/Attributes'
import { ConfiguracaoFiltros } from './src/globals/ConfiguracaoFiltros'
import { checkout } from './src/endpoints/checkout'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: { user: Users.slug },
  collections: [
    Users,
    Categories,
    Brands,
    Media,
    Products,
    Variants,
    Customers,
    Orders,
    Attributes,
  ],
  globals: [ConfiguracaoFiltros],
  endpoints: [checkout],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  // O `sharp` instalado e o tipo `SharpDependency` que o Payload 3.88 declara
  // divergem numa sobrecarga interna, apesar de o objeto ser o que ele espera
  // em runtime (as três dimensões de imagem são geradas em WebP — verificado).
  // O cast é só para o compilador; trocá-lo por `any` esconderia mais do que isto.
  sharp: sharp as unknown as NonNullable<Parameters<typeof buildConfig>[0]['sharp']>,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      // O tecto real de concorrência de escrita é este número, não as guardas.
      //
      // Medido, com o `max` por omissão do node-postgres (10, e não estava aqui
      // escrito): 13 `PATCH /api/products` em paralelo sobre produtos
      // publicados param a API por completo. Ficam 9 ligações `idle in
      // transaction`, todas paradas a seguir a uma leitura de `_products_v`, e o
      // servidor não recupera — seis minutos depois continuava igual, só voltou
      // com um reinício. Não é das guardas: o caminho de criação aguentava 26 em
      // paralelo com o mesmo pool, e o tecto já lá estava antes do lock
      // consultivo. Com 20, os mesmos 13 passam, e 16, 19, 22, 26 e 30 também.
      //
      // 20 é folga para um painel de administração (um punhado de gravações por
      // minuto) sem inventar gestão de pool nenhuma. Não elimina o tecto —
      // desloca-o, e o mecanismo exato (que gravação pede uma segunda ligação
      // enquanto segura a primeira) ficou por identificar. Se voltar a parar, é
      // isso que se procura, não um número maior.
      max: 20,
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, '../../packages/types/payload-types.ts'),
  },
  i18n: { supportedLanguages: { pt } },
})
