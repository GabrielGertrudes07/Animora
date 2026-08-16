import { describe, it, expect } from 'vitest'
import { agregarAvaliacoes, AvaliacaoError } from './avaliacoes'

describe('agregarAvaliacoes — sem avaliações', () => {
  it('lista vazia não tem média nenhuma: null, e nunca zero', () => {
    expect(agregarAvaliacoes([])).toEqual({ media: null, total: 0 })
  })

  it('null não é o mesmo que a média mais baixa possível', () => {
    // A distinção que importa: um produto sem avaliações e um produto com uma
    // avaliação de uma estrela não podem sair iguais de aqui. É a doutrina do
    // `margemPercent` — o que não se sabe aparece como não se sabendo.
    expect(agregarAvaliacoes([]).media).toBeNull()
    expect(agregarAvaliacoes([1]).media).toBe(10)
  })
})

describe('agregarAvaliacoes — a média em décimos inteiros', () => {
  it('uma avaliação é a própria nota', () => {
    expect(agregarAvaliacoes([4])).toEqual({ media: 40, total: 1 })
  })

  it('todas iguais dão a nota, sem resto', () => {
    expect(agregarAvaliacoes([4, 4, 4, 4])).toEqual({ media: 40, total: 4 })
    expect(agregarAvaliacoes([5, 5])).toEqual({ media: 50, total: 2 })
  })

  it('4, 4 e 5 dão 4,3 — e não 4,33333', () => {
    expect(agregarAvaliacoes([4, 4, 5])).toEqual({ media: 43, total: 3 })
  })

  it('a saída é sempre um inteiro, mesmo com dízimas infinitas', () => {
    for (const estrelas of [[1, 1, 2], [1, 2, 2], [4, 5, 5], [1, 2, 3, 4, 5, 5, 5]]) {
      const { media } = agregarAvaliacoes(estrelas)
      expect(Number.isInteger(media)).toBe(true)
    }
  })

  it('arredonda ao décimo mais próximo, com o meio para cima', () => {
    expect(agregarAvaliacoes([1, 1, 2]).media).toBe(13) // 1,333…
    expect(agregarAvaliacoes([1, 2, 2]).media).toBe(17) // 1,666…
    expect(agregarAvaliacoes([4, 5, 5]).media).toBe(47) // 4,666…
    expect(agregarAvaliacoes([1, 2, 2, 2]).media).toBe(18) // 1,75 → 1,8
  })

  it('a média fica sempre entre 1 e 5, em décimos', () => {
    expect(agregarAvaliacoes([1, 1, 1]).media).toBe(10)
    expect(agregarAvaliacoes([5, 5, 5]).media).toBe(50)
    expect(agregarAvaliacoes([1, 5]).media).toBe(30)
  })

  it('o total é a contagem, não a soma', () => {
    expect(agregarAvaliacoes([5, 5, 5])).toEqual({ media: 50, total: 3 })
  })
})

describe('agregarAvaliacoes — o que não é uma nota', () => {
  const recusa = (estrelas: number[]) => {
    expect(() => agregarAvaliacoes(estrelas)).toThrow(AvaliacaoError)
  }

  it('recusa fora de 1–5', () => {
    recusa([0])
    recusa([6])
    recusa([-1])
    recusa([4, 4, 0])
  })

  it('recusa não inteiros', () => {
    recusa([3.5])
    recusa([4, 4.0001])
  })

  it('recusa o que nem número é', () => {
    recusa([NaN])
    recusa([Infinity])
    recusa([undefined as unknown as number])
    recusa([null as unknown as number])
  })

  it('a mensagem diz qual foi o valor recusado', () => {
    expect(() => agregarAvaliacoes([4, 7])).toThrow(/7/)
  })
})
