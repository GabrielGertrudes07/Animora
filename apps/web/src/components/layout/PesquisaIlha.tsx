'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Icon } from '../icons/sprite'

/**
 * Lupa que abre a pesquisa por cima da cápsula do cabeçalho.
 *
 * Continua a ser um `<form method="get">` simples para `/produtos?q=` —
 * `acao` já vem com o prefixo do idioma. Esc ou o X fecham.
 */
export function PesquisaIlha({ acao }: { acao: string }) {
  const [aberta, setAberta] = useState(false)
  const t = useTranslations('Header')

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label={t('pesquisarAria')}
        aria-expanded={aberta}
        className={BOTAO_ICONE}
      >
        <Icon name="search" className="h-5 w-5" />
      </button>
      {aberta ? (
        <form
          action={acao}
          method="get"
          onKeyDown={(e) => e.key === 'Escape' && setAberta(false)}
          className="absolute inset-1.5 z-10 flex items-center gap-3 rounded-pill bg-surface pl-4 pr-1.5 ring-2 ring-orange/30 motion-safe:animate-entrada-cima sm:pl-5"
        >
          <Icon name="search" className="h-5 w-5 shrink-0 text-orange" />
          <input
            type="search"
            name="q"
            autoFocus
            placeholder={t('pesquisarPlaceholder')}
            aria-label={t('pesquisarAria')}
            className="h-full w-full min-w-0 bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={() => setAberta(false)}
            aria-label={t('fecharPesquisa')}
            className={BOTAO_ICONE}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </form>
      ) : null}
    </>
  )
}

const BOTAO_ICONE =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-colors hover:bg-cream hover:text-orange'
