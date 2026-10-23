import type { ReactNode } from 'react'
import { Icon } from '../../icons/sprite'
import styles from './Hero.module.css'

export function HeroPromoBar({ children }: { children: ReactNode }) {
  return (
    <div className={styles.promoBar}>
      <Icon name="cart" className={styles.promoIcon} />
      <p>{children}</p>
    </div>
  )
}
