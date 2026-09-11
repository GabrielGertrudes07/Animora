import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { PalcoCategorias } from './PalcoCategorias'
import { MediaPlaceholder } from '../ui/MediaPlaceholder'

/**
 * Categorias "de animal", uma por cartão.
 *
 * Fase estrutural v1: a cena fotográfica em `public/categorias/<slug>/`
 * (`fundo.webp` + `animal.webp`) fica de fora — o cartão usa um
 * `MediaPlaceholder` neutro. Os ficheiros continuam no disco para a fase de
 * criativos; é só a troca de `<MediaPlaceholder>` por `<Image>` que os
 * traz de volta, sem mudar o resto do cartão.
 *
 * Antes era um componente só, com a fiada de pills encostada ao fim sem
 * título — a home estrutural pede "escolha o teu animal" e "compra por
 * necessidade" como duas secções, não uma com um apêndice. Continuam num
 * ficheiro só porque partilham o mesmo par categorias/contagens e o mesmo
 * critério de partição (`COM_CENA`).
 */
const COM_CENA = new Set(['caes', 'gatos', 'passaros', 'roedores', 'aquario'])

type Categoria = { id: number; name: string; slug: string }

export async function EscolhaSeuAnimal({
  categorias,
  contagens,
}: {
  categorias: Categoria[]
  contagens: Record<string, number>
}) {
  const t = await getTranslations('EscolhaSeuAnimal')
  const animais = categorias.filter((c) => COM_CENA.has(c.slug))
  if (animais.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <h2 className="text-titulo">{t('titulo')}</h2>
      <p className="mt-3 max-w-leitura text-ink-muted">{t('texto')}</p>

      <PalcoCategorias className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {animais.map((c) => (
          <li key={c.slug} data-cartao-categoria>
            <Link
              href={`/${c.slug}`}
              className="group block overflow-hidden rounded-card active:scale-[0.98]"
            >
              <span className="relative block aspect-[4/5]">
                <span className="absolute inset-0 transition-transform duration-500 ease-loja group-hover:scale-[1.04] group-focus-visible:scale-[1.04]">
                  <MediaPlaceholder ratio="4/5" type="category" fill />
                </span>

                {/* Sem fotografia por baixo, a etiqueta lê-se em tinta escura
                    sobre o próprio placeholder em vez de branco sobre véu. */}
                <span className="absolute bottom-3 left-3 text-ink transition-transform duration-300 ease-loja group-hover:-translate-y-1">
                  <span className="block text-base font-bold sm:text-lg">{c.name}</span>
                  <span className="block text-xs tabular-nums text-ink-muted">
                    {t('produtos', { count: contagens[c.slug] ?? 0 })}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </PalcoCategorias>
    </section>
  )
}

/** As categorias sem cena própria (Alimentação, Higiene, ...) — mesmo dado, secção com nome próprio. */
export async function ComprarPorNecessidade({ categorias }: { categorias: Categoria[] }) {
  const t = await getTranslations('ComprarPorNecessidade')
  const porNecessidade = categorias.filter((c) => !COM_CENA.has(c.slug))
  if (porNecessidade.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <h2 className="text-titulo">{t('titulo')}</h2>
      <p className="mt-3 max-w-leitura text-ink-muted">{t('texto')}</p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {porNecessidade.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/${c.slug}`}
              className="block rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-terracota hover:text-ink"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
