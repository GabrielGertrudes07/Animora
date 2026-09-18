'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { Icon } from '../icons/sprite'

/**
 * `<Image>` com uma pata em marca de água quando o ficheiro falha ao
 * carregar — não só quando não há registo de imagem nenhum (isso já era
 * tratado em quem chama), mas quando há um registo e o download falha (URL
 * quebrada, ficheiro apagado do disco por fora do Payload). Sem isto, essa
 * falha caía no ícone de imagem partida do próprio browser.
 *
 * Precisa de ser Client Component só por causa do `onError`: um Server
 * Component não pode passar um manipulador de evento para o `<Image>` do
 * `next/image`, que é cliente por dentro.
 */
export function ImagemComFallback({ className, ...props }: ImageProps) {
  const [falhou, setFalhou] = useState(false)

  if (falhou) {
    return (
      <span className={`flex items-center justify-center text-sage/40 ${className ?? ''}`}>
        <Icon name="paw" className="h-16 w-16" />
      </span>
    )
  }

  return <Image {...props} className={className} onError={() => setFalhou(true)} />
}
