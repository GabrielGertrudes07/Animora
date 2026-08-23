import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt', 'de'],
  defaultLocale: 'pt',
  localePrefix: 'as-needed',
  // `false` porque o next-intl, por omissão, deteta o idioma preferido do
  // browser (`Accept-Language`) em pedidos sem prefixo e redireciona `/` para
  // `/de` quando esse for o preferido — exatamente o redirecionamento
  // automático que a spec exclui («sem redireccionamento automático por
  // Accept-Language na raiz»). Com isto desligado, `/` serve sempre pt; só um
  // link/URL explícito com `/de` (ou o seletor de idioma) muda de idioma.
  localeDetection: false,
})
