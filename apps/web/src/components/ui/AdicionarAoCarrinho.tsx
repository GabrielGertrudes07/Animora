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
  comQuantidade = false,
}: {
  variantId: number
  esgotado: boolean
  /** Para o nome acessível: "Adicionar Tamanho: L ao carrinho". */
  etiqueta: string
  /** Mostra um seletor de quantidade (−/+) antes do botão. */
  comQuantidade?: boolean
}) {
  const { acrescentar } = useCarrinho()
  const [feito, setFeito] = useState(false)
  const [quantidade, setQuantidade] = useState(1)
  const t = useTranslations('AdicionarAoCarrinho')

  if (esgotado) {
    return <span className="text-sm font-medium text-ink-muted">{t('esgotado')}</span>
  }

  return (
    // Empilhado no cartão estreito (2 colunas em mobile): seletor de
    // quantidade + botão lado a lado não cabem em ~170px de largura. A partir
    // de `md` (o mesmo ponto em que a grelha do cartão passa a 3 colunas) o
    // cartão já tem espaço e os dois voltam a ficar na mesma linha.
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      {comQuantidade ? (
        <div className="flex items-center self-start rounded-full border border-line">
          <button
            type="button"
            aria-label={t('diminuir')}
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-ink-muted transition-colors hover:text-ink sm:h-9 sm:w-9"
          >
            −
          </button>
          <span aria-live="polite" className="w-6 text-center text-sm tabular-nums text-ink">
            {quantidade}
          </span>
          <button
            type="button"
            aria-label={t('aumentar')}
            onClick={() => setQuantidade((q) => q + 1)}
            className="flex h-11 w-11 items-center justify-center text-ink-muted transition-colors hover:text-ink sm:h-9 sm:w-9"
          >
            +
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          acrescentar(variantId, quantidade)
          setFeito(true)
          window.setTimeout(() => setFeito(false), 2000)
        }}
        aria-label={t('adicionarAria', { etiqueta })}
        className={`botao-principal min-h-11 px-5 py-2 text-base sm:min-h-0 sm:px-4 sm:text-sm ${
          comQuantidade ? 'w-full md:w-auto md:flex-1' : ''
        }`}
      >
        {feito ? t('noCarrinho') : t('adicionar')}
      </button>
    </div>
  )
}
