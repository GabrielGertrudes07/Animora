import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Fredoka, Montserrat, Caveat } from 'next/font/google'
import { Link } from '../../i18n/navigation'
import { Entrada } from '../motion/Entrada'

/**
 * Fontes só desta campanha — Fredoka (títulos), Montserrat (apoio) e Caveat
 * (manuscrito), tal como veio do handoff de design. Não usam
 * `--fonte-titulo`/`--fonte-texto` (a dupla da loja): exceção pontual de
 * campanha, decisão explícita do dono do produto.
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

const FEATURES: Array<{ icone: string; chave: 'feature1' | 'feature2' | 'feature3' }> = [
  { icone: 'icone-pet', chave: 'feature1' },
  { icone: 'icone-entrega', chave: 'feature2' },
  { icone: 'icone-amor', chave: 'feature3' },
]

/**
 * Cada camada entra (`animate-hero-enter`, com `--tilt` próprio) e depois
 * flutua em loop (`animate-hero-float`, com `--sway` e atraso próprios) —
 * as mesmas duas keyframes para todas, só a inclinação/deriva mudam por
 * camada, o que já basta para não lerem como cópias sincronizadas umas das
 * outras.
 */
const ANIMAIS: Array<{
  id: string
  className: string
  tiltDeg: number
  swayDeg: number
  floatS: number
  delayMs: number
}> = [
  { id: 'cao', className: 'bottom-0 left-[3%] h-[92%] aspect-[880/900]', tiltDeg: -3, swayDeg: 1.5, floatS: 4.4, delayMs: 80 },
  { id: 'bola', className: 'bottom-[2%] left-[34%] h-[16%] aspect-[900/890]', tiltDeg: 10, swayDeg: 8, floatS: 2.8, delayMs: 300 },
  { id: 'gato', className: 'bottom-0 right-[14%] h-[62%] aspect-[900/885]', tiltDeg: 4, swayDeg: -2, floatS: 3.8, delayMs: 220 },
]

const DOODLES: Array<{ id: string; className: string; swayDeg: number; floatS: number; delayMs: number }> = [
  { id: 'f-sparkle-topright', className: 'right-[4%] top-[6%] h-[14%] aspect-[218/200]', swayDeg: 10, floatS: 3.2, delayMs: 480 },
  { id: 'a-sparkle-topleft', className: 'left-[2%] top-[10%] h-[12%] aspect-[252/242]', swayDeg: -8, floatS: 3.6, delayMs: 540 },
]

/**
 * O herói da campanha "Semana Animora" — reconstrução curta, no estilo
 * pedido pelo Gabriel (referência: `Hero`/`HeroMedia` do projeto
 * vivapapelcor dele): faixa de **altura fixa** (não um poster gigante
 * escalado a partir de um canvas de handoff), copy à esquerda + camadas
 * soltas à direita, animação em **CSS puro** (`animate-hero-enter`/
 * `animate-hero-float`, definidas em `tailwind.config.ts`) em vez de GSAP.
 *
 * Isto substitui a reconstrução anterior, pixel-perfect sobre um canvas
 * 2048×682 medido à mão a partir do handoff — essa versão fazia a Home
 * inteira (cabeçalho + herói) ocupar o ecrã sem sobrar nada de produto
 * visível sem rolar. A prioridade agora é a home parecer loja desde a
 * primeira tela, não fidelidade pixel a pixel a um cartaz.
 *
 * Duas composições: a de desktop (`sm:` e acima) é a faixa com camadas
 * animadas abaixo; a de telemóvel é um layout empilhado mais simples, com
 * `Entrada` (a mesma entrada suave já usada no resto do site) em vez da
 * coreografia completa — ecrã pequeno, menos elementos, menos peso extra.
 *
 * Texto continua todo em HTML/`next-intl`, nunca embutido em imagem — a
 * loja já reverteu essa escolha uma vez (`CarrosselCampanhas`) depois de
 * servir português a quem lia em alemão.
 */
export async function Hero() {
  const t = await getTranslations('Hero')

  return (
    <section className={`${fonteTitulo.variable} ${fonteTexto.variable} ${fonteManuscrita.variable} mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6`}>
      {/* Desktop/tablet — faixa curta, altura fixa, camadas animadas em CSS */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-center gap-2 rounded-t-xl bg-orange px-4 py-2">
          <div className="relative h-4 w-3.5 shrink-0">
            <Image src="/banner-promo/sacola.webp" alt="" aria-hidden fill className="object-contain" />
          </div>
          <p
            className="text-center text-sm text-white"
            style={{ fontFamily: 'var(--fonte-banner-texto)', fontWeight: 500 }}
          >
            {t.rich('topBarText', { b: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
          </p>
        </div>

        <div className="relative flex h-[260px] overflow-hidden rounded-b-xl bg-cream md:h-[300px]">
          <div className="flex w-[38%] shrink-0 flex-col justify-center gap-2 pl-8 pr-4 xl:w-[34%] xl:pl-12">
            <p
              className="motion-safe:animate-hero-copy inline-block w-fit border-b-2 border-orange pb-1 text-sm font-semibold text-teal-700"
              style={{ fontFamily: 'var(--fonte-banner-texto)', animationDelay: '0ms' }}
            >
              {t('data')}
            </p>
            <h1
              className="leading-[0.95]"
              style={{ fontFamily: 'var(--fonte-banner-titulo)', fontWeight: 700 }}
            >
              <span
                className="motion-safe:animate-hero-copy block text-4xl text-teal-900 md:text-[2.75rem]"
                style={{ animationDelay: '60ms' }}
              >
                {t('headline1')}
              </span>
              <span
                className="motion-safe:animate-hero-copy block text-4xl text-orange md:text-[2.75rem]"
                style={{ animationDelay: '120ms' }}
              >
                {t('headline2')}
              </span>
            </h1>
            <p
              className="motion-safe:animate-hero-copy text-sm text-teal-900"
              style={{ fontFamily: 'var(--fonte-banner-texto)', fontWeight: 500, animationDelay: '180ms' }}
            >
              {t('subtitulo')} <span aria-hidden className="text-orange">♥</span>
            </p>
            <div
              className="motion-safe:animate-hero-copy mt-1 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/produtos"
                className="botao-principal botao-principal-pequeno inline-flex items-center gap-1.5"
                style={{ fontFamily: 'var(--fonte-banner-texto)', fontWeight: 600 }}
              >
                {t('cta')}
                <span aria-hidden="true">›</span>
              </Link>
              <span
                className="rounded-pill bg-teal-900 px-3 py-1.5 text-xs font-bold text-white"
                style={{ fontFamily: 'var(--fonte-banner-titulo)' }}
              >
                {t('ofertaValor')} {t('ofertaOff')}
              </span>
            </div>
          </div>

          <div className="relative flex-1">
            <div
              className="motion-safe:animate-hero-enter absolute right-[-4%] top-1/2 h-[92%] -translate-y-1/2 aspect-square"
              style={{ animationDelay: '0ms' }}
            >
              <Image src="/banner-promo/blob.webp" alt="" aria-hidden fill className="object-contain" />
            </div>

            {DOODLES.map((d) => (
              <div
                key={d.id}
                className={`motion-safe:animate-hero-enter absolute ${d.className}`}
                style={{ animationDelay: `${d.delayMs}ms`, '--tilt': '0deg' } as React.CSSProperties}
              >
                <div
                  className="motion-safe:animate-hero-float h-full w-full"
                  style={{ animationDuration: `${d.floatS}s`, animationDelay: `${d.delayMs + 400}ms`, '--sway': `${d.swayDeg}deg` } as React.CSSProperties}
                >
                  <Image src={`/banner-promo/${d.id}.webp`} alt="" aria-hidden fill className="object-contain" />
                </div>
              </div>
            ))}

            {ANIMAIS.map((a) => (
              <div
                key={a.id}
                className={`motion-safe:animate-hero-enter absolute ${a.className}`}
                style={{ animationDelay: `${a.delayMs}ms`, '--tilt': `${a.tiltDeg}deg` } as React.CSSProperties}
              >
                <div
                  className="motion-safe:animate-hero-float h-full w-full"
                  style={{ animationDuration: `${a.floatS}s`, animationDelay: `${a.delayMs + 500}ms`, '--sway': `${a.swayDeg}deg` } as React.CSSProperties}
                >
                  <Image
                    src={`/banner-promo/${a.id}.webp`}
                    alt=""
                    aria-hidden
                    fill
                    priority={a.id === 'cao'}
                    className="object-contain object-bottom"
                  />
                </div>
              </div>
            ))}

            <div className="motion-safe:animate-hero-enter absolute bottom-[6%] right-[3%] h-[22%] aspect-[900/699]" style={{ animationDelay: '420ms' }}>
              <Image src="/banner-promo/logo.webp" alt="" aria-hidden fill className="object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Telemóvel — layout próprio, empilhado, entrada simples */}
      <Entrada>
        <div className="sm:hidden" style={{ backgroundColor: '#FDF3EC' }}>
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-center" style={{ backgroundColor: '#ED6900' }}>
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
              <span className="block text-5xl" style={{ color: '#ED6900' }}>
                {t('headline2')}
              </span>
            </h1>
            <p className="mt-2 text-sm font-medium" style={{ fontFamily: 'var(--fonte-banner-texto)', color: '#0F4F57' }}>
              {t('subtitulo')} <span aria-hidden style={{ color: '#ED6900' }}>♥</span>
            </p>

            <div className="mt-5 flex flex-col items-center">
              <p className="text-sm font-semibold" style={{ fontFamily: 'var(--fonte-banner-texto)', color: '#0F4F57' }}>
                {t('ofertaLabel')}
              </p>
              <p
                className="flex items-baseline leading-none"
                style={{ fontFamily: 'var(--fonte-banner-titulo)', fontWeight: 800, color: '#ED6900' }}
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
              {FEATURES.map(({ icone, chave }) => (
                <div key={icone} className="flex max-w-[6.5rem] flex-col items-center gap-1">
                  <div className="relative h-7 w-7">
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
