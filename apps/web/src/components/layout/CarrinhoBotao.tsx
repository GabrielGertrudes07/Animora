'use client'

import { useTranslations } from 'next-intl'

import { useCarrinho } from '../../modules/cart'
import { Link } from '../../i18n/navigation'
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
  const t = useTranslations('CarrinhoBotao')

  return (
    <Link
      href="/carrinho"
      className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-pill bg-orange px-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-deep"
      aria-label={t('carrinhoAria', { count: pronto ? contagem : 0 })}
    >
      <Icon name="cart" className="h-5 w-5" />
      {pronto && contagem > 0 ? (
        <span className="min-w-5 rounded-full bg-white px-1.5 py-0.5 text-center text-xs font-bold text-orange">
          {contagem}
        </span>
      ) : null}
    </Link>
  )
}
