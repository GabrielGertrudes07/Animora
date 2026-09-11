import { createElement } from 'react'

/**
 * Tipos de espaço editorial previstos na spec estrutural v1. Cada um vira um
 * `LayeredCampaignMedia` (ou equivalente) na fase de criativos, sem mudar a
 * estrutura da página.
 */
export type MediaPlaceholderType =
  | 'hero'
  | 'campaign'
  | 'editorial'
  | 'category'
  | 'product'
  | 'testimonial'
  | 'brand'

export type MediaPlaceholderProps = {
  /** Proporção CSS (`aspect-ratio`), ex.: `'16/7'`, `'4/5'`, `'1/1'`. */
  ratio: string
  type: MediaPlaceholderType
  /** Descrição acessível opcional. Sem ela, o espaço é decorativo (`aria-hidden`). */
  label?: string
  /** Ocupa 100% do contentor do pai (equivalente ao `fill` do `next/image`) em vez de reservar a própria proporção. */
  fill?: boolean
  className?: string
}

/**
 * Espaço reservado neutro para mídia editorial ainda não decidida.
 *
 * Escrito com `createElement` em vez de JSX de propósito: evita depender de
 * qualquer configuração de transform de JSX no runtime de teste, e o
 * componente não tem lógica que justifique a sintaxe.
 */
export function MediaPlaceholder({ ratio, type, label, fill = false, className }: MediaPlaceholderProps) {
  return createElement('div', {
    'data-media-placeholder': type,
    role: label ? 'img' : undefined,
    'aria-label': label,
    'aria-hidden': label ? undefined : true,
    className: [fill ? 'absolute inset-0 h-full w-full' : 'block w-full', className].filter(Boolean).join(' '),
    style: { aspectRatio: ratio, background: '#F4F1E8', border: '1px solid #E8E5DC' },
  })
}
