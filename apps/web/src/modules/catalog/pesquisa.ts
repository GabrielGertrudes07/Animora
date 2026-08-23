import { listProducts } from './queries'
import type { AttributeDef, PublicProduct } from './types'
import type { CatalogFilters } from './filters'

/**
 * Pesquisa por título, marca e categoria, sobre produtos publicados.
 *
 * ## Os acentos, e porquê assim
 *
 * `?q=ração` e `?q=racao` têm de dar o mesmo resultado — numa loja portuguesa,
 * quem escreve depressa no telemóvel não põe o til, e quem o põe não pode ser
 * castigado por isso. Havia três caminhos:
 *
 * 1. **`unaccent` no Postgres.** É a resposta certa para um catálogo grande,
 *    mas obriga a instalar uma extensão na base (e a tê-la em produção), e o
 *    Payload não expõe `unaccent(...)` no `where` — obrigava a sair da API para
 *    SQL cru, que é a fronteira que este módulo existe para não atravessar.
 * 2. **Coluna auxiliar já normalizada.** Um campo a mais em `products`,
 *    preenchido num hook, mantido em sincronia para sempre, e a repetir-se em
 *    `brands` e `categories` — três colunas e três hooks para uma pergunta que
 *    a loja faz sobre 42 produtos.
 * 3. **Normalizar dos dois lados, em memória.** `String.normalize('NFD')`
 *    separa a letra do acento e a expressão regular deita fora os acentos:
 *    `ração` e `racao` viram ambos `racao`, `VidaCão` vira `vidacao`. É
 *    biblioteca padrão, não muda a base, não acrescenta dependência nenhuma e
 *    trata igual o texto do catálogo e o texto que a pessoa escreveu.
 *
 * Escolhido o 3. A razão de peso não é a preguiça: é que `listProducts` **já
 * traz o catálogo inteiro para memória** — o filtro de preço e o de atributos
 * já lá são aplicados em JavaScript. A pesquisa não acrescenta uma leitura nem
 * um percurso novo, só mais uma condição na passagem que já existia.
 *
 * ponytail: varrimento linear sobre o catálogo publicado, por pedido. Chega a
 * 42 produtos e chegaria a uns milhares; o dia em que deixar de chegar
 * conhece-se pelo tempo da página, e o caminho é o 1 ou o 2 acima — a fronteira
 * está toda aqui dentro, nada fora deste ficheiro sabe como a pesquisa procura.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * O que se procura dentro de cada produto: título, marca e categoria — nomes e
 * slugs. Os slugs entram porque são o que aparece no endereço (`?marca=petisco-
 * real`) e portanto o que uma pessoa copia e cola.
 *
 * Campos internos não entram aqui, e não é por escolha deste ficheiro: um
 * `PublicProduct` já saiu de `sanitizeProduct` sem fornecedor, custo, EAN nem
 * armazém. Não há nada a filtrar — não há nada lá.
 */
function textoProcuravel(p: PublicProduct): string {
  return normalizarTexto(
    [
      p.title,
      p.brand.name,
      p.brand.slug,
      ...p.categories.flatMap((c) => [c.name, c.slug]),
    ].join(' '),
  )
}

/**
 * Reduz `produtos` aos que correspondem a `q`.
 *
 * Uma pesquisa vazia (ou só com espaços) devolve tudo, e não zero: quem apaga o
 * que escreveu está a desistir da pesquisa, não a pedir uma lista vazia.
 *
 * Vários termos são um **e**, não um **ou**: `ração cão` só traz o que tem as
 * duas palavras. Com **ou**, escrever mais palavras alargava o resultado em vez
 * de o estreitar, que é o contrário do que quem escreve espera.
 */
export function filtrarPorTexto(produtos: PublicProduct[], q: string): PublicProduct[] {
  const termos = normalizarTexto(q).split(/\s+/).filter((t) => t !== '')
  if (termos.length === 0) return produtos

  return produtos.filter((p) => {
    const texto = textoProcuravel(p)
    return termos.every((t) => texto.includes(t))
  })
}

/**
 * Os produtos publicados que correspondem a `q`, já com os filtros aplicados.
 *
 * `categoriaId` e `atributosAtivos` são os mesmos parâmetros de `listProducts`,
 * e chegam aqui pela mesma razão: a pesquisa é uma condição a mais sobre a
 * lista que já se ia buscar, não uma leitura paralela. Numa página de categoria
 * procura-se dentro da categoria; em `/produtos`, na loja inteira.
 */
export async function pesquisarProdutos(
  q: string,
  f: CatalogFilters,
  categoriaId?: number,
  atributosAtivos: AttributeDef[] = [],
): Promise<PublicProduct[]> {
  return filtrarPorTexto(await listProducts(f, categoriaId, atributosAtivos), q)
}
