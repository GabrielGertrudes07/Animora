'use client'

import { useState } from 'react'

import { useCarrinho } from '../../modules/cart/CarrinhoProvider'

/**
 * O botão de acrescentar uma variante ao carrinho.
 *
 * Recebe `variantId` e `esgotado`, e mais nada. É a fronteira servidor→cliente
 * da ficha de produto: um objeto de produto passado inteiro para aqui ia parar
 * ao estado serializado do React dentro do HTML, com tudo o que tivesse dentro.
 * Dois primitivos não levam nada consigo.
 */
export function AdicionarAoCarrinho({
  variantId,
  esgotado,
  etiqueta,
}: {
  variantId: number
  esgotado: boolean
  /** Para o nome acessível: "Adicionar Tamanho: L ao carrinho". */
  etiqueta: string
}) {
  const { acrescentar } = useCarrinho()
  const [feito, setFeito] = useState(false)

  if (esgotado) {
    return <span className="text-sm font-medium text-ink-muted">Esgotado</span>
  }

  return (
    <button
      type="button"
      onClick={() => {
        acrescentar(variantId)
        setFeito(true)
        window.setTimeout(() => setFeito(false), 2000)
      }}
      aria-label={`Adicionar ${etiqueta} ao carrinho`}
      className="rounded-lg bg-terracota px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracota-dark"
    >
      {feito ? 'No carrinho' : 'Adicionar'}
    </button>
  )
}
