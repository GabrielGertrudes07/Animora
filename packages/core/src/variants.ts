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
