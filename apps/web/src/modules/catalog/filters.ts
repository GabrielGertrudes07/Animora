export type SortKey = 'relevancia' | 'preco-asc' | 'preco-desc'

const SORT_KEYS: readonly SortKey[] = ['relevancia', 'preco-asc', 'preco-desc']

export type CatalogFilters = {
  marca?: string[]
  precoMin?: number
  precoMax?: number
  ordem: SortKey
}

type SearchParams = Record<string, string | string[] | undefined>

function toArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

/**
 * Lê os filtros da query string.
 *
 * Só reconhece parâmetros públicos. Qualquer outro — incluindo tentativas
 * de filtrar por campos internos como `fornecedor` ou `costCents` — é
 * ignorado em silêncio, e nunca chega à consulta à API.
 */
export function parseFilters(sp: SearchParams): CatalogFilters {
  const f: CatalogFilters = { ordem: 'relevancia' }

  const marca = toArray(sp.marca)
  if (marca && marca.length > 0) f.marca = marca

  const preco = typeof sp.preco === 'string' ? sp.preco : undefined
  if (preco && /^\d+-\d+$/.test(preco)) {
    const [a, b] = preco.split('-').map((n) => Number(n) * 100)
    if (a !== undefined && b !== undefined) {
      f.precoMin = Math.min(a, b)
      f.precoMax = Math.max(a, b)
    }
  }

  const ordem = typeof sp.ordem === 'string' ? sp.ordem : undefined
  if (ordem && (SORT_KEYS as readonly string[]).includes(ordem)) {
    f.ordem = ordem as SortKey
  }

  return f
}

/** Escreve os filtros de volta na query string, omitindo o que é omissão. */
export function filtersToQuery(f: CatalogFilters): string {
  const p = new URLSearchParams()

  for (const m of f.marca ?? []) p.append('marca', m)

  if (f.precoMin !== undefined && f.precoMax !== undefined) {
    p.set('preco', `${f.precoMin / 100}-${f.precoMax / 100}`)
  }

  if (f.ordem !== 'relevancia') p.set('ordem', f.ordem)

  return p.toString()
}
