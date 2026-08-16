'use client'

import Link from 'next/link'

import { useCarrinho } from '../../modules/cart/CarrinhoProvider'
import { Icon } from '../icons/sprite'

/**
 * O carrinho no cabeçalho, agora um link a sério.
 *
 * Era um botão `disabled` com a etiqueta "em breve". O contador só aparece
 * depois de o `localStorage` ter sido lido (`pronto`): pintar "0" no servidor e
 * outro número no cliente é um erro de hidratação, e o React deita fora a
 * árvore toda quando o encontra.
 */
export function CarrinhoBotao() {
  const { contagem, pronto } = useCarrinho()

  return (
    <Link
      href="/carrinho"
      className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-terracota"
      aria-label={
        pronto
          ? `Carrinho, ${contagem} ${contagem === 1 ? 'artigo' : 'artigos'}`
          : 'Carrinho'
      }
    >
      <Icon name="cart" className="h-5 w-5" />
      <span className="hidden sm:inline">Carrinho</span>
      {pronto && contagem > 0 ? (
        <span className="rounded-full bg-terracota px-2 py-0.5 text-xs font-semibold text-white">
          {contagem}
        </span>
      ) : null}
    </Link>
  )
}
