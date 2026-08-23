import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { clienteAtual } from '../../../modules/account/sessao'
import { BotaoSair } from './BotaoSair'
import { Moradas } from './Moradas'

export const metadata: Metadata = { title: 'A minha conta' }

export default async function ContaPage() {
  const cliente = await clienteAtual()
  if (!cliente) redirect('/conta/entrar')

  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Olá, {cliente.nome}</h1>
          <p className="mt-1 text-ink-muted">{cliente.email}</p>
        </div>
        <BotaoSair />
      </div>

      <nav className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/conta/encomendas"
          className="rounded-xl border border-line bg-white px-5 py-3 font-medium text-ink transition-colors hover:border-terracota"
        >
          Encomendas
        </Link>
        <Link
          href="/conta/favoritos"
          className="rounded-xl border border-line bg-white px-5 py-3 font-medium text-ink transition-colors hover:border-terracota"
        >
          Favoritos ({cliente.favoritos.length})
        </Link>
      </nav>

      <Moradas moradas={cliente.moradas} />
    </main>
  )
}
