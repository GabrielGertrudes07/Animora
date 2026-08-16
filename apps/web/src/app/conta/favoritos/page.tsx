import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { clienteAtual } from '../../../modules/account/sessao'
import { listProductsByIds } from '../../../modules/catalog'
import { EstadoVazio } from '../../../components/ui/EstadoVazio'
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
        <div className="mt-8">
          <EstadoVazio
            ilustracao="coracao"
            titulo="Ainda não guardou nenhum favorito"
            texto="Na ficha de cada produto há um coração para o guardar aqui."
          >
            <Link href="/produtos" className="botao-principal">
              Ver produtos
            </Link>
          </EstadoVazio>
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
