/** Envio grátis a partir de 50 €. Regra de negócio, não constante técnica. */
export const ENVIO_GRATIS_ACIMA_DE = 5000
export const PORTES_CENTS = 499

export type CartLine = {
  variantId: number
  qty: number
  unitPriceCents: number
}

export type CartTotals = {
  subtotalCents: number
  shippingCents: number
  totalCents: number
  /** Quanto falta gastar para o envio ficar grátis. Zero se já for. */
  faltaParaEnvioGratisCents: number
}

export class CartError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CartError'
  }
}

/**
 * Totais do carrinho, em cêntimos inteiros do princípio ao fim.
 *
 * Recusa entradas inválidas em vez de as arredondar: um preço decimal aqui
 * é sempre sintoma de dinheiro tratado como float noutro sítio, e mascará-lo
 * esconde o defeito real.
 */
export function calcularTotais(linhas: CartLine[]): CartTotals {
  for (const l of linhas) {
    if (!Number.isInteger(l.unitPriceCents) || l.unitPriceCents < 0) {
      throw new CartError(
        `Preço inválido: ${l.unitPriceCents}. Tem de ser cêntimos inteiros não negativos.`,
      )
    }
    if (!Number.isInteger(l.qty) || l.qty < 1) {
      throw new CartError(`Quantidade inválida: ${l.qty}. Tem de ser um inteiro igual ou maior que 1.`)
    }
  }

  const subtotalCents = linhas.reduce((s, l) => s + l.unitPriceCents * l.qty, 0)
  const gratis = subtotalCents >= ENVIO_GRATIS_ACIMA_DE
  const shippingCents = subtotalCents === 0 || gratis ? 0 : PORTES_CENTS

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    faltaParaEnvioGratisCents: Math.max(0, ENVIO_GRATIS_ACIMA_DE - subtotalCents),
  }
}
