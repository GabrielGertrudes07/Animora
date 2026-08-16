import { describe, expect, it } from 'vitest'
import { calcularTotais } from '@animora/core'

import {
  acrescentar,
  alterarQty,
  contar,
  esvaziar,
  fundir,
  normalizar,
  paraCheckout,
  QTY_MAX,
  remover,
  totaisDoCarrinho,
  type ItemCarrinho,
  type LinhaCarrinho,
} from './carrinho'

describe('acrescentar', () => {
  it('põe uma linha nova no fim', () => {
    expect(acrescentar([], 10, 2)).toEqual([{ variantId: 10, qty: 2 }])
  })

  it('soma à linha que já existe, sem duplicar', () => {
    const itens = acrescentar(acrescentar([], 10, 2), 10, 3)
    expect(itens).toEqual([{ variantId: 10, qty: 5 }])
  })

  it('não mexe no carrinho que recebe', () => {
    const original: ItemCarrinho[] = [{ variantId: 10, qty: 1 }]
    acrescentar(original, 10, 4)
    expect(original).toEqual([{ variantId: 10, qty: 1 }])
  })

  it('satura no teto em vez de rebentar — chegar a 99 não é um erro de entrada', () => {
    expect(acrescentar([{ variantId: 10, qty: QTY_MAX }], 10, 5)).toEqual([
      { variantId: 10, qty: QTY_MAX },
    ])
  })
})

describe('quantidades inválidas são recusadas, não arredondadas', () => {
  it.each([0, -1, 1.5, Number.NaN, QTY_MAX + 1])('recusa qty %p', (qty) => {
    expect(() => acrescentar([], 10, qty)).toThrow(/Quantidade inválida/)
    expect(() => alterarQty([{ variantId: 10, qty: 1 }], 10, qty)).toThrow(/Quantidade inválida/)
  })

  it.each([0, -3, 1.5])('recusa variante %p', (id) => {
    expect(() => acrescentar([], id)).toThrow(/Variante inválida/)
  })
})

describe('alterar, remover, esvaziar', () => {
  const cheio: ItemCarrinho[] = [
    { variantId: 10, qty: 2 },
    { variantId: 20, qty: 1 },
  ]

  it('alterar fixa a quantidade, não a soma', () => {
    expect(alterarQty(cheio, 10, 5)).toEqual([
      { variantId: 10, qty: 5 },
      { variantId: 20, qty: 1 },
    ])
  })

  it('remover tira só a linha pedida', () => {
    expect(remover(cheio, 10)).toEqual([{ variantId: 20, qty: 1 }])
  })

  it('remover uma linha que não existe deixa tudo como estava', () => {
    expect(remover(cheio, 999)).toEqual(cheio)
  })

  it('esvaziar devolve um carrinho vazio', () => {
    expect(esvaziar()).toEqual([])
  })

  it('contar soma as quantidades, não as linhas', () => {
    expect(contar(cheio)).toBe(3)
    expect(contar([])).toBe(0)
  })
})

describe('fundir no login', () => {
  it('com sobreposição fica a MAIOR, nunca a soma', () => {
    const convidado: ItemCarrinho[] = [{ variantId: 10, qty: 2 }]
    const conta: ItemCarrinho[] = [{ variantId: 10, qty: 2 }]

    // O caso que a verificação nomeia: 2 no browser + 2 na conta = 2.
    expect(fundir(convidado, conta)).toEqual([{ variantId: 10, qty: 2 }])
  })

  it('com sobreposição de quantidades diferentes fica a maior das duas', () => {
    expect(fundir([{ variantId: 10, qty: 5 }], [{ variantId: 10, qty: 2 }])).toEqual([
      { variantId: 10, qty: 5 },
    ])
    expect(fundir([{ variantId: 10, qty: 1 }], [{ variantId: 10, qty: 4 }])).toEqual([
      { variantId: 10, qty: 4 },
    ])
  })

  it('sem sobreposição junta os dois carrinhos inteiros', () => {
    expect(fundir([{ variantId: 10, qty: 2 }], [{ variantId: 20, qty: 3 }])).toEqual([
      { variantId: 10, qty: 2 },
      { variantId: 20, qty: 3 },
    ])
  })

  it('fundir com um carrinho vazio devolve o outro', () => {
    const um: ItemCarrinho[] = [{ variantId: 10, qty: 2 }]
    expect(fundir(um, [])).toEqual(um)
    expect(fundir([], um)).toEqual(um)
    expect(fundir([], [])).toEqual([])
  })

  it('descarta linhas corrompidas em vez de as propagar para a conta', () => {
    const sujo = [
      { variantId: 10, qty: 2 },
      { variantId: 20, qty: 0 },
      { variantId: -1, qty: 3 },
    ] as ItemCarrinho[]
    expect(fundir(sujo, [])).toEqual([{ variantId: 10, qty: 2 }])
  })
})

describe('normalizar o que sai do localStorage', () => {
  it('aceita o que é válido', () => {
    expect(normalizar([{ variantId: 10, qty: 2 }])).toEqual([{ variantId: 10, qty: 2 }])
  })

  it.each([null, undefined, 'carrinho', 42, {}])('devolve vazio para %p', (bruto) => {
    expect(normalizar(bruto)).toEqual([])
  })

  it('deita fora as linhas inválidas e fica com as boas', () => {
    const bruto = [
      { variantId: 10, qty: 2 },
      { variantId: '20', qty: 1 },
      { variantId: 30, qty: '1' },
      { variantId: 40, qty: 0 },
      null,
      { variantId: 50, qty: 3 },
    ]
    expect(normalizar(bruto)).toEqual([
      { variantId: 10, qty: 2 },
      { variantId: 50, qty: 3 },
    ])
  })

  it('junta duplicados numa linha só', () => {
    expect(
      normalizar([
        { variantId: 10, qty: 2 },
        { variantId: 10, qty: 3 },
      ]),
    ).toEqual([{ variantId: 10, qty: 5 }])
  })

  it('ignora um preço que alguém tenha metido no localStorage à mão', () => {
    const forjado = [{ variantId: 10, qty: 1, precoUnitarioCents: 1 }]
    expect(normalizar(forjado)).toEqual([{ variantId: 10, qty: 1 }])
  })
})

/**
 * O ponto 5 da verificação, como teste: **o total no ecrã tem de ser o total
 * cobrado**.
 *
 * O ecrã corre `totaisDoCarrinho` sobre as linhas que o servidor acabou de
 * devolver. O servidor corre `calcularTotais` sobre os preços que lê da base no
 * instante do checkout. O que os liga é o corpo do pedido não levar preço
 * nenhum: se levasse, haveria dois números com fontes diferentes e a igualdade
 * passaria a ser uma coincidência.
 */
describe('o total no ecrã é o total cobrado', () => {
  /** O que a base diz, que é a única autoridade sobre preços. */
  const precosNaBase: Record<number, number> = { 283: 1990, 1346: 2990 }

  /** O que o servidor devolve à página do carrinho, lido dessa mesma base. */
  const resolver = (itens: ItemCarrinho[], precos: Record<number, number>): LinhaCarrinho[] =>
    itens.map((i) => ({
      variantId: i.variantId,
      qty: i.qty,
      titulo: `Artigo ${i.variantId}`,
      slug: `artigo-${i.variantId}`,
      opcoes: '',
      precoUnitarioCents: precos[i.variantId] ?? 0,
      stock: 12,
      imagem: null,
    }))

  /** O que o checkout faz com o corpo que recebe: relê os preços e refaz a conta. */
  const cobrar = (corpo: { variantId: number; qty: number }[], precos: Record<number, number>) =>
    calcularTotais(
      corpo.map((l) => ({ ...l, unitPriceCents: precos[l.variantId] ?? 0 })),
    ).totalCents

  it('o mesmo número dos dois lados, com portes', () => {
    const itens: ItemCarrinho[] = [{ variantId: 283, qty: 1 }]
    const linhas = resolver(itens, precosNaBase)

    const noEcra = totaisDoCarrinho(linhas).totalCents
    const cobrado = cobrar(paraCheckout(linhas), precosNaBase)

    expect(noEcra).toBe(1990 + 499)
    expect(noEcra).toBe(cobrado)
  })

  it('o mesmo número dos dois lados, acima dos 50 € e portanto sem portes', () => {
    const itens: ItemCarrinho[] = [
      { variantId: 283, qty: 2 },
      { variantId: 1346, qty: 1 },
    ]
    const linhas = resolver(itens, precosNaBase)

    const noEcra = totaisDoCarrinho(linhas)
    expect(noEcra.subtotalCents).toBe(1990 * 2 + 2990)
    expect(noEcra.shippingCents).toBe(0)
    expect(noEcra.faltaParaEnvioGratisCents).toBe(0)
    expect(noEcra.totalCents).toBe(cobrar(paraCheckout(linhas), precosNaBase))
  })

  it('o corpo do checkout não leva preço nenhum — só identificadores e quantidades', () => {
    const linhas = resolver([{ variantId: 283, qty: 2 }], precosNaBase)
    const corpo = paraCheckout(linhas)

    expect(corpo).toEqual([{ variantId: 283, qty: 2 }])
    expect(Object.keys(corpo[0] ?? {})).toEqual(['variantId', 'qty'])
    // A rede por baixo: um campo novo com preço, título ou custo não passa daqui.
    expect(JSON.stringify(corpo)).not.toMatch(/preco|price|cent|custo|cost|titulo/i)
  })

  it('com o preço alterado no painel, o ecrã relido acompanha o cobrado', () => {
    const itens: ItemCarrinho[] = [{ variantId: 283, qty: 2 }]

    // O carrinho foi montado ontem, com o preço de ontem.
    const ontem = totaisDoCarrinho(resolver(itens, { 283: 1990 })).totalCents

    // Hoje o painel subiu o preço. O carrinho no browser continua igual —
    // guarda identificadores e quantidades, e mais nada.
    const hoje = { 283: 2990 }
    const cobrado = cobrar(paraCheckout(itens), hoje)

    // Se o ecrã tivesse guardado o preço, mostrava o de ontem e cobrava o de hoje.
    expect(ontem).not.toBe(cobrado)

    // Como relê, mostra o de hoje — e bate certo.
    expect(totaisDoCarrinho(resolver(itens, hoje)).totalCents).toBe(cobrado)
  })
})

describe('falta para o envio grátis', () => {
  const linha = (cents: number, qty = 1): LinhaCarrinho => ({
    variantId: 1,
    qty,
    titulo: 'Artigo',
    slug: 'artigo',
    opcoes: '',
    precoUnitarioCents: cents,
    stock: 12,
    imagem: null,
  })

  it('abaixo de 50 € diz quanto falta e cobra 4,99 €', () => {
    const t = totaisDoCarrinho([linha(1990)])
    expect(t.faltaParaEnvioGratisCents).toBe(5000 - 1990)
    expect(t.shippingCents).toBe(499)
  })

  it('nos 50 € exatos já é grátis e não falta nada', () => {
    const t = totaisDoCarrinho([linha(5000)])
    expect(t.faltaParaEnvioGratisCents).toBe(0)
    expect(t.shippingCents).toBe(0)
  })

  it('acima de 50 € continua grátis', () => {
    const t = totaisDoCarrinho([linha(2990, 2)])
    expect(t.faltaParaEnvioGratisCents).toBe(0)
    expect(t.shippingCents).toBe(0)
  })

  it('carrinho vazio não cobra portes nem promete envio grátis por comprar nada', () => {
    const t = totaisDoCarrinho([])
    expect(t.totalCents).toBe(0)
    expect(t.shippingCents).toBe(0)
  })
})
