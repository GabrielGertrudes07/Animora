import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { listCategories, listProducts, marcasDisponiveis } from '../../modules/catalog'
import { Link } from '../../i18n/navigation'
import { ProductCard } from '../../components/ui/ProductCard'
import { Reveal } from '../../components/motion/Reveal'
import { CascataProdutos } from '../../components/motion/CascataProdutos'
import { Carrossel, type SlideCarrossel } from '../../components/marketing/Carrossel'
import { CategoriasVisuais } from '../../components/marketing/CategoriasVisuais'
import { AprovadoPorQuemManda } from '../../components/marketing/AprovadoPorQuemManda'
import { ProvaSocial } from '../../components/marketing/ProvaSocial'
import { FOTOS_MARKETING } from '../../lib/fotosMarketing'

type Props = { params: Promise<{ locale: string }> }

/**
 * Os slides são conteúdo editorial (título, cor, foto), não uma coleção nova
 * na API — três banners fixos não justificam um sistema de gestão de
 * promoções. Os CTA apontam só para rotas que já existem: `#ofertas` e
 * `#categorias` são âncoras nesta própria página, não uma promessa de rota
 * nova. Montados aqui (não a nível de módulo, como antes) porque precisam de
 * `t`, que só existe depois de `getTranslations`.
 */
export default async function Home({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, todos, categorias] = await Promise.all([
    getTranslations('Home'),
    listProducts({ ordem: 'relevancia' }),
    listCategories(),
  ])

  const slides: SlideCarrossel[] = [
    {
      cor: 'terracota',
      rotulo: t('slide1Rotulo'),
      titulo: t('slide1Titulo'),
      texto: t('slide1Texto'),
      ctaPrincipal: { texto: t('slide1CtaPrincipal'), href: '#ofertas' },
      ctaSecundario: { texto: t('slide1CtaSecundario'), href: '/produtos' },
      imagem: { src: FOTOS_MARKETING.bulldogCamisola, alt: t('slide1Alt') },
      selo: t('slide1Selo'),
    },
    {
      cor: 'ink',
      rotulo: t('slide2Rotulo'),
      titulo: t('slide2Titulo'),
      texto: t('slide2Texto'),
      ctaPrincipal: { texto: t('slide2CtaPrincipal'), href: '/gatos' },
      ctaSecundario: { texto: t('slide2CtaSecundario'), href: '#categorias' },
      imagem: { src: FOTOS_MARKETING.gatinhoAEsticar, alt: t('slide2Alt') },
    },
    {
      cor: 'sage-dark',
      rotulo: t('slide3Rotulo'),
      titulo: t('slide3Titulo'),
      texto: t('slide3Texto', { valor: formatEuros(ENVIO_GRATIS_ACIMA_DE) }),
      ctaPrincipal: { texto: t('slide3CtaPrincipal'), href: '/produtos' },
      imagem: { src: FOTOS_MARKETING.cachorroRetriever, alt: t('slide3Alt') },
    },
  ]

  const ofertas = todos
    .filter((p) => p.variants.some((v) => v.oldPriceCents && v.oldPriceCents > v.priceCents))
    .slice(0, 4)
  const destaques = todos.slice(0, 4)
  const marcas = marcasDisponiveis(todos)

  // Contagem por categoria a partir do catálogo já carregado — `listCategories`
  // não traz contagem nenhuma, e pedi-la à parte seria uma segunda leitura só
  // para um número que já se pode tirar daqui.
  const contagens: Record<string, number> = {}
  for (const p of todos) {
    for (const c of p.categories) contagens[c.slug] = (contagens[c.slug] ?? 0) + 1
  }

  return (
    <main id="conteudo">
      <Carrossel slides={slides} />

      {categorias.length > 0 ? (
        <div id="categorias">
          <CategoriasVisuais categorias={categorias} contagens={contagens} />
        </div>
      ) : null}

      {ofertas.length > 0 ? (
        <section id="ofertas" className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracota">
                {t('esteSemana')}
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl">{t('ofertasDaSemana')}</h2>
            </div>
          </Reveal>
          <CascataProdutos className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ofertas.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </CascataProdutos>
        </section>
      ) : null}

      {destaques.length > 0 ? (
        <section className="border-t border-line">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl">{t('escolhasDaCasa')}</h2>
              </div>
              <Link
                href="/produtos"
                className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-terracota-dark"
              >
                {t('verTodosOsProdutos')}
              </Link>
            </Reveal>

            <CascataProdutos className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {destaques.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </CascataProdutos>
          </div>
        </section>
      ) : null}

      <AprovadoPorQuemManda />
      <ProvaSocial />

      {marcas.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-14 text-center">
          <p className="text-sm font-semibold text-ink-muted">{t('marcasEmQueConfiamos')}</p>
          <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {marcas.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/produtos?marca=${m.slug}`}
                  className="font-display text-lg font-semibold text-ink-muted/80 transition-colors hover:text-terracota"
                >
                  {m.nome}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
