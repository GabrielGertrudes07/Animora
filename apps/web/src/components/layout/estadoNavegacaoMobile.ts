export type EstadoNavegacaoMobile = {
  naHome: boolean
  naConta: boolean
  noCarrinho: boolean
}

/** Deriva as três bandeiras de aba ativa da `BarraMobile` a partir do caminho atual. */
export function estadoNavegacaoMobile(caminho: string): EstadoNavegacaoMobile {
  return {
    naHome: caminho === '/',
    naConta: caminho.startsWith('/conta'),
    noCarrinho: caminho === '/carrinho',
  }
}
