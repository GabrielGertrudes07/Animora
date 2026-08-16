import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { clienteAtual } from '../../modules/account/sessao'
import { FormularioCheckout } from './FormularioCheckout'

export const metadata: Metadata = { title: 'Finalizar compra' }

/**
 * Sem sessão, o checkout leva a entrar — e o carrinho não se perde.
 *
 * O carrinho vive no `localStorage`, do lado do browser: um redireccionamento
 * não lhe toca. O `?voltar=/checkout` é só para o ecrã de entrada saber para
 * onde devolver a pessoa depois, em vez de a deixar na página da conta a
 * perguntar-se o que aconteceu à compra.
 *
 * Uma sessão de staff conta como "não é cliente" e vem aqui parar também: é a
 * mesma decisão que o `POST /api/checkout` toma (403, "entre com a sua conta de
 * cliente"), tomada um ecrã antes.
 */
export default async function CheckoutPage() {
  const cliente = await clienteAtual()
  if (!cliente) redirect('/conta/entrar?voltar=/checkout')

  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Finalizar compra</h1>
      <p className="mt-2 text-ink-muted">{cliente.email}</p>

      <div className="mt-8">
        {/* Só o nome e as moradas atravessam para o cliente. */}
        <FormularioCheckout nome={cliente.nome} moradas={cliente.moradas} />
      </div>
    </main>
  )
}
