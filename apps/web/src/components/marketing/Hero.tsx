'use client'

import type { CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import gsap from 'gsap'
import { Fredoka, Montserrat, Caveat } from 'next/font/google'
import { Link } from '../../i18n/navigation'
import { Entrada } from '../motion/Entrada'
import { useMotion } from '../motion/useMotion'

/**
 * Fontes só desta campanha — Fredoka (títulos), Montserrat (apoio) e Caveat
 * (manuscrito), tal como veio do handoff de design (`animora_banner_assets`).
 * Não usam `--fonte-titulo`/`--fonte-texto` (Bricolage Grotesque/Figtree, a
 * dupla da loja): esta é uma exceção pontual de campanha, decisão explícita
 * do dono do produto, e por isso fica isolada aqui em vez de entrar no
 * `tailwind.config.ts` — a paleta e a tipografia da loja continuam a ditar a
 * arte em todo o resto do site.
 */
const fonteTitulo = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--fonte-banner-titulo',
  display: 'swap',
})

const fonteTexto = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--fonte-banner-texto',
  display: 'swap',
})

const fonteManuscrita = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--fonte-banner-manuscrita',
  display: 'swap',
})

// O canvas de referência do handoff (`specs.json`): todas as posições e
// tamanhos abaixo vêm de lá, em pixels sobre 2048×682, convertidos aqui para
// percentagem/`cqi` — unidades relativas ao próprio banner, não ao ecrã,
// para a composição escalar inteira em conjunto (a dica do handoff:
// "ajuste posições com base em breakpoints... use unidades relativas").
const CANVAS_W = 2048
const CANVAS_H = 682

const emX = (px: number): string => `${(px / CANVAS_W) * 100}%`
const emY = (px: number): string => `${(px / CANVAS_H) * 100}%`

/**
 * `clamp` com piso em px (para não desaparecer em ecrãs minúsculos) e teto no
 * próprio tamanho do design (não cresce além do que foi desenhado). O meio se
 * mede em `cqi` — 1% da largura do contentor do banner — para o texto
 * acompanhar o banner a encolher, e não a janela.
 */
function tamanhoFluido(px: number, pisoFator = 0.4): string {
  const piso = Math.round(px * pisoFator)
  const meio = ((px / CANVAS_W) * 100).toFixed(3)
  return `clamp(${piso}px, ${meio}cqi, ${px}px)`
}

function posicao(xPx: number, yPx: number, extra?: CSSProperties): CSSProperties {
  return { position: 'absolute', left: emX(xPx), top: emY(yPx), ...extra }
}

const FEATURES: Array<{ icone: string; aspecto: string; chave: 'feature1' | 'feature2' | 'feature3' }> = [
  { icone: 'icone-pet', aspecto: '514 / 509', chave: 'feature1' },
  { icone: 'icone-entrega', aspecto: '480 / 541', chave: 'feature2' },
  { icone: 'icone-amor', aspecto: '613 / 513', chave: 'feature3' },
]

/**
 * Os três protagonistas com peso próprio — assentam ao entrar (a mesma
 * escolha do `CarrosselCampanhas`) e respiram devagar em repouso. `apoio` é
 * onde cada um toca o chão, estimado a olho (o handoff não trouxe esse dado
 * para estes recortes, só para o `CarrosselCampanhas`) — é o `transformOrigin`
 * do gesto de assentar.
 */
const ANIMAIS: Array<{ id: string; leftPx: number; topPx: number; widthPct: string; aspecto: string; apoio: string }> = [
  { id: 'cao', leftPx: 1077, topPx: 68, widthPct: '34%', aspecto: '880 / 900', apoio: '38% 96%' },
  { id: 'gato', leftPx: 1459, topPx: 221, widthPct: '18%', aspecto: '900 / 885', apoio: '35% 97%' },
  { id: 'bola', leftPx: 1560, topPx: 500, widthPct: '8.5%', aspecto: '900 / 890', apoio: '50% 92%' },
]

/**
 * Os doodles do handoff (`doodles_pack.png`) recortados em peças soltas — a
 * versão anterior usava-o como uma única camada plana (impossível de animar
 * peça a peça) e duas dessas marcas caíam em cima de texto real; as duas
 * ficaram de fora aqui. Posições/tamanhos medidos por recorte + `-trim` sobre
 * o PNG original de 2172×724, convertidos para percentagem do canvas.
 */
/**
 * Posições remedidas direto sobre `reference/reference_banner.png` (não sobre
 * o `doodles_pack.png` original) — o pack é um kit solto de decorações, não
 * a camada final: tinha peças que não aparecem em lugar nenhum do banner de
 * referência (um coração grande atrás de "SEMANA/ANIMORA", um sparkle em
 * cima de "Ofertas até") e outras posicionadas onde nunca estiveram na
 * composição real. Aqui ficam só as que a referência de facto mostra, nas
 * posições onde ela as mostra.
 */
const DOODLES: Array<{ id: string; leftPct: number; topPct: number; widthPct: number; aspecto: string }> = [
  { id: 'a-sparkle-topleft', leftPct: 4.5, topPct: 18, widthPct: 6, aspecto: '252 / 242' },
  { id: 'd-heart-navy-small', leftPct: 86, topPct: 32, widthPct: 5, aspecto: '133 / 166' },
  { id: 'e-squiggle', leftPct: 34.35, topPct: 58, widthPct: 36.56, aspecto: '794 / 125' },
  { id: 'f-sparkle-topright', leftPct: 78, topPct: 16, widthPct: 7, aspecto: '218 / 200' },
  { id: 'i-sparkle-bottomright', leftPct: 86, topPct: 54, widthPct: 6, aspecto: '174 / 203' },
]

/**
 * O herói de campanha "Semana Animora" — reconstrução em HTML/CSS do banner
 * do handoff (`docs/handoff_specs.png`, `docs/specs.json`), a partir dos
 * recortes separados (cão, gato, bola, blob, doodles, ícones, logo) em vez do
 * banner achatado (`reference/reference_banner.png`). Texto embutido em
 * imagem já foi tentado nesta loja e revertido — via `CarrosselCampanhas`,
 * que trocou PNGs de manchete por texto real depois de servir português a
 * quem lia em alemão. Aqui todo o texto é DOM real, traduzido nas duas
 * línguas.
 *
 * Duas composições, não uma a encolher: o poster desktop (`sm:` e acima) é
 * fiel ao canvas 2048×682 do handoff; abaixo disso o mesmo cai a
 * sobrepor-se (texto, blob e recortes todos na mesma faixa de ~130px de
 * altura) — o handoff só cobre desktop. A versão de telemóvel é um layout
 * próprio, empilhado, sem nota manuscrita nem selo do logótipo (decorativos
 * secundários; a marca já está no cabeçalho), e com uma entrada simples
 * (`Entrada`) em vez da coreografia completa abaixo — ecrã pequeno, menos
 * elementos, menos justificação para o peso extra de código.
 *
 * **A composição desktop assenta como o `CarrosselCampanhas`**: os bichos
 * (`data-hero-animal`) entram com o mesmo gesto de peso — descem e giram a
 * partir do ponto onde tocam o chão (`apoio`) — e respiram devagar em
 * repouso; os doodles (`data-hero-doodle`) chegam por último, em `back.out`,
 * e flutuam fora de fase depois. Client Component por causa do GSAP: troca
 * `getTranslations` (servidor) por `useTranslations` (cliente) — o resto do
 * texto continua a vir de `next-intl`, só muda de onde é lido.
 *
 * Um só `<h1>` — "SEMANA" + "ANIMORA" — porque é o único desta página.
 *
 * Fora de escopo por agora: o "i" de ANIMORA com uma pata no lugar do pingo
 * (visível no banner de referência) pedia medir a métrica exata da fonte por
 * carácter — frágil a cada tamanho de ecrã, e o handoff não o exige em texto.
 */
export function Hero() {
  const t = useTranslations('Hero')

  const palco = useMotion<HTMLDivElement>((el) => {
    const animais = el.querySelectorAll<HTMLElement>('[data-hero-animal]')
    const doodles = el.querySelectorAll<HTMLElement>('[data-hero-doodle]')
    const textos = el.querySelectorAll<HTMLElement>('[data-hero-texto]')
    const blob = el.querySelector<HTMLElement>('[data-hero-blob]')
    const logo = el.querySelector<HTMLElement>('[data-hero-logo]')
    const topo = el.querySelector<HTMLElement>('[data-hero-topo]')

    animais.forEach((animal) => {
      gsap.set(animal, { transformOrigin: animal.dataset.apoio ?? 'bottom center' })
    })

    const entrada = gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (topo) entrada.from(topo, { opacity: 0, y: -16, duration: 0.5 }, 0)
    if (blob) entrada.from(blob, { opacity: 0, scale: 0.85, duration: 0.6, ease: 'back.out(1.4)' }, 0.1)
    if (textos.length > 0) {
      entrada.from(textos, { opacity: 0, y: 14, duration: 0.5, stagger: 0.06 }, 0.15)
    }
    if (animais.length > 0) {
      entrada.from(
        animais,
        {
          yPercent: 7,
          scaleY: 0.93,
          rotation: (i: number) => (i % 2 === 0 ? -4 : 3),
          opacity: 0,
          duration: 0.75,
          ease: 'power4.out',
          stagger: 0.09,
        },
        0.25,
      )
    }
    if (logo) entrada.from(logo, { opacity: 0, scale: 0.8, duration: 0.5 }, 0.45)
    if (doodles.length > 0) {
      entrada.from(doodles, { opacity: 0, scale: 0.5, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.06 }, 0.35)
    }

    /**
     * Repouso: os bichos respiram, o blob incha devagar, os doodles flutuam —
     * uma timeline só (todos reavançam/recuam em conjunto, mas começam em
     * offsets diferentes) para nunca saírem de fase entre si.
     */
    const respirar = gsap.timeline({ repeat: -1, yoyo: true, paused: true })
    animais.forEach((animal, i) => {
      respirar.to(
        animal,
        { yPercent: -1.5, rotation: i % 2 === 0 ? -0.8 : 0.8, duration: 2.4 + i * 0.4, ease: 'sine.inOut' },
        i * 0.3,
      )
    })
    if (blob) respirar.to(blob, { scale: 1.02, duration: 3.4, ease: 'sine.inOut' }, 0.2)
    doodles.forEach((doodle, i) => {
      respirar.to(
        doodle,
        { yPercent: -8 - i * 1.5, rotation: i % 2 === 0 ? 6 : -6, duration: 3 + i * 0.4, ease: 'sine.inOut' },
        i * 0.28,
      )
    })

    // Como no CarrosselCampanhas: nada de loop infinito com o banner fora do
    // ecrã — o IntersectionObserver liga/desliga a respiração.
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
  }, [])

  return (
    <section className={`${fonteTitulo.variable} ${fonteTexto.variable} ${fonteManuscrita.variable}`}>
      {/* Desktop/tablet — poster fiel ao canvas de referência, animado */}
      <div
        ref={palco}
        className="relative hidden aspect-[2172/560] w-full overflow-hidden sm:block [container-type:inline-size]"
      >
        <Image src="/banner-promo/fundo.webp" alt="" aria-hidden fill priority sizes="100vw" className="object-cover" />

        {DOODLES.map((d) => (
          <div
            key={d.id}
            data-hero-doodle
            className="absolute"
            style={{ left: `${d.leftPct}%`, top: `${d.topPct}%`, width: `${d.widthPct}%`, aspectRatio: d.aspecto }}
          >
            <Image src={`/banner-promo/${d.id}.webp`} alt="" aria-hidden fill className="object-contain" />
          </div>
        ))}

        {/* Blob turquesa atrás dos animais */}
        <div
          data-hero-blob
          className="absolute"
          style={{ left: emX(1190), top: emY(150), width: '36%', aspectRatio: '1100 / 825' }}
        >
          <Image src="/banner-promo/blob.webp" alt="" aria-hidden fill className="object-contain" />
        </div>

        {/* Cão, gato e bola — os protagonistas, assentam ao entrar */}
        {ANIMAIS.map((a) => (
          <div
            key={a.id}
            data-hero-animal
            data-apoio={a.apoio}
            className="absolute"
            style={{ left: emX(a.leftPx), top: emY(a.topPx), width: a.widthPct, aspectRatio: a.aspecto }}
          >
            <Image
              src={`/banner-promo/${a.id}.webp`}
              alt=""
              aria-hidden
              fill
              priority={a.id === 'cao'}
              className="object-contain"
            />
          </div>
        ))}

        <div
          data-hero-logo
          className="absolute"
          style={{ left: emX(1759), top: emY(478), width: '13.5%', aspectRatio: '900 / 699' }}
        >
          <Image src="/banner-promo/logo.webp" alt="" aria-hidden fill className="object-contain" />
        </div>

        {/* Barra superior — ícone + texto, centrados como um bloco só */}
        <div
          data-hero-topo
          className="absolute inset-x-0 top-0 flex items-center justify-center px-[4%]"
          style={{ height: emY(80) }}
        >
          <div className="flex items-center" style={{ gap: '0.8cqi' }}>
            <div className="relative shrink-0" style={{ width: '1.7cqi', aspectRatio: '172 / 200' }}>
              <Image src="/banner-promo/sacola.webp" alt="" aria-hidden fill className="object-contain" />
            </div>
            <p
              className="whitespace-nowrap text-center"
              style={{
                fontFamily: 'var(--fonte-banner-texto)',
                fontWeight: 500,
                fontSize: tamanhoFluido(32),
                lineHeight: 1,
                color: '#FFFFFF',
              }}
            >
              {t.rich('topBarText', { b: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
            </p>
          </div>
        </div>

        {/* Data, com o sublinhado laranja que a referência tem por baixo */}
        <p
          data-hero-texto
          style={{
            ...posicao(165, 145),
            fontFamily: 'var(--fonte-banner-texto)',
            fontWeight: 600,
            fontSize: tamanhoFluido(28),
            lineHeight: 1,
            color: '#0F4F57',
            paddingBottom: '0.3em',
            borderBottom: '0.1em solid #F57C00',
          }}
        >
          {t('data')}
        </p>

        {/* Título — um único <h1> para a página inteira */}
        <h1 className="contents">
          <span
            data-hero-texto
            style={{
              ...posicao(160, 200),
              fontFamily: 'var(--fonte-banner-titulo)',
              fontWeight: 800,
              fontSize: tamanhoFluido(110),
              lineHeight: 1,
              color: '#085B6B',
            }}
          >
            {t('headline1')}
          </span>
          <span
            data-hero-texto
            style={{
              ...posicao(120, 285),
              fontFamily: 'var(--fonte-banner-titulo)',
              fontWeight: 800,
              fontSize: tamanhoFluido(120),
              lineHeight: 1,
              color: '#F57C00',
            }}
          >
            {t('headline2')}
          </span>
        </h1>

        {/* Subtítulo */}
        <p
          data-hero-texto
          style={{
            ...posicao(165, 420),
            fontFamily: 'var(--fonte-banner-texto)',
            fontWeight: 500,
            fontSize: tamanhoFluido(28),
            lineHeight: 1,
            color: '#0F4F57',
          }}
        >
          {t('subtitulo')} <span aria-hidden style={{ color: '#F57C00' }}>♥</span>
        </p>

        {/* Oferta central */}
        <p
          data-hero-texto
          style={{
            ...posicao(860, 140),
            fontFamily: 'var(--fonte-banner-texto)',
            fontWeight: 600,
            fontSize: tamanhoFluido(32),
            lineHeight: 1,
            color: '#0F4F57',
          }}
        >
          {t('ofertaLabel')}
        </p>
        <p
          data-hero-texto
          style={{
            ...posicao(810, 200),
            fontFamily: 'var(--fonte-banner-titulo)',
            fontWeight: 800,
            fontSize: tamanhoFluido(200),
            lineHeight: 0.85,
            color: '#F57C00',
          }}
        >
          {t('ofertaValor')}
        </p>
        <p
          data-hero-texto
          style={{
            ...posicao(1100, 365),
            fontFamily: 'var(--fonte-banner-titulo)',
            fontWeight: 800,
            fontSize: tamanhoFluido(52),
            lineHeight: 1,
            color: '#F57C00',
          }}
        >
          {t('ofertaOff')}
        </p>

        {/* CTA — cor amostrada do próprio banner de referência, não é um
            token da loja (não entra no `tailwind.config.ts`): é o botão
            desta campanha.

            `hover:opacity-90` + `transition-opacity` competiam com o GSAP a
            animar a mesma propriedade (`opacity`) neste elemento — a
            transição CSS reagia a cada frame que o GSAP escrevia em
            `style.opacity`, travando o botão perto de 0 para sempre. Hover
            muda a cor de fundo em vez de opacidade, como o `.botao-principal`
            já faz no resto do site. */}
        <Link
          data-hero-texto
          href="/produtos"
          style={{
            ...posicao(925, 455),
            fontFamily: 'var(--fonte-banner-texto)',
            fontWeight: 600,
            fontSize: tamanhoFluido(32),
            lineHeight: 1,
            backgroundColor: '#024043',
          }}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-[1.4em] py-[0.7em] text-white transition-colors hover:bg-[#035249]"
        >
          {t('cta')}
          <span aria-hidden="true">›</span>
        </Link>

        {/* Features inferiores — um único grupo flex, não 3 posições fixas:
            o texto varia de comprimento por idioma ("Entrega para todo o
            Brasil" é bem mais longo que "OFF") e posições em x absolutas
            coladas ao spec colidiam com o ícone seguinte. */}
        <div className="absolute flex items-center" style={{ left: emX(150 - 56), top: emY(520), gap: '3.2cqi' }}>
          {FEATURES.map(({ icone, aspecto, chave }) => (
            <div key={icone} data-hero-texto className="flex items-center" style={{ gap: '0.6cqi' }}>
              <div className="relative shrink-0" style={{ width: '3.2cqi', aspectRatio: aspecto }}>
                <Image src={`/banner-promo/${icone}.webp`} alt="" aria-hidden fill className="object-contain" />
              </div>
              <p
                className="whitespace-nowrap"
                style={{
                  fontFamily: 'var(--fonte-banner-texto)',
                  fontWeight: 500,
                  fontSize: tamanhoFluido(18),
                  lineHeight: 1,
                  color: '#0F4F57',
                }}
              >
                {t(chave)}
              </p>
            </div>
          ))}
        </div>

        {/* Nota manuscrita, canto superior direito — ancorada pela direita
            (`right`, não `left`) porque o texto cresce para a esquerda. Uma
            coluna estreita (a referência quebra este texto em 3-4 linhas
            curtas, não uma linha só a espremer-se contra o cão). */}
        <p
          data-hero-texto
          className="text-right"
          style={{
            position: 'absolute',
            top: emY(105),
            right: emX(CANVAS_W - 1800 - 220),
            width: emX(190),
            fontFamily: 'var(--fonte-banner-manuscrita)',
            fontWeight: 600,
            fontSize: tamanhoFluido(32),
            lineHeight: 1.15,
            color: '#0F4F57',
          }}
        >
          {t('manuscrito')}
        </p>
      </div>

      {/* Telemóvel — layout próprio, empilhado; sem nota manuscrita nem
          selo do logótipo (ver nota acima). Entrada simples, não a
          coreografia de cima. */}
      <Entrada>
        <div className="sm:hidden" style={{ backgroundColor: '#FDF3EC' }}>
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-center" style={{ backgroundColor: '#F57C00' }}>
            <div className="relative h-4 w-3.5 shrink-0">
              <Image src="/banner-promo/sacola.webp" alt="" aria-hidden fill className="object-contain" />
            </div>
            <p className="text-xs font-medium text-white" style={{ fontFamily: 'var(--fonte-banner-texto)' }}>
              {t.rich('topBarText', { b: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
            </p>
          </div>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-sm px-8 pt-4">
            <div className="absolute inset-x-[4%] top-[6%]" style={{ aspectRatio: '1100 / 825' }}>
              <Image src="/banner-promo/blob.webp" alt="" aria-hidden fill className="object-contain" />
            </div>
            <div className="absolute bottom-0 left-0 w-[58%]" style={{ aspectRatio: '880 / 900' }}>
              <Image src="/banner-promo/cao.webp" alt="" aria-hidden fill priority className="object-contain" />
            </div>
            <div className="absolute bottom-[8%] right-[2%] w-[34%]" style={{ aspectRatio: '900 / 885' }}>
              <Image src="/banner-promo/gato.webp" alt="" aria-hidden fill className="object-contain" />
            </div>
            <div className="absolute bottom-0 left-[42%] w-[16%]" style={{ aspectRatio: '900 / 890' }}>
              <Image src="/banner-promo/bola.webp" alt="" aria-hidden fill className="object-contain" />
            </div>
          </div>

          <div className="px-6 pb-8 pt-2 text-center">
            <p className="text-xs font-semibold" style={{ fontFamily: 'var(--fonte-banner-texto)', color: '#0F4F57' }}>
              {t('data')}
            </p>
            <h1 className="mt-1 leading-[0.95]" style={{ fontFamily: 'var(--fonte-banner-titulo)', fontWeight: 800 }}>
              <span className="block text-4xl" style={{ color: '#085B6B' }}>
                {t('headline1')}
              </span>
              <span className="block text-5xl" style={{ color: '#F57C00' }}>
                {t('headline2')}
              </span>
            </h1>
            <p className="mt-2 text-sm font-medium" style={{ fontFamily: 'var(--fonte-banner-texto)', color: '#0F4F57' }}>
              {t('subtitulo')} <span aria-hidden style={{ color: '#F57C00' }}>♥</span>
            </p>

            <div className="mt-5 flex flex-col items-center">
              <p className="text-sm font-semibold" style={{ fontFamily: 'var(--fonte-banner-texto)', color: '#0F4F57' }}>
                {t('ofertaLabel')}
              </p>
              <p
                className="flex items-baseline leading-none"
                style={{ fontFamily: 'var(--fonte-banner-titulo)', fontWeight: 800, color: '#F57C00' }}
              >
                <span className="text-7xl">{t('ofertaValor')}</span>
                <span className="ml-1 text-2xl">{t('ofertaOff')}</span>
              </p>
            </div>

            <Link
              href="/produtos"
              className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
              style={{ fontFamily: 'var(--fonte-banner-texto)', backgroundColor: '#024043' }}
            >
              {t('cta')}
              <span aria-hidden="true">›</span>
            </Link>

            <div className="mt-6 flex justify-center gap-4">
              {FEATURES.map(({ icone, aspecto, chave }) => (
                <div key={icone} className="flex max-w-[6.5rem] flex-col items-center gap-1">
                  <div className="relative h-7 w-7" style={{ aspectRatio: aspecto }}>
                    <Image src={`/banner-promo/${icone}.webp`} alt="" aria-hidden fill className="object-contain" />
                  </div>
                  <p
                    className="text-[11px] font-medium leading-tight"
                    style={{ fontFamily: 'var(--fonte-banner-texto)', color: '#0F4F57' }}
                  >
                    {t(chave)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Entrada>
    </section>
  )
}
