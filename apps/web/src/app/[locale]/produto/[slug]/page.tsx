import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getProductBySlug,
  listAllSlugs,
  precoDeMostra,
  getAvaliacaoProduto,
  pesquisarProdutos,
} from '../../../../modules/catalog'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { mediaUrl } from '../../../../lib/api'
import { descriptionToHtml } from '../../../../lib/richtext'
import { Link } from '../../../../i18n/navigation'
import { Price } from '../../../../components/ui/Price'
import { Estrelas } from '../../../../components/ui/Estrelas'
import { BotaoFavorito } from '../../../../components/ui/BotaoFavorito'
import { ProductCard } from '../../../../components/ui/ProductCard'
import { Icon } from '../../../../components/icons/sprite'
import { Entrada } from '../../../../components/motion/Entrada'
import { CascataProdutos } from '../../../../components/motion/CascataProdutos'
import { GaleriaProduto } from '../../../../components/produto/GaleriaProduto'
import { AreaCompra } from '../../../../components/produto/AreaCompra'
import { JsonLd } from '../../../../components/seo/JsonLd'
import { absoluteUrl, alternatesFor, centsToDecimalString } from '../../../../lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const p = await getProductBySlug(slug)
  const t = await getTranslations({ locale, namespace: 'ProdutoPage' })
  if (!p) return { title: t('metaTituloIndisponivel') }

  // `shareImage` primeiro: é uma imagem carregada de propósito para partilha
  // (1200×630 e afins). Sem ela, sai a fotografia quadrada do catálogo, que é
  // o que estava a acontecer — o campo existia no Payload e nunca era lido.
  // A ficha em si continua a mostrar a `primaryImage`, que é a fotografia do
  // catálogo. Isto é só o Open Graph.
  const img = p.shareImage ?? p.primaryImage ?? p.gallery[0]?.image ?? null

  return {
    // `metaTitle` já vem com o sufixo "| Animora" preenchido no painel — usar
    // `absolute` sai do `template` do layout, que senão acrescentava "· Animora"
    // outra vez. Sem `metaTitle`, o título é só o produto e o template aplica-se
    // normalmente, como nas outras páginas.
    title: p.metaTitle ? { absolute: p.metaTitle } : p.title,
    description: p.metaDescription ?? t('metaDescricao', { titulo: p.title, marca: p.brand.name }),
    alternates: alternatesFor(`/produto/${slug}`, locale),
    openGraph: {
      title: p.metaTitle ?? p.title,
      description: p.metaDescription ?? p.title,
      images: img ? [{ url: mediaUrl(img.url), alt: img.alt }] : [],
    },
  }
}

export default async function ProdutoPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [p, t, tPreco] = await Promise.all([
    getProductBySlug(slug),
    getTranslations('ProdutoPage'),
    getTranslations('Price'),
  ])
  if (!p) notFound()

  const preco = precoDeMostra(p.variants)
  const desconto =
    preco.old && preco.old > preco.cents
      ? Math.round(((preco.old - preco.cents) / preco.old) * 100)
      : null
  const descricaoHtml = descriptionToHtml(p.description)
  const categoriaPrincipal = p.categories[0] ?? null
  // O CTA fixo mostra o mesmo prefixo "desde" que o preço principal quando
  // as variantes têm preços diferentes — sem isto, o CTA fixo mostrava um
  // preço sem qualificador nenhum, como se fosse o único da ficha.
  const precoLabelCta = preco.desde
    ? `${tPreco('desde')} ${formatEuros(preco.cents)}`
    : formatEuros(preco.cents)

  const [avaliacao, recomendados] = await Promise.all([
    getAvaliacaoProduto(p.id),
    categoriaPrincipal
      ? pesquisarProdutos('', { ordem: 'relevancia' }, categoriaPrincipal.id)
      : Promise.resolve([]),
  ])
  const recomendadosReais = recomendados.filter((r) => r.id !== p.id).slice(0, 4)

  // `primaryImage` e o (único, hoje) item de `gallery` apontam sempre para a
  // mesma fotografia nos dados semeados — deduplicado por `url` para a
  // galeria nunca mostrar a mesma imagem duas vezes como se fossem outra.
  const imagensBrutas = [p.primaryImage, ...p.gallery.map((g) => g.image)].filter(
    (img): img is NonNullable<typeof img> => img !== null && img !== undefined,
  )
  const imagens = Array.from(new Map(imagensBrutas.map((img) => [img.url, img])).values())

  const disponivel = p.variants.some((v) => v.stock > 0)
  const produtoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    ...(imagens[0] ? { image: [mediaUrl(imagens[0].url)] } : {}),
    description: p.metaDescription ?? t('metaDescricao', { titulo: p.title, marca: p.brand.name }),
    brand: { '@type': 'Brand', name: p.brand.name },
    // Um `sku` só faz sentido quando há uma variante só — com várias, cada
    // uma tem o seu, e não há um "sku do produto" para escrever aqui.
    ...(p.variants.length === 1 ? { sku: p.variants[0]!.sku } : {}),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/produto/${slug}`, locale),
      priceCurrency: 'EUR',
      price: centsToDecimalString(preco.cents),
      availability: disponivel ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    // Sem avaliação real (0 aprovadas hoje), nada aqui — um `aggregateRating`
    // sem avaliações por trás é exatamente a "nota inventada" que a doutrina
    // do módulo de avaliações proíbe.
    ...(avaliacao.media !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (avaliacao.media / 10).toFixed(1),
            reviewCount: avaliacao.total,
          },
        }
      : {}),
  }

  const migalhasJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: t('inicio'), url: absoluteUrl('/', locale) },
      ...(categoriaPrincipal
        ? [{ name: categoriaPrincipal.name, url: absoluteUrl(`/${categoriaPrincipal.slug}`, locale) }]
        : []),
      { name: p.title, url: absoluteUrl(`/produto/${slug}`, locale) },
    ].map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })),
  }

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <JsonLd data={produtoJsonLd} />
      <JsonLd data={migalhasJsonLd} />
      <nav aria-label={t('breadcrumbAria')} className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink hover:underline">
              {t('inicio')}
            </Link>
          </li>
          {categoriaPrincipal ? (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <Link href={`/${categoriaPrincipal.slug}`} className="hover:text-ink hover:underline">
                {categoriaPrincipal.name}
              </Link>
            </li>
          ) : null}
          <li className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="line-clamp-1 font-medium text-ink">
              {p.title}
            </span>
          </li>
        </ol>
      </nav>

      <Entrada className="mt-4 grid gap-10 md:grid-cols-2">
        <GaleriaProduto imagens={imagens} tituloProduto={p.title} />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">
            {p.brand.name}
          </p>
          <h1 className="mt-2 text-balance text-4xl leading-tight text-ink">{p.title}</h1>
          <Estrelas resumo={avaliacao} className="mt-3" />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Price cents={preco.cents} old={preco.old} desde={preco.desde} />
            {desconto ? (
              <span className="rounded-full bg-floresta px-3 py-1 text-xs font-bold tabular-nums text-papel">
                -{desconto}%
              </span>
            ) : null}
          </div>

          {/* Só ids e valores simples atravessam para o cliente. */}
          <AreaCompra
            variantes={p.variants.map((v) => ({
              id: v.id,
              combination: v.combination,
              precoLabel: preco.desde ? formatEuros(v.priceCents) : null,
              stock: v.stock,
            }))}
            tituloProduto={p.title}
            precoLabelCta={precoLabelCta}
          />

          <div className="mt-8">
            <BotaoFavorito productId={p.id} />
          </div>

          <p className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
            <Icon name="shield" className="h-4 w-4" />
            {t('envioGratis', { valor: formatEuros(ENVIO_GRATIS_ACIMA_DE) })}
          </p>
        </div>
      </Entrada>

      {descricaoHtml ? (
        <section className="mt-12 max-w-3xl border-t border-line pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('descricao')}
          </h2>
          <div
            className="mt-3 space-y-4 text-ink [&_a]:text-terracota [&_a]:underline [&_a]:decoration-terracota/40 [&_a:hover]:decoration-terracota [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: descricaoHtml }}
          />
        </section>
      ) : null}

      {recomendadosReais.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-titulo text-ink">{t('recomendacoesTitulo')}</h2>
          <CascataProdutos className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {recomendadosReais.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </CascataProdutos>
        </section>
      ) : null}
    </main>
  )
}
