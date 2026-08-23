import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import '../../styles/globals.css'
import { routing } from '../../i18n/routing'
import { Header } from '../../components/layout/Header'
import { Footer } from '../../components/layout/Footer'
import { CarrinhoProvider } from '../../modules/cart/CarrinhoProvider'

/**
 * As duas famílias da loja, auto-alojadas por `next/font` — sem pedido a
 * servidores de fontes em tempo de execução e sem salto de tipo ao carregar.
 *
 * Fraunces + Nunito Sans (a combinação anterior) é a escolha-reflexo de
 * qualquer gerador de design — foi apontada como "cara de IA" na crítica que
 * levou a este redesign. Bricolage Grotesque nos títulos tem carácter próprio
 * sem cair em serifa editorial; Figtree no texto continua legível. Duas e
 * mais nenhuma.
 */
const fonteTitulo = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--fonte-titulo',
  display: 'swap',
})

const fonteTexto = Figtree({
  subsets: ['latin'],
  variable: '--fonte-texto',
  display: 'swap',
})

const HTML_LANG: Record<string, string> = { pt: 'pt-PT', de: 'de-DE' }

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Home' })

  return {
    title: { default: t('metaTitulo'), template: '%s · Animora' },
    description: t('metaDescricao'),
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const [t, messages] = await Promise.all([
    getTranslations({ locale, namespace: 'Layout' }),
    getMessages(),
  ])

  return (
    <html lang={HTML_LANG[locale] ?? locale} className={`${fonteTitulo.variable} ${fonteTexto.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          {t('saltarParaConteudo')}
        </a>
        {/*
          O carrinho envolve a aplicação inteira porque o cabeçalho mostra o
          número de artigos em todas as páginas. Não lê cookies nem sessão do
          lado do servidor de propósito: `cookies()` aqui tornava TODAS as
          páginas dinâmicas, incluindo as fichas de produto, que são geradas
          estaticamente. A sessão é perguntada do cliente, depois de montar.

          `messages` tem de ser passado explicitamente ao provider — sem ele,
          `useTranslations` (a versão para Client Components, usada em
          `SeletorIdioma`, `FiltrosCatalogo`, `Totais`, `FormularioCheckout`,
          etc.) não tem de onde ler as traduções no browser.
        */}
        <NextIntlClientProvider messages={messages}>
          <CarrinhoProvider>
            <Header />
            {children}
            <Footer />
          </CarrinhoProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
