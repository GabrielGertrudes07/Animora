import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { clienteAtual } from '../../../../modules/account/sessao'
import { FormularioEntrada } from '../FormularioEntrada'
import { destinoSeguro } from '../destino'

export const metadata: Metadata = { title: 'Criar conta' }

type Props = { searchParams: Promise<{ voltar?: string }> }

export default async function RegistarPage({ searchParams }: Props) {
  const voltar = destinoSeguro((await searchParams).voltar)
  if (await clienteAtual()) redirect(voltar)

  return (
    <main id="conteudo" className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Criar conta</h1>
      <p className="mt-2 text-ink-muted">
        Para acompanhar as suas encomendas e guardar moradas e favoritos.
      </p>
      <FormularioEntrada modo="registar" voltar={voltar} />
    </main>
  )
}
