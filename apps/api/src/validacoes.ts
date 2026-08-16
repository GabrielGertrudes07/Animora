import type { NumberFieldSingleValidation, TextFieldSingleValidation } from 'payload'
import { validations } from 'payload'

/**
 * Dinheiro é sempre em cêntimos inteiros; stock e quantidades são sempre
 * inteiros de unidades. Sem isto, o Postgres aceita 29.9 ou 3.5 e a loja só
 * rebenta mais tarde, ao formatar o preço (MoneyError: "Cêntimos têm de ser
 * inteiros").
 *
 * Corre primeiro a validação nativa do Payload (`required`, `min`, `max`): um
 * `validate` personalizado SUBSTITUI a nativa em vez de a completar, e a
 * primeira versão desta função — na fase 1 — partiu assim o `min: 0` dos campos
 * de dinheiro. Reaproveitar `validations.number` é o que garante que `min: 1`
 * numa quantidade e `min: 0` num preço continuam a valer.
 */
export const validarInteiro: NumberFieldSingleValidation = (value, options) => {
  const nativo = validations.number(value, options)
  if (nativo !== true) return nativo
  return value === null || value === undefined || Number.isInteger(value)
    ? true
    : 'Tem de ser um número inteiro'
}

/**
 * Código postal português: quatro dígitos, hífen, três dígitos.
 *
 * `1234567` não é "quase certo" — é uma morada que os CTT não entregam, num
 * campo que só é lido quando a encomenda já está paga.
 *
 * Corre primeiro a validação nativa do Payload: um `validate` personalizado
 * SUBSTITUI a nativa em vez de a completar (lição da fase 1), e sem isto
 * perdiam-se o `required` e as mensagens traduzidas.
 */
export const validarCodigoPostal: TextFieldSingleValidation = (value, options) => {
  const nativo = validations.text(value, options)
  if (nativo !== true) return nativo

  return typeof value === 'string' && /^\d{4}-\d{3}$/.test(value)
    ? true
    : 'Código postal inválido. Use o formato 1234-567.'
}
