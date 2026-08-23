import Link from 'next/link'
import {
  pesquisarProdutos,
  computeAttributeFacets,
  filtersToQuery,
  precoBounds,
  marcasDisponiveis,
  type AttributeDef,
  type CatalogFilters,
} from '../../modules/catalog'
import { ProductCard } from '../ui/ProductCard'
import { EstadoVazio } from '../ui/EstadoVazio'
import { CascataProdutos } from '../motion/CascataProdutos'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { OrdenarPor } from './OrdenarPor'

type Props = {
  titulo: string
  descricao?: string
  /** O endereço desta página, sem query string — para os links que limpam. */
  caminho: string
  /** Ausente em `/produtos`: a loja inteira. Presente em `/[categoria]`. */
  categoriaId?: number
  /**
   * Já fechados ao que é público, por `lerFiltros` — que a página chama com
   * os `searchParams` crus. Estes nunca chegam aqui de propósito: as props de
   * um componente são serializadas na carga que vai para o browser, e a query
   * crua traria consigo qualquer chave que alguém tivesse forçado no URL.
   */
  filtros: CatalogFilters
  atributosAtivos: AttributeDef[]
  /** Texto do estado vazio quando não há filtros nenhuns aplicados. */
  vazio: { titulo: string; texto: string }
}

/**
 * A grelha de catálogo com filtros — a mesma peça em `/produtos` e em
 * `/[categoria]`.
 *
 * Existe porque as duas páginas fazem exatamente o mesmo trabalho e só
 * diferem numa coisa: haver ou não `categoriaId`. Sem `categoriaId`,
 * `listProducts` devolve a loja inteira e `resolveActiveAttributeDefs` cai no
 * conjunto de filtros por omissão — nenhum caminho novo, só o parâmetro que
 * já era opcional a chegar vazio.
 */
export async function Catalogo({
  titulo,
  descricao,
  caminho,
  categoriaId,
  filtros,
  atributosAtivos,
  vazio,
}: Props) {
  const q = filtros.q ?? ''

  // O universo SEM os filtros do pedido: é dele que saem os limites de preço,
  // as marcas e os valores de atributo REAIS — nunca uma constante e nunca
  // reduzido pelos próprios filtros que se está a montar (senão a barra de
  // preço encolhia sozinha a cada seleção). A lista efetivamente mostrada
  // (`produtos`, abaixo) é uma segunda leitura, já com os filtros aplicados.
  //
  // A pesquisa é a exceção e entra nos dois: quem procurou "ração" tem de ver
  // as marcas das rações, não as do catálogo inteiro. Um filtro que devolveria
  // zero resultados nunca é oferecido — é a regra do `computeAttributeFacets`,
  // e a pesquisa não a suspende.
  const [todos, produtos] = await Promise.all([
    pesquisarProdutos(q, { ordem: 'relevancia' }, categoriaId),
    pesquisarProdutos(q, filtros, categoriaId, atributosAtivos),
  ])

  const facetas = computeAttributeFacets(todos, atributosAtivos)
  const bounds = precoBounds(todos)
  const marcas = marcasDisponiveis(todos)

  const comFiltros = Boolean(
    filtros.marca?.length ||
      filtros.precoMin !== undefined ||
      Object.keys(filtros.atributos ?? {}).length > 0,
  )

  // Limpar a pesquisa tira só a pesquisa: os filtros que a pessoa escolheu
  // continuam lá.
  const semPesquisa = filtersToQuery({ ...filtros, q: undefined })

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-4xl text-ink">{titulo}</h1>
      {descricao ? (
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{descricao}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-ink-muted">
          {produtos.length === 1 ? '1 produto' : `${produtos.length} produtos`}
        </p>
        <OrdenarPor filtrosAtuais={filtros} />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <FiltrosCatalogo
          marcas={marcas}
          bounds={bounds}
          atributos={facetas}
          filtrosAtuais={filtros}
        />

        <div className="min-w-0 flex-1">
          {produtos.length === 0 ? (
            q ? (
              // A pesquisa vem primeiro: com `?q=xpto&marca=x`, o que não
              // encontrou nada foi a palavra, e mandar alargar o preço era
              // mandar a pessoa para o sítio errado.
              <EstadoVazio
                ilustracao="lupa"
                titulo={`Sem resultados para “${q}”`}
                texto="Experimenta uma palavra mais curta — o nome do produto, a marca ou o animal."
              >
                <Link
                  href={semPesquisa ? `${caminho}?${semPesquisa}` : caminho}
                  className="inline-block rounded-lg bg-terracota px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracota-dark"
                >
                  Limpar a pesquisa
                </Link>
              </EstadoVazio>
            ) : comFiltros ? (
              <EstadoVazio
                ilustracao="lupa"
                titulo="Nenhum produto corresponde aos filtros"
                texto="Experimenta alargar o preço ou tirar uma das marcas escolhidas."
              />
            ) : (
              <EstadoVazio ilustracao="tigela" titulo={vazio.titulo} texto={vazio.texto} />
            )
          ) : (
            <CascataProdutos className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {produtos.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </CascataProdutos>
          )}
        </div>
      </div>
    </main>
  )
}
