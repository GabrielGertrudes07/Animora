import { describe, it, expect } from 'vitest'
import { descriptionToHtml } from './richtext'

const paragrafo = (text: string, bold = false) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          {
            type: 'text',
            format: bold ? 1 : 0,
            detail: 0,
            mode: 'normal',
            style: '',
            text,
            version: 1,
          },
        ],
      },
    ],
  },
})

describe('descriptionToHtml', () => {
  it('converte um parágrafo simples', () => {
    expect(descriptionToHtml(paragrafo('Ração para cães.'))).toBe('<p>Ração para cães.</p>')
  })

  it('converte texto a negrito para <strong>, escapado', () => {
    const html = descriptionToHtml(paragrafo('<script>', true))
    expect(html).toBe('<p><strong>&lt;script&gt;</strong></p>')
  })

  it('devolve null quando não há descrição', () => {
    expect(descriptionToHtml(null)).toBeNull()
    expect(descriptionToHtml(undefined)).toBeNull()
  })

  it('devolve null para um documento lexical vazio', () => {
    const vazio = { root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 } }
    expect(descriptionToHtml(vazio)).toBeNull()
  })
})
