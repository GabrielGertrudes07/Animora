'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * O cabeçalho é uma cápsula que flutua e acompanha o scroll (`sticky`).
 *
 * No topo da página fica mais alta e com sombra leve; depois de rolar,
 * encolhe e a sombra cresce, para se destacar do conteúdo que passa por
 * baixo. Quem decide é um `IntersectionObserver` num marco de 1px antes da
 * cápsula, não um listener de `scroll`: o browser avisa só na passagem.
 *
 * A cápsula é `relative`: o painel do mega-menu e a pesquisa aberta
 * posicionam-se a partir dela.
 */
export function CabecalhoIlha({ children }: { children: ReactNode }) {
  const marco = useRef<HTMLDivElement>(null)
  const [rolado, setRolado] = useState(false)

  useEffect(() => {
    const el = marco.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e) setRolado(!e.isIntersecting)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <div ref={marco} aria-hidden className="-mb-px h-px" />
      <header
        className={`sticky top-0 z-50 mx-auto max-w-7xl px-4 transition-[padding] duration-300 ease-brand motion-safe:animate-entrada-cima motion-safe:[animation-delay:90ms] motion-reduce:transition-none sm:px-6 ${
          rolado ? 'pt-2' : 'pt-3 sm:pt-4'
        }`}
      >
        {/* Mesmo contentor do conteúdo (`max-w-7xl` + `px-4 sm:px-6`): a
            cápsula alinha com as bordas do banner. */}
        <div
          className={`relative flex items-center gap-2 rounded-pill border bg-surface/90 pl-4 pr-2 backdrop-blur-md transition-[height,box-shadow,border-color] duration-300 ease-brand motion-reduce:transition-none sm:gap-4 sm:pl-6 ${
            rolado ? 'h-14 border-border shadow-drawer' : 'h-14 border-border/70 shadow-card sm:h-16'
          }`}
        >
          {children}
        </div>
      </header>
    </>
  )
}
