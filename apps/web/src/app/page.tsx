import Link from 'next/link'
import { listCategories, listProducts } from '../modules/catalog'
import { ProductCard } from '../components/ui/ProductCard'
import { Icon } from '../components/icons/sprite'

export default async function Home() {
  const [destaques, categorias] = await Promise.all([
    listProducts({ ordem: 'relevancia' }).then((p) => p.slice(0, 4)),
    listCategories(),
  ])

  return (
    <main id="conteudo">
      <section className="textura-patas bg-ink px-6 py-20 text-cream sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-terracota">
            <Icon name="paw" className="h-4 w-4" />
            Cuidados e bem-estar para cada animal
          </p>
          <h1 className="mt-6 max-w-4xl text-balance text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Cuide do seu companheiro com{' '}
            <span className="text-terracota">produtos pensados para a vida real</span>.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-cream/75">
            Alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos
            animais.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            {/* Aponta para a loja inteira, não para uma categoria escolhida a
                dedo: o botão principal não depende de uma categoria existir
                nem de ela ter produtos. */}
            <Link href="/produtos" className="botao-principal">
              Explorar loja
            </Link>
            {categorias.length > 0 ? (
              <a
                href="#categorias"
                className="rounded-xl border border-cream/25 px-6 py-3 font-semibold text-cream transition-colors hover:bg-cream/10"
              >
                Ver categorias
              </a>
            ) : null}
          </div>

          <p className="mt-8 flex items-center gap-2 text-sm text-cream/60">
            <Icon name="shield" className="h-4 w-4" />
            Envio grátis acima de 50 €
          </p>
        </div>
      </section>

      {categorias.length > 0 ? (
        <section id="categorias" className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-terracota">
            Por onde começar
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Cada animal tem a sua prateleira</h2>
          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categorias.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${c.slug}`}
                  className="relative flex h-full flex-col justify-between overflow-hidden rounded-card border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <Icon
                    name="paw"
                    className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rotate-[18deg] text-sage/15"
                  />
                  <h3 className="relative text-xl font-semibold text-ink">{c.name}</h3>
                  <span className="relative mt-8 text-sm font-semibold text-terracota">
                    Ver produtos →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {destaques.length > 0 ? (
        <section className="border-t border-line bg-white/60">
          <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-terracota">
                  Em destaque
                </p>
                <h2 className="mt-3 text-3xl sm:text-4xl">Escolhas da casa</h2>
              </div>
              <Link
                href="/produtos"
                className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-terracota-dark"
              >
                Ver todos os produtos
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {destaques.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
