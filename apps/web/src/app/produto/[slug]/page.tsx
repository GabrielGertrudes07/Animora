import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductBySlug, listAllSlugs } from '../../../modules/catalog'
import { mediaUrl } from '../../../lib/api'
import { descriptionToHtml } from '../../../lib/richtext'
import { Price } from '../../../components/ui/Price'
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

  const img = p.primaryImage ?? p.gallery[0]?.image ?? null

  return {
    title: p.metaTitle ?? p.title,
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

  const barata = p.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
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
          <Price cents={barata.priceCents} old={barata.oldPriceCents} className="mt-4 block" />

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Opções disponíveis
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.variants.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
              >
                {Object.entries(v.combination).map(([k, val]) => `${k}: ${val}`).join(' · ') ||
                  'Padrão'}
                <span className="ml-2 text-ink-muted">
                  {v.stock > 0 ? `${v.stock} em stock` : 'esgotado'}
                </span>
              </li>
            ))}
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
