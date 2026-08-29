import sanitizeHtml from 'sanitize-html'

/**
 * A descrição do produto, vinda do Shopify, pronta para o DOM.
 *
 * Antes era Lexical, e o `convertLexicalToHTML` garantia o HTML seguro por
 * construção: só percorria nós conhecidos e escapava texto e endereços. Agora
 * o HTML chega feito, de um sistema que não é este — a garantia tem de ser
 * explícita, e é esta função.
 *
 * A lista é de permissões, nunca de proibições: o que não estiver aqui não
 * passa. Uma lista de proibições fica sempre atrás do próximo vetor.
 */
const PERMITIDO: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'h4',
    'a',
    'blockquote',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
  },
  // Sem `javascript:` nem `data:` — é assim que um href se torna executável.
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // Um link de descrição de produto sai do site: `noopener` impede a página
    // de destino de mexer nesta pela `window.opener`.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener nofollow', target: '_blank' }),
  },
}

export function descricaoSegura(html: unknown): string | null {
  if (typeof html !== 'string' || !html.trim()) return null
  return sanitizeHtml(html, PERMITIDO)
}
