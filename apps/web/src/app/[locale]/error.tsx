'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Limite de erro da home (e de qualquer página deste segmento sem o seu
 * próprio `error.tsx`). Precisa de `'use client'` — é o contrato do Next
 * para `error.tsx`, não uma escolha de interatividade.
 */
export default function ErroHome({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('ErroPagina')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-md px-4 py-secao text-center sm:px-6">
      <h1 className="text-titulo text-ink">{t('titulo')}</h1>
      <p className="mt-3 text-ink-muted">{t('texto')}</p>
      <button type="button" onClick={reset} className="botao-principal mt-6 inline-flex">
        {t('tentarNovamente')}
      </button>
    </main>
  )
}
