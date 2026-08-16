import type { TextFieldSingleValidation } from 'payload'
import { validations } from 'payload'

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
