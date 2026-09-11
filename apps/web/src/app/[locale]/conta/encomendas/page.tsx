import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { formatEuros } from '@animora/core'

import { Link, redirect } from '../../../../i18n/navigation'
import { clienteAtual } from '../../../../modules/account/sessao'
import { dataLegivel, estadoLegivel, listarEncomendas } from '../../../../modules/account/encomendas'
import { EstadoVazio } from '../../../../components/ui/EstadoVazio'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'EncomendasPage' })
  return { title: t('metaTitulo'), robots: { index: false, follow: false } }
}

export default async function EncomendasPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  if (!(await clienteAtual())) {
    redirect({ href: { pathname: '/conta/entrar', query: { voltar: '/conta/encomendas' } }, locale })
  }

  const [t, tEstados, encomendas] = await Promise.all([
    getTranslations('EncomendasPage'),
    getTranslations('Encomendas'),
    listarEncomendas(),
  ])

  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/conta" className="text-sm text-ink-muted underline hover:text-ink">
        {t('minhaConta')}
      </Link>
      <h1 className="mt-2 text-titulo text-ink">{t('titulo')}</h1>

      {encomendas.length === 0 ? (
        <div className="mt-8">
          <EstadoVazio ilustracao="caixa" titulo={t('vazioTitulo')} texto={t('vazioTexto')}>
            <Link href="/produtos" className="botao-principal">
              {t('verProdutos')}
            </Link>
          </EstadoVazio>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {encomendas.map((e) => (
            <li key={e.id} className="rounded-card bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link
                  href={`/conta/encomendas/${e.id}`}
                  className="text-lg font-bold text-ink hover:underline"
                >
                  {e.numero}
                </Link>
                <span className="text-sm text-ink-muted">{dataLegivel(e.criadaEm, locale)}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{estadoLegivel(e.estado, tEstados)}</p>
              <p className="mt-2 text-sm text-ink">
                {t('artigos', { count: e.linhas.length })} ·{' '}
                <strong>{formatEuros(e.totalCents)}</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
