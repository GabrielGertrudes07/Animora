import type { Metadata } from 'next'
import { Fraunces, Nunito_Sans } from 'next/font/google'
import '../styles/globals.css'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { CarrinhoProvider } from '../modules/cart/CarrinhoProvider'

/**
 * As duas famílias da loja, auto-alojadas por `next/font` — sem pedido a
 * servidores de fontes em tempo de execução e sem salto de tipo ao carregar.
 *
 * Fraunces (serifa suave, com `SOFT`/`WONK` a arredondar-lhe os cantos) só nos
 * títulos: é ela que tira o ar de template. Nunito Sans no texto, que é para
 * ler. Duas e mais nenhuma.
 */
const fonteTitulo = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--fonte-titulo',
  display: 'swap',
})

const fonteTexto = Nunito_Sans({
  subsets: ['latin'],
  variable: '--fonte-texto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Animora — cuidados para o teu animal',
    template: '%s · Animora',
  },
  description:
    'Alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos animais.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${fonteTitulo.variable} ${fonteTexto.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          Saltar para o conteúdo
        </a>
        {/*
          O carrinho envolve a aplicação inteira porque o cabeçalho mostra o
          número de artigos em todas as páginas. Não lê cookies nem sessão do
          lado do servidor de propósito: `cookies()` aqui tornava TODAS as
          páginas dinâmicas, incluindo as fichas de produto, que são geradas
          estaticamente. A sessão é perguntada do cliente, depois de montar.
        */}
        <CarrinhoProvider>
          <Header />
          {children}
          <Footer />
        </CarrinhoProvider>
      </body>
    </html>
  )
}
