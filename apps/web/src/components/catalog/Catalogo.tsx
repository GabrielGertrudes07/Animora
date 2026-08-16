import {
  listProducts,
  listAttributeDefs,
  getConfiguracaoFiltros,
  resolveActiveAttributeDefs,
  restringirAtributosAtivos,
  computeAttributeFacets,
  precoBounds,
  marcasDisponiveis,
  parseFilters,
} from '../../modules/catalog'
import { ProductCard } from '../ui/ProductCard'
import { EstadoVazio } from '../ui/EstadoVazio'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { OrdenarPor } from './OrdenarPor'

type Props = {
  titulo: string
  descricao?: string
  /** Ausente em `/produtos`: a loja inteira. Presente em `/[categoria]`. */
  categoriaId?: number
  searchParams: Record<string, string | string[] | undefined>
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
export async function Catalogo({ titulo, descricao, categoriaId, searchParams, vazio }: Props) {
  const filtros = parseFilters(searchParams)

  // O universo SEM os filtros do pedido: é dele que saem os limites de preço,
  // as marcas e os valores de atributo REAIS — nunca uma constante e nunca
  // reduzido pelos próprios filtros que se está a montar (senão a barra de
  // preço encolhia sozinha a cada seleção). A lista efetivamente mostrada
  // (`produtos`, abaixo) é uma segunda leitura, já com os filtros aplicados.
  const [todos, atributoDefs, configuracaoFiltros] = await Promise.all([
    listProducts({ ordem: 'relevancia' }, categoriaId),
    listAttributeDefs(),
    getConfiguracaoFiltros(),
  ])

  const atributosAtivos = resolveActiveAttributeDefs(atributoDefs, configuracaoFiltros, categoriaId)
  const facetas = computeAttributeFacets(todos, atributosAtivos)
  const bounds = precoBounds(todos)
  const marcas = marcasDisponiveis(todos)

  // Só o que corresponde a um atributo ativo continua daqui em diante — nem
  // para filtrar, nem para o estado da UI. Uma chave forçada no URL para um
  // atributo interno (que nunca chega a `atributosAtivos`) fica sem efeito
  // nenhum E sem rasto nenhum: não filtra, e não aparece no HTML nem no
  // estado serializado das Client Components abaixo.
  const filtrosVisiveis = restringirAtributosAtivos(filtros, atributosAtivos)

  const produtos = await listProducts(filtrosVisiveis, categoriaId, atributosAtivos)
  const comFiltros = Boolean(
    filtrosVisiveis.marca?.length ||
      filtrosVisiveis.precoMin !== undefined ||
      Object.keys(filtrosVisiveis.atributos ?? {}).length > 0,
  )

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
        <OrdenarPor filtrosAtuais={filtrosVisiveis} />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <FiltrosCatalogo
          marcas={marcas}
          bounds={bounds}
          atributos={facetas}
          filtrosAtuais={filtrosVisiveis}
        />

        <div className="min-w-0 flex-1">
          {produtos.length === 0 ? (
            comFiltros ? (
              <EstadoVazio
                ilustracao="lupa"
                titulo="Nenhum produto corresponde aos filtros"
                texto="Experimenta alargar o preço ou tirar uma das marcas escolhidas."
              />
            ) : (
              <EstadoVazio ilustracao="tigela" titulo={vazio.titulo} texto={vazio.texto} />
            )
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {produtos.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
