import { describe, it, expect } from 'vitest'
import { parseEuros, formatEuros, MoneyError } from './money'

describe('parseEuros', () => {
  it('converte decimal com vírgula em cêntimos', () => {
    expect(parseEuros('29,90')).toBe(2990)
  })

  it('converte decimal com ponto em cêntimos', () => {
    expect(parseEuros('29.90')).toBe(2990)
  })

  it('aceita inteiro sem casas decimais', () => {
    expect(parseEuros('30')).toBe(3000)
  })

  it('aceita uma só casa decimal', () => {
    expect(parseEuros('29,9')).toBe(2990)
  })

  it('ignora espaços e símbolo de euro', () => {
    expect(parseEuros(' 29,90 € ')).toBe(2990)
  })

  it('nao perde cêntimos por erro de vírgula flutuante', () => {
    expect(parseEuros('0,10')).toBe(10)
    expect(parseEuros('0,20')).toBe(20)
    expect(parseEuros('0,29')).toBe(29)
    expect(parseEuros('1234,56')).toBe(123456)
  })

  it('recusa mais de duas casas decimais', () => {
    expect(() => parseEuros('29,901')).toThrow(MoneyError)
  })

  it('recusa valores negativos', () => {
    expect(() => parseEuros('-5,00')).toThrow(MoneyError)
  })

  it('recusa texto que nao e numero', () => {
    expect(() => parseEuros('abc')).toThrow(MoneyError)
    expect(() => parseEuros('')).toThrow(MoneyError)
  })
})

describe('formatEuros', () => {
  it('formata cêntimos no formato português', () => {
    expect(formatEuros(2990)).toBe('29,90 €')
  })

  it('mostra sempre duas casas decimais', () => {
    expect(formatEuros(3000)).toBe('30,00 €')
    expect(formatEuros(5)).toBe('0,05 €')
  })

  it('separa os milhares', () => {
    expect(formatEuros(123456)).toBe('1234,56 €')
  })

  it('formata zero', () => {
    expect(formatEuros(0)).toBe('0,00 €')
  })

  it('recusa valores nao inteiros', () => {
    expect(() => formatEuros(29.9)).toThrow(MoneyError)
  })

  // Descontos e devoluções são negativos. `Math.trunc(-50/100)` é `-0`, e
  // `${-0}` é `"0"`: -0,50 € saía como 0,50 €, uma troca de sinal silenciosa
  // no módulo de dinheiro. Abaixo de -100 o sinal aparecia, o que fazia o
  // defeito passar despercebido em qualquer verificação com valores redondos.
  it('mantém o sinal em valores negativos abaixo de um euro', () => {
    expect(formatEuros(-1)).toBe('-0,01 €')
    expect(formatEuros(-5)).toBe('-0,05 €')
    expect(formatEuros(-50)).toBe('-0,50 €')
    expect(formatEuros(-99)).toBe('-0,99 €')
  })

  it('mantém o sinal em valores negativos de um euro ou mais', () => {
    expect(formatEuros(-100)).toBe('-1,00 €')
    expect(formatEuros(-2990)).toBe('-29,90 €')
  })

  it('nao poe sinal no zero', () => {
    expect(formatEuros(0)).toBe('0,00 €')
    expect(formatEuros(-0)).toBe('0,00 €')
  })
})
