import type { CollectionConfig } from 'payload'

import { blockDeleteIfPublished } from '../hooks/blockDeleteIfPublished'

export const Media: CollectionConfig = {
  slug: 'media',
  // Sem isto, o `defaultAccess` do Payload (`Boolean(req.user)`) aplica-se
  // também à leitura, e as imagens do catálogo — servidas sem sessão pelo
  // browser do cliente — levavam 403. Só a leitura fica aberta; escrita
  // continua a exigir sessão.
  access: { read: () => true },
  admin: { useAsTitle: 'alt' },
  hooks: {
    beforeDelete: [
      blockDeleteIfPublished('esta imagem', ['gallery.image', 'primaryImage', 'shareImage']),
    ],
  },
  upload: {
    staticDir: 'media',
    // Ponto focal: sem isto, o corte quadrado do card decapita os animais.
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumb',
        width: 120,
        height: 120,
        position: 'centre',
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        name: 'card',
        width: 600,
        height: 600,
        position: 'centre',
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        name: 'full',
        width: 1200,
        height: 1200,
        position: 'centre',
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texto alternativo',
      admin: {
        description:
          'Descreve a imagem para quem não a consegue ver. Ex.: "Cão castanho com coleira vermelha". Obrigatório.',
      },
    },
  ],
}
