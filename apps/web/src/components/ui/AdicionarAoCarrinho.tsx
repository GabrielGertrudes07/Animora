'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { useCarrinho } from '../../modules/cart'

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
    // Sempre empilhado quando há seletor de quantidade — não só em mobile.
    // `ProductCard` vive em grelhas de largura muito variável (2 a 5
    // colunas, com ou sem a barra de filtros da PLP ao lado), e o cartão
    // mais estreito de qualquer uma delas (~150-220px) nunca sobra espaço
    // para o seletor e o botão lado a lado sem cortar o botão — visto e
    // corrigido nesta fase (achado de QA na PLP em 1024/1440/1920px, onde a
    // barra de filtros reduz a grelha). Um `md:flex-row` baseado no
    // viewport não resolve: a mesma largura de ecrã tem cartões largos na
    // home e estreitos na PLP. Sem consulta de contentor (`@container`) no
    // Tailwind desta versão, empilhar sempre é o que garante nunca cortar,
    // ao custo de um pouco de altura extra nos cartões mais largos.
    <div className="flex flex-col gap-2">
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
          comQuantidade ? 'w-full' : ''
        }`}
      >
        {feito ? t('noCarrinho') : t('adicionar')}
      </button>
    </div>
  )
}
