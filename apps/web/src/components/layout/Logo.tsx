import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { Icon } from '../icons/sprite'

/** Pata + "animora / pet shop", sempre a ligar à home. */
export async function Logo() {
  const t = await getTranslations('Header')
  return (
    <Link href="/" className="flex min-h-11 shrink-0 items-center gap-1.5" aria-label={t('logoAria')}>
      <Icon name="paw" className="h-6 w-6 shrink-0 text-orange" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold text-teal-900">animora</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {t('petShop')}
        </span>
      </span>
    </Link>
  )
}
