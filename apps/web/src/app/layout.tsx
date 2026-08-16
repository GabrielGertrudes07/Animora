import type { Metadata } from 'next'
import '../styles/globals.css'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { CarrinhoProvider } from '../modules/cart/CarrinhoProvider'

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
    <html lang="pt-PT">
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
