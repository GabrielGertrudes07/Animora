import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listCategories, listProducts, marcasDisponiveis } from '../../../modules/catalog'
import { Link } from '../../../i18n/navigation'
import { ProductCard } from '../../../components/ui/ProductCard'
import { CascataProdutos } from '../../../components/motion/CascataProdutos'
import { Hero } from '../../../components/marketing/Hero'
import { EscolhaSeuAnimal, ComprarPorNecessidade } from '../../../components/marketing/CategoriasVisuais'
import { SecaoCampanha } from '../../../components/marketing/SecaoCampanha'
import { DestaquesPorCategoria } from '../../../components/marketing/DestaquesPorCategoria'
import { AprovadoPorQuemManda } from '../../../components/marketing/AprovadoPorQuemManda'
import { Beneficios } from '../../../components/marketing/Beneficios'
import { JsonLd } from '../../../components/seo/JsonLd'
import { SITE_URL } from '../../../lib/seo'

type Props = { params: Promise<{ locale: string }> }

/**
 * A home estrutural (spec `docs/superpowers/plans/2026-09-11-animora-structural-v1-execucao.md`,
 * Fase 4). Ordem fixa: herói, escolha o teu animal, compra por necessidade,
 * mais vendidos, campanha, ofertas da semana, destaques por categoria,
 * segunda campanha/editorial, aprovado por quem manda, marcas, benefícios —
 * o cabeçalho e o rodapé vivem no `layout.tsx`, fora desta página.
 *
 * O carrossel de campanhas anterior (`CarrosselCampanhas`, `ProvaSocial`
 * como secção à parte, "escolhas da casa") saiu da composição — não foi
 * apagado, só parou de ser importado aqui. Ver `docs/CURRENT_STATE.md` §Fase 4.
 */
export default async function Home({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, todos, categorias] = await Promise.all([
    getTranslations('Home'),
    listProducts({ ordem: 'relevancia' }),
    listCategories(),
  ])

  const ofertas = todos
    .filter((p) => p.variants.some((v) => v.oldPriceCents && v.oldPriceCents > v.priceCents))
    .slice(0, 4)

  /**
   * "Em destaque" — chamava-se "Mais vendidos", renomeado porque não é (e
   * nunca foi) uma classificação por vendas: produtos reais, sem repetir os
   * das Ofertas, mas escolhidos aqui, não ordenados por unidades vendidas.
   *
   * A loja regista vendas reais (`orders.linhas.variante` referencia a
   * variante), mas essa agregação hoje só existe no lado admin
   * (`packages/core/relatorios`) e a coleção `orders` não tem leitura
   * pública — expor uma agregação real ao storefront pede um novo endpoint
   * na API. Pendência registada para uma fase futura, não recalculada aqui
   * no frontend nem inventada no seeder.
   */
  const emDestaque = todos.filter((p) => !ofertas.some((o) => o.id === p.id)).slice(0, 4)

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
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'Organization', name: 'Animora', url: SITE_URL },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Animora',
            url: SITE_URL,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${SITE_URL}/produtos?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />
      <Hero />

      <EscolhaSeuAnimal categorias={categorias} contagens={contagens} />
      <ComprarPorNecessidade categorias={categorias} />

      {emDestaque.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
          <h2 className="text-titulo text-ink">{t('emDestaque')}</h2>
          <CascataProdutos className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {emDestaque.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </CascataProdutos>
        </section>
      ) : null}

      <SecaoCampanha
        tipo="campaign"
        titulo={t('campanha1Titulo')}
        texto={t('campanha1Texto')}
        ctaTexto={t('campanha1Cta')}
        ctaHref="/produtos"
      />

      {ofertas.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
          <h2 className="text-titulo text-ink">{t('ofertasDaSemana')}</h2>
          <CascataProdutos className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {ofertas.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </CascataProdutos>
        </section>
      ) : null}

      <DestaquesPorCategoria categorias={categorias} />

      <SecaoCampanha
        tipo="editorial"
        titulo={t('campanha2Titulo')}
        texto={t('campanha2Texto')}
        ctaTexto={t('campanha2Cta')}
        ctaHref="/produtos"
        inverter
      />

      <AprovadoPorQuemManda />

      {marcas.length > 0 ? (
        <section className="border-t border-line px-4 py-secao text-center sm:px-6">
          <p className="mx-auto max-w-7xl text-eyebrow font-semibold uppercase text-ink-muted/70">
            {t('marcasEmQueConfiamos')}
          </p>
          <ul className="mx-auto mt-6 flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3">
            {marcas.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/produtos?marca=${m.slug}`}
                  className="font-display text-lg font-semibold text-ink-muted transition-colors hover:text-ink"
                >
                  {m.nome}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Beneficios />
    </main>
  )
}
