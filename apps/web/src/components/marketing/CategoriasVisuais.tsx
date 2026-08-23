import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { FOTOS_MARKETING } from '../../lib/fotosMarketing'

/**
 * Fotografia de referência por categoria "de animal". Uma categoria que não
 * esteja aqui (as "por necessidade": Alimentação, Higiene, ...) cai
 * automaticamente na fiada de pills abaixo — é o retrocesso seguro para uma
 * categoria nova que ainda não tenha foto escolhida, não um erro.
 */
const FOTO_ANIMAL: Record<string, string> = {
  caes: FOTOS_MARKETING.cachorroRetriever,
  gatos: FOTOS_MARKETING.gatoMalhado,
  passaros: FOTOS_MARKETING.papagaioPoleiro,
  roedores: FOTOS_MARKETING.porquinhosDaIndia,
  aquario: FOTOS_MARKETING.peixeDourado,
}

export async function CategoriasVisuais({
  categorias,
  contagens,
}: {
  categorias: { name: string; slug: string }[]
  contagens: Record<string, number>
}) {
  const t = await getTranslations('CategoriasVisuais')
  const animais = categorias.flatMap((c) => {
    const foto = FOTO_ANIMAL[c.slug]
    return foto ? [{ categoria: c, foto }] : []
  })
  const porNecessidade = categorias.filter((c) => !FOTO_ANIMAL[c.slug])

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <h2 className="text-3xl sm:text-4xl">{t('titulo')}</h2>
      <p className="mt-3 max-w-xl text-ink-muted">{t('texto')}</p>

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {animais.map(({ categoria: c, foto }) => (
          <li key={c.slug}>
            <Link
              href={`/${c.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-card"
            >
              <Image
                src={foto}
                alt=""
                fill
                sizes="(min-width: 1024px) 20vw, 45vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
              <span className="absolute bottom-3 left-3 text-white">
                <span className="block text-lg font-bold">{c.name}</span>
                <span className="block text-xs text-white/85">
                  {t('produtos', { count: contagens[c.slug] ?? 0 })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {porNecessidade.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
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
      ) : null}
    </section>
  )
}
