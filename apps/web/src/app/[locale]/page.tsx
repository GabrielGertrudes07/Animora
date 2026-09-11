import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listCategories, listProducts, marcasDisponiveis } from '../../modules/catalog'
import { Link } from '../../i18n/navigation'
import { ProductCard } from '../../components/ui/ProductCard'
import { CascataProdutos } from '../../components/motion/CascataProdutos'
import { CarrosselCampanhas, type SlideCampanha } from '../../components/marketing/CarrosselCampanhas'
import { CategoriasVisuais } from '../../components/marketing/CategoriasVisuais'
import { AprovadoPorQuemManda } from '../../components/marketing/AprovadoPorQuemManda'
import { ProvaSocial } from '../../components/marketing/ProvaSocial'

type Props = { params: Promise<{ locale: string }> }

/**
 * A home.
 *
 * O ritmo é deliberado e é metade do efeito: **as secções não têm todas a
 * mesma largura**. Antes eram quatro blocos `max-w-7xl px-6 py-16` seguidos, o
 * que dá uma página sem respiração — o olho não tem onde descansar, e nada
 * parece importante porque tudo tem o mesmo tamanho.
 *
 *   herói              a sangrar
 *   categorias         largo
 *   ofertas            largo
 *   escolhas da casa   estreito  ← a secção que respira
 *   testemunhos        a sangrar, floresta
 *   marcas + rodapé    a sangrar, floresta
 *
 * O herói já não é um carrossel: recebia um slide só, e um carrossel de um
 * item não é um carrossel.
 */
export default async function Home({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, tc, todos, categorias] = await Promise.all([
    getTranslations('Home'),
    getTranslations('CarrosselCampanhas'),
    listProducts({ ordem: 'relevancia' }),
    listCategories(),
  ])

  /**
   * As quatro campanhas. A copy já estava escrita e traduzida em PT e DE — só
   * era usada em `sr-only`, por baixo de PNGs portugueses.
   *
   * `fotografia` aponta hoje para o fundo do pacote antigo nos quatro slides:
   * a arte própria de cada campanha está a ser gerada (ver o briefing na
   * secção 7 do desenho). Quando chegar, trocam-se três strings aqui e o
   * componente não muda. O slide 4 fica com esta, que é a cena dele.
   */
  const FOTOGRAFIA_PROVISORIA = '/banner/fundo.webp'
  const FOTOGRAFIA_SLIDE2 = '/campanha/slide2/fundo-camadas.webp'
  const FOTOGRAFIA_SLIDE3 = '/campanha/slide3/fundo-camadas.webp'

  const slides: SlideCampanha[] = [
    {
      id: 'slide1',
      href: '/produtos',
      hrefSecundario: '/produtos',
      eyebrow: tc('slide1Eyebrow'),
      titulo: tc('slide1Titulo'),
      texto: tc('slide1Texto'),
      ctaPrincipal: tc('slide1CtaPrincipal'),
      ctaSecundario: tc('slide1CtaSecundario'),
      alt: tc('slide1Alt'),
      fotografia: '/campanha/slide1/fundo-camadas.webp',
      pets: [
        {
          animal: '/campanha/slide1/cao-gerado.png',
          sombra: '/campanha/slide1/sombra-cao.svg',
          largura: 1230,
          altura: 1278,
          classe: 'bottom-[-7%] right-[4%] h-[82%] w-auto',
          apoio: '50% 96%',
        },
        {
          animal: '/campanha/slide1/gato-gerado.png',
          sombra: '/campanha/slide1/sombra-gato.svg',
          largura: 1145,
          altura: 1374,
          classe: 'bottom-[-5%] right-[24%] h-[55%] w-auto',
          apoio: '50% 96%',
        },
      ],
    },
    {
      id: 'slide2',
      href: '/caes',
      hrefSecundario: '/#categorias',
      eyebrow: tc('slide2Eyebrow'),
      titulo: tc('slide2Titulo'),
      texto: tc('slide2Texto'),
      ctaPrincipal: tc('slide2CtaPrincipal'),
      ctaSecundario: tc('slide2CtaSecundario'),
      alt: tc('slide2Alt'),
      fotografia: FOTOGRAFIA_SLIDE2,
      pets: [
        {
          animal: '/campanha/slide1/cao-gerado.png',
          sombra: '/campanha/slide1/sombra-cao.svg',
          largura: 1230,
          altura: 1278,
          classe: 'bottom-[-7%] right-[10%] h-[82%] w-auto',
          apoio: '50% 96%',
        },
      ],
    },
    {
      id: 'slide3',
      href: '/gatos',
      hrefSecundario: '/produtos',
      eyebrow: tc('slide3Eyebrow'),
      titulo: tc('slide3Titulo'),
      texto: tc('slide3Texto'),
      ctaPrincipal: tc('slide3CtaPrincipal'),
      ctaSecundario: tc('slide3CtaSecundario'),
      alt: tc('slide3Alt'),
      fotografia: FOTOGRAFIA_SLIDE3,
      pets: [
        {
          animal: '/campanha/slide1/gato-gerado.png',
          sombra: '/campanha/slide1/sombra-gato.svg',
          largura: 1145,
          altura: 1374,
          classe: 'bottom-[-5%] right-[12%] h-[66%] w-auto',
          apoio: '50% 96%',
        },
      ],
    },
    {
      // As três aves do pacote antigo são a cena desta campanha e só desta —
      // num slide "Para cães" ficariam a dizer outra coisa.
      id: 'slide4',
      href: '/#categorias',
      hrefSecundario: '/passaros',
      eyebrow: tc('slide4Eyebrow'),
      titulo: tc('slide4Titulo'),
      texto: tc('slide4Texto'),
      ctaPrincipal: tc('slide4CtaPrincipal'),
      ctaSecundario: tc('slide4CtaSecundario'),
      alt: tc('slide4Alt'),
      fotografia: FOTOGRAFIA_PROVISORIA,
      pets: [
        {
          animal: '/banner/ave-papagaio.webp',
          largura: 1122,
          altura: 1389,
          classe: 'bottom-[-6%] left-[2%] h-[62%] w-auto',
        },
        {
          animal: '/banner/ave-calopsita.webp',
          largura: 1073,
          altura: 1402,
          classe: 'bottom-[-5%] right-[6%] h-[58%] w-auto',
        },
        {
          animal: '/banner/ave-periquito.webp',
          largura: 980,
          altura: 1477,
          classe: 'bottom-[14%] right-[30%] h-[34%] w-auto',
        },
      ],
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
      <CarrosselCampanhas slides={slides} />

      {categorias.length > 0 ? (
        <div id="categorias">
          <CategoriasVisuais categorias={categorias} contagens={contagens} />
        </div>
      ) : null}

      {ofertas.length > 0 ? (
        <section id="ofertas" className="mx-auto max-w-7xl px-6 py-secao">
          <h2 className="text-titulo">{t('ofertasDaSemana')}</h2>
          <CascataProdutos className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ofertas.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </CascataProdutos>
        </section>
      ) : null}

      {destaques.length > 0 ? (
        <section className="border-t border-line">
          {/* A secção estreita. Os mesmos quatro produtos em duas colunas
              grandes em vez de quatro pequenas — é a pausa da página, e o
              cartão 4:5 finalmente tem tamanho para se ver. */}
          <div className="mx-auto max-w-3xl px-6 py-secao">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-titulo">{t('escolhasDaCasa')}</h2>
              <Link
                href="/produtos"
                className="text-sm font-semibold text-ink underline underline-offset-4 transition-colors hover:text-terracota-dark"
              >
                {t('verTodosOsProdutos')}
              </Link>
            </div>

            <CascataProdutos className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {destaques.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </CascataProdutos>
          </div>
        </section>
      ) : null}

      {/* A média real de avaliações vem antes da voz de marca: primeiro o
          número que a loja não inventa, depois as citações. Estava entre os
          testemunhos e as marcas, e como é a única superfície clara no meio
          de duas escuras, partia ao meio o bloco que fecha a página. */}
      <ProvaSocial />

      <AprovadoPorQuemManda />

      {/* As marcas encostam ao bloco escuro dos testemunhos e continuam nele
          até ao rodapé: no fim a página fecha numa clareira só, em vez de
          alternar escuro / tira branca / escuro. Com o fio dourado fora do
          `.chao-floresta`, já não há costura entre faixas encostadas. */}
      {marcas.length > 0 ? (
        <section className="chao-floresta px-6 pb-4 pt-14 text-center">
          <p className="mx-auto max-w-7xl text-eyebrow font-semibold uppercase text-papel/50">
            {t('marcasEmQueConfiamos')}
          </p>
          <ul className="mx-auto mt-6 flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3">
            {marcas.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/produtos?marca=${m.slug}`}
                  className="font-display text-lg font-semibold text-papel/70 transition-colors hover:text-papel"
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
