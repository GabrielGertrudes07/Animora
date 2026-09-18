import { describe, expect, it } from 'vitest'
import { comVisto } from './vistos'

describe('comVisto', () => {
  it('põe o produto no topo', () => {
    expect(comVisto([], 1)).toEqual([1])
    expect(comVisto([2, 3], 1)).toEqual([1, 2, 3])
  })

  it('não duplica — um produto já visto só sobe ao topo', () => {
    expect(comVisto([1, 2, 3], 2)).toEqual([2, 1, 3])
  })

  it('nunca cresce além de 8', () => {
    const cheia = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(comVisto(cheia, 9)).toEqual([9, 1, 2, 3, 4, 5, 6, 7])
    expect(comVisto(cheia, 9)).toHaveLength(8)
  })
})
