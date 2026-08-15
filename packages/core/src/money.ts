export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/**
 * Converte texto escrito por uma pessoa em cêntimos inteiros.
 * Aceita vírgula ou ponto como separador decimal.
 */
export function parseEuros(input: string): number {
  const cleaned = input.trim().replace(/\s/g, '').replace('€', '').replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError(`Valor inválido: "${input}". Use o formato 29,90`)
  }

  const [whole = '0', frac = ''] = cleaned.split('.')
  const cents = frac.padEnd(2, '0')

  return Number(whole) * 100 + Number(cents)
}

/** Converte cêntimos inteiros no formato português com símbolo. */
export function formatEuros(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new MoneyError(`Cêntimos têm de ser inteiros, recebi ${cents}`)
  }

  const whole = Math.trunc(cents / 100)
  const frac = String(Math.abs(cents % 100)).padStart(2, '0')

  return `${whole},${frac} €`
}
