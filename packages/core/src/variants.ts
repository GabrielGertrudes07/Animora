export type VariantOption = { name: string; values: string[] }
export type Combination = Record<string, string>

/** Produto cartesiano das opções. Opções sem valores são ignoradas. */
export function generateCombinations(options: VariantOption[]): Combination[] {
  const usable = options.filter((o) => o.values.length > 0)

  return usable.reduce<Combination[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.values.map((value) => ({ ...combo, [option.name]: value })),
      ),
    [{}],
  )
}

/**
 * Identidade estável de uma combinação, independente da ordem das chaves.
 * É por esta chave que se reconhece uma variante já existente.
 */
export function combinationKey(c: Combination): string {
  return Object.keys(c)
    .sort()
    .map((k) => `${k}=${c[k]}`)
    .join('|')
}

export type VariantRow = {
  combination: Combination
  sku: string
  priceCents: number
  stock: number
  active: boolean
}

/**
 * Recalcula a matriz a partir das opções, preservando os dados das linhas
 * cuja combinação continua a existir.
 *
 * Linhas cuja combinação deixou de ser possível desaparecem.
 * Linhas novas nascem a zero e inativas de propósito? Não — nascem ativas
 * com preço e stock a zero, para que a validação de publicação as apanhe.
 */
export function mergeVariants(
  existing: VariantRow[],
  options: VariantOption[],
): VariantRow[] {
  const byKey = new Map(existing.map((r) => [combinationKey(r.combination), r]))

  return generateCombinations(options).map((combination) => {
    const previous = byKey.get(combinationKey(combination))

    if (previous) return { ...previous, combination }

    return { combination, sku: '', priceCents: 0, stock: 0, active: true }
  })
}
