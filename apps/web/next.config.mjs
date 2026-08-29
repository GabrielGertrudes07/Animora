import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// A mesma origem que o src/lib/api.ts usa — o otimizador de imagens tem de
// autorizar a API onde quer que ela corra, não só na porta 3000 por omissão.
const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000')

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: api.protocol.replace(':', ''), hostname: api.hostname, port: api.port },
      // Fotografia de referência para o hero/marketing enquanto não há
      // fotografia própria de produto — ver apps/web/src/lib/fotosMarketing.ts.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // As imagens do catálogo passam a ser servidas pelo CDN do Shopify.
      // Sem isto o otimizador recusa-as com 400 e o catálogo fica sem
      // fotografias — o mesmo defeito que o comentário do `mediaUrl` em
      // src/lib/api.ts descreve, noutro sítio.
      { protocol: 'https', hostname: 'cdn.shopify.com' },
    ],
  },
}

export default withNextIntl(nextConfig)
