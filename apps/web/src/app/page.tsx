import Link from 'next/link'
import { listProducts } from '../modules/catalog'
import { ProductCard } from '../components/ui/ProductCard'
import { Icon } from '../components/icons/sprite'

export default async function Home() {
  const destaques = (await listProducts({ ordem: 'relevancia' })).slice(0, 4)

  return (
    <main id="conteudo">
      <section className="bg-ink px-6 py-20 text-cream">
        <div className="mx-auto max-w-6xl">
          <p className="flex items-center gap-2 text-sm uppercase tracking-wide text-terracota">
            <Icon name="paw" className="h-4 w-4" />
            Cuidados e bem-estar para cada animal
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-5xl font-bold leading-tight">
            Cuide do seu companheiro com produtos pensados para a vida real.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/80">
            Alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos animais.
          </p>
          {/* Aponta para a loja inteira, não para uma categoria escolhida a
              dedo: o botão principal não depende de uma categoria existir nem
              de ela ter produtos. */}
          <Link
            href="/produtos"
            className="mt-8 inline-block rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark"
          >
            Explorar loja
          </Link>
        </div>
      </section>

      {destaques.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-2xl font-bold text-ink">Em destaque</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
