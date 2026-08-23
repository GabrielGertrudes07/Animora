import Link from 'next/link'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { listCategories, listProducts, marcasDisponiveis } from '../modules/catalog'
import { ProductCard } from '../components/ui/ProductCard'
import { Reveal } from '../components/motion/Reveal'
import { CascataProdutos } from '../components/motion/CascataProdutos'
import { Carrossel, type SlideCarrossel } from '../components/marketing/Carrossel'
import { CategoriasVisuais } from '../components/marketing/CategoriasVisuais'
import { AprovadoPorQuemManda } from '../components/marketing/AprovadoPorQuemManda'
import { ProvaSocial } from '../components/marketing/ProvaSocial'
import { FOTOS_MARKETING } from '../lib/fotosMarketing'

/**
 * Os slides são conteúdo editorial (título, cor, foto), não uma coleção nova
 * na API — três banners fixos não justificam um sistema de gestão de
 * promoções. Os CTA apontam só para rotas que já existem: `#ofertas` e
 * `#categorias` são âncoras nesta própria página, não uma promessa de rota
 * nova.
 */
const SLIDES: SlideCarrossel[] = [
  {
    cor: 'terracota',
    rotulo: '🐾 Semana de saldo',
    titulo: 'O teu cão não sabe que isto está em saldo.',
    texto: 'Tu sabes. Descontos em ração, camas e acessórios, enquanto durar o stock.',
    ctaPrincipal: { texto: 'Ver ofertas', href: '#ofertas' },
    ctaSecundario: { texto: 'Explorar loja', href: '/produtos' },
    imagem: {
      src: FOTOS_MARKETING.bulldogCamisola,
      alt: 'Bulldog francês com camisola amarela, sobre fundo azul',
    },
    selo: 'Saldo',
  },
  {
    cor: 'ink',
    rotulo: '🐱 Para os felinos',
    titulo: 'O teu gato escolhe. Tu só precisas de comprar.',
    texto: 'Areia, arranhadores e ração das marcas que sobrevivem ao teste do faro felino.',
    ctaPrincipal: { texto: 'Ver produtos para gatos', href: '/gatos' },
    ctaSecundario: { texto: 'Ver todas as categorias', href: '#categorias' },
    imagem: {
      src: FOTOS_MARKETING.gatinhoAEsticar,
      alt: 'Gatinho a esticar a pata para cima, sobre fundo verde-água',
    },
  },
  {
    cor: 'sage-dark',
    rotulo: '🚚 Sem letras pequenas',
    titulo: 'Chega mais rápido do que ele foge do banho.',
    texto: `Envio grátis acima de ${formatEuros(ENVIO_GRATIS_ACIMA_DE)}. Sempre, não só em promoção.`,
    ctaPrincipal: { texto: 'Explorar loja', href: '/produtos' },
    imagem: {
      src: FOTOS_MARKETING.cachorroRetriever,
      alt: 'Cachorro golden retriever com coleira, sentado num quintal ao sol',
    },
  },
]

export default async function Home() {
  const [todos, categorias] = await Promise.all([
    listProducts({ ordem: 'relevancia' }),
    listCategories(),
  ])

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
      <Carrossel slides={SLIDES} />

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
                Esta semana
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Ofertas desta semana</h2>
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
                <h2 className="text-3xl sm:text-4xl">Escolhas da casa</h2>
              </div>
              <Link
                href="/produtos"
                className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-terracota-dark"
              >
                Ver todos os produtos
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
          <p className="text-sm font-semibold text-ink-muted">Marcas em que confiamos</p>
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
