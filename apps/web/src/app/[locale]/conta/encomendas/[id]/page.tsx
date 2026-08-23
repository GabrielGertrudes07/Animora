import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { formatEuros } from '@animora/core'

import { clienteAtual } from '../../../../../modules/account/sessao'
import { dataLegivel, estadoLegivel, obterEncomenda } from '../../../../../modules/account/encomendas'

export const metadata: Metadata = { title: 'Encomenda' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ novo?: string }>
}

/**
 * O detalhe de uma encomenda — e a confirmação da compra que acabou de ser
 * feita (`?novo=1`).
 *
 * É a mesma página nos dois casos de propósito: a confirmação mostra o número e
 * o que foi comprado, que é exatamente o que esta página mostra. Uma página de
 * confirmação à parte, com o estado a viver na memória do browser, perdia tudo
 * a um F5 logo a seguir a alguém gastar dinheiro.
 *
 * A encomenda de outra pessoa dá 404 — não porque esta página o verifique, mas
 * porque a API não a devolve (o `read` dos `orders` devolve um `Where`, e o
 * `findByID` de um id que não é do cliente não encontra nada).
 */
export default async function EncomendaPage({ params, searchParams }: Props) {
  if (!(await clienteAtual())) redirect('/conta/entrar?voltar=/conta/encomendas')

  const { id } = await params
  const encomenda = await obterEncomenda(id)
  if (!encomenda) notFound()

  const novo = (await searchParams).novo === '1'

  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/conta/encomendas" className="text-sm text-ink-muted underline hover:text-ink">
        Encomendas
      </Link>

      {novo ? (
        <p className="mt-4 rounded-card bg-sage/15 px-5 py-4 text-ink">
          <strong className="block text-lg">Encomenda registada.</strong>
          Fica a aguardar pagamento. Guardámos tudo o que escolheu, com os preços deste momento.
        </p>
      ) : null}

      <h1 className="mt-4 text-3xl font-bold text-ink">{encomenda.numero}</h1>
      <p className="mt-1 text-ink-muted">
        {dataLegivel(encomenda.criadaEm)} · {estadoLegivel(encomenda.estado)}
      </p>

      <h2 className="mt-8 text-lg font-bold text-ink">Artigos</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {encomenda.linhas.map((l, i) => (
          <li
            key={`${l.sku}-${i}`}
            className="flex flex-wrap items-baseline justify-between gap-3 rounded-card bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">{l.titulo}</p>
              {l.opcoes ? <p className="text-sm text-ink-muted">{l.opcoes}</p> : null}
              <p className="text-sm text-ink-muted">
                {l.quantidade} × {formatEuros(l.precoUnitarioCents)}
              </p>
            </div>
            <span className="font-semibold text-ink">
              {formatEuros(l.precoUnitarioCents * l.quantidade)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-card bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Totais</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="text-ink">{formatEuros(encomenda.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Envio</dt>
              <dd className="text-ink">
                {encomenda.portesCents === 0 ? 'Grátis' : formatEuros(encomenda.portesCents)}
              </dd>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-line pt-3 text-base">
              <dt className="font-bold text-ink">Total</dt>
              <dd className="font-bold text-ink" data-total-cents={encomenda.totalCents}>
                {formatEuros(encomenda.totalCents)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-card bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">Morada de envio</h2>
          <p className="mt-3 text-sm text-ink-muted">
            {encomenda.moradaEnvio.nomeDestinatario}
            <br />
            {encomenda.moradaEnvio.linha1}
            {encomenda.moradaEnvio.linha2 ? `, ${encomenda.moradaEnvio.linha2}` : ''}
            <br />
            {encomenda.moradaEnvio.codigoPostal} {encomenda.moradaEnvio.localidade}
            {encomenda.moradaEnvio.telefone ? (
              <>
                <br />
                {encomenda.moradaEnvio.telefone}
              </>
            ) : null}
          </p>
        </section>
      </div>
    </main>
  )
}
