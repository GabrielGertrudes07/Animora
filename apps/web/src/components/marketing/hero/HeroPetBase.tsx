import styles from './Hero.module.css'

/** A borda dá apoio às patas e contextualiza o enquadramento dos retratos. */
export function HeroPetBase() {
  return (
    <div className={styles.petBase} aria-hidden="true">
      <span className={styles.petBaseTop} />
    </div>
  )
}
