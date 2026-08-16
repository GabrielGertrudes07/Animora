import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getCategoryBySlug,
  listCategories,
  listProducts,
  listAttributeDefs,
  getConfiguracaoFiltros,
  resolveActiveAttributeDefs,
  restringirAtributosAtivos,
  computeAttributeFacets,
  precoBounds,
  marcasDisponiveis,
  parseFilters,
} from '../../modules/catalog'
import { ProductCard } from '../../components/ui/ProductCard'
import { FiltrosCatalogo } from '../../components/catalog/FiltrosCatalogo'
import { OrdenarPor } from '../../components/catalog/OrdenarPor'

type Props = {
  params: Promise<{ categoria: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Pré-gera uma rota por categoria real, à semelhança da ficha de produto. */
export async function generateStaticParams() {
  const categorias = await listCategories()
  return categorias.map((c) => ({ categoria: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params
  const cat = await getCategoryBySlug(categoria)
  if (!cat) return { title: 'Categoria não encontrada' }

  return {
    title: cat.name,
    description: `Produtos de ${cat.name} para o teu animal, na Animora.`,
  }
}

export default async function CatalogoPage({ params, searchParams }: Props) {
  const { categoria } = await params
  const cat = await getCategoryBySlug(categoria)
  // Categoria inexistente é 404 — categoria existente e vazia é 200 com
  // estado vazio (mais abaixo). São situações diferentes.
  if (!cat) notFound()

  const filtros = parseFilters(await searchParams)

  // O universo SEM os filtros do pedido: é dele que saem os limites de preço,
  // as marcas e os valores de atributo REAIS — nunca uma constante e nunca
  // reduzido pelos próprios filtros que se está a montar (senão a barra de
  // preço encolhia sozinha a cada seleção). A lista efetivamente mostrada
  // (`produtos`, abaixo) é uma segunda leitura, já com os filtros aplicados.
  const [todosDaCategoria, atributoDefs, configuracaoFiltros] = await Promise.all([
    listProducts({ ordem: 'relevancia' }, cat.id),
    listAttributeDefs(),
    getConfiguracaoFiltros(),
  ])

  const atributosAtivos = resolveActiveAttributeDefs(atributoDefs, configuracaoFiltros, cat.id)
  const facetas = computeAttributeFacets(todosDaCategoria, atributosAtivos)
  const bounds = precoBounds(todosDaCategoria)
  const marcas = marcasDisponiveis(todosDaCategoria)

  // Só o que corresponde a um atributo ativo continua daqui em diante — nem
  // para filtrar, nem para o estado da UI. Uma chave forçada no URL para um
  // atributo interno (que nunca chega a `atributosAtivos`) fica sem efeito
  // nenhum E sem rasto nenhum: não filtra, e não aparece no HTML nem no
  // estado serializado das Client Components abaixo.
  const filtrosVisiveis = restringirAtributosAtivos(filtros, atributosAtivos)

  const produtos = await listProducts(filtrosVisiveis, cat.id, atributosAtivos)
  const comFiltros = Boolean(
    filtrosVisiveis.marca?.length ||
      filtrosVisiveis.precoMin !== undefined ||
      Object.keys(filtrosVisiveis.atributos ?? {}).length > 0,
  )

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold text-ink">{cat.name}</h1>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-muted">
          {produtos.length === 1 ? '1 produto' : `${produtos.length} produtos`}
        </p>
        <OrdenarPor filtrosAtuais={filtrosVisiveis} />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <FiltrosCatalogo marcas={marcas} bounds={bounds} atributos={facetas} filtrosAtuais={filtrosVisiveis} />

        <div className="min-w-0 flex-1">
          {produtos.length === 0 ? (
            <div className="rounded-card bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-ink">
                {comFiltros ? 'Nenhum produto corresponde aos filtros' : 'Ainda sem produtos nesta categoria'}
              </h2>
              <p className="mt-2 text-ink-muted">
                {comFiltros
                  ? 'Experimenta alargar os filtros escolhidos.'
                  : 'Volta em breve — estamos a preparar novidades.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {produtos.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
