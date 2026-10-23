import { getTranslations } from 'next-intl/server'
import { HeroPromoBar } from './hero/HeroPromoBar'
import { HeroCopy } from './hero/HeroCopy'
import { HeroOffer } from './hero/HeroOffer'
import { HeroAnimals } from './hero/HeroAnimals'
import { HeroDecorations } from './hero/HeroDecorations'
import { HeroPetBase } from './hero/HeroPetBase'
import styles from './hero/Hero.module.css'

/** Campanha composta em HTML, CSS e duas fotografias com alpha independentes. */
export async function Hero() {
  const t = await getTranslations('Hero')

  return (
    <section aria-labelledby="hero-titulo" className={styles.section}>
      <div className={styles.banner}>
        <HeroPromoBar>
          {t.rich('topBarText', { b: (chunks) => <strong>{chunks}</strong> })}
        </HeroPromoBar>
        <div className={styles.content}>
          <HeroCopy
            date={t('data')}
            title={t('headline1')}
            brand={t('headline2')}
            subtitle={t('subtitulo')}
            cta={t('cta')}
          />
          <div className={styles.artwork}>
            <HeroDecorations />
            <HeroPetBase />
            <HeroAnimals />
            <HeroOffer label={t('ofertaLabel')} value={t('ofertaValor')} suffix={t('ofertaOff')} />
          </div>
        </div>
      </div>
    </section>
  )
}
