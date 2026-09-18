'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { encontrarVariante, type GrupoAtributo } from '../../modules/catalog'
import { AdicionarAoCarrinho } from '../ui/AdicionarAoCarrinho'

type VarianteInfo = {
  id: number
  combination: Record<string, string>
  precoLabel: string | null
  stock: number
}

/**
 * Um seletor por atributo (Tamanho: S/M/L, Cor: Preto/Branco) em vez da
 * lista de uma linha por combinação — o "9 variantes = 9 linhas" que ficava
 * ilegível num produto com muitas opções.
 *
 * Só é usado quando `agruparPorAtributo` (em `AreaCompra`) confirma que as
 * variantes formam uma matriz regular; o catálogo real semeado desta loja
 * não tem hoje nenhum produto com mais de uma variante, por isso este
 * componente não pôde ser verificado em navegador contra dado real — só por
 * teste unitário da lógica pura (`variantes.test.ts`) e leitura de código.
 * Ver `docs/CURRENT_STATE.md`.
 */
export function SeletorAtributos({
  variantes,
  grupos,
  tituloProduto,
}: {
  variantes: VarianteInfo[]
  grupos: GrupoAtributo[]
  tituloProduto: string
}) {
  const t = useTranslations('ProdutoPage')
  const [selecao, setSelecao] = useState<Record<string, string>>(() =>
    Object.fromEntries(grupos.map((g) => [g.chave, variantes[0]!.combination[g.chave]!])),
  )

  const varianteAtual = encontrarVariante(variantes, selecao)
  const opcoesTexto = Object.entries(selecao)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((g) => (
        <fieldset key={g.chave}>
          <legend className="text-sm font-semibold text-ink">{g.chave}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {g.valores.map((valor) => {
              const ativo = selecao[g.chave] === valor
              // Existe alguma variante com este valor, mantendo o resto da
              // seleção atual? Se não, o botão fica visível mas desativado
              // — nunca escondido, que confundiria quem já tinha decorado a
              // grelha de opções.
              const existe = encontrarVariante(variantes, { ...selecao, [g.chave]: valor }) !== undefined

              return (
                <button
                  key={valor}
                  type="button"
                  disabled={!existe}
                  aria-pressed={ativo}
                  onClick={() => setSelecao((s) => ({ ...s, [g.chave]: valor }))}
                  className={`min-h-11 rounded-campo border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    ativo
                      ? 'border-terracota bg-terracota/10 text-terracota-dark'
                      : 'border-line text-ink hover:border-ink-muted'
                  }`}
                >
                  {valor}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {varianteAtual ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-campo border border-line px-3 py-2 text-sm text-ink">
          <span>
            {varianteAtual.precoLabel ? <span className="font-semibold">{varianteAtual.precoLabel}</span> : null}
            <span className="ml-2 text-ink-muted">
              {varianteAtual.stock > 0 ? t('emStock', { count: varianteAtual.stock }) : t('esgotado')}
            </span>
          </span>
          <AdicionarAoCarrinho
            variantId={varianteAtual.id}
            esgotado={varianteAtual.stock < 1}
            etiqueta={`${tituloProduto} — ${opcoesTexto}`}
            comQuantidade
          />
        </div>
      ) : (
        <p className="text-sm text-ink-muted">{t('combinacaoIndisponivel')}</p>
      )}
    </div>
  )
}
