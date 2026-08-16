import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'

/**
 * Converte a descrição rich text (Lexical) do produto para HTML seguro.
 *
 * `convertLexicalToHTML` só percorre nós Lexical conhecidos (parágrafo,
 * texto, lista, link, ...) e escapa o texto (`escape-html`) e os URLs
 * (`sanitizeUrl`) por dentro — por isso o resultado pode ir para
 * `dangerouslySetInnerHTML` sem passar por HTML solto do editor.
 *
 * Devolve `null` quando não há descrição, para a página não desenhar uma
 * secção vazia.
 */
export function descriptionToHtml(description: unknown): string | null {
  if (!description || typeof description !== 'object') return null

  const html = convertLexicalToHTML({
    data: description as Parameters<typeof convertLexicalToHTML>[0]['data'],
    disableContainer: true,
  })

  return html.trim().length > 0 ? html : null
}
