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
 * A grelha de cartões: cascata suave à entrada no ecrã, e a micro-interação
 * do rato em cima de cada cartão.
 *
 * Os ouvintes ficam no contentor e não em cada cartão, por duas razões: um
 * ouvinte em vez de vinte, e — a que interessa — a lista muda quando os
 * filtros mudam, e cartões novos não teriam ouvinte nenhum se este estivesse
 * agarrado a cada um deles.
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
      if (!jaAnimou.has(pathname)) {
        jaAnimou.add(pathname)
        gsap.from(el.querySelectorAll('[data-cartao]'), {
          opacity: 0,
          y: 24,
          duration: 0.5,
          ease: 'power2.out',
          // O atraso total é fixo, não por cartão: numa grelha de quarenta
          // produtos, 0,07 s cada dava três segundos até o último aparecer.
          stagger: { amount: 0.5 },
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        })
      }

      const cartaoDe = (e: PointerEvent) =>
        (e.target as Element | null)?.closest<HTMLElement>('[data-cartao]') ?? null

      /** Um movimento de e para dentro do mesmo cartão não conta como entrar
       * nem como sair — senão o cartão saltava a cada elemento atravessado. */
      const atravessouAFronteira = (e: PointerEvent, cartao: HTMLElement) =>
        !cartao.contains(e.relatedTarget as Node | null)

      const mover = (cartao: HTMLElement, y: number, escala: number) => {
        gsap.to(cartao, { y, duration: 0.3, ease: 'power2.out' })
        const imagem = cartao.querySelector('img')
        if (imagem) gsap.to(imagem, { scale: escala, duration: 0.5, ease: 'power2.out' })
      }

      const parar = new AbortController()
      el.addEventListener(
        'pointerover',
        (e) => {
          const cartao = cartaoDe(e)
          if (cartao && atravessouAFronteira(e, cartao)) mover(cartao, -6, 1.06)
        },
        { signal: parar.signal },
      )
      el.addEventListener(
        'pointerout',
        (e) => {
          const cartao = cartaoDe(e)
          if (cartao && atravessouAFronteira(e, cartao)) mover(cartao, 0, 1)
        },
        { signal: parar.signal },
      )

      return () => parar.abort()
    },
    [pathname],
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
