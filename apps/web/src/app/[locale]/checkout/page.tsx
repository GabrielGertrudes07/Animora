import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '../../../i18n/navigation'

import { clienteAtual } from '../../../modules/account/sessao'
import { FormularioCheckout } from './FormularioCheckout'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'CheckoutPage' })
  return { title: t('metaTitulo'), robots: { index: false, follow: false } }
}

/**
 * Sem sessão, o checkout leva a entrar — e o carrinho não se perde.
 *
 * O carrinho vive no `localStorage`, do lado do browser: um redireccionamento
 * não lhe toca. `voltar` fica sempre como caminho SEM prefixo de idioma
 * (`/checkout`, nunca `/de/checkout`) — é o `redirect`/`router.push` locale-aware
 * (de `i18n/navigation`) que acrescenta o prefixo certo no momento de navegar,
 * tanto aqui como em `FormularioEntrada` (Task 10). Prefixar `voltar` já aqui
 * faria `FormularioEntrada` prefixar outra vez por cima e dava `/de/de/checkout`.
 *
 * Uma sessão de staff conta como "não é cliente" e vem aqui parar também: é a
 * mesma decisão que o `POST /api/checkout` toma (403, "entre com a sua conta de
 * cliente"), tomada um ecrã antes.
 */
export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('CheckoutPage')

  const cliente = await clienteAtual()
  if (!cliente) {
    return redirect({ href: { pathname: '/conta/entrar', query: { voltar: '/checkout' } }, locale })
  }

  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-titulo text-ink">{t('titulo')}</h1>
      <p className="mt-2 text-ink-muted">{cliente.email}</p>

      <div className="mt-8">
        {/* Só o nome e as moradas atravessam para o cliente. */}
        <FormularioCheckout nome={cliente.nome} moradas={cliente.moradas} />
      </div>
    </main>
  )
}
