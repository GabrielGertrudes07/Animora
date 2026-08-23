import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { FOTOS_MARKETING } from '../../lib/fotosMarketing'

/**
 * Voz da marca, não avaliação de cliente — daí as citações serem assinadas
 * por um animal, com nome e idade, e não por "cliente verificado". A
 * especificação da loja proíbe avaliação inventada (`Reviews.ts`, "avaliações
 * não se inventam"); isto não pretende ser uma, é humor de marca.
 */
export async function AprovadoPorQuemManda() {
  const t = await getTranslations('AprovadoPorQuemManda')

  const testemunhos = [
    {
      src: FOTOS_MARKETING.bulldogCamisola,
      alt: t('testemunho1Alt'),
      fala: t('testemunho1Fala'),
      assinatura: t('testemunho1Assinatura'),
    },
    {
      src: FOTOS_MARKETING.gatinhoAEsticar,
      alt: t('testemunho2Alt'),
      fala: t('testemunho2Fala'),
      assinatura: t('testemunho2Assinatura'),
    },
    {
      src: FOTOS_MARKETING.cachorroRetriever,
      alt: t('testemunho3Alt'),
      fala: t('testemunho3Fala'),
      assinatura: t('testemunho3Assinatura'),
    },
    {
      src: FOTOS_MARKETING.gatoMalhado,
      alt: t('testemunho4Alt'),
      fala: t('testemunho4Fala'),
      assinatura: t('testemunho4Assinatura'),
    },
  ]

  return (
    <section className="bg-ink px-6 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl">{t('titulo')}</h2>
        <p className="mt-3 max-w-xl text-white/70">{t('texto')}</p>

        <ul className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {testemunhos.map((tst) => (
            <li
              key={tst.assinatura}
              className="overflow-hidden rounded-card border border-white/10 bg-white/5"
            >
              <div className="relative aspect-square">
                <Image src={tst.src} alt={tst.alt} fill sizes="25vw" className="object-cover" />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold leading-snug">{tst.fala}</p>
                <p className="mt-2 text-xs text-white/60">{tst.assinatura}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
