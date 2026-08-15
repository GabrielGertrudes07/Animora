import { describe, it, expect } from 'vitest'
import { buildSku } from './sku'

describe('buildSku', () => {
  it('junta marca, produto e valores das opções', () => {
    expect(buildSku('HappyPaws', 'Coleira', { Tamanho: 'S', Cor: 'Preto' }))
      .toBe('HAP-COL-PRE-S')
    })

  it('usa as tres primeiras letras de cada parte', () => {
    expect(buildSku('PetNest', 'Comedouro', {})).toBe('PET-COM')
  })

  it('remove acentos', () => {
    expect(buildSku('Ração', 'Sénior', {})).toBe('RAC-SEN')
  })

  it('remove espaços e pontuação', () => {
    expect(buildSku('Cat & Co.', 'Casa de banho', {})).toBe('CAT-CAS')
  })

  it('ordena as opções alfabeticamente para ser determinista', () => {
    const a = buildSku('X', 'Y', { Tamanho: 'S', Cor: 'Preto' })
    const b = buildSku('X', 'Y', { Cor: 'Preto', Tamanho: 'S' })
    expect(a).toBe(b)
  })

  it('lida com partes mais curtas que tres letras', () => {
    expect(buildSku('Pi', 'Ao', {})).toBe('PI-AO')
  })
})
