import { formatEuros } from '@animora/core'

/**
 * Formata cêntimos inteiros. É o ÚNICO sítio da loja onde dinheiro vira texto.
 * `formatEuros` rebenta se receber decimais — é de propósito.
 */
export function Price({
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
  return (
    <span className={className}>
      {desde ? <span className="mr-1 text-sm text-ink-muted">desde</span> : null}
      <span className="text-lg font-bold text-ink">{formatEuros(cents)}</span>
      {old && old > cents ? (
        <span className="ml-2 text-sm text-ink-muted line-through">{formatEuros(old)}</span>
      ) : null}
    </span>
  )
}
