import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { MediaPlaceholder } from '../ui/MediaPlaceholder'
import { Entrada } from '../motion/Entrada'

/**
 * O herói estrutural: proporção `16/7` e ~38% para o texto, os dois números
 * da spec da fase estrutural (§"Fase 4 - Home estrutural"). Em mobile a
 * mídia vem primeiro — a mesma composição que o carrossel anterior já
 * usava — e o texto por baixo; a partir de `md` ficam lado a lado.
 *
 * É o único `<h1>` da página: a home não tinha nenhum antes.
 */
export async function Hero() {
  const t = await getTranslations('Hero')

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <Entrada className="grid gap-6 md:grid-cols-[38%_1fr] md:items-center md:gap-10">
        <div className="order-2 md:order-1">
          <p className="text-eyebrow font-semibold uppercase text-ink-muted">{t('eyebrow')}</p>
          <h1 className="mt-2 text-titulo text-ink">{t('titulo')}</h1>
          <p className="mt-3 max-w-leitura text-ink-muted">{t('texto')}</p>
          <Link href="/produtos" className="botao-principal mt-6 inline-flex">
            {t('cta')}
          </Link>
        </div>
        <div className="order-1 md:order-2">
          <MediaPlaceholder ratio="16/7" type="hero" label={t('titulo')} />
        </div>
      </Entrada>
    </section>
  )
}
