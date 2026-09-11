import type { MetadataRoute } from 'next'
import { routing } from '../i18n/routing'
import { SITE_URL, localizedPathname } from '../lib/seo'

/** Carrinho, checkout e conta não têm nada a indexar — são estado de quem
 * já está a comprar ou já entrou, não conteúdo da loja. */
const PRIVADAS = ['/checkout', '/carrinho', '/conta']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PRIVADAS.flatMap((rota) => routing.locales.map((l) => localizedPathname(rota, l))),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
