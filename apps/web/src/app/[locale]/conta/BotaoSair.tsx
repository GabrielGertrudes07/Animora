'use client'

import { useRouter } from 'next/navigation'

import { sair } from '../../../modules/account/acoes'
import { useCarrinho } from '../../../modules/cart/CarrinhoProvider'

/**
 * Sair.
 *
 * O carrinho da conta fica onde está, no balde dela: sair não é apagar o que a
 * pessoa escolheu, é deixar de estar autenticado. O que passa a estar à vista é
 * o carrinho de convidado, que é o que estava lá antes de entrar.
 */
export function BotaoSair() {
  const router = useRouter()
  const { sairDaConta } = useCarrinho()

  return (
    <button
      type="button"
      onClick={() => {
        void sair().then(() => {
          sairDaConta()
          router.push('/')
          router.refresh()
        })
      }}
      className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
    >
      Sair
    </button>
  )
}
