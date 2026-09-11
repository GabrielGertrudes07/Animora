import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '../../../../i18n/navigation'

import { clienteAtual } from '../../../../modules/account/sessao'
import { FormularioEntrada } from '../FormularioEntrada'
import { destinoSeguro } from '../destino'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ voltar?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'RegistarPage' })
  return { title: t('metaTitulo'), robots: { index: false, follow: false } }
}

export default async function RegistarPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('RegistarPage')

  const voltar = destinoSeguro((await searchParams).voltar)
  if (await clienteAtual()) redirect({ href: voltar, locale })

  return (
    <main id="conteudo" className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-titulo text-ink">{t('titulo')}</h1>
      <p className="mt-2 text-ink-muted">{t('descricao')}</p>
      <FormularioEntrada modo="registar" voltar={voltar} />
    </main>
  )
}
