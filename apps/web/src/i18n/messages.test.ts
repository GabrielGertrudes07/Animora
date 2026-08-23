import { describe, expect, it } from 'vitest'
import pt from '../../messages/pt.json'
import de from '../../messages/de.json'

function chaves(obj: Record<string, unknown>, prefixo = ''): string[] {
  return Object.entries(obj).flatMap(([chave, valor]) => {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave
    return typeof valor === 'object' && valor !== null
      ? chaves(valor as Record<string, unknown>, caminho)
      : [caminho]
  })
}

describe('mensagens pt/de', () => {
  it('têm exatamente as mesmas chaves', () => {
    expect(chaves(de).sort()).toEqual(chaves(pt).sort())
  })
})
