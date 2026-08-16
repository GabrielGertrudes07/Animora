export {
  acrescentar,
  alterarQty,
  remover,
  esvaziar,
  contar,
  fundir,
  normalizar,
  paraCheckout,
  totaisDoCarrinho,
  CarrinhoError,
  QTY_MAX,
} from './carrinho'
export type { ItemCarrinho, LinhaCarrinho } from './carrinho'
export { CarrinhoProvider, useCarrinho } from './CarrinhoProvider'
export type { ResolucaoCarrinho } from './linhas'
