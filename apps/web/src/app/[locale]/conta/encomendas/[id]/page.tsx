import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { formatEuros } from '@animora/core'

import { Link, redirect } from '../../../../../i18n/navigation'
import { clienteAtual } from '../../../../../modules/account/sessao'
import { dataLegivel, estadoLegivel, obterEncomenda } from '../../../../../modules/account/encomendas'

type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ novo?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'EncomendaDetalhe' })
  return { title: t('metaTitulo'), robots: { index: false, follow: false } }
}

/**
 * O detalhe de uma encomenda — e a confirmação da compra que acabou de ser
 * feita (`?novo=1`). Ver o comentário original em `encomendas/[id]/page.tsx`
 * (git blame) para a razão de ser a mesma página nos dois casos e de a
 * encomenda de outra pessoa dar 404.
 */
export default async function EncomendaPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  if (!(await clienteAtual())) {
    redirect({ href: { pathname: '/conta/entrar', query: { voltar: '/conta/encomendas' } }, locale })
  }

  const [t, tEstados, encomenda] = await Promise.all([
    getTranslations('EncomendaDetalhe'),
    getTranslations('Encomendas'),
    obterEncomenda(id),
  ])
  if (!encomenda) notFound()

  const novo = (await searchParams).novo === '1'

  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/conta/encomendas" className="text-sm text-ink-muted underline hover:text-ink">
        {t('encomendas')}
      </Link>

      {novo ? (
        <p className="mt-4 rounded-card bg-sage/15 px-5 py-4 text-ink">
          <strong className="block text-lg">{t('registada')}</strong>
          {t('aguardaPagamento')}
        </p>
      ) : null}

      <h1 className="mt-4 text-titulo text-ink">{encomenda.numero}</h1>
      <p className="mt-1 text-ink-muted">
        {dataLegivel(encomenda.criadaEm, locale)} · {estadoLegivel(encomenda.estado, tEstados)}
      </p>

      <h2 className="mt-8 text-lg font-bold text-ink">{t('artigos')}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {encomenda.linhas.map((l, i) => (
          <li
            key={`${l.sku}-${i}`}
            className="flex flex-wrap items-baseline justify-between gap-3 rounded-card bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">{l.titulo}</p>
              {l.opcoes ? <p className="text-sm text-ink-muted">{l.opcoes}</p> : null}
              <p className="text-sm text-ink-muted">
                {l.quantidade} × {formatEuros(l.precoUnitarioCents)}
              </p>
            </div>
            <span className="font-semibold text-ink">
              {formatEuros(l.precoUnitarioCents * l.quantidade)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-card bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{t('totais')}</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t('subtotal')}</dt>
              <dd className="text-ink">{formatEuros(encomenda.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t('envio')}</dt>
              <dd className="text-ink">
                {encomenda.portesCents === 0 ? t('gratis') : formatEuros(encomenda.portesCents)}
              </dd>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-line pt-3 text-base">
              <dt className="font-bold text-ink">{t('total')}</dt>
              <dd className="font-bold text-ink" data-total-cents={encomenda.totalCents}>
                {formatEuros(encomenda.totalCents)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-card bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{t('moradaEnvio')}</h2>
          <p className="mt-3 text-sm text-ink-muted">
            {encomenda.moradaEnvio.nomeDestinatario}
            <br />
            {encomenda.moradaEnvio.linha1}
            {encomenda.moradaEnvio.linha2 ? `, ${encomenda.moradaEnvio.linha2}` : ''}
            <br />
            {encomenda.moradaEnvio.codigoPostal} {encomenda.moradaEnvio.localidade}
            {encomenda.moradaEnvio.telefone ? (
              <>
                <br />
                {encomenda.moradaEnvio.telefone}
              </>
            ) : null}
          </p>
        </section>
      </div>
    </main>
  )
}
