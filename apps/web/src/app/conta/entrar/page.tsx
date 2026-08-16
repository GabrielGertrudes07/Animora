import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { clienteAtual } from '../../../modules/account/sessao'
import { FormularioEntrada } from '../FormularioEntrada'
import { destinoSeguro } from '../destino'

export const metadata: Metadata = { title: 'Entrar' }

type Props = { searchParams: Promise<{ voltar?: string }> }

export default async function EntrarPage({ searchParams }: Props) {
  const voltar = destinoSeguro((await searchParams).voltar)
  if (await clienteAtual()) redirect(voltar)

  return (
    <main id="conteudo" className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Entrar</h1>
      {voltar === '/checkout' ? (
        <p className="mt-2 text-ink-muted">
          O carrinho fica onde está — entre e continue a compra.
        </p>
      ) : null}
      <FormularioEntrada modo="entrar" voltar={voltar} />
    </main>
  )
}
