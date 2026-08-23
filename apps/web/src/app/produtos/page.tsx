import type { Metadata } from 'next'
import { lerFiltros } from '../../modules/catalog'
import { Catalogo } from '../../components/catalog/Catalogo'

export const metadata: Metadata = {
  title: 'Todos os produtos',
  description:
    'A loja inteira da Animora: alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos animais.',
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

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
export default async function ProdutosPage({ searchParams }: Props) {
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
      titulo={q ? `Resultados para “${q}”` : 'Todos os produtos'}
      descricao={
        q
          ? 'Procurámos no título, na marca e na categoria de tudo o que está publicado.'
          : 'Tudo o que está à venda, de uma vez. Filtra por marca, preço ou característica.'
      }
      caminho="/produtos"
      filtros={filtros}
      atributosAtivos={atributosAtivos}
      vazio={{
        titulo: 'A loja está a ser preparada',
        texto: 'Ainda não há produtos publicados. Volta em breve.',
      }}
    />
  )
}
