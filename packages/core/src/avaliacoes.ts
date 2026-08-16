export type ResumoAvaliacoes = {
  /**
   * Média em décimos inteiros: 4,3 ⇒ `43`. A mesma convenção "inteiro × 10" que
   * `money.ts` usa para cêntimos e `relatorios.ts` para a margem — nenhum
   * decimal atravessa uma fronteira deste projeto.
   *
   * `null` quando não há avaliações nenhumas. **Nunca zero.** Zero é uma
   * média possível de escrever mas impossível de obter (as notas vão de 1 a 5),
   * por isso um zero aqui só poderia querer dizer "não sei" — e um "não sei"
   * disfarçado de número é o que faz uma loja nova anunciar estrelas que
   * ninguém deu. É a doutrina do `margemPercent`: o que não se sabe aparece
   * como não se sabendo, e quem mostra decide o que fazer com o silêncio.
   */
  media: number | null
  /** Quantas avaliações entraram na conta. */
  total: number
}

export class AvaliacaoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AvaliacaoError'
  }
}

/**
 * Média e contagem de um conjunto de notas de 1 a 5.
 *
 * Recebe as estrelas já filtradas por quem chama — esta função não sabe o que é
 * uma avaliação aprovada, e é de propósito: a moderação é regra da API
 * (`collections/Reviews.ts`), aqui só entra aritmética.
 *
 * Arredonda ao décimo mais próximo, com o meio para cima (`Math.round`): 4,35
 * sai 4,4. Fazer a divisão já em décimos (`soma × 10 / n`) em vez de arredondar
 * uma média decimal evita o segundo arredondamento e a vírgula flutuante que
 * vem com ele.
 */
export function agregarAvaliacoes(estrelas: number[]): ResumoAvaliacoes {
  let soma = 0

  for (const nota of estrelas) {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw new AvaliacaoError(
        `Estrelas inválidas: ${String(nota)}. Tem de ser um inteiro entre 1 e 5.`,
      )
    }
    soma += nota
  }

  if (estrelas.length === 0) return { media: null, total: 0 }

  return { media: Math.round((soma * 10) / estrelas.length), total: estrelas.length }
}
