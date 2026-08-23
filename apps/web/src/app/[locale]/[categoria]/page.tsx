import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategoryBySlug, lerFiltros, listCategories } from '../../../modules/catalog'
import { Catalogo } from '../../../components/catalog/Catalogo'

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

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { categoria } = await params
  const cat = await getCategoryBySlug(categoria)
  // Categoria inexistente é 404 — categoria existente e vazia é 200 com
  // estado vazio (dentro de `Catalogo`). São situações diferentes.
  if (!cat) notFound()

  // A query string crua morre aqui: o que segue para dentro já é só o que
  // corresponde a um filtro ativo desta categoria. Ver `lerFiltros`.
  const { filtros, atributosAtivos } = await lerFiltros(await searchParams, cat.id)

  return (
    <Catalogo
      titulo={cat.name}
      caminho={`/${cat.slug}`}
      categoriaId={cat.id}
      filtros={filtros}
      atributosAtivos={atributosAtivos}
      vazio={{
        titulo: 'Ainda sem produtos nesta categoria',
        texto: 'Volta em breve — estamos a preparar novidades.',
      }}
    />
  )
}
