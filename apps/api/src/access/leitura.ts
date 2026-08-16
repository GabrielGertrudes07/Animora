import type { Access, FieldAccess } from 'payload'

/**
 * Regras de leitura para a API pública.
 *
 * A loja lê a API sem sessão nenhuma, e o endereço da API vai no HTML de todas
 * as páginas (`/_next/image?url=http://…:3000/…`). Qualquer visitante sabe onde
 * ela é e pode pedir-lhe o que quiser. Abrir `read` numa coleção abre TODOS os
 * campos dessa coleção e TODOS os documentos, incluindo os que ainda não foram
 * publicados — o `access` da coleção não sabe distinguir uns dos outros.
 *
 * É por isso que estas duas regras existem: a proteção tem de ser aqui, na
 * fronteira que responde ao pedido. A `sanitizeProduct` da loja constrói o HTML
 * campo a campo e é uma segunda rede, mas não protege coisa nenhuma na API —
 * quem pede `/api/variants` não passa por ela.
 */

/**
 * Campos de gestão (custo de compra, fornecedor, EAN, armazém, peso de portes).
 * O Payload omite-os da resposta quando isto devolve `false`, em vez de os
 * devolver a nulo — e recusa também filtrar e ordenar por eles.
 */
export const soComSessao: FieldAccess = ({ req }) => Boolean(req.user)

/**
 * Leitura pública restrita aos documentos publicados.
 *
 * Devolver um `Where` em vez de `true` é o mecanismo do próprio Payload para
 * isto: a condição entra na consulta (`combineQueries`), por isso aplica-se ao
 * `find`, ao `findByID` e — via `appendVersionToQueryKey` — também ao
 * `?draft=true`, que de outra forma iria buscar a versão em rascunho à tabela
 * de versões por um caminho diferente. Um utilizador com sessão devolve `true`
 * e continua a ver tudo.
 */
export const soPublicadosSemSessao: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

/**
 * O mesmo, para as variantes, que não têm `_status` próprio: herdam o do
 * produto a que pertencem. Sem isto, o SKU de um produto por publicar — que é
 * gerado a partir da marca e do título — ficava legível a toda a gente.
 */
export const soDeProdutosPublicados: Access = ({ req }) =>
  req.user ? true : { 'product._status': { equals: 'published' } }
