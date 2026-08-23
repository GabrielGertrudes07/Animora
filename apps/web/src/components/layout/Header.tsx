import Image from 'next/image'
import Link from 'next/link'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { listCategories } from '../../modules/catalog'
import { CarrinhoBotao } from './CarrinhoBotao'
import { Icon } from '../icons/sprite'

/**
 * Cabeçalho presente em todas as páginas.
 *
 * As categorias vêm da base de dados (`listCategories`) — nunca escritas à
 * mão aqui. Em ecrãs estreitos, a lista de categorias ganha scroll horizontal
 * próprio (`overflow-x-auto`) em vez de espremer a página inteira: a página
 * nunca ganha scroll horizontal, só esta barra.
 *
 * `logo-cabecalho.png` é o `logo.png` original sem a legenda alemã
 * ("Haustierbedarf") que vinha por baixo do nome — um resto de um genérico
 * qualquer, nunca traduzido. A pesquisa é um `<form method="get">` simples
 * para `/produtos`: `lerFiltros` já lê `?q=` (ver `modules/catalog/pesquisa`),
 * só faltava um sítio na interface para lá chegar sem escrever o URL à mão.
 *
 * O carrinho deixou de ser um botão desativado com "em breve": é um link com o
 * número de artigos. É a única parte interativa daqui, e por isso a única que é
 * um Client Component — o resto continua a ser lido no servidor.
 */
export async function Header() {
  const categorias = await listCategories()

  return (
    <header className="border-b border-line bg-white">
      <p className="bg-ink px-6 py-2 text-center text-xs font-semibold text-cream sm:text-sm">
        Envio grátis acima de {formatEuros(ENVIO_GRATIS_ACIMA_DE)}. Sempre, não só em promoção.
      </p>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
        <Link href="/" className="flex shrink-0 flex-col" aria-label="Animora — página inicial">
          <Image
            src="/logo-cabecalho.png"
            alt="Animora"
            width={771}
            height={160}
            className="h-11 w-auto"
            priority
          />
          <span className="mt-0.5 hidden pl-1 text-xs font-medium text-ink-muted lg:block">
            cuidados a sério, sem ser sério demais
          </span>
        </Link>

        <form
          action="/produtos"
          method="get"
          className="order-3 flex w-full items-center gap-2 rounded-full border border-line bg-cream/60 px-4 py-2 transition-colors focus-within:border-terracota sm:order-none sm:ml-auto sm:w-auto sm:max-w-sm sm:flex-1"
        >
          <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
          <input
            type="search"
            name="q"
            placeholder="O que o teu animal precisa hoje?"
            aria-label="Pesquisar produtos"
            className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
          <Link
            href="/conta"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <Icon name="paw" className="h-5 w-5" />
            <span className="hidden sm:inline">Conta</span>
          </Link>
          <CarrinhoBotao />
        </div>
      </div>

      <nav aria-label="Categorias" className="border-t border-line">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto whitespace-nowrap px-6 py-2 text-sm">
          {/* Primeiro item, sempre: a loja inteira. Sem ele só se chegava a
              produtos escolhendo primeiro uma categoria. */}
          <li className="shrink-0">
            <Link
              href="/produtos"
              className="block rounded-lg px-3 py-1.5 font-medium text-ink transition-colors hover:bg-cream"
            >
              Todos os produtos
            </Link>
          </li>
          {categorias.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/${c.slug}`}
                className="block rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-cream hover:text-ink"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
