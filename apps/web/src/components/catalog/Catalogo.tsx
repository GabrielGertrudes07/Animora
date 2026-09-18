import { getTranslations } from 'next-intl/server'
import {
  pesquisarProdutos,
  computeAttributeFacets,
  filtersToQuery,
  precoBounds,
  marcasDisponiveis,
  listSubcategories,
  getAvaliacoesEmLote,
  type AttributeDef,
  type CatalogFilters,
} from '../../modules/catalog'
import type { ResumoAvaliacoes } from '@animora/core'

const SEM_AVALIACAO: ResumoAvaliacoes = { media: null, total: 0 }
import { Link } from '../../i18n/navigation'
import { ProductCard } from '../ui/ProductCard'
import { EstadoVazio } from '../ui/EstadoVazio'
import { CascataProdutos } from '../motion/CascataProdutos'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { OrdenarPor } from './OrdenarPor'
import { MostrarMais } from './MostrarMais'
import { JsonLd } from '../seo/JsonLd'
import { absoluteUrl } from '../../lib/seo'

type Props = {
  titulo: string
  descricao?: string
  /** O endereço desta página, sem query string — para os links que limpam. */
  caminho: string
  locale: string
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
  locale,
  categoriaId,
  filtros,
  atributosAtivos,
  vazio,
}: Props) {
  const t = await getTranslations('Catalogo')
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
  const [todos, produtos, subcategorias] = await Promise.all([
    pesquisarProdutos(q, { ordem: 'relevancia' }, categoriaId),
    pesquisarProdutos(q, filtros, categoriaId, atributosAtivos),
    categoriaId ? listSubcategories(categoriaId) : Promise.resolve([]),
  ])
  // Uma leitura em lote para a grelha inteira — não uma por cartão (era N+1
  // numa PLP com dezenas de produtos).
  const avaliacoes = await getAvaliacoesEmLote(produtos.map((p) => p.id))

  const facetas = computeAttributeFacets(todos, atributosAtivos)
  const bounds = precoBounds(todos)
  const marcas = marcasDisponiveis(todos)

  // Sem `descricao` explícita (a página de categoria não passa uma — a
  // coleção `categories` não tem campo de descrição hoje), uma frase
  // genérica com o nome real da categoria — nunca inventada por produto.
  const descricaoFinal = descricao ?? (categoriaId ? t('descricaoCategoriaGenerica', { categoria: titulo }) : undefined)

  const comFiltros = Boolean(
    filtros.marca?.length ||
    filtros.precoMin !== undefined ||
    Object.keys(filtros.atributos ?? {}).length > 0,
  )

  // Limpar a pesquisa tira só a pesquisa: os filtros que a pessoa escolheu
  // continuam lá.
  const semPesquisa = filtersToQuery({ ...filtros, q: undefined })

  // Espelha exatamente o <nav> visual logo abaixo — mesmos três níveis,
  // mesma condição para o meio (`categoriaId`), só com URL absoluta.
  const migalhas = [
    { name: t('inicio'), url: absoluteUrl('/', locale) },
    ...(categoriaId ? [{ name: t('todosOsProdutos'), url: absoluteUrl('/produtos', locale) }] : []),
    { name: titulo, url: absoluteUrl(caminho, locale) },
  ]

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: migalhas.map((m, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: m.name,
            item: m.url,
          })),
        }}
      />
      <nav aria-label={t('breadcrumbAria')} className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink hover:underline">
              {t('inicio')}
            </Link>
          </li>
          {categoriaId ? (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <Link href="/produtos" className="hover:text-ink hover:underline">
                {t('todosOsProdutos')}
              </Link>
            </li>
          ) : null}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-medium text-ink">
              {titulo}
            </span>
          </li>
        </ol>
      </nav>

      <h1 className="mt-3 text-titulo text-ink">{titulo}</h1>
      {descricaoFinal ? (
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-muted sm:mt-3">{descricaoFinal}</p>
      ) : null}

      {subcategorias.length > 0 ? (
        <nav aria-label={t('subcategoriasTitulo')} className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {subcategorias.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${s.slug}`}
                  className="block rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-terracota hover:text-ink"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 sm:mt-6 sm:pb-4">
        <p className="text-sm text-ink-muted sm:text-base">
          {t('contagemProdutos', { count: produtos.length })}
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
                titulo={t('semResultadosTitulo', { q })}
                texto={t('semResultadosTexto')}
              >
                <Link
                  href={semPesquisa ? `${caminho}?${semPesquisa}` : caminho}
                  className="botao-principal botao-principal-pequeno"
                >
                  {t('limparPesquisa')}
                </Link>
              </EstadoVazio>
            ) : comFiltros ? (
              <EstadoVazio
                ilustracao="lupa"
                titulo={t('semFiltrosTitulo')}
                texto={t('semFiltrosTexto')}
              />
            ) : (
              <EstadoVazio ilustracao="tigela" titulo={vazio.titulo} texto={vazio.texto} />
            )
          ) : (
            // A barra de filtros (`w-64` + `gap-8`, ~288px) só existe a partir
            // de `lg` — por isso o degrau de 4 colunas espera por `xl`, não
            // `lg`: em 1024px com a barra presente, a grelha tem só ~688px
            // reais, e 4 colunas aí cabiam a 152px cada, estreito demais para
            // o cartão (o seletor de quantidade + botão ficava cortado — visto
            // e corrigido nesta fase). Em `xl` (1280px) já há espaço de sobra.
            <CascataProdutos className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              <MostrarMais>
                {produtos.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    avaliacao={avaliacoes.get(p.id) ?? SEM_AVALIACAO}
                    prioritario={i === 0}
                  />
                ))}
              </MostrarMais>
            </CascataProdutos>
          )}
        </div>
      </div>
    </main>
  )
}
