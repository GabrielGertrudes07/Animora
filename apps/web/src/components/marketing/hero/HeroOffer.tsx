import styles from './Hero.module.css'

type Props = { label: string; value: string; suffix: string }

export function HeroOffer({ label, value, suffix }: Props) {
  return (
    <div className={styles.offer}>
      <span className={styles.offerLabel}>{label}</span>
      <span className={styles.offerValue}>{value}</span>
      <span className={styles.offerSuffix}>{suffix}</span>
    </div>
  )
}
