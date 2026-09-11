'use client'

import type { ReactNode } from 'react'
import gsap from 'gsap'
import { useMotion } from '../motion/useMotion'

/**
 * A entrada do seletor de categorias: as cenas assentam de um zoom curto, em
 * cascata da esquerda para a direita.
 *
 * Aqui viviam também os ouvintes do hover — `pointerover`/`pointerout`
 * delegados, com deteção de fronteira, mais `focus`/`blur` em cada ligação
 * para o teclado ter o mesmo destaque —, que animavam o animal a sair da
 * moldura enquanto o cenário recuava. O gesto era bonito e era o mais
 * assinado do site, mas dependia de um recorte que a arte não entrega: sem
 * sombra de contacto e com a luz do animal a não bater com a do cenário, o que
 * se lia era colagem.
 *
 * O zoom contido que ficou é uma transição de uma propriedade disparada por
 * `:hover` e `:focus-visible` — CSS, no cartão, sem ouvinte nenhum. O teclado
 * ganha o mesmo tratamento de graça, o que antes custava dois ouvintes por
 * cartão.
 */
export function PalcoCategorias({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useMotion<HTMLUListElement>((el) => {
    gsap.from(el.querySelectorAll('[data-cartao-categoria]'), {
      opacity: 0,
      scale: 1.06,
      duration: 0.55,
      ease: 'power3.out',
      stagger: { amount: 0.35 },
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    })
  })

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  )
}
