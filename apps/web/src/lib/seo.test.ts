import { describe, expect, it } from 'vitest'
import { absoluteUrl, alternatesFor, centsToDecimalString, localizedPathname } from './seo'

describe('localizedPathname', () => {
  it('não prefixa o idioma por omissão (pt)', () => {
    expect(localizedPathname('/produtos', 'pt')).toBe('/produtos')
  })

  it('prefixa qualquer outro idioma', () => {
    expect(localizedPathname('/produtos', 'de')).toBe('/de/produtos')
  })

  it('prefixa a raiz corretamente', () => {
    expect(localizedPathname('/', 'de')).toBe('/de/')
  })
})

describe('absoluteUrl', () => {
  it('junta SITE_URL ao caminho localizado', () => {
    expect(absoluteUrl('/produto/coleira', 'pt')).toMatch(/^https?:\/\/.+\/produto\/coleira$/)
    expect(absoluteUrl('/produto/coleira', 'de')).toMatch(/^https?:\/\/.+\/de\/produto\/coleira$/)
  })
})

describe('alternatesFor', () => {
  it('devolve canónica no idioma atual e uma entrada por idioma + x-default', () => {
    const a = alternatesFor('/caes', 'de')
    expect(a.canonical).toBe(absoluteUrl('/caes', 'de'))
    expect(a.languages.pt).toBe(absoluteUrl('/caes', 'pt'))
    expect(a.languages.de).toBe(absoluteUrl('/caes', 'de'))
    expect(a.languages['x-default']).toBe(absoluteUrl('/caes', 'pt'))
  })
})

describe('centsToDecimalString', () => {
  it('formata cêntimos como decimal ISO', () => {
    expect(centsToDecimalString(2990)).toBe('29.90')
    expect(centsToDecimalString(100)).toBe('1.00')
    expect(centsToDecimalString(5)).toBe('0.05')
  })
})
