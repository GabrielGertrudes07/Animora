'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '../../i18n/navigation'
import { filtersToQuery, type CatalogFilters, type SortKey } from '../../modules/catalog'

/**
 * Independente do painel de filtros de propósito: mudar a ordenação não abre
 * nem fecha a folha de filtros em mobile, e não devia — são duas decisões
 * diferentes. Reconstrói a query a partir de `filtrosAtuais` com
 * `filtersToQuery`, a mesma função que a página usa para ler o URL, para não
 * ter uma segunda forma de montar a query string.
 */
export function OrdenarPor({ filtrosAtuais }: { filtrosAtuais: CatalogFilters }) {
  const t = useTranslations('OrdenarPor')
  const router = useRouter()
  const pathname = usePathname()

  const opcoes: { value: SortKey; label: string }[] = [
    { value: 'relevancia', label: t('relevancia') },
    { value: 'preco-asc', label: t('precoAsc') },
    { value: 'preco-desc', label: t('precoDesc') },
    { value: 'recentes', label: t('recentes') },
  ]

  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      {/* `sr-only` e não `hidden`: `display:none` sai da árvore de
          acessibilidade, e era por isso que o `<select>` não tinha nome
          nenhum em mobile — o texto continua a dar o nome ao controlo pela
          própria `<label>` que os envolve aos dois, só deixa de aparecer. */}
      <span className="sr-only sm:not-sr-only">{t('rotulo')}</span>
      <select
        value={filtrosAtuais.ordem}
        onChange={(e) => {
          const query = filtersToQuery({ ...filtrosAtuais, ordem: e.target.value as SortKey })
          router.push(query ? `${pathname}?${query}` : pathname)
        }}
        className="min-h-11 rounded-campo border border-line bg-white px-2 py-1.5 text-base text-ink sm:min-h-0 sm:text-sm"
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
