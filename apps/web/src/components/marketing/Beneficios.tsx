import { getTranslations } from 'next-intl/server'
import { ENVIO_GRATIS_ACIMA_DE, formatEuros } from '@animora/core'
import { Icon, type IconName } from '../icons/sprite'

const ITENS: { icone: IconName; chave: 'envio' | 'dados' | 'filtros' }[] = [
  { icone: 'cart', chave: 'envio' },
  { icone: 'shield', chave: 'dados' },
  { icone: 'paw', chave: 'filtros' },
]

/**
 * Três factos verificáveis sobre a loja tal como ela é hoje — não uma lista
 * de promessas de marca. "Pagamento seguro" ficou de fora de propósito: o
 * checkout ainda não liga a um processador de pagamento real (ver
 * `docs/spec-animora.md` §1, "fora de âmbito nesta fase").
 *
 * Empilhado em mobile, três colunas a partir de `sm` — não é o mesmo grid a
 * encolher, é uma pilha vertical a virar fiada horizontal.
 */
export async function Beneficios() {
  const t = await getTranslations('Beneficios')

  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <ul className="flex flex-col gap-8 sm:grid sm:grid-cols-3 sm:gap-6">
        {ITENS.map(({ icone, chave }) => (
          <li key={chave} className="flex items-start gap-4 sm:flex-col sm:items-center sm:text-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-terracota">
              <Icon name={icone} className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">
                {chave === 'envio'
                  ? t('envioTitulo', { valor: formatEuros(ENVIO_GRATIS_ACIMA_DE) })
                  : t(`${chave}Titulo`)}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{t(`${chave}Texto`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
