import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'

import { Users } from './src/collections/Users'
import { Categories } from './src/collections/Categories'
import { Brands } from './src/collections/Brands'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users, Categories, Brands],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  typescript: {
    outputFile: path.resolve(dirname, '../../packages/types/payload-types.ts'),
  },
  i18n: { supportedLanguages: { pt } },
})
