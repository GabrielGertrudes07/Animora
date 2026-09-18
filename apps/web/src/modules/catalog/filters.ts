import type { AttributeDef } from './types'

export type SortKey = 'relevancia' | 'preco-asc' | 'preco-desc' | 'recentes'

const SORT_KEYS: readonly SortKey[] = ['relevancia', 'preco-asc', 'preco-desc', 'recentes']

/** Os únicos parâmetros com significado fixo. Tudo o resto na query string é
 * lido como um filtro de atributo, pela chave — ver `parseFilters`. */
const RESERVADOS = new Set(['marca', 'preco', 'ordem', 'q'])

export type CatalogFilters = {
  /**
   * O texto pesquisado. Vive aqui, e não à parte, por uma razão prática: o
   * `filtersToQuery` é o único sítio do projeto que monta a query string do
   * catálogo, e é dele que saem os endereços da barra de filtros e da caixa de
   * ordenação. Com a pesquisa fora de `CatalogFilters`, escolher uma marca
   * depois de procurar apagava a procura — e a pesquisa combina com os filtros,
   * não os substitui.
   */
  q?: string
  marca?: string[]
  precoMin?: number
  precoMax?: number
  /** Chave do atributo (ver `AttributeDef.chave`) → valores escolhidos.
   * Para `tipo: 'intervalo'` são dois valores `[min, max]`, como `preco`;
   * para os outros tipos, a lista de valores selecionados. */
  atributos?: Record<string, string[]>
  ordem: SortKey
}

type SearchParams = Record<string, string | string[] | undefined>

function toArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

/**
 * Lê os filtros da query string.
 *
 * Só reconhece parâmetros públicos. Qualquer outro — incluindo tentativas
 * de filtrar por campos internos como `fornecedor` ou `costCents` — não tem
 * efeito nenhum na consulta à API: entra em `atributos` como uma chave
 * qualquer, mas só é aplicado se corresponder a um atributo realmente ativo
 * (ver `resolveActiveAttributeDefs` e `filtrarPorAtributos` em `facets.ts`) —
 * e um atributo `interno` nunca entra nessa lista, porque a API já o exclui
 * de `/api/attributes` sem sessão. Não há aqui lista de nomes proibidos para
 * manter: a defesa é a mesma allowlist, só que resolvida mais tarde, com os
 * dados reais do catálogo.
 */
export function parseFilters(sp: SearchParams): CatalogFilters {
  const f: CatalogFilters = { ordem: 'relevancia' }

  // `?q=` vazio, ou só com espaços, é não haver pesquisa nenhuma — devolve a
  // loja toda, não zero resultados. Um `?q=a&q=b` fica pelo primeiro: a caixa
  // de pesquisa é uma só e não há segunda leitura de "duas pesquisas".
  const q = toArray(sp.q)?.[0]?.trim()
  if (q) f.q = q

  const marca = toArray(sp.marca)
  if (marca && marca.length > 0) f.marca = marca

  const preco = typeof sp.preco === 'string' ? sp.preco : undefined
  if (preco && /^\d+-\d+$/.test(preco)) {
    const [a, b] = preco.split('-').map((n) => Number(n) * 100)
    if (a !== undefined && b !== undefined) {
      f.precoMin = Math.min(a, b)
      f.precoMax = Math.max(a, b)
    }
  }

  const ordem = typeof sp.ordem === 'string' ? sp.ordem : undefined
  if (ordem && (SORT_KEYS as readonly string[]).includes(ordem)) {
    f.ordem = ordem as SortKey
  }

  const atributos: Record<string, string[]> = {}
  for (const [chave, bruto] of Object.entries(sp)) {
    if (RESERVADOS.has(chave)) continue
    const valores = toArray(bruto)
    if (valores && valores.length > 0) atributos[chave] = valores
  }
  if (Object.keys(atributos).length > 0) f.atributos = atributos

  return f
}

/** Escreve os filtros de volta na query string, omitindo o que é omissão. */
export function filtersToQuery(f: CatalogFilters): string {
  const p = new URLSearchParams()

  // Primeiro, para o endereço se ler como o que é: uma pesquisa, filtrada.
  if (f.q) p.set('q', f.q)

  for (const m of f.marca ?? []) p.append('marca', m)

  if (f.precoMin !== undefined && f.precoMax !== undefined) {
    p.set('preco', `${f.precoMin / 100}-${f.precoMax / 100}`)
  }

  for (const [chave, valores] of Object.entries(f.atributos ?? {})) {
    for (const valor of valores) p.append(chave, valor)
  }

  if (f.ordem !== 'relevancia') p.set('ordem', f.ordem)

  return p.toString()
}

type LinhaAtributoConfig = { atributo?: unknown; visivel?: boolean | null }

/** Forma da resposta pública de `/api/globals/configuracao-filtros`. */
export type ConfiguracaoFiltrosRaw = {
  padrao?: LinhaAtributoConfig[] | null
  porCategoria?: { categoria?: unknown; atributos?: LinhaAtributoConfig[] | null }[] | null
}

function idDaRelacao(raw: unknown): number | undefined {
  const v = typeof raw === 'object' && raw !== null ? (raw as { id?: unknown }).id : raw
  return typeof v === 'number' ? v : undefined
}

/**
 * Os atributos ativos como filtro, na ordem configurada, para a categoria
 * dada (ou os globais, sem categoria).
 *
 * A ordem das linhas é a ordem final: `computeAttributeFacets` não lhe volta
 * a mexer. O `ordem` do próprio atributo é só a omissão de quem não está
 * configurado — é ele que ordena `defs` à chegada (`listAttributeDefs` pede
 * `sort=ordem` à API), e a configuração escolhe e reordena por cima disso.
 *
 * Uma linha com `visivel: false`, ou cujo `atributo` já não corresponde a
 * nenhum `AttributeDef` conhecido — incluindo um `interno`, que nunca chega a
 * `defs` porque a API já o tirou de `/api/attributes` sem sessão — desaparece
 * em silêncio. Uma categoria com substituição em `porCategoria` ignora
 * `padrao` por completo: é assim que "Ração" filtra por peso e "Coleiras"
 * por tamanho, cada uma com o seu próprio conjunto.
 */
export function resolveActiveAttributeDefs(
  defs: AttributeDef[],
  config: ConfiguracaoFiltrosRaw,
  categoriaId?: number,
): AttributeDef[] {
  const porId = new Map(defs.map((d) => [d.id, d]))

  const substituicao =
    categoriaId === undefined
      ? undefined
      : (config.porCategoria ?? []).find((linha) => idDaRelacao(linha.categoria) === categoriaId)

  const linhas = substituicao ? (substituicao.atributos ?? []) : (config.padrao ?? [])

  return linhas
    .filter((l) => l.visivel !== false)
    .map((l) => idDaRelacao(l.atributo))
    .map((id) => (id !== undefined ? porId.get(id) : undefined))
    .filter((d): d is AttributeDef => d !== undefined)
}

/**
 * Fecha `f.atributos` ao conjunto de atributos ativos — chamar logo a seguir
 * a `resolveActiveAttributeDefs`, antes de `f` viajar para mais algum lado.
 *
 * `filtrarPorAtributos` (em `facets.ts`) já ignora em silêncio uma chave que
 * não é atributo ativo NA FILTRAGEM, mas isso não bastava: `f` também é passado
 * como prop a Client Components (`FiltrosCatalogo`, `OrdenarPor`) para pintar o
 * estado da UI, e o React serializa props no HTML/estado do cliente — uma
 * chave qualquer forçada no URL, como `margem-alvo` (o atributo interno),
 * ficava a aparecer aí em texto, mesmo sem filtrar nada. Esta função é o que
 * impede isso: só o que sobrevive aqui é que se passa adiante.
 */
export function restringirAtributosAtivos(f: CatalogFilters, ativos: AttributeDef[]): CatalogFilters {
  const chaves = new Set(ativos.map((a) => a.chave))
  const atributos = Object.fromEntries(
    Object.entries(f.atributos ?? {}).filter(([chave]) => chaves.has(chave)),
  )

  if (Object.keys(atributos).length === 0) {
    const { atributos: _semEfeito, ...resto } = f
    return resto
  }
  return { ...f, atributos }
}
