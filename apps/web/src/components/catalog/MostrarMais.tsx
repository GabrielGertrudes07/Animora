'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

const INCREMENTO = 12

/**
 * Revelação progressiva da grelha: só os primeiros `INCREMENTO` cartões
 * nascem visíveis, o resto vem por "mostrar mais". Os `children` já são
 * `<ProductCard>` renderizados pelo servidor — este componente só decide
 * quantos mostrar, nunca busca dados nem sabe o que é um produto.
 *
 * Sem paginação por URL de propósito: a página inteira já é uma leitura só
 * (até umas dezenas de produtos), e uma página de resultados perderia o
 * filtro/ordenação atuais só para trocar de `?pagina=`. Os cartões revelados
 * depois não animam com a cascata de entrada (`CascataProdutos` já correu
 * para este caminho) — é o mesmo motivo pelo qual filtrar não reanima a
 * grelha toda.
 */
export function MostrarMais({ children }: { children: ReactNode[] }) {
  const [visiveis, setVisiveis] = useState(Math.min(INCREMENTO, children.length))
  const t = useTranslations('MostrarMais')

  return (
    <>
      {children.slice(0, visiveis)}
      {visiveis < children.length ? (
        <div className="col-span-full mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisiveis((v) => Math.min(v + INCREMENTO, children.length))}
            className="botao-principal botao-principal-pequeno"
          >
            {t('mostrarMais', { restantes: children.length - visiveis })}
          </button>
        </div>
      ) : null}
    </>
  )
}
