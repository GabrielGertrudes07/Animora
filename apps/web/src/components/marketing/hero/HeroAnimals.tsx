import Image from 'next/image'
import styles from './Hero.module.css'

/** Cada animal tem arquivo, tamanho, posição e animação próprios. */
export function HeroAnimals() {
  return (
    <div className={styles.animals} aria-hidden="true">
      <div className={styles.dog}>
        <Image
          src="/banner-hero-v2/cao-destaque.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 410px, (min-width: 640px) 34vw, 65vw"
          className={styles.animalImage}
        />
      </div>
      <div className={styles.cat}>
        <Image
          src="/banner-hero-v2/gato-destaque.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 280px, (min-width: 640px) 24vw, 43vw"
          className={styles.animalImage}
        />
      </div>
    </div>
  )
}
