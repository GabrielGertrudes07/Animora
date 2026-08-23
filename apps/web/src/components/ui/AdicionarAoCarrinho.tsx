'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('AdicionarAoCarrinho')

  if (esgotado) {
    return <span className="text-sm font-medium text-ink-muted">{t('esgotado')}</span>
  }

  return (
    <button
      type="button"
      onClick={() => {
        acrescentar(variantId)
        setFeito(true)
        window.setTimeout(() => setFeito(false), 2000)
      }}
      aria-label={t('adicionarAria', { etiqueta })}
      className="rounded-lg bg-terracota px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracota-dark"
    >
      {feito ? t('noCarrinho') : t('adicionar')}
    </button>
  )
}
