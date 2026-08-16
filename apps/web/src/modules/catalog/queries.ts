import { apiGet } from '../../lib/api'
import { sanitizeProduct } from './sanitize'
import type { PublicProduct } from './types'
import type { CatalogFilters } from './filters'

type Paginated<T> = { docs: T[]; totalDocs: number }

/**
 * `limit=0` no Payload significa SEM LIMITE, não zero resultados
 * (`@payloadcms/drizzle/dist/find/findMany.js`). É o que queremos aqui:
 * um limite numérico baixo truncaria o catálogo em silêncio.
 */
const NO_LIMIT = 0

async function variantsOf(productId: number) {
  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/variants?limit=${NO_LIMIT}&depth=0&where[product][equals]=${productId}`,
  )
  return res.docs
}

/** Produtos publicados, com as variantes já anexadas e sanitizadas. */
export async function listProducts(f: CatalogFilters): Promise<PublicProduct[]> {
  const params = new URLSearchParams({
    limit: String(NO_LIMIT),
    depth: '2',
    'where[_status][equals]': 'published',
  })

  for (const m of f.marca ?? []) params.append('where[brand.slug][in]', m)

  const res = await apiGet<Paginated<Record<string, unknown>>>(`/api/products?${params}`)

  const comVariantes = await Promise.all(
    res.docs.map(async (d) => ({ ...d, variants: await variantsOf(Number(d.id)) })),
  )

  let produtos = comVariantes.map(sanitizeProduct).filter((p) => p.variants.length > 0)

  if (f.precoMin !== undefined && f.precoMax !== undefined) {
    produtos = produtos.filter((p) =>
      p.variants.some((v) => v.priceCents >= f.precoMin! && v.priceCents <= f.precoMax!),
    )
  }

  const menorPreco = (p: PublicProduct) => Math.min(...p.variants.map((v) => v.priceCents))

  if (f.ordem === 'preco-asc') produtos.sort((a, b) => menorPreco(a) - menorPreco(b))
  if (f.ordem === 'preco-desc') produtos.sort((a, b) => menorPreco(b) - menorPreco(a))

  return produtos
}

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/products?limit=1&depth=2&where[slug][equals]=${encodeURIComponent(slug)}&where[_status][equals]=published`,
  )

  const doc = res.docs[0]
  if (!doc) return null

  const p = sanitizeProduct({ ...doc, variants: await variantsOf(Number(doc.id)) })
  return p.variants.length > 0 ? p : null
}

/** Para `generateStaticParams` da ficha de produto. */
export async function listAllSlugs(): Promise<string[]> {
  const res = await apiGet<Paginated<{ slug: string }>>(
    `/api/products?limit=${NO_LIMIT}&depth=0&where[_status][equals]=published`,
  )
  return res.docs.map((d) => d.slug)
}

export async function listBrands(): Promise<{ name: string; slug: string }[]> {
  const res = await apiGet<Paginated<{ name: string; slug: string }>>(
    `/api/brands?limit=${NO_LIMIT}&depth=0`,
  )
  return res.docs.map((d) => ({ name: d.name, slug: d.slug }))
}

/** Para a navegação do cabeçalho — categorias reais, nunca escritas à mão. */
export async function listCategories(): Promise<{ name: string; slug: string }[]> {
  const res = await apiGet<Paginated<{ name: string; slug: string }>>(
    `/api/categories?limit=${NO_LIMIT}&depth=0`,
  )
  return res.docs
    .map((d) => ({ name: d.name, slug: d.slug }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
}
