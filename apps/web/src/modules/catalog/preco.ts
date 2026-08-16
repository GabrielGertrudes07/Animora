import type { PublicVariant } from './types'

/**
 * Que preço mostrar por um produto que tem várias variantes.
 *
 * O catálogo e a ficha mostravam o preço mais baixo das variantes, cru. Um
 * produto com S a 29,90 € e M a 32,90 € anunciava `29,90 €` e listava a seguir
 * "Tamanho: M" em primeiro lugar — quem lê fica a acreditar que o M custa
 * 29,90 €. Não é ambiguidade de apresentação: é um preço errado ao lado da
 * coisa a que parece pertencer.
 *
 * A saída é `desde: true` quando as variantes divergem, para o preço aparecer
 * como "desde 29,90 €". Escolhido em vez de mostrar um preço por opção porque
 * escolher variante é a fase 3 e um preço por linha na lista de opções seria
 * meio seletor — o texto diz a verdade inteira sem construir nada disso.
 *
 * O preço anterior (riscado) cai quando os preços divergem: um riscado sobre
 * um "desde" é uma promessa sobre qual das variantes, exatamente, teve aquele
 * desconto — e essa pergunta não tem resposta aqui.
 */
export type PrecoDeMostra = {
  cents: number
  old: number | null
  desde: boolean
}

export function precoDeMostra(variants: PublicVariant[]): PrecoDeMostra {
  const barata = variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
  const desde = variants.some((v) => v.priceCents !== barata.priceCents)

  return {
    cents: barata.priceCents,
    old: desde ? null : (barata.oldPriceCents ?? null),
    desde,
  }
}
