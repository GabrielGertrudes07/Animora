'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Cabeçalho compacto que acompanha o scroll (desktop).
 *
 * O cabeçalho completo fica no topo da página, parado. Este é uma segunda
 * barra, fixa, que desce do topo quando aquele sai do ecrã e sobe quando
 * volta — uma linha só (logótipo, categorias, carrinho), referência do
 * Gabriel: popularpet.
 *
 * Quem decide é um `IntersectionObserver` num marco de 1px logo a seguir ao
 * cabeçalho, não um listener de `scroll`: o browser avisa só na passagem,
 * sem correr código a cada píxel. Escondida, a barra fica `inert` — os
 * links não recebem foco nem aparecem ao leitor de ecrã em duplicado.
 * Em mobile não existe: aí já há a `BarraMobile` fixa em baixo.
 */
export function BarraFixa({ children }: { children: ReactNode }) {
  const marco = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = marco.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e) setVisivel(!e.isIntersecting && e.boundingClientRect.top < 0)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <div ref={marco} aria-hidden className="-mt-px h-px" />
      <div
        inert={!visivel}
        className={`fixed inset-x-0 top-0 z-50 hidden border-b border-border bg-surface/95 shadow-card backdrop-blur transition-[transform,opacity] duration-300 ease-brand motion-reduce:transition-none sm:block ${
          visivel ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        {children}
      </div>
    </>
  )
}
