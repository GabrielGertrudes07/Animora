const CHAVE = 'animora.vistos'
const MAXIMO = 8

/**
 * A lista depois de registar uma visualização: o produto sobe ao topo, sem
 * duplicar, e a lista nunca cresce além de `MAXIMO`. Puro de propósito —
 * mesma disciplina de `modules/cart/carrinho.ts` — para ser testável sem
 * `localStorage` nenhum.
 */
export function comVisto(atuais: number[], produtoId: number): number[] {
  return [produtoId, ...atuais.filter((id) => id !== produtoId)].slice(0, MAXIMO)
}

/** Ids dos últimos produtos vistos, mais recente primeiro. */
export function listarVistos(): number[] {
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(bruto) ? bruto.filter((id): id is number => typeof id === 'number') : []
  } catch {
    // `localStorage` indisponível (modo privado) ou JSON partido — sem
    // histórico é aceitável; a página não pode depender disto para existir.
    return []
  }
}

/** Regista que `produtoId` acabou de ser visto. */
export function registarVisto(produtoId: number): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(comVisto(listarVistos(), produtoId)))
  } catch {
    /* idem */
  }
}
