'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AdicionarAoCarrinho } from '../ui/AdicionarAoCarrinho'

/**
 * Barra fixa no fundo, só em mobile, só quando a área de compra principal
 * (`#area-compra`) já saiu da viewport — nunca antes, para não duplicar o
 * CTA que já está visível. Aparece/desaparece sem animação: uma barra que
 * pisca ao ligar/desligar por causa de rolagem não precisa de transição
 * para ficar clara, e sem transição não há nada para `prefers-reduced-motion`
 * ter de desligar aqui.
 *
 * Produto com variante única: o botão repete a mesma ação do CTA principal.
 * Produto com várias variantes: não há "a" variante para adicionar sem
 * escolha — o botão rola de volta até às opções em vez de inventar uma
 * escolha por quem ainda não escolheu.
 */
export function CtaStickyMobile({
  precoLabel,
  unica,
}: {
  precoLabel: string
  unica: { variantId: number; esgotado: boolean; etiqueta: string } | null
}) {
  const [visivel, setVisivel] = useState(false)
  const t = useTranslations('CtaStickyMobile')

  useEffect(() => {
    const alvo = document.getElementById('area-compra')
    if (!alvo) return

    const observador = new IntersectionObserver(([entrada]) => setVisivel(!(entrada?.isIntersecting ?? true)))
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  if (!visivel) return null

  return (
    <div
      role="region"
      aria-label={t('ariaLabel')}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-white px-4 py-3 shadow-md sm:hidden"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <span className="text-lg font-bold tabular-nums text-ink">{precoLabel}</span>
      {unica ? (
        <AdicionarAoCarrinho variantId={unica.variantId} esgotado={unica.esgotado} etiqueta={unica.etiqueta} />
      ) : (
        <a href="#area-compra" className="botao-principal botao-principal-pequeno">
          {t('verOpcoes')}
        </a>
      )}
    </div>
  )
}
