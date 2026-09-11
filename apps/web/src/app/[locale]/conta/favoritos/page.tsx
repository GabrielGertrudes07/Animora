import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Link, redirect } from '../../../../i18n/navigation'
import { clienteAtual } from '../../../../modules/account/sessao'
import { listProductsByIds } from '../../../../modules/catalog'
import { EstadoVazio } from '../../../../components/ui/EstadoVazio'
import { ProductCard } from '../../../../components/ui/ProductCard'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'FavoritosPage' })
  return { title: t('metaTitulo'), robots: { index: false, follow: false } }
}

/**
 * Os favoritos são ids de produto guardados na conta. Os produtos em si vêm do
 * catálogo, pelo mesmo caminho sanitizado de sempre — um favorito de um produto
 * entretanto despublicado simplesmente não aparece.
 */
export default async function FavoritosPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('FavoritosPage')

  const cliente = await clienteAtual()
  if (!cliente) {
    return redirect({ href: { pathname: '/conta/entrar', query: { voltar: '/conta/favoritos' } }, locale })
  }

  const produtos = await listProductsByIds(cliente.favoritos)

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/conta" className="text-sm text-ink-muted underline hover:text-ink">
        {t('minhaConta')}
      </Link>
      <h1 className="mt-2 text-titulo text-ink">{t('titulo')}</h1>

      {produtos.length === 0 ? (
        <div className="mt-8">
          <EstadoVazio ilustracao="coracao" titulo={t('vazioTitulo')} texto={t('vazioTexto')}>
            <Link href="/produtos" className="botao-principal">
              {t('verProdutos')}
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
