import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getProductBySlug, listAllSlugs, precoDeMostra } from '../../../../modules/catalog'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { mediaUrl } from '../../../../lib/api'
import { descriptionToHtml } from '../../../../lib/richtext'
import { Price } from '../../../../components/ui/Price'
import { AdicionarAoCarrinho } from '../../../../components/ui/AdicionarAoCarrinho'
import { BotaoFavorito } from '../../../../components/ui/BotaoFavorito'
import { Icon } from '../../../../components/icons/sprite'
import { Entrada } from '../../../../components/motion/Entrada'
import { Reveal } from '../../../../components/motion/Reveal'

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
  // A ficha em si continua a mostrar a `primaryImage`; isto é só o Open Graph.
  const img = p.shareImage ?? p.primaryImage ?? p.gallery[0]?.image ?? null

  return {
    // `metaTitle` já vem com o sufixo "| Animora" preenchido no painel — usar
    // `absolute` sai do `template` do layout, que senão acrescentava "· Animora"
    // outra vez. Sem `metaTitle`, o título é só o produto e o template aplica-se
    // normalmente, como nas outras páginas.
    title: p.metaTitle ? { absolute: p.metaTitle } : p.title,
    description: p.metaDescription ?? t('metaDescricao', { titulo: p.title, marca: p.brand.name }),
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

  const [p, t] = await Promise.all([getProductBySlug(slug), getTranslations('ProdutoPage')])
  if (!p) notFound()

  const preco = precoDeMostra(p.variants)
  const img = p.primaryImage ?? p.gallery[0]?.image ?? null
  const descricaoHtml = descriptionToHtml(p.description)

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-6 py-10">
      <Entrada className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-card bg-white shadow-sm">
          {img ? (
            <Image
              src={mediaUrl(img.url)}
              alt={img.alt}
              width={img.width ?? 800}
              height={img.height ?? 800}
              className="h-full w-full object-cover"
              priority
            />
          ) : null}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">
            {p.brand.name}
          </p>
          <h1 className="mt-2 text-4xl leading-tight text-ink">{p.title}</h1>
          <Price cents={preco.cents} old={preco.old} desde={preco.desde} className="mt-5 block" />

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('opcoesDisponiveis')}
          </h2>
          {/*
            Quando os preços divergem, cada opção mostra o seu. É aqui que o
            engano acontecia: o preço mais baixo em cima e a lista logo por
            baixo, a começar por uma opção que custa outra coisa. Não é um
            seletor — é a lista que já existia, a dizer o preço de cada linha.
          */}
          <ul className="mt-3 flex flex-col gap-2">
            {p.variants.map((v) => {
              const opcoes =
                Object.entries(v.combination)
                  .map(([k, val]) => `${k}: ${val}`)
                  .join(' · ') || t('padrao')

              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink"
                >
                  <span>
                    {opcoes}
                    {preco.desde ? (
                      <span className="ml-2 font-semibold">{formatEuros(v.priceCents)}</span>
                    ) : null}
                    <span className="ml-2 text-ink-muted">
                      {v.stock > 0 ? t('emStock', { count: v.stock }) : t('esgotado')}
                    </span>
                  </span>
                  {/* Só o id e dois valores simples atravessam para o cliente. */}
                  <AdicionarAoCarrinho
                    variantId={v.id}
                    esgotado={v.stock < 1}
                    etiqueta={`${p.title} — ${opcoes}`}
                  />
                </li>
              )
            })}
          </ul>

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
        <Reveal className="mt-12 max-w-3xl border-t border-line pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('descricao')}
          </h2>
          <div
            className="mt-3 space-y-4 text-ink [&_a]:text-terracota [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: descricaoHtml }}
          />
        </Reveal>
      ) : null}
    </main>
  )
}
