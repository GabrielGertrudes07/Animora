import { getTranslations } from 'next-intl/server'
import { getAvaliacoesEmLote, pesquisarProdutos } from '../../modules/catalog'
import type { ResumoAvaliacoes } from '@animora/core'
import { Link } from '../../i18n/navigation'
import { ProductCard } from '../ui/ProductCard'
import { CascataProdutos } from '../motion/CascataProdutos'
import { Revelar } from '../motion/Revelar'

const SEM_AVALIACAO: ResumoAvaliacoes = { media: null, total: 0 }

/**
 * Uma fiada de produtos reais por categoria — não os primeiros N produtos do
 * catálogo com um título emprestado de "categoria". Só as três primeiras
 * categorias (por nome, a mesma ordem de `listCategories`) entram: a home não
 * é o catálogo inteiro replicado uma vez por categoria.
 */
export async function DestaquesPorCategoria({
  categorias,
}: {
  categorias: { id: number; name: string; slug: string }[]
}) {
  const t = await getTranslations('DestaquesPorCategoria')
  const escolhidas = categorias.slice(0, 3)

  const linhas = await Promise.all(
    escolhidas.map(async (categoria) => ({
      categoria,
      produtos: (await pesquisarProdutos('', { ordem: 'relevancia' }, categoria.id)).slice(0, 4),
    })),
  )
  const comProdutos = linhas.filter((l) => l.produtos.length > 0)
  if (comProdutos.length === 0) return null

  // Uma leitura em lote para as até 3×4 cartões desta secção inteira.
  const avaliacoes = await getAvaliacoesEmLote(comProdutos.flatMap((l) => l.produtos.map((p) => p.id)))

  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <Revelar>
        <h2 className="text-titulo text-text">{t('titulo')}</h2>
      </Revelar>

      <div className="mt-8 flex flex-col gap-12">
        {comProdutos.map(({ categoria, produtos }) => (
          <div key={categoria.id}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="text-secao text-text">{categoria.name}</h3>
              <Link
                href={`/${categoria.slug}`}
                className="text-sm font-semibold text-text underline underline-offset-4 transition-colors hover:text-teal-900"
              >
                {t('verCategoria')}
              </Link>
            </div>

            <CascataProdutos className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {produtos.map((p) => (
                <ProductCard key={p.id} product={p} avaliacao={avaliacoes.get(p.id) ?? SEM_AVALIACAO} />
              ))}
            </CascataProdutos>
          </div>
        ))}
      </div>
    </section>
  )
}
