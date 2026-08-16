import type { Access } from 'payload'

import { ehStaff } from './staff'

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
 *
 * Os campos de gestão (custo de compra, fornecedor, EAN, armazém, peso de
 * portes) são protegidos com o `soStaffCampo` de `staff.ts`. O Payload omite-os
 * da resposta quando o access devolve `false`, em vez de os devolver a nulo — e
 * recusa também filtrar e ordenar por eles.
 */

/**
 * Leitura pública restrita aos documentos publicados.
 *
 * Devolver um `Where` em vez de `true` é o mecanismo do próprio Payload para
 * isto: a condição entra na consulta (`combineQueries`), por isso aplica-se ao
 * `find`, ao `findByID` e — via `appendVersionToQueryKey` — também ao
 * `?draft=true`, que de outra forma iria buscar a versão em rascunho à tabela
 * de versões por um caminho diferente. O staff devolve `true` e continua a ver
 * tudo.
 *
 * A pergunta é "é staff?" e não "tem sessão?": um cliente da loja também tem
 * sessão, e os rascunhos não são dele — ver `staff.ts`.
 */
export const soPublicadosSemSessao: Access = ({ req }) =>
  ehStaff(req.user) ? true : { _status: { equals: 'published' } }

/**
 * O mesmo, para as variantes, que não têm `_status` próprio: herdam o do
 * produto a que pertencem. Sem isto, o SKU de um produto por publicar — que é
 * gerado a partir da marca e do título — ficava legível a toda a gente.
 */
export const soDeProdutosPublicados: Access = ({ req }) =>
  ehStaff(req.user) ? true : { 'product._status': { equals: 'published' } }
