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
 * A barra de aviso do topo usa `orange.DEFAULT` (`#ED6900`, amostrado do
 * banner de referência) com texto branco — ~3,17:1 de contraste, abaixo do
 * 4,5:1 ideal, aceite por pedido explícito de fidelidade visual à
 * referência (ver `tailwind.config.ts`). Em mobile mostra só a mensagem principal
 * (envio grátis) — slogan e "dados protegidos" ficam para `sm:` para cima,
 * por pedido explícito da spec de remover conteúdo secundário no telemóvel.
 *
 * Três factos, não três promessas: envio grátis (real, `ENVIO_GRATIS_ACIMA_DE`),
 * o slogan da loja (não é um facto, é só quem a loja é) e "conta e dados
 * protegidos" — a mesma frase já usada em `Beneficios.tsx`, nunca "apoio ao
 * cliente" ou coisa parecida, que a loja não tem hoje (ver o comentário do
 * `Footer.tsx` sobre não fingir páginas de apoio que não existem).
 *
 * Sem item "Ofertas" na navegação de categorias: a spec original pede-o,
 * mas não existe categoria/rota "ofertas" nos dados reais (`listCategories`,
 * via `/api/categories`) — só um filtro de produtos com desconto usado na
 * home (`page.tsx`). Inventar aqui uma categoria ou rota que não existe
 * violaria a regra de não hardcodar dado que devia vir da base. Do mesmo
 * modo, a navegação fica em lista simples, sem mega menu de agrupamentos
 * (Alimentação/Diversão/Cuidados/...): as categorias reais não têm
 * hierarquia (`parent` é sempre `null` na base atual), então qualquer
 * agrupamento visual seria inventado. Ambos ficam registados como pendência
 * de dados, não como desvio silencioso.
 *
 * O logótipo deixou de ser uma imagem (`logo-cabecalho.png`, a árvore
 * verde-salva da identidade antiga) — passa a ser texto+ícone em HTML,
 * igual ao mockup de referência: pata laranja, "animora" em `font-display`,
 * "PET SHOP" por baixo. Texto em HTML em vez de imagem é o que a própria
 * spec pede para qualquer elemento de marca — sobrevive a tradução, não
 * pesa um pedido de rede, e não fica desatualizado se a paleta mudar outra
 * vez. A pesquisa é um `<form method="get">` simples
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
      <header className="bg-surface">
        {/* Barra promocional: 34-38px, orange + texto branco (contraste
            AA — ver comentário acima). Slogan e "dados protegidos" só a
            partir de `sm`, mobile fica só com o envio grátis. */}
        <div className="bg-orange px-4 py-2 sm:px-6">
          <ul className="mx-auto flex min-h-[34px] max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[13px] font-medium text-white sm:min-h-[38px] sm:text-sm">
            <li className="flex items-center gap-1.5">
              <Icon name="cart" className="h-3.5 w-3.5 shrink-0" />
              {t('barraEnvio', { valor: formatEuros(ENVIO_GRATIS_ACIMA_DE) })}
            </li>
            <li className="hidden items-center gap-1.5 sm:flex">
              <Icon name="paw" className="h-3.5 w-3.5 shrink-0" />
              {t('slogan')}
            </li>
            <li className="hidden items-center gap-1.5 sm:flex">
              <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
              {t('barraDados')}
            </li>
          </ul>
        </div>

        {/* Header principal: 64px mobile, 80px desktop (dentro do intervalo
            76-84px pedido), border-b sutil, sem sombra. */}
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-4 border-b border-border px-6 py-3 sm:min-h-20 sm:py-4">
          <Link
            href="/"
            className="flex min-h-11 shrink-0 items-center gap-2"
            aria-label={t('logoAria')}
          >
            <Icon name="paw" className="h-7 w-7 shrink-0 text-orange" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-2xl font-bold text-teal-900">animora</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                {t('petShop')}
              </span>
            </span>
          </Link>

          <form
            action={acaoPesquisa}
            method="get"
            className="order-3 hidden w-full items-center gap-2 rounded-pill border border-border bg-cream px-4 py-2.5 transition-colors focus-within:border-orange sm:order-none sm:mx-auto sm:flex sm:max-w-lg sm:flex-1"
          >
            <Icon name="search" className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              type="search"
              name="q"
              placeholder={t('pesquisarPlaceholder')}
              aria-label={t('pesquisarAria')}
              className="w-full min-w-0 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <SeletorIdioma />
            <Link
              href="/conta"
              className="hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text sm:flex"
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
          className="hidden border-b border-border sm:block"
        >
          <ul className="mx-auto flex min-h-[42px] max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-6 text-sm font-medium sm:min-h-[46px]">
            {/* Primeiro item, sempre: a loja inteira. Sem ele só se chegava a
              produtos escolhendo primeiro uma categoria. */}
            <li className="shrink-0">
              <Link
                href="/produtos"
                className="block rounded-sm px-3 py-1.5 text-text transition-colors hover:bg-cream"
              >
                {t('todosOsProdutos')}
              </Link>
            </li>
            {categorias.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={`/${c.slug}`}
                  className="block rounded-sm px-3 py-1.5 text-text-muted transition-colors hover:bg-cream hover:text-text"
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
