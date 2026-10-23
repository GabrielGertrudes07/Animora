import { describe, expect, it } from 'vitest'
import { MediaPlaceholder } from './MediaPlaceholder'

function propsOf(element: ReturnType<typeof MediaPlaceholder>) {
  return (element as unknown as { props: Record<string, unknown> }).props
}

describe('MediaPlaceholder', () => {
  it('aplica o contrato visual neutro e a proporção pedida', () => {
    const props = propsOf(MediaPlaceholder({ ratio: '16/7', type: 'hero' }))

    expect(props.style).toEqual({
      aspectRatio: '16/7',
      background: '#FFFFFF',
      border: '1px solid #E8ECEC',
    })
    expect(props['data-media-placeholder']).toBe('hero')
  })

  it('é decorativo por omissão e anunciado só quando recebe label', () => {
    const semLabel = propsOf(MediaPlaceholder({ ratio: '1/1', type: 'category' }))
    expect(semLabel['aria-hidden']).toBe(true)
    expect(semLabel.role).toBeUndefined()

    const comLabel = propsOf(MediaPlaceholder({ ratio: '1/1', type: 'category', label: 'Cães' }))
    expect(comLabel.role).toBe('img')
    expect(comLabel['aria-label']).toBe('Cães')
    expect(comLabel['aria-hidden']).toBeUndefined()
  })

  it('no modo fill ocupa o contentor do pai em vez da própria proporção', () => {
    const props = propsOf(MediaPlaceholder({ ratio: '4/5', type: 'testimonial', fill: true }))
    expect(props.className).toContain('absolute inset-0 h-full w-full')
  })

  it('nunca faz um pedido de rede — nenhuma referência a src, srcSet ou url', () => {
    const props = propsOf(MediaPlaceholder({ ratio: '16/9', type: 'brand', className: 'rounded-card' }))
    expect(Object.keys(props)).not.toContain('src')
    expect(props.className).toBe('block w-full rounded-card')
  })
})
