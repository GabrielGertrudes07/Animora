'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { useMotion } from './useMotion'

/**
 * Grelhas já animadas nesta sessão, por caminho.
 *
 * É isto que cumpre a segunda regra da especificação: **a grelha do catálogo
 * não anima a cada mudança de filtro**. Filtrar muda só a query string, o
 * caminho continua o mesmo, e a cascata não volta a correr — vinte cartões a
 * desaparecer e a voltar a cada caixa que se marca enjoa e atrasa. Mudar de
 * categoria (caminho novo) anima, porque aí é mesmo uma página nova.
 */
const jaAnimou = new Set<string>()

/**
 * A grelha de cartões: uma cascata curta à entrada no ecrã, e nada mais.
 *
 * Aqui viviam também os ouvintes do hover — `pointerover`/`pointerout`
 * delegados no contentor, com deteção de fronteira, a levantar o cartão 6 px e
 * a escalar a imagem. O levantamento saiu (um cartão que salta lê-se como
 * salto, não como elevação) e a escala da imagem passou a uma transição CSS no
 * próprio cartão, que é o sítio dela. Ficou a cascata.
 *
 * `y: 12` e não 24: o deslocamento é o que se sente, não o que se vê. Vinte e
 * quatro píxeis é o fade-up de qualquer template.
 */
export function CascataProdutos({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()

  const ref = useMotion<HTMLDivElement>(
    (el) => {
      if (jaAnimou.has(pathname)) return
      jaAnimou.add(pathname)

      gsap.from(el.querySelectorAll('[data-cartao]'), {
        opacity: 0,
        y: 12,
        duration: 0.42,
        // Vizinho de `var(--curva)` em CSS: o GSAP não come `cubic-bezier`
        // sem plugin, e `power3.out` é a mesma sensação de travagem.
        ease: 'power3.out',
        // O atraso total é fixo, não por cartão: numa grelha de quarenta
        // produtos, 0,07 s cada dava três segundos até o último aparecer.
        stagger: { amount: 0.35 },
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      })
    },
    [pathname],
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
