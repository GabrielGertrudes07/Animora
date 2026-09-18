import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'

/**
 * A faixa "marcas em que confiamos" — extraída do bloco que vivia inline em
 * `page.tsx` (spec original §7, posição 8: "cards horizontais de logo;
 * nesta fase, usar caixa com nome da marca em texto e placeholder").
 *
 * Server Component simples: recebe `marcas` já resolvidas por quem chama
 * (`marcasDisponiveis(todos)` em `page.tsx`) em vez de ler o catálogo aqui —
 * a página já carrega o catálogo uma vez para o resto da home, e duplicar
 * essa leitura dentro do componente seria uma segunda ida à base de dados
 * pelo mesmo dado.
 */
export async function Marcas({ marcas }: { marcas: { slug: string; nome: string }[] }) {
  const t = await getTranslations('Home')

  if (marcas.length === 0) return null

  return (
    <section className="border-t border-border px-4 py-secao text-center sm:px-6">
      <p className="mx-auto max-w-7xl text-eyebrow font-semibold uppercase text-text-muted">
        {t('marcasEmQueConfiamos')}
      </p>
      <ul className="mx-auto mt-6 flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3">
        {marcas.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/produtos?marca=${m.slug}`}
              className="font-display text-lg font-semibold text-text-muted transition-colors hover:text-teal-900"
            >
              {m.nome}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
