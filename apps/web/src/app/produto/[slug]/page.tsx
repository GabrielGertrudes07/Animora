import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductBySlug, listAllSlugs, precoDeMostra } from '../../../modules/catalog'
import { formatEuros } from '@animora/core'
import { mediaUrl } from '../../../lib/api'
import { descriptionToHtml } from '../../../lib/richtext'
import { Price } from '../../../components/ui/Price'
import { AdicionarAoCarrinho } from '../../../components/ui/AdicionarAoCarrinho'
import { Icon } from '../../../components/icons/sprite'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = await getProductBySlug(slug)
  if (!p) return { title: 'Produto não encontrado' }

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
    description: p.metaDescription ?? `${p.title} da marca ${p.brand.name}, na Animora.`,
    openGraph: {
      title: p.metaTitle ?? p.title,
      description: p.metaDescription ?? p.title,
      images: img ? [{ url: mediaUrl(img.url), alt: img.alt }] : [],
    },
  }
}

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params
  const p = await getProductBySlug(slug)
  if (!p) notFound()

  const preco = precoDeMostra(p.variants)
  const img = p.primaryImage ?? p.gallery[0]?.image ?? null
  const descricaoHtml = descriptionToHtml(p.description)

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
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
          <p className="text-sm uppercase tracking-wide text-ink-muted">{p.brand.name}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">{p.title}</h1>
          <Price
            cents={preco.cents}
            old={preco.old}
            desde={preco.desde}
            className="mt-4 block"
          />

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Opções disponíveis
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
                  .join(' · ') || 'Padrão'

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
                      {v.stock > 0 ? `${v.stock} em stock` : 'esgotado'}
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

          <p className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Icon name="shield" className="h-4 w-4" />
            Envio grátis acima de 50 €
          </p>
        </div>
      </div>

      {descricaoHtml ? (
        <section className="mt-12 max-w-3xl border-t border-line pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Descrição
          </h2>
          <div
            className="mt-3 space-y-4 text-ink [&_a]:text-terracota [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: descricaoHtml }}
          />
        </section>
      ) : null}
    </main>
  )
}
