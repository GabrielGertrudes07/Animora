/**
 * Corre a consulta contra a loja real e escreve a primeira página em
 * `fixtures/produtos.json`.
 *
 * Existe porque nada garante, sem experimentar, que cada campo se chama assim
 * na versão da API em uso. Correr isto é a verificação — e a fixture que sai
 * daqui é uma resposta verdadeira, não uma invenção.
 *
 * Uso: pnpm --filter @animora/api shopify:validar
 */
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { consultarShopify } from './cliente'
import { CONSULTA_PRODUTOS, type PaginaProdutos } from './consultas'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const pagina = await consultarShopify<PaginaProdutos>(CONSULTA_PRODUTOS)
const destino = path.join(dirname, 'fixtures', 'produtos.json')

await writeFile(destino, JSON.stringify(pagina, null, 2), 'utf8')

console.log(
  `${pagina.products.nodes.length} produtos escritos em ${destino}. ` +
    `Há mais páginas: ${pagina.products.pageInfo.hasNextPage}`,
)
