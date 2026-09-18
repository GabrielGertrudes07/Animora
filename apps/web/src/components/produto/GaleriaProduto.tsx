'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { mediaUrl } from '../../lib/api'
import { Icon } from '../icons/sprite'
import { ImagemComFallback } from '../ui/ImagemComFallback'

type Imagem = { url: string; alt: string; width?: number; height?: number }

/**
 * A galeria da ficha de produto — pronta para várias fotografias reais,
 * mesmo que hoje nenhum produto semeado tenha mais de uma (`primaryImage`
 * e o único item de `gallery` são sempre a mesma imagem). `imagens` já
 * chega deduplicada por `url`; com uma imagem só, a fiada de miniaturas
 * não aparece — não há nada para trocar.
 */
export function GaleriaProduto({ imagens, tituloProduto }: { imagens: Imagem[]; tituloProduto: string }) {
  const [selecionada, setSelecionada] = useState(0)
  const t = useTranslations('GaleriaProduto')

  if (imagens.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-card bg-papel">
        <Icon name="paw" className="h-20 w-20 text-sage/40" />
      </div>
    )
  }

  const atual = imagens[selecionada] ?? imagens[0]!

  return (
    <div>
      <div className="overflow-hidden rounded-card bg-white shadow-sm">
        <ImagemComFallback
          src={mediaUrl(atual.url)}
          alt={atual.alt}
          width={atual.width ?? 800}
          height={atual.height ?? 800}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      {imagens.length > 1 ? (
        <ul className="mt-3 flex gap-2">
          {imagens.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setSelecionada(i)}
                aria-label={t('verImagem', { indice: i + 1, total: imagens.length, produto: tituloProduto })}
                aria-current={i === selecionada}
                className={`block h-16 w-16 overflow-hidden rounded-campo border-2 transition-colors ${
                  i === selecionada ? 'border-terracota' : 'border-line hover:border-ink-muted'
                }`}
              >
                <Image
                  src={mediaUrl(img.url)}
                  alt=""
                  aria-hidden
                  width={img.width ?? 200}
                  height={img.height ?? 200}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
