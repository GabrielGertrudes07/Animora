'use client'

import { useTranslations } from 'next-intl'
import { formatEuros, type CartTotals } from '@animora/core'

import { Icon } from '../icons/sprite'

/**
 * Os totais do carrinho, e a mensagem de quanto falta para o envio grátis.
 *
 * A regra dos 50 € existia no site antigo e nunca era dita a ninguém — foi
 * apontada na crítica como a alavanca de conversão mais barata desperdiçada.
 * Aqui é uma frase com o valor exato que falta, e **desaparece assim que deixa
 * de ser verdade**: uma barra a dizer "faltam 0,00 €" ao lado de "Envio grátis"
 * é ruído, e ruído ao lado de números é o que faz as pessoas deixarem de ler os
 * números.
 *
 * Os três valores vêm de `calcularTotais`, que é a mesma função que o servidor
 * corre no checkout — o total aqui é o total da fatura.
 *
 * `data-total-cents` existe para a verificação poder medir o número exato no
 * HTML e compará-lo com o `totalCents` da encomenda criada, sem ter de
 * desformatar texto.
 */
export function Totais({ totais }: { totais: CartTotals }) {
  const t = useTranslations('Totais')

  return (
    <>
      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">{t('subtotal')}</dt>
          <dd className="font-medium text-ink">{formatEuros(totais.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">{t('envio')}</dt>
          <dd className="font-medium text-ink">
            {totais.shippingCents === 0 ? t('gratis') : formatEuros(totais.shippingCents)}
          </dd>
        </div>
        <div className="mt-2 flex justify-between gap-4 border-t border-line pt-3 text-base">
          <dt className="font-bold text-ink">{t('total')}</dt>
          <dd className="font-bold text-ink" data-total-cents={totais.totalCents}>
            {formatEuros(totais.totalCents)}
          </dd>
        </div>
      </dl>

      {totais.faltaParaEnvioGratisCents > 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-cream px-3 py-2 text-sm text-ink">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('faltaEnvioGratis', { valor: formatEuros(totais.faltaParaEnvioGratisCents) })}</span>
        </p>
      ) : totais.subtotalCents > 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-cream px-3 py-2 text-sm text-ink">
          <Icon name="shield" className="h-4 w-4 shrink-0" />
          {t('temEnvioGratis')}
        </p>
      ) : null}
    </>
  )
}
