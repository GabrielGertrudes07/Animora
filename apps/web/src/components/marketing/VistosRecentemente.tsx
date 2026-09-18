'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { formatEuros } from '@animora/core'
import { produtosPorIds, precoDeMostra, type PublicProduct } from '../../modules/catalog'
import { Link } from '../../i18n/navigation'
import { Icon } from '../icons/sprite'
import { mediaUrl } from '../../lib/api'
import { listarVistos } from '../../lib/vistos'

/**
 * Só existe no cliente — depende do `localStorage` de quem está a ver a
 * página, não de nada que o servidor conheça de antemão. Por isso é um
 * cartão próprio, mais simples que `ProductCard` (sem avaliação, sem
 * adicionar rápido): reaproveitar `ProductCard` exigiria um Client Component
 * a instanciar um Server Component assíncrono — não é possível.
 *
 * `excluirId` tira o próprio produto da lista (uso futuro na ficha, se
 * "vistos recentemente" também aparecer lá).
 */
export function VistosRecentemente({ excluirId }: { excluirId?: number }) {
  const t = useTranslations('VistosRecentemente')
  const [produtos, setProdutos] = useState<PublicProduct[] | null>(null)

  useEffect(() => {
    const ids = listarVistos().filter((id) => id !== excluirId)
    if (ids.length === 0) {
      setProdutos([])
      return
    }
    void produtosPorIds(ids).then(setProdutos)
  }, [excluirId])

  if (!produtos || produtos.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <h2 className="text-titulo text-text">{t('titulo')}</h2>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {produtos.map((p) => {
          const preco = precoDeMostra(p.variants)
          const img = p.primaryImage ?? p.gallery[0]?.image ?? null

          return (
            <Link key={p.id} href={`/produto/${p.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-cream">
                {img ? (
                  <Image
                    src={mediaUrl(img.url)}
                    alt={img.alt}
                    width={img.width ?? 600}
                    height={img.height ?? 600}
                    sizes="(min-width: 1536px) 20vw, (min-width: 768px) 33vw, 50vw"
                    className="h-full w-full object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-teal-700/40">
                    <Icon name="paw" className="h-16 w-16" />
                  </span>
                )}
              </div>
              <p className="mt-2 text-eyebrow font-semibold uppercase text-text-muted">{p.brand.name}</p>
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text">{p.title}</h3>
              <p className="mt-1 text-sm font-bold tabular-nums text-text">
                {preco.desde ? `${t('desde')} ` : ''}
                {formatEuros(preco.cents)}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
