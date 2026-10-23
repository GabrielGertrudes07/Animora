import { getLocale, getTranslations } from 'next-intl/server'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { listCategories, listProducts, marcasDisponiveis } from '../../modules/catalog'
import { Link, getPathname } from '../../i18n/navigation'
import { CarrinhoBotao } from './CarrinhoBotao'
import { CabecalhoIlha } from './CabecalhoIlha'
import { PesquisaIlha } from './PesquisaIlha'
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
 * Desenho em "ilha" (pedido do Gabriel: "algo mais moderno"): barra
 * promocional fina e, por baixo, uma cápsula flutuante numa linha só, que
 * acompanha o scroll e encolhe (`CabecalhoIlha`). Substitui o cabeçalho
 * empilhado em duas linhas e a barra fixa separada que aparecia ao rolar.
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

  return (
    <>
      {/* Barra promocional: orange + texto branco (contraste aceite — ver
          comentário acima). Slogan e "dados protegidos" só a partir de `sm`,
          mobile fica só com o envio grátis. Rola com a página; quem fica
          preso ao topo é só a cápsula. */}
      <div className="bg-orange px-4 py-1 motion-safe:animate-entrada-cima sm:px-6">
        <div className="relative mx-auto max-w-7xl">
          <ul className="flex min-h-[26px] flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[13px] font-medium text-white sm:min-h-[28px] sm:px-16 sm:text-xs">
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
          {/* Idioma no desktop: aqui, para a cápsula ter espaço para todas as
              categorias. Em mobile fica na cápsula. */}
          <div className="absolute inset-y-0 right-0 hidden items-center sm:flex">
            <SeletorIdioma claro />
          </div>
        </div>
      </div>

      {/* Cápsula flutuante numa linha só: logo, categorias, ações. A
          pesquisa abre por cima dela (`PesquisaIlha`). Em mobile as
          categorias, a conta e o carrinho vivem na `BarraMobile`. */}
      <CabecalhoIlha>
        <Logo />
        <nav aria-label={t('categoriasAria')} className="hidden min-w-0 flex-1 sm:block">
          <MegaMenu paineis={paineis} id="mega-menu" compacta />
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          <span className="sm:hidden">
            <SeletorIdioma />
          </span>
          <PesquisaIlha acao={acaoPesquisa} />
          <Link
            href="/conta"
            aria-label={t('conta')}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors hover:bg-cream hover:text-orange sm:flex"
          >
            <Icon name="usuario" className="h-5 w-5" />
          </Link>
          <span className="hidden sm:block">
            <CarrinhoBotao />
          </span>
        </div>
      </CabecalhoIlha>

      <BarraMobile categorias={categorias.map((c) => ({ slug: c.slug, name: c.name }))} />
    </>
  )
}
