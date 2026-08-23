import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link, redirect } from '../../../i18n/navigation'

import { clienteAtual } from '../../../modules/account/sessao'
import { BotaoSair } from './BotaoSair'
import { Moradas } from './Moradas'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ContaPage' })
  return { title: t('metaTitulo') }
}

export default async function ContaPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('ContaPage')

  const cliente = await clienteAtual()
  if (!cliente) {
    return redirect({ href: '/conta/entrar', locale })
  }

  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">{t('ola', { nome: cliente.nome })}</h1>
          <p className="mt-1 text-ink-muted">{cliente.email}</p>
        </div>
        <BotaoSair />
      </div>

      <nav className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/conta/encomendas"
          className="rounded-xl border border-line bg-white px-5 py-3 font-medium text-ink transition-colors hover:border-terracota"
        >
          {t('encomendas')}
        </Link>
        <Link
          href="/conta/favoritos"
          className="rounded-xl border border-line bg-white px-5 py-3 font-medium text-ink transition-colors hover:border-terracota"
        >
          {t('favoritos', { count: cliente.favoritos.length })}
        </Link>
      </nav>

      <Moradas moradas={cliente.moradas} />
    </main>
  )
}
