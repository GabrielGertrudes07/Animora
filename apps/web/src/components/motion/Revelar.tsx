'use client'

import type { ReactNode } from 'react'
import gsap from 'gsap'
import { useMotion } from './useMotion'

/**
 * Os filhos diretos sobem e aparecem quando o bloco entra no ecrã — para os
 * títulos de secção (h2 + texto), que até aqui ficavam parados enquanto o
 * conteúdo por baixo deles (círculos, cartões) já entrava em cascata.
 *
 * Mesmo gatilho da `PalcoCategorias` (`top 88%`, uma vez), por isso o título
 * chega um instante antes do conteúdo que apresenta. Na primeira dobra
 * dispara logo ao abrir a página.
 */
export function Revelar({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useMotion<HTMLDivElement>((el) => {
    gsap.from(Array.from(el.children), {
      opacity: 0,
      y: 16,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.1,
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
