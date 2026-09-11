'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCarrinho } from '../../modules/cart'

/**
 * Barra fixa no fundo, só em mobile, só depois de a área de compra principal
 * (`#area-compra`) já ter sido vista e ter saído da viewport — nunca antes
 * disso. `viuUmaVez` (variável local do efeito, não `state`: o observador
 * não precisa de repintar por causa dela) impede que a barra apareça já na
 * primeira leitura do observador quando `#area-compra` nasce abaixo da
 * dobra: sem essa guarda, quem carrega a ficha já via o CTA fixo antes de
 * ter rolado um pixel — o oposto do que a barra existe para fazer.
 *
 * Ancorada acima da `BarraMobile` (nav inferior, `min-h-[3.5rem]` + safe
 * area) e não em `bottom-0`: as duas são `fixed`/`z-40`, e como este
 * componente vive mais tarde na árvore, `bottom-0` nos dois cobria a
 * navegação inteira (Início/Categorias/Procurar/Conta/Carrinho) sempre que
 * a barra de compra aparecia.
 *
 * Aparece/desaparece sem animação: uma barra que pisca ao ligar/desligar por
 * causa de rolagem não precisa de transição para ficar clara, e sem
 * transição não há nada para `prefers-reduced-motion` ter de desligar aqui.
 *
 * Produto com variante única: o botão adiciona a MESMA quantidade escolhida
 * na área de compra principal — recebida como prop, nunca um seletor
 * próprio, para nunca haver dois números "quantidade" para o mesmo produto
 * ao mesmo tempo. Produto com várias variantes: não há "a" variante para
 * adicionar sem escolha — o botão rola de volta até às opções em vez de
 * inventar uma escolha por quem ainda não escolheu.
 */
export function CtaStickyMobile({
  precoLabel,
  unica,
}: {
  precoLabel: string
  unica: { variantId: number; esgotado: boolean; etiqueta: string; quantidade: number } | null
}) {
  const [visivel, setVisivel] = useState(false)
  const [feito, setFeito] = useState(false)
  const { acrescentar } = useCarrinho()
  const t = useTranslations('CtaStickyMobile')
  const tAdicionar = useTranslations('AdicionarAoCarrinho')

  useEffect(() => {
    const alvo = document.getElementById('area-compra')
    if (!alvo) return

    let viuUmaVez = false
    const observador = new IntersectionObserver(([entrada]) => {
      const aVista = entrada?.isIntersecting ?? false
      if (aVista) viuUmaVez = true
      setVisivel(viuUmaVez && !aVista)
    })
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  if (!visivel) return null

  return (
    <div
      role="region"
      aria-label={t('ariaLabel')}
      className="fixed inset-x-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-white px-4 py-3 shadow-md sm:hidden"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
    >
      <span className="text-lg font-bold tabular-nums text-ink">{precoLabel}</span>
      {unica ? (
        unica.esgotado ? (
          <span className="text-sm font-medium text-ink-muted">{tAdicionar('esgotado')}</span>
        ) : (
          <button
            type="button"
            aria-label={tAdicionar('adicionarAria', { etiqueta: unica.etiqueta })}
            onClick={() => {
              acrescentar(unica.variantId, unica.quantidade)
              setFeito(true)
              window.setTimeout(() => setFeito(false), 2000)
            }}
            className="botao-principal botao-principal-pequeno"
          >
            {feito ? tAdicionar('noCarrinho') : tAdicionar('adicionar')}
          </button>
        )
      ) : (
        <a href="#area-compra" className="botao-principal botao-principal-pequeno">
          {t('verOpcoes')}
        </a>
      )}
    </div>
  )
}
