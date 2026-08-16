import type { Metadata } from 'next'
import { listProducts, parseFilters } from '../../modules/catalog'
import { ProductCard } from '../../components/ui/ProductCard'

type Props = {
  params: Promise<{ categoria: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params
  const nome = categoria.charAt(0).toUpperCase() + categoria.slice(1)
  return {
    title: nome,
    description: `Produtos de ${nome} para o teu animal, na Animora.`,
  }
}

export default async function CatalogoPage({ params, searchParams }: Props) {
  const { categoria } = await params
  const filtros = parseFilters(await searchParams)
  const produtos = await listProducts(filtros)

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold capitalize text-ink">{categoria}</h1>
      <p className="mt-2 text-ink-muted">
        {produtos.length === 1 ? '1 produto' : `${produtos.length} produtos`}
      </p>

      {produtos.length === 0 ? (
        <div className="mt-10 rounded-card bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-ink">Nenhum produto corresponde aos filtros</h2>
          <p className="mt-2 text-ink-muted">Experimenta alargar o intervalo de preço.</p>
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
