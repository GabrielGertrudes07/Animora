import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { clienteAtual, COOKIE_SESSAO } from '../../../../modules/account/sessao'
import { FormularioEntrada } from '../FormularioEntrada'
import { destinoSeguro } from '../destino'

export const metadata: Metadata = { title: 'Entrar' }

type Props = { searchParams: Promise<{ voltar?: string }> }

export default async function EntrarPage({ searchParams }: Props) {
  const voltar = destinoSeguro((await searchParams).voltar)
  if (await clienteAtual()) redirect(voltar)

  /**
   * Há cookie mas não há cliente: ou a sessão é da administração (o painel e a
   * loja são contas diferentes — é a mesma decisão que o `POST /api/checkout`
   * toma com o seu 403), ou expirou. Sem esta linha, quem trabalha na loja e
   * está autenticado no painel era mandado para um formulário de entrada sem
   * perceber porquê, no meio de uma compra.
   */
  const sessaoQueNaoServe = (await cookies()).get(COOKIE_SESSAO) !== undefined

  return (
    <main id="conteudo" className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Entrar</h1>
      {sessaoQueNaoServe ? (
        <p className="mt-2 rounded-lg border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink">
          A sessão que tem aberta não é de cliente (ou já terminou). Quem trabalha na loja compra
          com a sua conta de cliente, como toda a gente.
        </p>
      ) : null}
      {voltar === '/checkout' ? (
        <p className="mt-2 text-ink-muted">
          O carrinho fica onde está — entre e continue a compra.
        </p>
      ) : null}
      <FormularioEntrada modo="entrar" voltar={voltar} />
    </main>
  )
}
