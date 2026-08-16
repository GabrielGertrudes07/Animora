export type LinhaVendida = {
  quantidade: number
  precoUnitarioCents: number
  /** `null` quando a encomenda é antiga e o custo nunca foi registado — não é o mesmo que custar zero. */
  custoUnitarioCents: number | null
}

export type ResumoVendas = {
  faturacaoCents: number
  /** Soma do custo só das linhas com custo registado. Zero quando nenhuma linha o tem. */
  custoCents: number
  /** Soma de (preço − custo) × quantidade só das linhas com custo registado. */
  lucroCents: number
  /**
   * Margem em centésimos de ponto percentual (33,33% ⇒ 3333), o mesmo princípio
   * de "inteiro × 100" que `money.ts` usa para cêntimos.
   *
   * `null` sempre que houver pelo menos uma linha sem custo registado: nesse caso
   * `lucroCents`/`custoCents` cobrem só as linhas conhecidas, e uma margem calculada
   * sobre dados incompletos fingiria uma precisão que não existe. Ver
   * `unidadesSemCustoConhecido` para saber quantas unidades ficam de fora.
   */
  margemPercent: number | null
  unidades: number
  /** Unidades vendidas cujo custo não é conhecido (null) — não confundir com custo zero. */
  unidadesSemCustoConhecido: number
}

export class RelatorioError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RelatorioError'
  }
}

/**
 * Agrega linhas de vendas em faturação, custo, lucro e margem — tudo em
 * cêntimos inteiros, sem base de dados.
 *
 * Custo nulo (encomendas antigas sem custo congelado) nunca é tratado como
 * zero: tratá-lo como zero faria a margem dessas vendas aparecer como 100%
 * e inflaria o lucro. Em vez disso essas unidades são excluídas do cálculo
 * de custo/lucro e contadas à parte em `unidadesSemCustoConhecido`, e a
 * margem agregada recusa-se a ser calculada (`null`) sempre que faltar
 * custo nalguma linha.
 */
export function agregarVendas(linhas: LinhaVendida[]): ResumoVendas {
  for (const l of linhas) {
    if (!Number.isInteger(l.quantidade) || l.quantidade < 1) {
      throw new RelatorioError(
        `Quantidade inválida: ${l.quantidade}. Tem de ser um inteiro igual ou maior que 1.`,
      )
    }
    if (!Number.isInteger(l.precoUnitarioCents) || l.precoUnitarioCents < 0) {
      throw new RelatorioError(
        `Preço inválido: ${l.precoUnitarioCents}. Tem de ser cêntimos inteiros não negativos.`,
      )
    }
    if (
      l.custoUnitarioCents !== null &&
      (!Number.isInteger(l.custoUnitarioCents) || l.custoUnitarioCents < 0)
    ) {
      throw new RelatorioError(
        `Custo inválido: ${l.custoUnitarioCents}. Tem de ser null ou cêntimos inteiros não negativos.`,
      )
    }
  }

  let faturacaoCents = 0
  let custoCents = 0
  let lucroCents = 0
  let unidades = 0
  let unidadesSemCustoConhecido = 0

  for (const l of linhas) {
    faturacaoCents += l.precoUnitarioCents * l.quantidade
    unidades += l.quantidade

    if (l.custoUnitarioCents === null) {
      unidadesSemCustoConhecido += l.quantidade
      continue
    }

    custoCents += l.custoUnitarioCents * l.quantidade
    lucroCents += (l.precoUnitarioCents - l.custoUnitarioCents) * l.quantidade
  }

  const margemPercent =
    unidadesSemCustoConhecido > 0
      ? null
      : faturacaoCents === 0
        ? 0
        : Math.round((lucroCents / faturacaoCents) * 10000) || 0 // `|| 0` normaliza -0

  return { faturacaoCents, custoCents, lucroCents, margemPercent, unidades, unidadesSemCustoConhecido }
}
