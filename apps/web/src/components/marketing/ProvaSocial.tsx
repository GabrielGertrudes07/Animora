import { getAvaliacaoLoja } from '../../modules/catalog'
import { Estrelas } from '../ui/Estrelas'

/**
 * A média real de avaliações aprovadas de toda a loja — nunca um número
 * inventado. Enquanto não houver avaliações (uma loja nova, ou em
 * desenvolvimento), esta secção não aparece: nada substitui o número real,
 * nem um "brevemente" nem um zero. Ver `getAvaliacaoLoja` e a doutrina de
 * `agregarAvaliacoes` em `@animora/core`.
 */
export async function ProvaSocial() {
  const avaliacao = await getAvaliacaoLoja()
  if (avaliacao.media === null) return null

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
      <h2 className="text-3xl sm:text-4xl">A avaliação de quem já comprou</h2>
      <div className="mt-5 flex justify-center">
        <Estrelas resumo={avaliacao} className="text-base" />
      </div>
    </section>
  )
}
