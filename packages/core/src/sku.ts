import type { Combination } from './variants'

function abbreviate(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
}

/**
 * SKU sugerido. Editável no admin — isto é apenas o valor inicial.
 * A unicidade é garantida pela base de dados, não por esta função.
 */
export function buildSku(brand: string, product: string, combination: Combination): string {
  const parts = [abbreviate(brand), abbreviate(product)]

  for (const key of Object.keys(combination).sort()) {
    const value = combination[key]
    if (value) parts.push(abbreviate(value))
  }

  return parts.filter(Boolean).join('-')
}
