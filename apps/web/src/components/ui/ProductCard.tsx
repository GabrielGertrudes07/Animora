import Image from 'next/image'
import Link from 'next/link'
import type { PublicProduct } from '../../modules/catalog'
import { precoDeMostra } from '../../modules/catalog'
import { mediaUrl } from '../../lib/api'
import { Price } from './Price'
import { Icon } from '../icons/sprite'

/**
 * O cartão de produto — a peça que mais se repete na loja.
 *
 * `data-cartao` é o gancho da camada de movimento (`components/motion`): é por
 * ele que a grelha encontra os cartões para a cascata e para a micro-interação
 * do rato, sem que o GSAP precise de conhecer a estrutura interna deste
 * componente nem de o transformar num Client Component.
 */
export function ProductCard({ product }: { product: PublicProduct }) {
  const preco = precoDeMostra(product.variants)
  const img = product.primaryImage ?? product.gallery[0]?.image ?? null
  const stockTotal = product.variants.reduce((s, v) => s + v.stock, 0)

  return (
    <article
      data-cartao
      className="group relative overflow-hidden rounded-card border border-line bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <Link href={`/produto/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-cream">
          {img ? (
            <Image
              src={mediaUrl(img.url)}
              alt={img.alt}
              width={img.width ?? 600}
              height={img.height ?? 600}
              className="h-full w-full object-cover"
            />
          ) : (
            // Sem fotografia, uma pata em marca de água — não um retângulo
            // vazio que parece a página a meio de carregar.
            <span className="flex h-full w-full items-center justify-center text-sage/40">
              <Icon name="paw" className="h-16 w-16" />
            </span>
          )}
          {stockTotal === 0 ? (
            <span className="absolute left-3 top-3 rounded-full bg-ink/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cream">
              Esgotado
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">
            {product.brand.name}
          </p>
          <h3 className="text-lg font-semibold leading-snug text-ink">{product.title}</h3>
          <Price cents={preco.cents} old={preco.old} desde={preco.desde} className="mt-2 block" />
          {stockTotal > 0 ? (
            <p className="text-sm text-ink-muted">{stockTotal} em stock</p>
          ) : (
            <p className="text-sm text-ink-muted">Sem stock de momento</p>
          )}
        </div>
      </Link>
    </article>
  )
}
