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

/**
 * Slug do URL → valor pronto a pôr na query string da API.
 *
 * No App Router do Next 15 os `params` chegam **já percent-encoded**: a
 * categoria `ração-água` chega como `ra%C3%A7%C3%A3o-%C3%A1gua`. Aplicar-lhes
 * `encodeURIComponent` diretamente codifica os `%` outra vez
 * (`ra%25C3%25A7...`) e a consulta não encontra nada — numa loja portuguesa,
 * onde `ração`, `cão` e `pássaros` são slugs de esperar, isso dava 404 em
 * links que o próprio cabeçalho emitia.
 *
 * Descodificar primeiro trata os dois casos com o mesmo código: o slug vindo
 * do URL (codificado) e o slug vindo da base de dados (não codificado, e sem
 * `%` nenhum para descodificar).
 *
 * Um `%` solto no endereço faz `decodeURIComponent` rebentar. Nesse caso vale
 * a pena seguir com o texto cru: não corresponde a slug nenhum, dá o 404 que
 * se espera, em vez de um 500 na página.
 */
function slugParaQuery(slug: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(slug))
  } catch {
    return encodeURIComponent(slug)
  }
}

async function variantsOf(productId: number, revalidate?: number) {
  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/variants?limit=${NO_LIMIT}&depth=0&where[product][equals]=${productId}`,
    revalidate,
  )
  return res.docs
}

/**
 * Produtos publicados, com as variantes já anexadas e sanitizadas.
 *
 * `categoriaId` é um parâmetro à parte de `f` (os filtros da query string)
 * de propósito: vem do segmento da rota (`/[categoria]`), não da query
 * string, tem de ser resolvido contra a base antes de chegar aqui (para
 * distinguir categoria inexistente de categoria vazia — ver a página), e
 * a página inicial chama `listProducts` sem nenhuma categoria. Metê-lo
 * dentro de `CatalogFilters` obrigaria `parseFilters`/`filtersToQuery` —
 * pensados só para a query string — a saber lidar com algo que nunca
 * vem de lá.
 */
export async function listProducts(
  f: CatalogFilters,
  categoriaId?: number,
): Promise<PublicProduct[]> {
  const params = new URLSearchParams({
    limit: String(NO_LIMIT),
    depth: '2',
    'where[_status][equals]': 'published',
  })

  if (categoriaId !== undefined) params.set('where[categories][equals]', String(categoriaId))

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
    `/api/products?limit=1&depth=2&where[slug][equals]=${slugParaQuery(slug)}&where[_status][equals]=published`,
  )

  const doc = res.docs[0]
  if (!doc) return null

  const p = sanitizeProduct({ ...doc, variants: await variantsOf(Number(doc.id)) })
  return p.variants.length > 0 ? p : null
}

/**
 * Sem cache: é para o carrinho e para o checkout.
 *
 * As páginas de catálogo revalidam a cada 60 segundos porque um preço com um
 * minuto de atraso numa listagem é aceitável. No carrinho não é: o número que
 * aparece ali é o que a pessoa vai pagar, e o servidor relê os preços da base
 * no instante do checkout. Um minuto de cache aqui é um minuto em que o ecrã
 * pode dizer um valor e a fatura outro.
 */
const SEM_CACHE = 0

/**
 * Produtos publicados por id, com variantes e já sanitizados.
 *
 * Serve os favoritos (ids de produto guardados na conta) e, por baixo, o
 * carrinho. Um id que não exista ou cujo produto tenha sido despublicado
 * simplesmente não vem na resposta — é o mesmo caminho que a loja já usa para
 * não mostrar o que não está à venda, e não uma verificação nova.
 */
export async function listProductsByIds(ids: number[]): Promise<PublicProduct[]> {
  if (ids.length === 0) return []

  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/products?limit=${NO_LIMIT}&depth=2&where[id][in]=${ids.join(',')}` +
      `&where[_status][equals]=published`,
    SEM_CACHE,
  )

  const comVariantes = await Promise.all(
    res.docs.map(async (d) => ({ ...d, variants: await variantsOf(Number(d.id), SEM_CACHE) })),
  )

  return comVariantes.map(sanitizeProduct).filter((p) => p.variants.length > 0)
}

/**
 * Os produtos a que pertencem estas variantes — o caminho do carrinho.
 *
 * O carrinho no browser guarda ids de variante e mais nada, por isso é preciso
 * ir da variante ao produto para saber título, imagem e preço. Duas leituras e
 * não uma: `/api/variants` só devolve as variantes de produtos publicados
 * (`soDeProdutosPublicados`), e daí sai o conjunto de ids de produto a pedir.
 *
 * Uma variante apagada, desativada ou de um produto despublicado não vem — e é
 * assim que a página do carrinho descobre que tem de a tirar de lá.
 */
export async function listProductsByVariantIds(variantIds: number[]): Promise<PublicProduct[]> {
  if (variantIds.length === 0) return []

  const res = await apiGet<Paginated<{ product?: unknown }>>(
    `/api/variants?limit=${NO_LIMIT}&depth=0&where[id][in]=${variantIds.join(',')}`,
    SEM_CACHE,
  )

  const ids = [...new Set(res.docs.map((v) => Number(v.product)).filter(Number.isInteger))]
  return listProductsByIds(ids)
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

/**
 * Para a página `/[categoria]`: resolve o slug do URL contra a base.
 * `null` quando a categoria não existe — é o sinal para a página devolver
 * 404 em vez de 200 com o catálogo inteiro.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<{ id: number; name: string; slug: string } | null> {
  const res = await apiGet<Paginated<{ id: number; name: string; slug: string }>>(
    `/api/categories?limit=1&depth=0&where[slug][equals]=${slugParaQuery(slug)}`,
  )
  const doc = res.docs[0]
  return doc ? { id: doc.id, name: doc.name, slug: doc.slug } : null
}
