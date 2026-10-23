import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getAvaliacoesEmLote, listCategories, listProducts, marcasDisponiveis } from '../../../modules/catalog'
import type { ResumoAvaliacoes } from '@animora/core'
import { Link } from '../../../i18n/navigation'
import { ProductCard } from '../../../components/ui/ProductCard'
import { CascataProdutos } from '../../../components/motion/CascataProdutos'
import { Hero } from '../../../components/marketing/Hero'
import { EscolhaSeuAnimal } from '../../../components/marketing/CategoriasVisuais'
import { SecaoCampanha } from '../../../components/marketing/SecaoCampanha'
import { DestaquesPorCategoria } from '../../../components/marketing/DestaquesPorCategoria'
import { AprovadoPorQuemManda } from '../../../components/marketing/AprovadoPorQuemManda'
import { Beneficios } from '../../../components/marketing/Beneficios'
import { ProductTabs } from '../../../components/home/ProductTabs'
import { Marcas } from '../../../components/marketing/Marcas'
import { JsonLd } from '../../../components/seo/JsonLd'
import { SITE_URL } from '../../../lib/seo'

type Props = { params: Promise<{ locale: string }> }

/**
 * A home estrutural (spec `docs/superpowers/plans/2026-09-11-animora-structural-v1-execucao.md`,
 * Fase 4). Ordem fixa: herói, escolha o teu animal, compra por necessidade,
 * produtos (em destaque/ofertas/novidades, em abas), campanha, destaques por
 * categoria, segunda campanha/editorial, aprovado por quem manda, marcas,
 * benefícios — o cabeçalho e o rodapé vivem no `layout.tsx`, fora desta página.
 *
 * `ProvaSocial` como secção à parte e "escolhas da casa" continuam fora da
 * composição — não foram apagados, só pararam de ser importados aqui. Ver
 * `docs/CURRENT_STATE.md` §Fase 4.
 *
 * O herói é agora o banner de campanha "Semana Animora" (`Hero`), no lugar do
 * `CarrosselCampanhas` (cão dourado / sala de estar) — este último continua a
 * existir para os outros slides já escritos, só parou de ser importado aqui.
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

  // "Novidades" — os 4 produtos mais recentes do catálogo, sem excluir os
  // que já apareçam em destaque/ofertas (cada aba é independente).
  const novidades = [...todos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)

  // Uma leitura em lote para os três grupos de cartões desta página — não
  // uma por cartão (era N+1: leituras de avaliação por carga da home).
  const avaliacoes = await getAvaliacoesEmLote([...emDestaque, ...ofertas, ...novidades].map((p) => p.id))
  const SEM_AVALIACAO: ResumoAvaliacoes = { media: null, total: 0 }

  const marcas = marcasDisponiveis(todos)

  // Contagem por categoria a partir do catálogo já carregado — `listCategories`
  // não traz contagem nenhuma, e pedi-la à parte seria uma segunda leitura só
  // para um número que já se pode tirar daqui.
  const contagens: Record<string, number> = {}
  for (const p of todos) {
    for (const c of p.categories) contagens[c.slug] = (contagens[c.slug] ?? 0) + 1
  }

  const grade = (produtos: typeof todos) => (
    <CascataProdutos className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {produtos.map((p) => (
        <ProductCard key={p.id} product={p} avaliacao={avaliacoes.get(p.id) ?? SEM_AVALIACAO} />
      ))}
    </CascataProdutos>
  )

  // Só entram no seletor de abas os grupos com produtos — um grupo vazio
  // seria uma aba sem nada lá dentro.
  const gruposProdutos = [
    emDestaque.length > 0 ? { chave: 'destaque', titulo: t('emDestaque'), produtos: grade(emDestaque) } : null,
    ofertas.length > 0 ? { chave: 'ofertas', titulo: t('ofertasDaSemana'), produtos: grade(ofertas) } : null,
    novidades.length > 0 ? { chave: 'novidades', titulo: t('novidades'), produtos: grade(novidades) } : null,
  ].filter((g): g is NonNullable<typeof g> => g !== null)

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

      {gruposProdutos.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
          <ProductTabs grupos={gruposProdutos} />
          <div className="mt-8 text-center">
            <Link
              href="/produtos"
              className="text-sm font-semibold text-text underline underline-offset-4 transition-colors hover:text-teal-900"
            >
              {t('verTodosOsProdutos')}
            </Link>
          </div>
        </section>
      ) : null}

      <SecaoCampanha
        tipo="campaign"
        imagemAlt={t('campanha1ImagemAlt')}
        titulo={t('campanha1Titulo')}
        texto={t('campanha1Texto')}
        ctaTexto={t('campanha1Cta')}
        ctaHref="/produtos"
      />

      <DestaquesPorCategoria categorias={categorias} />

      <SecaoCampanha
        tipo="editorial"
        imagemAlt={t('campanha2ImagemAlt')}
        titulo={t('campanha2Titulo')}
        texto={t('campanha2Texto')}
        ctaTexto={t('campanha2Cta')}
        ctaHref="/produtos"
        inverter
      />

      <AprovadoPorQuemManda />

      <Marcas marcas={marcas} />

      <Beneficios />
    </main>
  )
}
