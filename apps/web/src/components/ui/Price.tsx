import { getTranslations } from 'next-intl/server'
import { formatEuros } from '@animora/core'

/**
 * Formata cêntimos inteiros. É o ÚNICO sítio da loja onde dinheiro vira texto.
 * `formatEuros` rebenta se receber decimais — é de propósito.
 */
export async function Price({
  cents,
  old,
  desde = false,
  className = '',
}: {
  cents: number
  old?: number | null
  /** O produto tem variantes com preços diferentes e este é o mais baixo. */
  desde?: boolean
  className?: string
}) {
  const t = await getTranslations('Price')

  return (
    <span className={className}>
      {desde ? <span className="mr-1 text-sm text-text-muted">{t('desde')}</span> : null}
      <span className="text-lg font-bold tabular-nums text-text">{formatEuros(cents)}</span>
      {old && old > cents ? (
        // O preço riscado, e mais nada. Havia aqui um distintivo verde
        // "Poupas X €" que dizia pela terceira vez o que o distintivo de
        // percentagem e o preço riscado já diziam — três pílulas de três cores
        // num cartão de 300 px.
        <span className="ml-2 text-sm tabular-nums text-text-muted line-through">
          {formatEuros(old)}
        </span>
      ) : null}
    </span>
  )
}
