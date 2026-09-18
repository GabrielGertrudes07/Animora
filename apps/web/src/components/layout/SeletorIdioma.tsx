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
    <div className="flex items-center gap-1 text-sm font-medium text-text-muted">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={locale === (params.locale as string | undefined)}
          aria-label={t('trocarPara', { idioma: NOME[locale]! })}
          onClick={() => {
            // `usePathname` (next-intl) exclui a query string de propósito —
            // sem isto, trocar de idioma a meio de uma busca ou de filtros
            // aplicados voltava à PLP "limpa". Lida do `window` (só ao
            // clicar, não `useSearchParams`) para não forçar toda página que
            // usa este componente — todas, via `Header` — a sair da geração
            // estática por causa de um seletor que só precisa da query
            // string no instante do clique.
            const query = window.location.search
            router.replace(query ? `${pathname}${query}` : pathname, { locale })
          }}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 py-1 transition-colors hover:text-text sm:min-h-0 sm:min-w-0 disabled:font-semibold disabled:text-orange-deep disabled:hover:text-orange-deep"
        >
          {t(locale as 'pt' | 'de')}
        </button>
      ))}
    </div>
  )
}
