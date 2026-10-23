import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { FOTOS_MARKETING } from '../../lib/fotosMarketing'
import { getAvaliacaoLoja } from '../../modules/catalog'
import { Estrelas } from '../ui/Estrelas'
import { Revelar } from '../motion/Revelar'

/**
 * Voz da marca, não avaliação de cliente — daí as citações serem assinadas
 * por um animal, com nome e idade, e não por "cliente verificado". A
 * especificação da loja proíbe avaliação inventada (`Reviews.ts`, "avaliações
 * não se inventam"); isto não pretende ser uma, é humor de marca.
 *
 * A média real da loja (antes um bloco à parte, `ProvaSocial`) entra aqui por
 * cima — a spec da home estrutural não lista uma secção própria para ela, e
 * separá-la do bloco de confiança da marca era o que a partia ao meio.
 *
 * Fase estrutural v1: fundo neutro (não é mais `chao-floresta`) — não
 * reativa a direção "Clareira e Balcão".
 */
export async function AprovadoPorQuemManda() {
  const [t, avaliacaoLoja] = await Promise.all([
    getTranslations('AprovadoPorQuemManda'),
    getAvaliacaoLoja(),
  ])

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
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <Revelar>
        <h2 className="text-titulo text-text">{t('titulo')}</h2>
        <p className="mt-3 max-w-xl text-text-muted">{t('texto')}</p>
      </Revelar>

      {avaliacaoLoja.media !== null ? (
        <div className="mt-5 flex items-center gap-2">
          <Estrelas resumo={avaliacaoLoja} className="text-base" />
        </div>
      ) : null}

      <ul className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {testemunhos.map((tst) => (
          <li key={tst.assinatura} className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="relative aspect-square">
              <Image
                src={tst.src}
                alt={tst.alt}
                fill
                sizes="(min-width: 1280px) 286px, (min-width: 1024px) 23vw, (min-width: 640px) 46vw, 45vw"
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold leading-snug text-text">{tst.fala}</p>
              <p className="mt-2 text-xs text-text-muted">{tst.assinatura}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
