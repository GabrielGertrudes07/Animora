import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { listCategories } from '../../modules/catalog'
import { Link, getPathname } from '../../i18n/navigation'
import { CarrinhoBotao } from './CarrinhoBotao'
import { BarraMobile } from './BarraMobile'
import { SeletorIdioma } from './SeletorIdioma'
import { Icon } from '../icons/sprite'

/**
 * Cabeçalho presente em todas as páginas.
 *
 * As categorias vêm da base de dados (`listCategories`) — nunca escritas à
 * mão aqui. Em ecrãs estreitos, a lista de categorias ganha scroll horizontal
 * próprio (`overflow-x-auto`) em vez de espremer a página inteira: a página
 * nunca ganha scroll horizontal, só esta barra.
 *
 * A barra de aviso do topo era a terceira faixa escura da página — floresta
 * com um nascer do sol em gradiente radial e um fio dourado a fechar em baixo.
 * Somada ao balcão e à fiada de categorias, dava cento e sessenta píxeis de
 * cromo antes de qualquer conteúdo. Agora é uma linha em papel: diz o que tem
 * a dizer e não disputa a atenção do herói.
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
  const [categorias, t, locale] = await Promise.all([
    listCategories(),
    getTranslations('Header'),
    getLocale(),
  ])
  const acaoPesquisa = getPathname({ href: '/produtos', locale })

  return (
    <>
      <header className="border-b border-line bg-white">
        <p className="border-b border-line bg-papel px-4 py-1.5 text-center text-xs font-medium text-ink-muted sm:px-6">
          {t('envioGratis', { valor: formatEuros(ENVIO_GRATIS_ACIMA_DE) })}
        </p>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex min-h-11 shrink-0 flex-col justify-center"
            aria-label={t('logoAria')}
          >
            <Image
              src="/logo-cabecalho.png"
              alt="Animora"
              width={771}
              height={160}
              className="h-9 w-auto sm:h-11"
              priority
            />
            <span className="mt-0.5 hidden pl-1 text-xs font-medium text-ink-muted lg:block">
              {t('slogan')}
            </span>
          </Link>

          <form
            action={acaoPesquisa}
            method="get"
            className="order-3 hidden w-full items-center gap-2 sm:flex rounded-full border border-line bg-papel/60 px-4 py-2.5 transition-colors focus-within:border-terracota sm:order-none sm:mx-auto sm:max-w-lg sm:flex-1"
          >
            <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              type="search"
              name="q"
              placeholder={t('pesquisarPlaceholder')}
              aria-label={t('pesquisarAria')}
              className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <SeletorIdioma />
            <Link
              href="/conta"
              className="hidden items-center gap-2 rounded-campo px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:flex"
            >
              <Icon name="paw" className="h-5 w-5" />
              <span className="hidden sm:inline">{t('conta')}</span>
            </Link>
            <span className="hidden sm:block">
              <CarrinhoBotao />
            </span>
          </div>
        </div>

        <nav
          aria-label={t('categoriasAria')}
          className="hidden border-t border-line sm:block"
        >
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto whitespace-nowrap px-6 py-2 text-sm">
            {/* Primeiro item, sempre: a loja inteira. Sem ele só se chegava a
              produtos escolhendo primeiro uma categoria. */}
            <li className="shrink-0">
              <Link
                href="/produtos"
                className="block rounded-campo px-3 py-1.5 font-medium text-ink transition-colors hover:bg-papel"
              >
                {t('todosOsProdutos')}
              </Link>
            </li>
            {categorias.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={`/${c.slug}`}
                  className="block rounded-campo px-3 py-1.5 text-ink-muted transition-colors hover:bg-papel hover:text-ink"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <BarraMobile categorias={categorias.map((c) => ({ slug: c.slug, name: c.name }))} />
    </>
  )
}
