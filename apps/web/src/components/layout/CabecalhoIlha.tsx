'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * O cabeçalho é uma cápsula que flutua e acompanha o scroll (`sticky`).
 *
 * Depois de rolar, só a sombra cresce, para a cápsula se destacar do
 * conteúdo que passa por baixo. Quem decide é um `IntersectionObserver` num
 * marco de 1px antes da cápsula, não um listener de `scroll`.
 *
 * O tamanho NUNCA muda com o estado: encolher a cápsula mexia na altura da
 * página, o browser corrigia o scroll (scroll anchoring), o marco voltava a
 * aparecer e a cápsula crescia outra vez — tremia sem parar na fronteira.
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
        className="sticky top-0 z-50 mx-auto max-w-7xl px-4 pt-3 motion-safe:animate-entrada-cima motion-safe:[animation-delay:90ms] sm:px-6"
      >
        {/* Mesmo contentor do conteúdo (`max-w-7xl` + `px-4 sm:px-6`): a
            cápsula alinha com as bordas do banner. */}
        <div
          className={`relative flex items-center gap-2 rounded-pill border bg-surface/90 pl-4 pr-2 backdrop-blur-md h-14 transition-[box-shadow,border-color] duration-300 ease-brand motion-reduce:transition-none sm:h-16 sm:gap-4 sm:pl-6 ${
            rolado ? 'border-border shadow-drawer' : 'border-border/70 shadow-card'
          }`}
        >
          {children}
        </div>
      </header>
    </>
  )
}
