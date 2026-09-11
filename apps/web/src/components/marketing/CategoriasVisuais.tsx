import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { PalcoCategorias } from './PalcoCategorias'

/**
 * Categorias "de animal" com cena própria em `public/categorias/<slug>/`.
 *
 * Hoje cada uma vem em duas camadas — `fundo.webp` (o cenário) e `animal.webp`
 * (o animal recortado) — porque o hover antigo fazia o animal sair da moldura.
 * Esse gesto exigia da arte três coisas que os recortes não tinham: contorno
 * sem halo, sombra de contacto, e a mesma direção de luz nas duas camadas. Sem
 * elas, o olho lê colagem.
 *
 * O hover passou a um zoom contido do conjunto, que não precisa de camadas
 * separadas. Quando as cenas novas chegarem — o animal já dentro do cenário,
 * com sombra real (ver o briefing de arte) — apaga-se a segunda `<Image>` e
 * troca-se `fundo.webp` por `cena.webp`. Mais nada neste ficheiro muda.
 *
 * Uma categoria que não esteja aqui (as "por necessidade": Alimentação,
 * Higiene, ...) cai automaticamente na fiada de pills abaixo — é o retrocesso
 * seguro para uma categoria nova que ainda não tenha cena, não um erro.
 */
const COM_CENA = new Set(['caes', 'gatos', 'passaros', 'roedores', 'aquario'])

export async function CategoriasVisuais({
  categorias,
  contagens,
}: {
  categorias: { name: string; slug: string }[]
  contagens: Record<string, number>
}) {
  const t = await getTranslations('CategoriasVisuais')
  const animais = categorias.filter((c) => COM_CENA.has(c.slug))
  const porNecessidade = categorias.filter((c) => !COM_CENA.has(c.slug))

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
                {/* As duas camadas escalam juntas — daí o zoom viver neste
                    envelope e não em cada imagem. É também o que deixa o
                    componente pronto para uma cena de camada única. */}
                <span className="absolute inset-0 transition-transform duration-500 ease-loja group-hover:scale-[1.04] group-focus-visible:scale-[1.04]">
                  <Image
                    src={`/categorias/${c.slug}/fundo.webp`}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(min-width: 1024px) 20vw, 45vw"
                    className="object-cover"
                  />
                  <Image
                    src={`/categorias/${c.slug}/animal.webp`}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(min-width: 1024px) 20vw, 45vw"
                    className="object-contain object-bottom"
                  />
                </span>

                <span className="absolute inset-0 bg-gradient-to-t from-floresta/85 via-floresta/10 to-transparent" />

                <span className="absolute bottom-3 left-3 text-papel transition-transform duration-300 ease-loja group-hover:-translate-y-1">
                  <span className="block text-base font-bold sm:text-lg">{c.name}</span>
                  <span className="block text-xs tabular-nums text-papel/80">
                    {t('produtos', { count: contagens[c.slug] ?? 0 })}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </PalcoCategorias>

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
