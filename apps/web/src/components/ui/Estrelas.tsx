import type { ResumoAvaliacoes } from '@animora/core'

/**
 * Média e contagem de avaliações — ou nada.
 *
 * `resumo.media === null` (sem avaliação nenhuma) não desenha zero estrelas:
 * não desenha nada. Um produto novo sem avaliações não é um produto mal
 * avaliado, e mostrar "0,0 ★" diria exatamente isso.
 */
export function Estrelas({
  resumo,
  className = '',
}: {
  resumo: ResumoAvaliacoes
  className?: string
}) {
  if (resumo.media === null) return null

  const media = resumo.media / 10

  return (
    <div className={`flex items-center gap-1.5 text-sm text-ink-muted ${className}`}>
      <span className="text-terracota" aria-hidden="true">
        {'★★★★★'.slice(0, Math.round(media))}
        {'☆☆☆☆☆'.slice(0, 5 - Math.round(media))}
      </span>
      <span>
        {media.toFixed(1)} · {resumo.total} {resumo.total === 1 ? 'avaliação' : 'avaliações'}
      </span>
    </div>
  )
}
