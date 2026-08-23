import Image from 'next/image'
import { FOTOS_MARKETING } from '../../lib/fotosMarketing'

/**
 * Voz da marca, não avaliação de cliente — daí as citações serem assinadas
 * por um animal, com nome e idade, e não por "cliente verificado". A
 * especificação da loja proíbe avaliação inventada (`Reviews.ts`, "avaliações
 * não se inventam"); isto não pretende ser uma, é humor de marca.
 */
const TESTEMUNHOS = [
  {
    src: FOTOS_MARKETING.bulldogCamisola,
    alt: 'Bulldog francês com camisola amarela, sobre fundo azul',
    fala: '"A camisola é ridícula. Não a tires."',
    assinatura: '— Óscar, 2 anos, Bulldog Francês',
  },
  {
    src: FOTOS_MARKETING.gatinhoAEsticar,
    alt: 'Gatinho a esticar a pata para cima, sobre fundo verde-água',
    fala: '"Escondo o crime na areia nova. Silenciosa. 5 estrelas."',
    assinatura: '— Mimi, 1 ano, Gata',
  },
  {
    src: FOTOS_MARKETING.cachorroRetriever,
    alt: 'Cachorro golden retriever com coleira, sentado num quintal ao sol',
    fala: '"Testei a coleira. Continuo aqui. Aprovo."',
    assinatura: '— Bóris, 3 meses, Golden Retriever',
  },
  {
    src: FOTOS_MARKETING.gatoMalhado,
    alt: 'Gato malhado laranja deitado numa mesa de madeira',
    fala: '"Dormi na cama nova 14 horas. Sem arrependimentos."',
    assinatura: '— Simba, 4 anos, Gato',
  },
]

export function AprovadoPorQuemManda() {
  return (
    <section className="bg-ink px-6 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl">Aprovado por quem manda</h2>
        <p className="mt-3 max-w-xl text-white/70">Não fomos nós que dissemos. Foram eles.</p>

        <ul className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {TESTEMUNHOS.map((t) => (
            <li
              key={t.assinatura}
              className="overflow-hidden rounded-card border border-white/10 bg-white/5"
            >
              <div className="relative aspect-square">
                <Image src={t.src} alt={t.alt} fill sizes="25vw" className="object-cover" />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold leading-snug">{t.fala}</p>
                <p className="mt-2 text-xs text-white/60">{t.assinatura}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
