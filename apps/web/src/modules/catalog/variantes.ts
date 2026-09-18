export type GrupoAtributo = { chave: string; valores: string[] }

/**
 * Agrupa variantes por atributo — uma entrada por chave de `combination`,
 * com os valores distintos que aparecem entre elas.
 *
 * Só faz sentido como seletor (Tamanho: S/M/L, Cor: Preto/Branco) quando
 * TODAS as variantes têm exatamente o mesmo conjunto de chaves — uma matriz
 * regular. Uma variante com uma chave a mais ou a menos (dado real mal
 * cadastrado, ou um produto que mistura tipos de opção) devolve `null`: quem
 * chama continua com a lista de linhas, mais segura para uma combinação
 * irregular do que um seletor que finge uma grelha que não existe.
 *
 * Com 0 ou 1 variante devolve `null` de propósito — é o caso de longe mais
 * comum no catálogo real desta loja hoje (todos os 42 produtos semeados têm
 * uma única variante), e não há nada para agrupar.
 */
export function agruparPorAtributo(
  variantes: readonly { combination: Record<string, string> }[],
): GrupoAtributo[] | null {
  if (variantes.length < 2) return null

  const chaves = [...new Set(variantes.flatMap((v) => Object.keys(v.combination)))].sort()
  if (chaves.length === 0) return null

  const regular = variantes.every((v) => {
    const doVariante = Object.keys(v.combination).sort()
    return doVariante.length === chaves.length && doVariante.every((c, i) => c === chaves[i])
  })
  if (!regular) return null

  return chaves.map((chave) => ({
    chave,
    valores: [
      ...new Set(
        variantes.map((v) => v.combination[chave]).filter((v): v is string => v !== undefined),
      ),
    ],
  }))
}

/** A variante cuja `combination` bate exatamente com `selecao` — ou nenhuma. */
export function encontrarVariante<V extends { combination: Record<string, string> }>(
  variantes: readonly V[],
  selecao: Record<string, string>,
): V | undefined {
  const chavesSelecao = Object.keys(selecao)
  return variantes.find((v) => {
    const chaves = Object.keys(v.combination)
    return (
      chaves.length === chavesSelecao.length && chavesSelecao.every((c) => v.combination[c] === selecao[c])
    )
  })
}
