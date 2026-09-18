import type { CSSProperties } from 'react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Fredoka, Montserrat, Caveat } from 'next/font/google'
import { Link } from '../../i18n/navigation'
import { Entrada } from '../motion/Entrada'

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

const FEATURES: Array<{ icone: string; aspecto: string; chave: 'feature1' | 'feature2' | 'feature3'; xPx: number }> = [
  { icone: 'icone-pet', aspecto: '514 / 509', chave: 'feature1', xPx: 150 },
  { icone: 'icone-entrega', aspecto: '480 / 541', chave: 'feature2', xPx: 420 },
  { icone: 'icone-amor', aspecto: '613 / 513', chave: 'feature3', xPx: 680 },
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
 * secundários; a marca já está no cabeçalho).
 *
 * Um só `<h1>` — "SEMANA" + "ANIMORA" — porque é o único desta página.
 *
 * Fora de escopo por agora: o "i" de ANIMORA com uma pata no lugar do pingo
 * (visível no banner de referência) pedia medir a métrica exata da fonte por
 * carácter — frágil a cada tamanho de ecrã, e o handoff não o exige em texto.
 */
export async function Hero() {
  const t = await getTranslations('Hero')

  return (
    <section className={`${fonteTitulo.variable} ${fonteTexto.variable} ${fonteManuscrita.variable}`}>
      <Entrada>
        {/* Desktop/tablet — poster fiel ao canvas de referência */}
        <div className="relative hidden aspect-[2172/724] w-full overflow-hidden sm:block [container-type:inline-size]">
          <Image src="/banner-promo/fundo.webp" alt="" aria-hidden fill priority sizes="100vw" className="object-cover" />
          <Image src="/banner-promo/doodles.webp" alt="" aria-hidden fill sizes="100vw" className="object-cover" />

          {/* Blob turquesa atrás dos animais */}
          <div className="absolute" style={{ left: emX(1260), top: emY(150), width: '36%', aspectRatio: '1100 / 825' }}>
            <Image src="/banner-promo/blob.webp" alt="" aria-hidden fill className="object-contain" />
          </div>

          {/* Cão e gato — os protagonistas da campanha */}
          <div className="absolute" style={{ left: emX(1180), top: emY(150), width: '34%', aspectRatio: '880 / 900' }}>
            <Image src="/banner-promo/cao.webp" alt="" aria-hidden fill priority className="object-contain" />
          </div>
          <div className="absolute" style={{ left: emX(1640), top: emY(255), width: '18%', aspectRatio: '900 / 885' }}>
            <Image src="/banner-promo/gato.webp" alt="" aria-hidden fill className="object-contain" />
          </div>
          <div className="absolute" style={{ left: emX(1560), top: emY(500), width: '8.5%', aspectRatio: '900 / 890' }}>
            <Image src="/banner-promo/bola.webp" alt="" aria-hidden fill className="object-contain" />
          </div>
          <div className="absolute" style={{ left: emX(1790), top: emY(505), width: '13.5%', aspectRatio: '900 / 699' }}>
            <Image src="/banner-promo/logo.webp" alt="" aria-hidden fill className="object-contain" />
          </div>

          {/* Barra superior — ícone + texto, centrados como um bloco só */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-center px-[4%]" style={{ height: emY(80) }}>
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
                  color: '#FFFFFF',
                }}
              >
                {t.rich('topBarText', { b: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
              </p>
            </div>
          </div>

          {/* Data */}
          <p
            style={{
              ...posicao(165, 160),
              fontFamily: 'var(--fonte-banner-texto)',
              fontWeight: 600,
              fontSize: tamanhoFluido(28),
              color: '#0F4F57',
            }}
          >
            {t('data')}
          </p>

          {/* Título — um único <h1> para a página inteira */}
          <h1 className="contents">
            <span
              style={{
                ...posicao(160, 215),
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
              style={{
                ...posicao(160, 325),
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
            style={{
              ...posicao(180, 450),
              fontFamily: 'var(--fonte-banner-texto)',
              fontWeight: 500,
              fontSize: tamanhoFluido(28),
              color: '#0F4F57',
            }}
          >
            {t('subtitulo')} <span aria-hidden>♡</span>
          </p>

          {/* Oferta central */}
          <p
            style={{
              ...posicao(900, 190),
              fontFamily: 'var(--fonte-banner-texto)',
              fontWeight: 600,
              fontSize: tamanhoFluido(32),
              color: '#0F4F57',
            }}
          >
            {t('ofertaLabel')}
          </p>
          <p
            style={{
              ...posicao(870, 250),
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
            style={{
              ...posicao(1090, 410),
              fontFamily: 'var(--fonte-banner-titulo)',
              fontWeight: 800,
              fontSize: tamanhoFluido(72),
              lineHeight: 1,
              color: '#F57C00',
            }}
          >
            {t('ofertaOff')}
          </p>

          {/* CTA — cor amostrada do próprio banner de referência, não é um
              token da loja (não entra no `tailwind.config.ts`): é o botão
              desta campanha. */}
          <Link
            href="/produtos"
            style={{
              ...posicao(925, 470),
              fontFamily: 'var(--fonte-banner-texto)',
              fontWeight: 600,
              fontSize: tamanhoFluido(32),
              backgroundColor: '#024043',
            }}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-[1.4em] py-[0.7em] text-white transition-opacity hover:opacity-90"
          >
            {t('cta')}
            <span aria-hidden="true">›</span>
          </Link>

          {/* Features inferiores — ícone recortado + texto real */}
          {FEATURES.map(({ icone, aspecto, chave, xPx }) => (
            <div
              key={icone}
              className="absolute flex items-center"
              style={{ left: emX(xPx - 56), top: emY(540), gap: '0.6cqi' }}
            >
              <div className="relative shrink-0" style={{ width: '3.2cqi', aspectRatio: aspecto }}>
                <Image src={`/banner-promo/${icone}.webp`} alt="" aria-hidden fill className="object-contain" />
              </div>
              <p
                className="whitespace-nowrap"
                style={{
                  fontFamily: 'var(--fonte-banner-texto)',
                  fontWeight: 500,
                  fontSize: tamanhoFluido(18),
                  color: '#0F4F57',
                }}
              >
                {t(chave)}
              </p>
            </div>
          ))}

          {/* Nota manuscrita, canto superior direito — ancorada pela direita
              (`right`, não `left`) porque o texto cresce para a esquerda. */}
          <p
            className="text-right"
            style={{
              position: 'absolute',
              top: emY(120),
              right: emX(CANVAS_W - 1800 - 220),
              fontFamily: 'var(--fonte-banner-manuscrita)',
              fontWeight: 600,
              fontSize: tamanhoFluido(36),
              lineHeight: 1.15,
              color: '#0F4F57',
            }}
          >
            {t('manuscrito')}
          </p>
        </div>

        {/* Telemóvel — layout próprio, empilhado; sem nota manuscrita nem
            selo do logótipo (ver nota acima). */}
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
              {t('subtitulo')} <span aria-hidden>♡</span>
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
