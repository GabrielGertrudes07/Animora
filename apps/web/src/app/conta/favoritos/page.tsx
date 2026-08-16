import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { clienteAtual } from '../../../modules/account/sessao'
import { listProductsByIds } from '../../../modules/catalog'
import { ProductCard } from '../../../components/ui/ProductCard'

export const metadata: Metadata = { title: 'Favoritos' }

/**
 * Os favoritos são ids de produto guardados na conta. Os produtos em si vêm do
 * catálogo, pelo mesmo caminho sanitizado de sempre — um favorito de um produto
 * entretanto despublicado simplesmente não aparece.
 */
export default async function FavoritosPage() {
  const cliente = await clienteAtual()
  if (!cliente) redirect('/conta/entrar?voltar=/conta/favoritos')

  const produtos = await listProductsByIds(cliente.favoritos)

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/conta" className="text-sm text-ink-muted underline hover:text-ink">
        A minha conta
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-ink">Favoritos</h1>

      {produtos.length === 0 ? (
        <div className="mt-8 rounded-card bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-ink">Ainda não guardou nenhum favorito.</p>
          <p className="mt-2 text-ink-muted">
            Na ficha de cada produto há um coração para o guardar aqui.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {produtos.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  )
}
