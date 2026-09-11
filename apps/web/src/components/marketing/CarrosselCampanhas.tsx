'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useTranslations } from 'next-intl'
import { Link } from '../../i18n/navigation'
import { useMotion } from '../motion/useMotion'
import { Icon } from '../icons/sprite'
import { MediaPlaceholder } from '../ui/MediaPlaceholder'

/**
 * Uma camada de animal por cima da fotografia — recorte com alpha, posicionado
 * em percentagem do palco.
 *
 * `sombra` é opcional e fica por baixo do animal. Vem num ficheiro à parte de
 * propósito: quando o animal se mexer (respirar, assentar), a sombra tem de
 * ficar ancorada ao chão e encolher em vez de viajar com ele. Sombra dentro do
 * recorte do animal é o que faz uma composição em camadas ler-se como colagem.
 */
export type CamadaPet = {
  animal: string
  sombra?: string
  largura: number
  altura: number
  /** Posição e tamanho dentro do palco, em percentagem. */
  classe: string
  /**
   * Onde o animal toca o chão, em percentagem do próprio ficheiro
   * (`'41% 99%'`). É o `transformOrigin` do gesto de assentar: sem ele o
   * animal roda pelo centro do recorte e lê-se a flutuar em vez de a pousar.
   * Vem no relatório de quem gera a arte, não se adivinha.
   */
  apoio?: string
}

export type SlideCampanha = {
  id: string
  href: string
  hrefSecundario: string
  eyebrow: string
  titulo: string
  texto: string
  ctaPrincipal: string
  ctaSecundario: string
  /** Descreve a fotografia para quem não a vê. Nunca vazio. */
  alt: string
  fotografia: string
  pets?: CamadaPet[]
}

const INTERVALO_MS = 7000

/**
 * O carrossel de campanhas da home.
 *
 * **O tipo nunca assenta sobre a fotografia.** O painel de floresta ocupa a
 * coluna esquerda e é nele que a manchete vive; a fotografia fica ao lado, a
 * sangrar. Em telemóvel empilham — foto em cima, painel em baixo. São dois
 * desenhos, não um a encolher, e em nenhum deles o texto precisa de um véu por
 * baixo para se ler.
 *
 * A versão anterior desenhava a manchete em PNG (`promocao.png`, `desconto.png`,
 * `em-toda-a-loja.png`, `botao.png`) — 4,3 MB de letras acima da dobra, em
 * português, servidas também a quem abria `/de`. A copy traduzida já existia
 * nas mensagens e só era usada em `sr-only`: via-se o PNG, lia-se a tradução.
 * Agora é o mesmo texto para os dois.
 */
export function CarrosselCampanhas({ slides }: { slides: SlideCampanha[] }) {
  const [atual, setAtual] = useState(0)
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null)
  const total = slides.length
  const t = useTranslations('CarrosselCampanhas')

  function pararRotacao() {
    if (!intervalo.current) return
    clearInterval(intervalo.current)
    intervalo.current = null
  }

  function irPara(indice: number) {
    setAtual(((indice % total) + total) % total)
  }

  /**
   * `prefers-reduced-motion` desliga o avanço automático — WCAG 2.2.2: conteúdo
   * que avança sozinho tem de se poder parar. As setas e os pontos continuam.
   */
  useEffect(() => {
    if (total <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    intervalo.current = setInterval(() => setAtual((i) => (i + 1) % total), INTERVALO_MS)
    return pararRotacao
  }, [total])

  /**
   * O que chega com cada slide entra por gesto próprio: a fotografia é
   * descoberta por máscara da esquerda enquanto as linhas de texto se levantam
   * por baixo do seu próprio recorte. Só o slide ativo — os outros estão fora
   * do ecrã e animá-los é trabalho invisível.
   *
   * **Os animais assentam, não flutuam.** A rotação parte do ponto onde as
   * patas tocam o chão (`apoio`), a compressão vertical desfaz-se com ela, e a
   * sombra faz o percurso inverso: está maior e mais difusa enquanto o animal
   * ainda vem no ar, e fecha quando ele pousa. É esse contra-movimento que faz
   * duas camadas planas lerem-se como um corpo com peso — uma sombra que sobe
   * junto com o animal denuncia a colagem no primeiro frame.
   */
  const palco = useMotion<HTMLElement>(
    (el) => {
      const slide = el.querySelector<HTMLElement>(`[data-slide="${atual}"]`)
      if (!slide) return

      const animais = slide.querySelectorAll('[data-pet-animal]')
      const sombras = slide.querySelectorAll('[data-pet-sombra]')

      const entrada = gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(
          slide.querySelector('[data-foto]'),
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.7, clearProps: 'clipPath' },
          0,
        )
        .from(slide.querySelectorAll('[data-linha]'), { yPercent: 110, duration: 0.6, stagger: 0.07 }, 0.12)

      // Fase estrutural v1: sem camada de animal, `animais`/`sombras` vêm
      // vazios — o GSAP avisa no console ao animar uma NodeList vazia, daí a
      // guarda. As duas timelines voltam assim que os `<Image data-pet-*>`
      // voltarem a ser renderizados.
      if (animais.length > 0) {
        entrada.from(
          animais,
          {
            yPercent: 7,
            scaleY: 0.93,
            rotation: (i: number) => (i % 2 === 0 ? -4 : 3),
            duration: 0.75,
            ease: 'power4.out',
            stagger: 0.09,
          },
          0.3,
        )
      }
      if (sombras.length > 0) {
        entrada.from(
          sombras,
          { scale: 1.14, opacity: 0.45, duration: 0.75, ease: 'power4.out', stagger: 0.09 },
          0.3,
        )
      }

      /**
       * Repouso: os animais respiram e a sombra respira ao contrário. Uma
       * timeline só, para as duas camadas nunca saírem de fase.
       */
      const respirar = gsap.timeline({ repeat: -1, yoyo: true, paused: true })
      animais.forEach((animal, i) => {
        respirar.to(
          animal,
          {
            yPercent: -1.5,
            rotation: i % 2 === 0 ? -0.8 : 0.8,
            duration: 2.4 + i * 0.4,
            ease: 'sine.inOut',
          },
          i * 0.3,
        )
      })
      sombras.forEach((sombra, i) => {
        respirar.to(
          sombra,
          { scale: 1.035, opacity: 0.82, duration: 2.4 + i * 0.4, ease: 'sine.inOut' },
          i * 0.3,
        )
      })

      /**
       * Nada disto corre com o carrossel fora do ecrã — um loop infinito que
       * ninguém está a ver é bateria gasta a zero. O `IntersectionObserver`
       * chega; não vale um ScrollTrigger.
       */
      let visivel = true
      const arrancar = () => {
        if (visivel && !entrada.isActive()) respirar.play()
      }
      entrada.eventCallback('onComplete', arrancar)

      const observador = new IntersectionObserver(([visao]) => {
        visivel = visao?.isIntersecting ?? true
        if (visivel) arrancar()
        else respirar.pause()
      })
      observador.observe(el)

      return () => observador.disconnect()
    },
    [atual],
  )

  return (
    <section
      ref={palco}
      aria-roledescription={t('roledescription')}
      aria-label={t('ariaLabel')}
      className="relative"
      onMouseEnter={pararRotacao}
      onFocus={pararRotacao}
    >
      <div className="relative overflow-hidden bg-floresta">
        <div
          className="flex transition-transform duration-[850ms] ease-loja"
          style={{ transform: `translateX(-${atual * 100}%)` }}
        >
          {slides.map((slide, indice) => (
            <article
              key={slide.id}
              data-slide={indice}
              aria-hidden={indice !== atual}
              className="grid w-full shrink-0 grid-cols-1 sm:grid-cols-[minmax(0,36%)_1fr]"
            >
              {/* Em telemóvel a fotografia vem primeiro; em ecrã largo passa
                  para a direita. Uma ordem por CSS, sem duplicar marcação.
                  Fase estrutural v1: mídia editorial neutra — sem fotografia
                  nem animal composto (ver `slide.fotografia`/`slide.pets`,
                  preservados para a fase de criativos). `data-foto` continua
                  no contentor para o gesto de revelação por `clipPath`. */}
              <div
                data-foto
                className="relative order-first aspect-[16/10] overflow-hidden sm:order-last sm:aspect-[1.92/1]"
              >
                <MediaPlaceholder ratio="16/10" type="hero" label={slide.alt} fill />
              </div>

              <div className="chao-floresta flex flex-col justify-center gap-4 px-6 pb-20 pt-10 sm:px-10 sm:pb-24 sm:pt-12">
                <p className="text-eyebrow font-semibold uppercase text-papel/60">{slide.eyebrow}</p>

                <h2>
                  {/* Cada linha dentro do seu próprio recorte — é o que deixa o
                      texto levantar-se de baixo sem transbordar para a de cima. */}
                  <span className="block overflow-hidden">
                    <span data-linha className="block text-titulo font-bold text-papel">
                      {slide.titulo}
                    </span>
                  </span>
                </h2>

                <p className="max-w-leitura text-papel/70">{slide.texto}</p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href={slide.href}
                    className="botao-principal"
                    tabIndex={indice === atual ? 0 : -1}
                  >
                    {slide.ctaPrincipal}
                  </Link>
                  <Link
                    href={slide.hrefSecundario}
                    className="text-sm font-semibold text-papel/80 underline hover:text-papel"
                    tabIndex={indice === atual ? 0 : -1}
                  >
                    {slide.ctaSecundario}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {total > 1 ? (
          /* Os controlos vivem dentro do painel, não por cima da fotografia.
             Assim nunca tapam o título — o alemão é mais comprido e a seta
             esquerda cortava-lhe a última linha — e os pontos assentam sobre
             floresta em vez de sobre folhagem, onde não se viam. */
          <div className="absolute bottom-0 left-0 z-40 flex w-full items-center justify-between gap-4 px-6 pb-6 sm:w-[36%] sm:px-10">
            <div className="flex gap-1">
              {slides.map((slide, indice) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={t('verSlide', { numero: indice + 1, titulo: slide.titulo })}
                  aria-current={indice === atual}
                  onClick={() => {
                    pararRotacao()
                    irPara(indice)
                  }}
                  className="grid h-11 w-6 place-items-center"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all ${
                      indice === atual ? 'w-6 bg-terracota' : 'w-1.5 bg-papel/35'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  pararRotacao()
                  irPara(atual - 1)
                }}
                aria-label={t('anterior')}
                className="grid h-11 w-11 place-items-center rounded-full border border-papel/20 text-papel transition-colors hover:border-papel/50"
              >
                <Icon name="chevronLeft" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pararRotacao()
                  irPara(atual + 1)
                }}
                aria-label={t('seguinte')}
                className="grid h-11 w-11 place-items-center rounded-full border border-papel/20 text-papel transition-colors hover:border-papel/50"
              >
                <Icon name="chevronRight" className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
