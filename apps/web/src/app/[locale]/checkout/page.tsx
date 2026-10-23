import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link, redirect } from '../../../i18n/navigation'
import { Icon } from '../../../components/icons/sprite'
import { Logo } from '../../../components/layout/Logo'

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

  // Sem o cabeçalho da loja (ver `ForaDoCheckout`): só o logo, o selo de
  // pagamento seguro e o caminho de volta ao carrinho.
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-900">
            <Icon name="shield" className="h-5 w-5 text-success" />
            {t('pagamentoSeguro')}
          </p>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          href="/carrinho"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-muted hover:text-orange"
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
          {t('voltarAoCarrinho')}
        </Link>
        <h1 className="mt-2 text-titulo text-text">{t('titulo')}</h1>
        <p className="mt-2 text-text-muted">{cliente.email}</p>

        <div className="mt-8">
          {/* Só o nome e as moradas atravessam para o cliente. */}
          <FormularioCheckout nome={cliente.nome} moradas={cliente.moradas} />
        </div>
      </main>
    </>
  )
}
