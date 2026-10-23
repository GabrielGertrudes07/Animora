import { Icon } from '../../icons/sprite'
import styles from './Hero.module.css'

/** Formas vetoriais e CSS permitem ajustar cada decoração individualmente. */
export function HeroDecorations() {
  return (
    <div className={styles.decorations} aria-hidden="true">
      <div className={styles.backdrop} />
      <div className={styles.backdropRing} />
      <span className={styles.sparkle}>✦</span>
      <span className={styles.smallSparkle}>✦</span>
      <svg className={styles.doodle} viewBox="0 0 60 60" fill="none">
        <path d="M17 33 4 26M28 20 23 5M39 20 45 9" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className={styles.paw}><Icon name="paw" className={styles.pawIcon} /></span>
      <div className={styles.groundShadow} />
    </div>
  )
}
