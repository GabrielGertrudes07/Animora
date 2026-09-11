import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'

/**
 * 404 do segmento `[locale]` — cai aqui sempre que `notFound()` é chamado
 * (produto, categoria ou encomenda inexistente) e sempre que o Next não
 * encontra rota nenhuma. Sem isto, o visitante via a página genérica do
 * Next, sem a paleta nem o idioma da loja.
 */
export default async function NaoEncontrado() {
  const t = await getTranslations('NaoEncontrado')

  return (
    <main className="mx-auto max-w-md px-4 py-secao text-center sm:px-6">
      <h1 className="text-titulo text-ink">{t('titulo')}</h1>
      <p className="mt-3 text-ink-muted">{t('texto')}</p>
      <Link href="/produtos" className="botao-principal mt-6 inline-flex">
        {t('voltar')}
      </Link>
    </main>
  )
}
