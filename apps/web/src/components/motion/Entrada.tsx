'use client'

import type { ReactNode } from 'react'
import gsap from 'gsap'
import { useMotion } from './useMotion'

/**
 * Os filhos diretos entram em sequência, ao montar — o herói da home (título,
 * texto, botões) e a ficha de produto (imagem e informação a assentar).
 *
 * `gsap.from` parte do estado final: o HTML servido já está visível e é o
 * script que o recua meio segundo. `clearProps` no fim não deixa estilo
 * nenhum agarrado ao elemento.
 */
export function Entrada({
  children,
  className,
  y = 20,
}: {
  children: ReactNode
  className?: string
  y?: number
}) {
  const ref = useMotion<HTMLDivElement>((el) => {
    gsap.from(Array.from(el.children), {
      opacity: 0,
      y,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
      clearProps: 'transform,opacity',
    })
  })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
