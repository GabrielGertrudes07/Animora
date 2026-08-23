'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '../../i18n/navigation'

export type SlideCarrossel = {
  cor: 'terracota' | 'ink' | 'sage-dark'
  rotulo: string
  titulo: string
  texto: string
  ctaPrincipal: { texto: string; href: string }
  ctaSecundario?: { texto: string; href: string }
  imagem: { src: string; alt: string }
  selo?: string
}

const CORES: Record<SlideCarrossel['cor'], string> = {
  terracota: 'bg-terracota',
  ink: 'bg-ink',
  'sage-dark': 'bg-sage-dark',
}

/**
 * O corte entre o bloco de cor e a fotografia (fundos de estúdio muito
 * diferentes) ficava demasiado abrupto. Este gradiente — na mesma cor do
 * bloco — cobre a borda esquerda da foto e esbate a transição, em vez de a
 * escurecer com um véu neutro que ficaria igual em qualquer slide.
 */
const GRADIENTES_BORDA: Record<SlideCarrossel['cor'], string> = {
  terracota: 'from-terracota via-terracota/25',
  ink: 'from-ink via-ink/25',
  'sage-dark': 'from-sage-dark via-sage-dark/25',
}

/**
 * O carrossel de destaques da home — não é uma peça do sistema de movimento
 * `components/motion` (`useMotion`) porque não é "anima uma vez ao aparecer":
 * é interação contínua (slides, pontos, avanço automático), por isso tem o
 * seu próprio estado em vez de um `gsap.context`.
 *
 * `prefers-reduced-motion` desliga o avanço automático (WCAG 2.2.2: conteúdo
 * que avança sozinho tem de se poder parar) — as setas e os pontos continuam
 * a funcionar. A transição do próprio deslize já cai a zero pela regra global
 * em `globals.css`.
 */
export function Carrossel({ slides }: { slides: SlideCarrossel[] }) {
  const [atual, setAtual] = useState(0)
  const total = slides.length
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null)
  const t = useTranslations('Carrossel')

  function ir(i: number) {
    setAtual(((i % total) + total) % total)
  }

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    intervalo.current = setInterval(() => setAtual((a) => (a + 1) % total), 6000)
    return () => {
      if (intervalo.current) clearInterval(intervalo.current)
    }
  }, [total])

  function pausar() {
    if (intervalo.current) clearInterval(intervalo.current)
  }

  return (
    <section
      className="relative mx-auto mt-6 max-w-7xl px-6"
      aria-roledescription={t('roledescription')}
      aria-label={t('ariaLabel')}
      onMouseEnter={pausar}
    >
      <div className="overflow-hidden rounded-card">
        <div
          className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(-${atual * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <article
              key={slide.titulo}
              className={`grid w-full shrink-0 grid-cols-1 sm:grid-cols-[1.1fr_1fr] ${CORES[slide.cor]}`}
              aria-hidden={i !== atual}
            >
              <div className="flex flex-col justify-center gap-5 px-8 py-12 text-white sm:px-12">
                <span className="w-fit rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold">
                  {slide.rotulo}
                </span>
                <h1 className="max-w-md text-3xl font-bold leading-tight sm:text-4xl">
                  {slide.titulo}
                </h1>
                <p className="max-w-md leading-relaxed text-white/90">{slide.texto}</p>
                <div className="flex flex-wrap items-center gap-5 pt-2">
                  <Link
                    href={slide.ctaPrincipal.href}
                    className="rounded-full border border-white/70 px-5 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    {slide.ctaPrincipal.texto}
                  </Link>
                  {slide.ctaSecundario ? (
                    <Link
                      href={slide.ctaSecundario.href}
                      className="text-sm font-medium text-white underline underline-offset-4 transition-opacity hover:opacity-80"
                    >
                      {slide.ctaSecundario.texto}
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="relative hidden overflow-hidden sm:block">
                {/* A moldura (posição, tamanho, cantos, sombra) fica aqui, num
                    quadrado só — para o gradiente de baixo se alinhar exatamente
                    com a borda esquerda da foto, e não com a do contentor todo. */}
                <div className="absolute bottom-[-6%] right-[-6%] aspect-square w-[92%] max-w-[480px] overflow-hidden rounded-2xl shadow-2xl">
                  <Image src={slide.imagem.src} alt={slide.imagem.alt} fill className="object-cover" />
                  <span
                    className={`absolute inset-y-0 left-0 z-[1] w-1/2 bg-gradient-to-r to-transparent ${GRADIENTES_BORDA[slide.cor]}`}
                  />
                </div>
                {slide.selo ? (
                  <span className="absolute right-8 top-8 z-10 rounded-full bg-promo px-4 py-3 text-lg font-bold text-white shadow-lg">
                    {slide.selo}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          ir(atual - 1)
          pausar()
        }}
        aria-label={t('anterior')}
        className="absolute left-10 top-1/2 hidden -translate-y-1/2 text-4xl text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)] transition-transform hover:scale-110 sm:flex"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => {
          ir(atual + 1)
          pausar()
        }}
        aria-label={t('seguinte')}
        className="absolute right-10 top-1/2 hidden -translate-y-1/2 text-4xl text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)] transition-transform hover:scale-110 sm:flex"
      >
        ›
      </button>

      <div
        className="absolute bottom-1 left-1/2 flex -translate-x-1/2"
        role="tablist"
        aria-label={t('escolherSlide')}
      >
        {slides.map((slide, i) => (
          <button
            key={slide.titulo}
            type="button"
            role="tab"
            aria-selected={i === atual}
            aria-label={t('slideAria', { numero: i + 1, titulo: slide.titulo })}
            onClick={() => {
              ir(i)
              pausar()
            }}
            className="flex h-11 w-11 items-center justify-center"
          >
            <span
              className={`h-2 rounded-full transition-all ${
                i === atual ? 'w-6 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
