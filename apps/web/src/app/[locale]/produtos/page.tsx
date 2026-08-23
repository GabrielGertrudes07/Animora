import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { lerFiltros } from '../../../modules/catalog'
import { Catalogo } from '../../../components/catalog/Catalogo'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'ProdutosPage' })
  return { title: t('metaTitulo'), description: t('metaDescricao') }
}

/**
 * A loja inteira, sem categoria.
 *
 * Faltava: só se chegava a produtos entrando primeiro numa categoria, e quem
 * não sabe em que categoria mora o que procura não tinha por onde começar.
 * Os filtros são os mesmos da página de categoria (é o mesmo componente) —
 * aqui com o conjunto de filtros por omissão da configuração, porque não há
 * categoria de onde tirar uma substituição.
 *
 * Fica em `/produtos` e não em `/` porque a rota de categoria é `/[categoria]`:
 * uma categoria com o slug `produtos` passaria a ser inalcançável, e é um nome
 * que ninguém dá a uma categoria de loja de animais.
 */
export default async function ProdutosPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('ProdutosPage')

  // A query string crua morre aqui — ver `lerFiltros`.
  const { filtros, atributosAtivos } = await lerFiltros(await searchParams)

  // `/produtos?q=coleira` é a página de resultados da loja: mesma rota, mesmos
  // filtros, mesma grelha — só o cabeçalho muda, para quem chega por um link
  // partilhado saber o que está a ver. A pesquisa vive na query string e não
  // numa rota própria justamente para se combinar com os filtros sem duplicar
  // nada disto.
  const q = filtros.q

  return (
    <Catalogo
      titulo={q ? t('resultadosPara', { q }) : t('todosOsProdutos')}
      descricao={q ? t('descricaoComPesquisa') : t('descricaoSemPesquisa')}
      caminho="/produtos"
      filtros={filtros}
      atributosAtivos={atributosAtivos}
      vazio={{ titulo: t('vazioTitulo'), texto: t('vazioTexto') }}
    />
  )
}
