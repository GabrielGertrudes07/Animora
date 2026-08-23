'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { routing } from '../../i18n/routing'
import { usePathname, useRouter } from '../../i18n/navigation'

const NOME: Record<string, string> = { pt: 'PT', de: 'DE' }

/**
 * Troca de idioma explícita — nunca automática. `useRouter`/`usePathname`
 * vêm da navegação locale-aware do next-intl: trocar de idioma preserva o
 * caminho atual, só o prefixo muda.
 */
export function SeletorIdioma() {
  const t = useTranslations('SeletorIdioma')
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  return (
    <div className="flex items-center gap-1 text-sm font-medium text-ink-muted">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={locale === (params.locale as string | undefined)}
          aria-label={t('trocarPara', { idioma: NOME[locale]! })}
          onClick={() => router.replace(pathname, { locale })}
          className="rounded-lg px-2 py-1 transition-colors hover:text-ink disabled:font-semibold disabled:text-terracota disabled:hover:text-terracota"
        >
          {t(locale as 'pt' | 'de')}
        </button>
      ))}
    </div>
  )
}
