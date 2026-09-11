'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AdicionarAoCarrinho } from '../ui/AdicionarAoCarrinho'
import { CtaStickyMobile } from './CtaStickyMobile'

type VarianteInfo = {
  id: number
  combination: Record<string, string>
  /** Preço da linha, só quando os preços divergem entre variantes. */
  precoLabel: string | null
  stock: number
}

/**
 * A lista de variantes e o CTA fixo mobile precisam de ser um Client
 * Component só a partir daqui — e os dois juntos, não cada um por si — para
 * partilharem o mesmo `useState` de quantidade quando há uma variante única.
 * Antes, `CtaStickyMobile` tinha o seu próprio `<AdicionarAoCarrinho>`, com o
 * seu próprio estado: escolher 3 aqui em cima e clicar no CTA fixo
 * adicionava 1. Um só dono do número resolve isso na origem.
 */
export function AreaCompra({
  variantes,
  tituloProduto,
  precoLabelCta,
}: {
  variantes: VarianteInfo[]
  tituloProduto: string
  /** Preço do CTA fixo — já formatado, com "desde" quando aplicável. */
  precoLabelCta: string
}) {
  const t = useTranslations('ProdutoPage')
  const unica = variantes.length === 1 ? variantes[0]! : null
  const unicaOpcoes = unica
    ? Object.entries(unica.combination)
        .map(([k, val]) => `${k}: ${val}`)
        .join(' · ') || t('padrao')
    : null
  const [quantidadeUnica, setQuantidadeUnica] = useState(1)

  return (
    <>
      <div id="area-compra" className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('opcoesDisponiveis')}
        </h2>
        {/*
          Quando os preços divergem, cada opção mostra o seu. É aqui que o
          engano acontecia: o preço mais baixo em cima e a lista logo por
          baixo, a começar por uma opção que custa outra coisa. Não é um
          seletor — é a lista que já existia, a dizer o preço de cada linha.
        */}
        <ul className="mt-3 flex flex-col gap-2">
          {variantes.map((v) => {
            const opcoes =
              Object.entries(v.combination)
                .map(([k, val]) => `${k}: ${val}`)
                .join(' · ') || t('padrao')
            const ehUnica = unica !== null && v.id === unica.id

            return (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-campo border border-line px-3 py-2 text-sm text-ink"
              >
                <span>
                  {opcoes}
                  {v.precoLabel ? <span className="ml-2 font-semibold">{v.precoLabel}</span> : null}
                  <span className="ml-2 text-ink-muted">
                    {v.stock > 0 ? t('emStock', { count: v.stock }) : t('esgotado')}
                  </span>
                </span>
                <AdicionarAoCarrinho
                  variantId={v.id}
                  esgotado={v.stock < 1}
                  etiqueta={`${tituloProduto} — ${opcoes}`}
                  comQuantidade
                  quantidade={ehUnica ? quantidadeUnica : undefined}
                  aoMudarQuantidade={ehUnica ? setQuantidadeUnica : undefined}
                />
              </li>
            )
          })}
        </ul>
      </div>

      <CtaStickyMobile
        precoLabel={precoLabelCta}
        unica={
          unica
            ? {
                variantId: unica.id,
                esgotado: unica.stock < 1,
                etiqueta: `${tituloProduto} — ${unicaOpcoes}`,
                quantidade: quantidadeUnica,
              }
            : null
        }
      />
    </>
  )
}
