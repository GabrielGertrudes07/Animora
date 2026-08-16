import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatEuros } from '@animora/core'

import { clienteAtual } from '../../../modules/account/sessao'
import { dataLegivel, estadoLegivel, listarEncomendas } from '../../../modules/account/encomendas'

export const metadata: Metadata = { title: 'As minhas encomendas' }

export default async function EncomendasPage() {
  if (!(await clienteAtual())) redirect('/conta/entrar?voltar=/conta/encomendas')

  const encomendas = await listarEncomendas()

  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/conta" className="text-sm text-ink-muted underline hover:text-ink">
        A minha conta
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-ink">Encomendas</h1>

      {encomendas.length === 0 ? (
        <div className="mt-8 rounded-card bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-ink">Ainda não fez nenhuma encomenda.</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {encomendas.map((e) => (
            <li key={e.id} className="rounded-card bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link
                  href={`/conta/encomendas/${e.id}`}
                  className="text-lg font-bold text-ink hover:underline"
                >
                  {e.numero}
                </Link>
                <span className="text-sm text-ink-muted">{dataLegivel(e.criadaEm)}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{estadoLegivel(e.estado)}</p>
              <p className="mt-2 text-sm text-ink">
                {e.linhas.length} {e.linhas.length === 1 ? 'artigo' : 'artigos'} ·{' '}
                <strong>{formatEuros(e.totalCents)}</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
