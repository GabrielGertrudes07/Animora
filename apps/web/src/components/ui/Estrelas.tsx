import { getTranslations } from 'next-intl/server'
import type { ResumoAvaliacoes } from '@animora/core'

/**
 * Média e contagem de avaliações — ou nada.
 *
 * `resumo.media === null` (sem avaliação nenhuma) não desenha zero estrelas:
 * não desenha nada. Um produto novo sem avaliações não é um produto mal
 * avaliado, e mostrar "0,0 ★" diria exatamente isso.
 *
 * As estrelas são SVG e não os glifos `★`/`☆`. O glifo vinha da fonte do
 * sistema: mudava de desenho, de peso e de largura entre macOS, Windows e
 * Android, e num cartão de produto isso lê-se como rascunho. Em SVG são a
 * mesma forma em toda a parte — e a média fracionária mostra-se a sério,
 * cortando a fila preenchida à percentagem certa em vez de arredondar.
 */
const ESTRELA = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'

/**
 * As estrelas medem-se em `em`, não em píxeis fixos: crescem com o texto que
 * as acompanha. Estavam presas a 14px, e `ProvaSocial` — que pede um tamanho
 * maior para a média da loja — só via crescer o número ao lado.
 */
function Fila({ className }: { className: string }) {
  return (
    <span className={`flex w-max gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-[1em] w-[1em] shrink-0" fill="currentColor">
          <path d={ESTRELA} />
        </svg>
      ))}
    </span>
  )
}

export async function Estrelas({
  resumo,
  className = '',
}: {
  resumo: ResumoAvaliacoes
  className?: string
}) {
  if (resumo.media === null) return null

  const t = await getTranslations('Estrelas')
  const media = resumo.media / 10

  return (
    <div className={`flex items-center gap-1.5 text-sm text-ink-muted ${className}`}>
      <span className="relative inline-block" aria-hidden="true">
        <Fila className="text-ink-muted/25" />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${(media / 5) * 100}%` }}
        >
          <Fila className="text-terracota" />
        </span>
      </span>
      <span className="tabular-nums">
        {media.toFixed(1)} · {t('contagem', { count: resumo.total })}
      </span>
    </div>
  )
}
