export {
  listProducts,
  getProductBySlug,
  listAllSlugs,
  listProductsByIds,
  listProductsByVariantIds,
  listAttributeDefs,
  getConfiguracaoFiltros,
  listCategories,
  getCategoryBySlug,
  listSubcategories,
  lerFiltros,
} from './queries'
export {
  parseFilters,
  filtersToQuery,
  resolveActiveAttributeDefs,
  restringirAtributosAtivos,
} from './filters'
export { pesquisarProdutos, filtrarPorTexto, normalizarTexto } from './pesquisa'
export { precoBounds, marcasDisponiveis, computeAttributeFacets } from './facets'
export { sanitizeProduct, INTERNAL_PRODUCT_FIELDS, INTERNAL_VARIANT_FIELDS } from './sanitize'
export { precoDeMostra } from './preco'
export { getAvaliacaoProduto, getAvaliacaoLoja } from './avaliacoes'
export type { PrecoDeMostra } from './preco'
export type { PublicProduct, PublicVariant, AttributeDef, AttributeFacet } from './types'
export type { CatalogFilters, SortKey, ConfiguracaoFiltrosRaw } from './filters'
