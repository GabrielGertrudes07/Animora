import Image from 'next/image'
import Link from 'next/link'
import type { PublicProduct } from '../../modules/catalog'
import { mediaUrl } from '../../lib/api'
import { Price } from './Price'

export function ProductCard({ product }: { product: PublicProduct }) {
  const barata = product.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
  const img = product.primaryImage ?? product.gallery[0]?.image ?? null
  const stockTotal = product.variants.reduce((s, v) => s + v.stock, 0)

  return (
    <article className="group overflow-hidden rounded-card bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/produto/${product.slug}`} className="block">
        <div className="relative aspect-square bg-cream">
          {img ? (
            <Image
              src={mediaUrl(img.url)}
              alt={img.alt}
              width={img.width ?? 600}
              height={img.height ?? 600}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-1 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">{product.brand.name}</p>
          <h3 className="font-semibold leading-snug text-ink">{product.title}</h3>
          <Price cents={barata.priceCents} old={barata.oldPriceCents} className="mt-2 block" />
          <p className="text-sm text-ink-muted">
            {stockTotal > 0 ? `${stockTotal} em stock` : 'Indisponível'}
          </p>
        </div>
      </Link>
    </article>
  )
}
