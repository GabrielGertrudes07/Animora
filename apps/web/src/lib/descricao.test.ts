import { describe, expect, it } from 'vitest'

import { descricaoSegura } from './descricao'

describe('descricaoSegura', () => {
  it('devolve null quando não há descrição', () => {
    expect(descricaoSegura(null)).toBeNull()
    expect(descricaoSegura('')).toBeNull()
    expect(descricaoSegura('   ')).toBeNull()
  })

  it('devolve null para o que não é texto', () => {
    // A descrição era Lexical (um objeto). Se sobrar um por migrar, não pode
    // ir parar ao DOM como "[object Object]".
    expect(descricaoSegura({ root: {} })).toBeNull()
  })

  it('mantém a formatação que o Shopify usa', () => {
    const html = '<p>Ração <strong>premium</strong></p><ul><li>2 kg</li></ul>'
    expect(descricaoSegura(html)).toBe(html)
  })

  it('remove script', () => {
    expect(descricaoSegura('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })

  it('remove atributos de evento', () => {
    expect(descricaoSegura('<p onclick="roubar()">ok</p>')).toBe('<p>ok</p>')
  })

  it('remove href com javascript:', () => {
    expect(descricaoSegura('<a href="javascript:alert(1)">clica</a>')).not.toContain('javascript:')
  })

  it('remove iframe', () => {
    expect(descricaoSegura('<iframe src="https://mau.exemplo"></iframe>')).toBe('')
  })

  it('põe noopener nos links, que saem do site', () => {
    const resultado = descricaoSegura('<a href="https://exemplo.pt">loja</a>')
    expect(resultado).toContain('rel="noopener nofollow"')
  })
})
