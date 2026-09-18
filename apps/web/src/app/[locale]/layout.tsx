import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Fredoka, Montserrat, Caveat } from 'next/font/google'
import '../../styles/globals.css'
import { routing } from '../../i18n/routing'
import { Header } from '../../components/layout/Header'
import { Footer } from '../../components/layout/Footer'
import { CarrinhoProvider } from '../../modules/cart'
import { SITE_URL, alternatesFor } from '../../lib/seo'

/**
 * As três famílias da loja, auto-alojadas por `next/font` — sem pedido a
 * servidores de fontes em tempo de execução e sem salto de tipo ao carregar.
 *
 * Substituem Bricolage Grotesque + Figtree (identidade anterior, "A
 * Clareira e o Balcão") pela paleta tipográfica da spec definitiva: Fredoka
 * nos títulos (peso 700 — a família não tem corte 800, o mais pesado
 * disponível é 700), Montserrat no texto/interface, Caveat só em manuscrito
 * decorativo (nunca em informação funcional, por isso um peso mais leve, 500,
 * já serve o uso pontual).
 */
const fonteTitulo = Fredoka({
  weight: ['700'],
  subsets: ['latin'],
  variable: '--fonte-titulo',
  display: 'swap',
})

const fonteTexto = Montserrat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--fonte-texto',
  display: 'swap',
})

const fonteManuscrita = Caveat({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--fonte-manuscrita',
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
    metadataBase: new URL(SITE_URL),
    title: { default: t('metaTitulo'), template: '%s · Animora' },
    description: t('metaDescricao'),
    alternates: alternatesFor('/', locale),
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
    <html
      lang={HTML_LANG[locale] ?? locale}
      className={`${fonteTitulo.variable} ${fonteTexto.variable} ${fonteManuscrita.variable}`}
    >
      {/* A folga em baixo é do tamanho da barra de navegação em telemóvel
          (ver `BarraMobile`), que é fixa e taparia o fim do rodapé. A partir
          de `sm` a barra não existe e a folga também não. */}
      <body className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-campo focus:bg-ink focus:px-4 focus:py-2 focus:text-papel"
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
