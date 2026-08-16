import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategoryBySlug, listCategories, listProducts, parseFilters } from '../../modules/catalog'
import { ProductCard } from '../../components/ui/ProductCard'

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
  const produtos = await listProducts(filtros, cat.id)
  const comFiltros = Boolean(filtros.marca?.length || filtros.precoMin !== undefined)

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold text-ink">{cat.name}</h1>
      <p className="mt-2 text-ink-muted">
        {produtos.length === 1 ? '1 produto' : `${produtos.length} produtos`}
      </p>

      {produtos.length === 0 ? (
        <div className="mt-10 rounded-card bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-ink">
            {comFiltros ? 'Nenhum produto corresponde aos filtros' : 'Ainda sem produtos nesta categoria'}
          </h2>
          <p className="mt-2 text-ink-muted">
            {comFiltros
              ? 'Experimenta alargar o intervalo de preço.'
              : 'Volta em breve — estamos a preparar novidades.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {produtos.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  )
}
