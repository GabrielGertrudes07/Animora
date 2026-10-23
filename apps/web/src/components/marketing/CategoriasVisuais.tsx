import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Link } from '../../i18n/navigation'
import { PalcoCategorias } from './PalcoCategorias'

/**
 * Categorias "de animal", um círculo por categoria (spec §7: "cada
 * categoria usa círculo de 104–116px com placeholder de imagem, label
 * abaixo").
 *
 * Os recortes de `public/categorias/<slug>/animal.webp` assentam sobre
 * creme, em harmonia com a identidade laranja/teal da loja.
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
      {/* Primeira secção abaixo do Hero, já no ecrã ao abrir: CSS e não
          `Revelar`, para entrar desde a primeira pintura em vez de piscar à
          espera da hidratação. */}
      <h2 className="text-titulo motion-safe:animate-hero-copy motion-safe:[animation-delay:350ms]">{t('titulo')}</h2>
      <p className="mt-3 max-w-leitura text-text-muted motion-safe:animate-hero-copy motion-safe:[animation-delay:450ms]">{t('texto')}</p>

      {/* Mobile: linha com scroll horizontal e snap por item (spec §7) — não
          espremer 6-8 círculos num grid minúsculo. Desktop: volta a grid,
          `overflow-visible` desliga o scroll (nada a rolar quando cabe tudo). */}
      <PalcoCategorias className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
        {animais.map((c) => (
          <li key={c.slug} data-cartao-categoria className="flex w-28 shrink-0 snap-start justify-center sm:w-auto">
            <Link
              href={`/${c.slug}`}
              className="group flex flex-col items-center gap-3 text-center transition-transform duration-300 ease-brand hover:-translate-y-1 focus-visible:-translate-y-1 active:scale-[0.98]"
            >
              {/* Círculo 112px (dentro do intervalo 104-116px da spec). A
                  sombra só aparece no hover — em repouso o círculo é plano.
                  Borda laranja suave para o círculo branco não sumir no fundo
                  branco; acende no hover, como tudo o que é clicável. */}
              <span className="block h-28 w-28 overflow-hidden rounded-pill border-2 border-orange/35 transition-[box-shadow,border-color] duration-300 ease-brand group-hover:border-orange group-hover:shadow-card group-focus-visible:border-orange group-focus-visible:shadow-card">
                <span className="block h-full w-full transition-transform duration-300 ease-brand group-hover:scale-[1.03] group-focus-visible:scale-[1.03]">
                  <Image
                    src={`/categorias/${c.slug}/animal.webp`}
                    alt=""
                    width={112}
                    height={112}
                    sizes="112px"
                    className="h-full w-full bg-cream object-contain p-2"
                  />
                </span>
              </span>

              {/* A legenda nomeia a categoria fora do círculo. */}
              <span>
                <span className="block text-sm font-semibold text-text">{c.name}</span>
                <span className="block text-xs tabular-nums text-text-muted">
                  {t('produtos', { count: contagens[c.slug] ?? 0 })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </PalcoCategorias>
    </section>
  )
}
