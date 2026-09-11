import { getTranslations } from 'next-intl/server'
import { FOTOS_MARKETING } from '../../lib/fotosMarketing'
import { MediaPlaceholder } from '../ui/MediaPlaceholder'

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
    <section className="chao-floresta px-6 py-secao">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-titulo">{t('titulo')}</h2>
        <p className="mt-3 max-w-xl text-papel/70">{t('texto')}</p>

        <ul className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {testemunhos.map((tst) => (
            <li
              key={tst.assinatura}
              // Sobre floresta, um cartão distingue-se do chão pela sua
              // própria superfície — um branco a 5,5% — e por um aro hairline.
              // Não por sombra: uma sombra preta sobre um fundo quase preto não
              // se vê, e o aro dourado que aqui estava era a peça que mais
              // atraiçoava a gama.
              className="overflow-hidden rounded-card bg-white/[0.055] ring-1 ring-inset ring-white/10"
            >
              <div className="relative aspect-square">
                {/* Fase estrutural v1: sem fotografia (`tst.src`/`tst.alt`
                    preservados para a fase de criativos). */}
                <MediaPlaceholder ratio="1/1" type="testimonial" fill />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold leading-snug text-papel">{tst.fala}</p>
                <p className="mt-2 text-xs text-papel/55">{tst.assinatura}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
