'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

const INCREMENTO = 12
const PARAM = 'mostrar'

/**
 * Revelação progressiva da grelha: só os primeiros `INCREMENTO` cartões
 * nascem visíveis, o resto vem por "mostrar mais". Os `children` já são
 * `<ProductCard>` renderizados pelo servidor — este componente só decide
 * quantos mostrar, nunca busca dados nem sabe o que é um produto.
 *
 * Sem paginação por URL que passe pelo router do Next de propósito: isso
 * disparava uma nova busca ao servidor (com o `loading.tsx` da rota) a cada
 * clique, por uma contagem que já está toda em memória no cliente. Em vez
 * disso, `?mostrar=N` é escrito com `history.replaceState` — só marca a URL,
 * não navega — para o número de cartões revelados sobreviver a voltar do
 * histórico (ex.: da ficha de um produto de volta a esta página) sem custar
 * uma reconsulta. Um outro parâmetro (`?mostrar=`) some quando o utilizador
 * troca de filtro/ordenação de verdade, porque essas ações levam a uma nova
 * URL escrita pelo componente que as faz (`FiltrosCatalogo`/`OrdenarPor`),
 * que nunca inclui `mostrar`.
 */
export function MostrarMais({ children }: { children: ReactNode[] }) {
  const searchParams = useSearchParams()
  const t = useTranslations('MostrarMais')

  const daUrl = Number(searchParams.get(PARAM))
  const inicial = Number.isInteger(daUrl) && daUrl > INCREMENTO ? daUrl : INCREMENTO
  const [visiveis, setVisiveis] = useState(Math.min(inicial, children.length))

  function mostrarMais() {
    const proximos = Math.min(visiveis + INCREMENTO, children.length)
    setVisiveis(proximos)

    const params = new URLSearchParams(window.location.search)
    params.set(PARAM, String(proximos))
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }

  return (
    <>
      {children.slice(0, visiveis)}
      {visiveis < children.length ? (
        <div className="col-span-full mt-4 flex justify-center">
          <button type="button" onClick={mostrarMais} className="botao-principal botao-principal-pequeno">
            {t('mostrarMais', { restantes: children.length - visiveis })}
          </button>
        </div>
      ) : null}
    </>
  )
}
