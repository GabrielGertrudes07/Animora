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

  // O sinal sai à parte porque `Math.trunc(-50 / 100)` é `-0` e `${-0}` é "0":
  // um desconto de -0,50 € era formatado como 0,50 €. Entre -1 e -99 cêntimos
  // o sinal desaparecia por inteiro, e de -100 para baixo aparecia — o que
  // escondia o defeito de quem só experimentasse valores redondos.
  const sign = cents < 0 ? '-' : ''
  const whole = Math.trunc(Math.abs(cents) / 100)
  const frac = String(Math.abs(cents % 100)).padStart(2, '0')

  return `${sign}${whole},${frac} €`
}
