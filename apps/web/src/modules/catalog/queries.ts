import { apiGet } from '../../lib/api'
import { sanitizeProduct } from './sanitize'
import { filtrarPorAtributos } from './facets'
import { parseFilters, resolveActiveAttributeDefs, restringirAtributosAtivos } from './filters'
import type { AttributeDef, PublicProduct } from './types'
import type { CatalogFilters, ConfiguracaoFiltrosRaw } from './filters'

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
/**
 * `atributosAtivos` é a lista já resolvida para a categoria (ver
 * `resolveActiveAttributeDefs`) — quem chama decide quais atributos contam
 * como filtro aqui. Sem ela, `f.atributos` fica sem efeito nenhum: é a mesma
 * allowlist da API aplicada outra vez, do lado da loja, para quem monta a
 * query string à mão.
 */
export async function listProducts(
  f: CatalogFilters,
  categoriaId?: number,
  atributosAtivos: AttributeDef[] = [],
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

  if (f.atributos) produtos = filtrarPorAtributos(produtos, f.atributos, atributosAtivos)

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

/**
 * As definições de atributo, tal como a API as devolve sem sessão: já só
 * `filtro` e `ficha`, nunca `interno` (`access/leitura.ts` na API — a loja
 * não repete essa verificação, confia nela).
 *
 * Mas só os de `alcance: 'filtro'` viram filtro aqui — `ficha` "aparece nas
 * especificações, não filtra" (é a própria label do campo em `Attributes.ts`
 * na API). A API não impede tecnicamente que um `ficha` entre em
 * `ConfiguracaoFiltros` (só bloqueia `interno`), por isso esta segunda
 * verificação fica do lado da loja: um atributo de ficha nunca deve oferecer
 * um filtro, e mais um sítio a checar `alcance` é barato comparado com a
 * confusão de um cliente filtrar por um campo pensado só para a ficha.
 */
export async function listAttributeDefs(): Promise<AttributeDef[]> {
  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/attributes?limit=${NO_LIMIT}&depth=0&sort=ordem`,
  )
  return res.docs
    .filter((d) => d.alcance === 'filtro')
    .filter((d) => d.tipo === 'select' || d.tipo === 'multiselect' || d.tipo === 'intervalo' || d.tipo === 'booleano')
    .map((d) => ({
      id: Number(d.id),
      nome: String(d.nome ?? ''),
      chave: String(d.chave ?? ''),
      tipo: d.tipo as AttributeDef['tipo'],
      controlo: String(d.controlo ?? 'caixas') as AttributeDef['controlo'],
      ordem: Number(d.ordem ?? 0),
      abertoPorOmissao: Boolean(d.abertoPorOmissao),
    }))
}

/** O conjunto de filtros configurado no painel (`ConfiguracaoFiltros`, global
 * de leitura pública) — por omissão e por categoria. */
export async function getConfiguracaoFiltros(): Promise<ConfiguracaoFiltrosRaw> {
  return apiGet<ConfiguracaoFiltrosRaw>('/api/globals/configuracao-filtros?depth=0')
}

/**
 * Os filtros de uma página de catálogo, já fechados ao que é público — e o
 * conjunto de atributos ativos de onde essa allowlist saiu.
 *
 * **Chamar isto no componente de página, com os `searchParams` acabados de
 * esperar, e nunca passar os `searchParams` crus mais para dentro.** O React
 * serializa as props dos componentes na carga que vai para o browser: um
 * `searchParams` cru entregue a um componente — ainda que de servidor, ainda
 * que ele o filtre logo a seguir — deixa a query string inteira escrita no
 * HTML, com `margem-alvo` e `costCents` incluídos, escritos por quem os
 * forçou no URL. `restringirAtributosAtivos` só protege o que vier depois
 * dele; a query crua tem de morrer aqui, na página.
 */
export async function lerFiltros(
  sp: Record<string, string | string[] | undefined>,
  categoriaId?: number,
): Promise<{ filtros: CatalogFilters; atributosAtivos: AttributeDef[] }> {
  const [defs, config] = await Promise.all([listAttributeDefs(), getConfiguracaoFiltros()])
  const atributosAtivos = resolveActiveAttributeDefs(defs, config, categoriaId)

  return {
    filtros: restringirAtributosAtivos(parseFilters(sp), atributosAtivos),
    atributosAtivos,
  }
}

/**
 * Para a navegação do cabeçalho e para quem precisar do `id` — categorias
 * reais, nunca escritas à mão. `id` já vinha na resposta da API e ficava por
 * usar; passa a viajar porque a home estrutural precisa dele para pedir os
 * produtos de cada categoria (`pesquisarProdutos` pede `categoriaId`, não
 * slug) sem uma segunda chamada por categoria.
 */
export async function listCategories(): Promise<{ id: number; name: string; slug: string }[]> {
  const res = await apiGet<Paginated<{ id: number; name: string; slug: string }>>(
    `/api/categories?limit=${NO_LIMIT}&depth=0`,
  )
  return res.docs
    .map((d) => ({ id: d.id, name: d.name, slug: d.slug }))
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

/**
 * Categorias filhas de `categoriaId` (`categories.parent`) — reais, nunca
 * inventadas. Hoje nenhuma categoria semeada tem `parent` preenchido, então
 * isto devolve sempre `[]`; o caminho fica pronto para o dia em que o
 * catálogo ganhar uma hierarquia de verdade, sem precisar de outra função.
 */
export async function listSubcategories(
  categoriaId: number,
): Promise<{ id: number; name: string; slug: string }[]> {
  const res = await apiGet<Paginated<{ id: number; name: string; slug: string }>>(
    `/api/categories?limit=${NO_LIMIT}&depth=0&where[parent][equals]=${categoriaId}`,
  )
  return res.docs
    .map((d) => ({ id: d.id, name: d.name, slug: d.slug }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
}
