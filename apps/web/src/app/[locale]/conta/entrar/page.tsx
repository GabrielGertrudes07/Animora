import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '../../../../i18n/navigation'

import { clienteAtual, COOKIE_SESSAO } from '../../../../modules/account/sessao'
import { FormularioEntrada } from '../FormularioEntrada'
import { destinoSeguro } from '../destino'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ voltar?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'EntrarPage' })
  return { title: t('metaTitulo') }
}

export default async function EntrarPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('EntrarPage')

  const voltar = destinoSeguro((await searchParams).voltar)
  if (await clienteAtual()) redirect({ href: voltar, locale })

  /**
   * Há cookie mas não há cliente: ou a sessão é da administração (o painel e a
   * loja são contas diferentes — é a mesma decisão que o `POST /api/checkout`
   * toma com o seu 403), ou expirou. Sem esta linha, quem trabalha na loja e
   * está autenticado no painel era mandado para um formulário de entrada sem
   * perceber porquê, no meio de uma compra.
   */
  const sessaoQueNaoServe = (await cookies()).get(COOKIE_SESSAO) !== undefined

  return (
    <main id="conteudo" className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-titulo text-ink">{t('titulo')}</h1>
      {sessaoQueNaoServe ? (
        <p className="mt-2 rounded-campo border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink">
          {t('sessaoQueNaoServe')}
        </p>
      ) : null}
      {voltar === '/checkout' ? (
        <p className="mt-2 text-ink-muted">{t('carrinhoFicaOndeEsta')}</p>
      ) : null}
      <FormularioEntrada modo="entrar" voltar={voltar} />
    </main>
  )
}
