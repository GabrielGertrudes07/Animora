import { getLocale, getTranslations } from 'next-intl/server'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { listCategories, listProducts, marcasDisponiveis } from '../../modules/catalog'
import { Link, getPathname } from '../../i18n/navigation'
import { CarrinhoBotao } from './CarrinhoBotao'
import { BarraFixa } from './BarraFixa'
import { BarraMobile } from './BarraMobile'
import { MegaMenu, type PainelCategoria } from './MegaMenu'
import { SeletorIdioma } from './SeletorIdioma'
import { Logo } from './Logo'
import { Icon } from '../icons/sprite'

/** Produtos listados por categoria no mega-menu; o resto fica no "Ver todos". */
const PRODUTOS_NO_MENU = 6

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
 * Alturas compactadas (pedido do Gabriel, referência: `PromoBar`/`Header`/
 * `MainNavigation` do vivapapelcor — cabeçalho empilhado ali dá ~123px em
 * desktop): barra promocional ~28px, linha principal 60px fixos, linha de
 * categorias 36px — total ≈124px, contra os ~164px de antes.
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
 * modo, não há agrupamentos (Alimentação/Diversão/Cuidados/...): as
 * categorias reais não têm hierarquia (`parent` é sempre `null` na base
 * atual). O mega-menu de cada categoria (`MegaMenu`) mostra por isso o que
 * existe de facto nela — as marcas (atalho para o filtro `?marca=`) e os
 * primeiros produtos —, tirado da mesma `listProducts` da home, que o
 * `fetch` com `revalidate` partilha em vez de repetir.
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
  const [categorias, produtos, t, locale] = await Promise.all([
    listCategories(),
    listProducts({ ordem: 'relevancia' }),
    getTranslations('Header'),
    getLocale(),
  ])
  const acaoPesquisa = getPathname({ href: '/produtos', locale })
  const paineis: PainelCategoria[] = categorias.map((c) => {
    const daCategoria = produtos.filter((p) => p.categories.some((pc) => pc.slug === c.slug))
    return {
      slug: c.slug,
      name: c.name,
      marcas: marcasDisponiveis(daCategoria),
      produtos: daCategoria.slice(0, PRODUTOS_NO_MENU).map((p) => ({ titulo: p.title, slug: p.slug })),
      totalProdutos: daCategoria.length,
    }
  })

  const logo = <Logo />

  return (
    <>
      <header className="bg-surface">
        {/* Abertura: as três faixas descem em cascata (CSS, `entrada-cima`
            com atraso crescente), uma vez — o cabeçalho vive no layout e não
            volta a montar ao navegar. CSS e não GSAP: corre desde a primeira
            pintura, sem o piscar visível → escondido → visível de esperar
            pela hidratação. */}
        {/* Barra promocional: ~28px, orange + texto branco (contraste
            AA — ver comentário acima). Slogan e "dados protegidos" só a
            partir de `sm`, mobile fica só com o envio grátis. */}
        <div className="bg-orange px-4 py-1 motion-safe:animate-entrada-cima sm:px-6">
          <ul className="mx-auto flex min-h-[26px] max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[13px] font-medium text-white sm:min-h-[28px] sm:text-xs">
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

        {/* Header principal: 56px mobile, 60px desktop fixos (era 64/80px),
            border-b sutil, sem sombra. */}
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-4 border-b border-border px-6 py-2 motion-safe:animate-entrada-cima motion-safe:[animation-delay:90ms] sm:min-h-[60px] sm:py-0">
          {logo}

          <form
            action={acaoPesquisa}
            method="get"
            className="order-3 hidden w-full items-center gap-2 rounded-pill border border-border bg-cream px-4 py-2 transition-colors focus-within:border-orange sm:order-none sm:mx-auto sm:flex sm:max-w-lg sm:flex-1"
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
          className="hidden border-b border-border motion-safe:animate-entrada-cima motion-safe:[animation-delay:180ms] sm:block"
        >
          <MegaMenu paineis={paineis} id="mega-menu" />
        </nav>
      </header>

      <BarraFixa>
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          {logo}
          <nav aria-label={t('categoriasAria')} className="min-w-0 flex-1">
            <MegaMenu paineis={paineis} id="mega-menu-fixo" compacta />
          </nav>
          <CarrinhoBotao />
        </div>
      </BarraFixa>

      <BarraMobile categorias={categorias.map((c) => ({ slug: c.slug, name: c.name }))} />
    </>
  )
}
