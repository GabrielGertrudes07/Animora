import { getTranslations } from 'next-intl/server'
import { Icon } from '../../../components/icons/sprite'

/**
 * A coluna de marca ao lado dos formulários de entrar e registar: o que a
 * conta dá, em três linhas. Factos do que a loja faz hoje (encomendas,
 * moradas, favoritos existem em `/conta`) — nada de promessas de pontos ou
 * descontos que não existem.
 */
export async function PainelConta() {
  const t = await getTranslations('PainelConta')

  return (
    <aside className="relative overflow-hidden bg-teal-900 px-6 py-8 text-white sm:px-10 sm:py-12">
      <Icon
        name="paw"
        className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 text-white/[0.06]"
      />
      <span className="flex items-center gap-1.5">
        <Icon name="paw" className="h-6 w-6 text-orange" />
        <span className="font-display text-xl font-bold">animora</span>
      </span>
      <p className="mt-6 font-display text-2xl font-bold leading-tight sm:mt-10 sm:text-3xl">
        {t('titulo')}
      </p>
      <ul className="mt-6 hidden space-y-4 sm:block">
        {(['beneficio1', 'beneficio2', 'beneficio3'] as const).map((k) => (
          <li key={k} className="flex gap-3 text-sm leading-relaxed text-white/85">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-orange">
              <Icon name="check" className="h-3 w-3 text-white" />
            </span>
            {t(k)}
          </li>
        ))}
      </ul>
    </aside>
  )
}
