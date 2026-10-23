import { Link } from '../../../i18n/navigation'
import { Icon } from '../../icons/sprite'
import styles from './Hero.module.css'

type Props = { date: string; title: string; brand: string; subtitle: string; cta: string }

export function HeroCopy({ date, title, brand, subtitle, cta }: Props) {
  return (
    <div className={styles.copy}>
      <p className={styles.date}><span aria-hidden />{date}</p>
      <h1 id="hero-titulo" className={styles.title}>
        <span>{title}</span>
        <span className={styles.brand}>{brand}<span aria-hidden className={styles.titleDot}>.</span></span>
      </h1>
      <p className={styles.subtitle}>{subtitle} <span aria-hidden>♥</span></p>
      <Link href="/produtos" className={styles.cta}>
        {cta}<Icon name="chevronRight" className={styles.ctaIcon} />
      </Link>
    </div>
  )
}
