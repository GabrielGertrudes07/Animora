import { Link } from '../../i18n/navigation'
import { MediaPlaceholder, type MediaPlaceholderType } from '../ui/MediaPlaceholder'

/**
 * As duas faixas de campanha/editorial da home estrutural (spec original
 * §7, "banners secundários": dois cards, radius 24px, altura 250–320px
 * desktop, "um pode usar fundo turquesa e outro creme"). Mobile empilha
 * com a mídia sempre primeiro — a mesma regra do `Hero`; em `md` os dois
 * lados se alternam por `inverter`, para as duas campanhas não ficarem
 * espelhadas ao acaso uma da outra.
 *
 * A escolha de cor não é aleatória por chamada: é o `tipo` que já existe
 * (`campaign`/`editorial`) que decide, para o mesmo tipo dar sempre o
 * mesmo fundo em qualquer página futura que reutilize o componente.
 * `tipo="campaign"` é a primeira chamada em `page.tsx` hoje (antes de
 * "ofertas da semana") → turquesa (`bg-teal-700`); `tipo="editorial"` é a
 * segunda (depois de "destaques por categoria") → creme (`bg-cream`),
 * mantendo a ordem visual já existente na home.
 *
 * Copy propositalmente genérica nesta fase: nenhuma campanha real foi
 * decidida ainda, e inventar uma manchete específica seria a mesma
 * direção de arte que esta fase evita, só que em palavras.
 */
export function SecaoCampanha({
  tipo,
  titulo,
  texto,
  ctaTexto,
  ctaHref,
  inverter = false,
}: {
  tipo: MediaPlaceholderType
  titulo: string
  texto: string
  ctaTexto: string
  ctaHref: string
  inverter?: boolean
}) {
  const teal = tipo === 'campaign'

  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <div
        className={`grid min-h-[250px] gap-6 rounded-xl p-6 sm:p-8 md:grid-cols-2 md:items-center md:gap-10 lg:min-h-[320px] ${
          teal ? 'bg-teal-700 text-white' : 'bg-cream text-teal-900'
        }`}
      >
        <div className={inverter ? 'order-1 md:order-2' : 'order-1'}>
          <MediaPlaceholder ratio="16/9" type={tipo} label={titulo} className="rounded-lg" />
        </div>
        <div className={inverter ? 'order-2 md:order-1' : 'order-2'}>
          <h2 className="text-secao">{titulo}</h2>
          <p className={`mt-3 max-w-leitura ${teal ? 'text-white/80' : 'text-teal-900/70'}`}>{texto}</p>
          <Link href={ctaHref} className="botao-principal botao-principal-pequeno mt-6 inline-flex">
            {ctaTexto}
          </Link>
        </div>
      </div>
    </section>
  )
}
