import { calcularTotais, type CartTotals } from '@animora/core'

/**
 * O carrinho, do lado do browser.
 *
 * ## A regra que decide tudo o resto
 *
 * Um item do carrinho é `{ variantId, qty }` — **um identificador e uma
 * quantidade**. Nunca um preço, nunca um título, nunca uma imagem. O que está
 * guardado no browser pode ter sido escrito ontem; os preços são relidos do
 * servidor a cada abertura da página (`resolverLinhas`), e a única coisa que
 * viaja para o checkout é outra vez isto: identificadores e quantidades
 * (`paraCheckout`).
 *
 * Guardar o preço aqui parece inofensivo — poupa uma leitura e mostra o
 * carrinho sem esperar. Custa o cenário em que o ecrã diz 29,90 € e a fatura
 * diz 34,90 €, porque o preço mudou no painel entretanto. O servidor recalcula
 * tudo no `POST /api/checkout` e ignora qualquer preço vindo do cliente; se o
 * browser mostrasse um preço próprio, o ecrã e a fatura eram dois números
 * calculados a partir de fontes diferentes, e mais cedo ou mais tarde
 * divergiam.
 *
 * Este ficheiro é puro de propósito: sem `localStorage`, sem `fetch`, sem
 * React. É o que permite testá-lo todo sem browser nenhum
 * (`carrinho.test.ts`), e é onde vive a lógica que a verificação exige.
 */

export type ItemCarrinho = {
  variantId: number
  qty: number
}

/**
 * Teto por linha. Não é uma regra de stock — o stock é do servidor e é ele que
 * recusa (409 com o que falta). Isto só impede que um clique preso, ou um
 * `localStorage` escrito à mão, mande um carrinho absurdo para o checkout.
 */
export const QTY_MAX = 99

export class CarrinhoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CarrinhoError'
  }
}

const ehIdValido = (variantId: unknown): variantId is number =>
  typeof variantId === 'number' && Number.isInteger(variantId) && variantId > 0

const ehQtyValida = (qty: unknown): qty is number =>
  typeof qty === 'number' && Number.isInteger(qty) && qty >= 1 && qty <= QTY_MAX

function exigirId(variantId: number): void {
  if (!ehIdValido(variantId)) {
    throw new CarrinhoError(`Variante inválida: ${JSON.stringify(variantId)}.`)
  }
}

function exigirQty(qty: number): void {
  if (!ehQtyValida(qty)) {
    throw new CarrinhoError(
      `Quantidade inválida: ${JSON.stringify(qty)}. Tem de ser um inteiro entre 1 e ${QTY_MAX}.`,
    )
  }
}

/**
 * Acrescenta (ou soma à linha que já existe).
 *
 * A soma satura em `QTY_MAX` em vez de rebentar: quem carrega no "+" com 99 no
 * carrinho não cometeu erro nenhum de entrada — só chegou ao teto. Uma
 * quantidade inválida *pedida* (0, −1, 1.5) é outra coisa e é recusada.
 */
export function acrescentar(
  itens: readonly ItemCarrinho[],
  variantId: number,
  qty = 1,
): ItemCarrinho[] {
  exigirId(variantId)
  exigirQty(qty)

  const atual = itens.find((i) => i.variantId === variantId)
  if (!atual) return [...itens, { variantId, qty }]

  return itens.map((i) =>
    i.variantId === variantId ? { variantId, qty: Math.min(QTY_MAX, i.qty + qty) } : i,
  )
}

/** Fixa a quantidade de uma linha. Recusa quantidades inválidas — não arredonda. */
export function alterarQty(
  itens: readonly ItemCarrinho[],
  variantId: number,
  qty: number,
): ItemCarrinho[] {
  exigirId(variantId)
  exigirQty(qty)
  return itens.map((i) => (i.variantId === variantId ? { variantId, qty } : i))
}

export function remover(itens: readonly ItemCarrinho[], variantId: number): ItemCarrinho[] {
  return itens.filter((i) => i.variantId !== variantId)
}

export function esvaziar(): ItemCarrinho[] {
  return []
}

/** Artigos no carrinho — a soma das quantidades, que é o que o cabeçalho mostra. */
export function contar(itens: readonly ItemCarrinho[]): number {
  return itens.reduce((s, i) => s + i.qty, 0)
}

/**
 * Funde dois carrinhos: por variante, fica a **maior** das quantidades.
 *
 * Nunca a soma. Quem tinha 2 no browser e 2 na conta tinha os *mesmos* 2 —
 * pôs-os no carrinho duas vezes, de dois sítios, não pediu quatro. Somar é o
 * erro clássico desta operação e é o que faz alguém receber (e pagar) o dobro
 * do que escolheu.
 */
export function fundir(a: readonly ItemCarrinho[], b: readonly ItemCarrinho[]): ItemCarrinho[] {
  const maior = new Map<number, number>()

  for (const { variantId, qty } of [...a, ...b]) {
    if (!ehIdValido(variantId) || !ehQtyValida(qty)) continue
    maior.set(variantId, Math.max(maior.get(variantId) ?? 0, qty))
  }

  return [...maior].map(([variantId, qty]) => ({ variantId, qty }))
}

/**
 * O que sai do `localStorage` é texto que qualquer pessoa pode ter editado, e
 * que uma versão anterior da loja pode ter escrito noutro formato. Entra por
 * aqui: o que não for `{ variantId, qty }` válido desaparece em silêncio, em
 * vez de rebentar a página do carrinho inteira.
 */
export function normalizar(bruto: unknown): ItemCarrinho[] {
  if (!Array.isArray(bruto)) return []

  return bruto.reduce<ItemCarrinho[]>((itens, cru) => {
    const { variantId, qty } = (cru ?? {}) as { variantId?: unknown; qty?: unknown }
    if (!ehIdValido(variantId) || !ehQtyValida(qty)) return itens
    return acrescentar(itens, variantId, qty)
  }, [])
}

/**
 * O corpo do `POST /api/checkout` — e só ele.
 *
 * Construído campo a campo, como a `sanitizeProduct` do catálogo e pela mesma
 * razão: espalhar o objeto (`{ ...linha }`) faria com que qualquer campo novo
 * acrescentado à linha amanhã (um preço lido do servidor, por exemplo) passasse
 * a ser enviado por omissão. O servidor ignora-o de qualquer forma; o problema
 * é o que isso ensina a quem lê o código a seguir.
 */
export function paraCheckout(
  linhas: readonly { variantId: number; qty: number }[],
): { variantId: number; qty: number }[] {
  return linhas.map(({ variantId, qty }) => ({ variantId, qty }))
}

/**
 * Uma linha do carrinho já resolvida contra o servidor: o item guardado no
 * browser mais o que o catálogo diz **agora** sobre aquela variante.
 *
 * Só o que a interface precisa de mostrar. Nada aqui vem do `localStorage`
 * a não ser `variantId` e `qty`.
 */
export type LinhaCarrinho = {
  variantId: number
  qty: number
  titulo: string
  slug: string
  /** "Tamanho: L · Cor: Preto", já pronto. Vazio num produto sem opções. */
  opcoes: string
  precoUnitarioCents: number
  stock: number
  imagem: { url: string; alt: string; width: number; height: number } | null
}

/**
 * Os totais do ecrã.
 *
 * É o mesmo `calcularTotais` que o servidor corre no checkout, alimentado com
 * os preços que o servidor acabou de devolver. Dois cálculos, uma só função e
 * uma só fonte de preços — é assim que o total mostrado é o total cobrado.
 */
export function totaisDoCarrinho(linhas: readonly LinhaCarrinho[]): CartTotals {
  return calcularTotais(
    linhas.map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      unitPriceCents: l.precoUnitarioCents,
    })),
  )
}
