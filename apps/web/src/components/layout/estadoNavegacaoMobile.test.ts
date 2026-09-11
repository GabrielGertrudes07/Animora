import { describe, expect, it } from 'vitest'
import { estadoNavegacaoMobile } from './estadoNavegacaoMobile'

describe('estadoNavegacaoMobile', () => {
  it('marca a home só na raiz exata', () => {
    expect(estadoNavegacaoMobile('/').naHome).toBe(true)
    expect(estadoNavegacaoMobile('/produtos').naHome).toBe(false)
  })

  it('marca conta em /conta e em qualquer sub-rota', () => {
    expect(estadoNavegacaoMobile('/conta').naConta).toBe(true)
    expect(estadoNavegacaoMobile('/conta/encomendas').naConta).toBe(true)
    expect(estadoNavegacaoMobile('/produtos').naConta).toBe(false)
  })

  it('marca carrinho só na rota exata, não em sub-rotas', () => {
    expect(estadoNavegacaoMobile('/carrinho').noCarrinho).toBe(true)
    expect(estadoNavegacaoMobile('/carrinho/qualquer').noCarrinho).toBe(false)
  })

  it('as três bandeiras não se confundem entre si', () => {
    expect(estadoNavegacaoMobile('/')).toEqual({
      naHome: true,
      naConta: false,
      noCarrinho: false,
    })
  })
})
