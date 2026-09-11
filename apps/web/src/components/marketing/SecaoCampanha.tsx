import { Link } from '../../i18n/navigation'
import { MediaPlaceholder, type MediaPlaceholderType } from '../ui/MediaPlaceholder'

/**
 * As duas faixas de campanha/editorial da home estrutural (posições 6 e 9
 * da spec). Mobile empilha com a mídia sempre primeiro — a mesma regra do
 * `Hero`; em `md` os dois lados se alternam por `inverter`, para as duas
 * campanhas não ficarem espelhadas ao acaso uma da outra.
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
  return (
    <section className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
      <div className="grid gap-6 md:grid-cols-2 md:items-center md:gap-10">
        <div className={inverter ? 'order-1 md:order-2' : 'order-1'}>
          <MediaPlaceholder ratio="16/9" type={tipo} label={titulo} />
        </div>
        <div className={inverter ? 'order-2 md:order-1' : 'order-2'}>
          <h2 className="text-secao text-ink">{titulo}</h2>
          <p className="mt-3 max-w-leitura text-ink-muted">{texto}</p>
          <Link href={ctaHref} className="botao-principal botao-principal-pequeno mt-6 inline-flex">
            {ctaTexto}
          </Link>
        </div>
      </div>
    </section>
  )
}
