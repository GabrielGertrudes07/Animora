'use client'

import type { ReactNode } from 'react'
import gsap from 'gsap'
import { useMotion } from './useMotion'

/**
 * Revelação ao rolar (ScrollTrigger), para as secções abaixo da dobra.
 *
 * `once: true`: revela uma vez e o gatilho morre — nada volta a esconder-se
 * ao rolar para cima. Um bloco que já esteja dentro do ecrã quando a página
 * abre é revelado no mesmo instante, sem esperar por scroll nenhum.
 */
export function Reveal({
  children,
  className,
  y = 28,
}: {
  children: ReactNode
  className?: string
  y?: number
}) {
  const ref = useMotion<HTMLDivElement>((el) => {
    gsap.from(el, {
      opacity: 0,
      y,
      duration: 0.7,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    })
  })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
