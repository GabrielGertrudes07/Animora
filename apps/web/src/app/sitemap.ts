import type { MetadataRoute } from 'next'
import { listAllSlugs, listCategories } from '../modules/catalog'
import { routing } from '../i18n/routing'
import { absoluteUrl } from '../lib/seo'

/**
 * Fora de `[locale]/` de propósito — é uma rota especial do Next
 * (`app/sitemap.ts`), não uma página, e o middleware de i18n já exclui
 * qualquer caminho com ponto no último segmento (`sitemap.xml` incluído),
 * então não passa pela negociação de idioma.
 *
 * Sem `lastModified`: o catálogo não expõe data de atualização (nem
 * `Product` nem `Category` trazem isso hoje), e escrever "agora" para todo
 * produto seria inventar um sinal que os motores de busca usam para decidir
 * o que voltar a rastrear.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, categorias] = await Promise.all([listAllSlugs(), listCategories()])

  const rotas = [
    '/',
    '/produtos',
    ...categorias.map((c) => `/${c.slug}`),
    ...slugs.map((s) => `/produto/${s}`),
  ]

  return rotas.flatMap((rota) => routing.locales.map((locale) => ({ url: absoluteUrl(rota, locale) })))
}
