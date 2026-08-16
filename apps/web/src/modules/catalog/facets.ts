import type { AttributeDef, AttributeFacet, PublicProduct } from './types'

/**
 * A mesma normalização de `chave` que a API aplica a `Attributes.chave`
 * (`Attributes.ts`, `beforeValidate`): minúsculas, sem espaços a mais. É o que
 * permite comparar a chave de um atributo ("tamanho") com o nome de uma opção
 * de variante escrito à mão no produto ("Tamanho") — ver `combination` em
 * `Variants.ts` e o uso em `produto/[slug]/page.tsx`.
 */
function normalizar(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, '-')
}

function valoresReais(produtos: PublicProduct[], chave: string): string[] {
  const vistos = new Set<string>()
  for (const p of produtos) {
    for (const v of p.variants) {
      for (const [nomeOpcao, valor] of Object.entries(v.combination)) {
        if (normalizar(nomeOpcao) === chave) vistos.add(valor)
      }
    }
  }
  return [...vistos]
}

/**
 * Limites reais de preço (cêntimos) do catálogo dado — nunca uma constante.
 * `undefined` quando não há nenhuma variante para mostrar (categoria vazia):
 * aí não há intervalo nenhum a oferecer.
 */
export function precoBounds(produtos: PublicProduct[]): { min: number; max: number } | undefined {
  const precos = produtos.flatMap((p) => p.variants.map((v) => v.priceCents))
  if (precos.length === 0) return undefined
  return { min: Math.min(...precos), max: Math.max(...precos) }
}

/** Marcas que existem mesmo entre os produtos dados, não o catálogo inteiro. */
export function marcasDisponiveis(produtos: PublicProduct[]): { nome: string; slug: string }[] {
  const vistas = new Map<string, string>()
  for (const p of produtos) vistas.set(p.brand.slug, p.brand.name)
  return [...vistas.entries()]
    .map(([slug, nome]) => ({ nome, slug }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}

/**
 * Cruza os atributos ativos (já resolvidos para a categoria, ver
 * `resolveActiveAttributeDefs` em `filters.ts`) com os valores que existem
 * MESMO nos produtos publicados dados.
 *
 * Um atributo sem nenhum valor real — ou, para `tipo: 'intervalo'`, sem
 * nenhum valor que seja número — não aparece: é a regra central desta
 * tarefa, um filtro que devolveria sempre zero resultados nunca é oferecido.
 *
 * **A ordem que entra é a ordem que sai.** Quem chama já a decidiu: é a das
 * linhas do ecrã de configuração de filtros (`resolveActiveAttributeDefs`).
 * Reordenar aqui por `attr.ordem` — como esta função fazia — desfazia o
 * arrastar das linhas no painel e tornava esse ecrã decorativo. O campo
 * `ordem` do atributo continua a ser a omissão, aplicada uma camada acima
 * (`listAttributeDefs` pede `sort=ordem` à API): é ele que ordena a lista de
 * atributos antes de a configuração lhe mexer.
 */
export function computeAttributeFacets(
  produtos: PublicProduct[],
  ativos: AttributeDef[],
): AttributeFacet[] {
  const facetas: AttributeFacet[] = []

  for (const attr of ativos) {
    const valores = valoresReais(produtos, attr.chave)
    if (valores.length === 0) continue

    if (attr.tipo === 'intervalo') {
      const numeros = valores.map(Number).filter((n) => Number.isFinite(n))
      if (numeros.length === 0) continue
      facetas.push({ ...attr, valores, min: Math.min(...numeros), max: Math.max(...numeros) })
    } else {
      facetas.push({ ...attr, valores: [...valores].sort((a, b) => a.localeCompare(b, 'pt')) })
    }
  }

  return facetas
}

/**
 * Reduz `produtos` aos que combinam com os valores escolhidos por atributo.
 *
 * Ignora em silêncio qualquer chave em `selecionados` que não corresponda a
 * um atributo em `ativos` — a mesma defesa em profundidade da API: nunca
 * confiar só na query string, mesmo vinda do próprio formulário da loja.
 * É assim que um parâmetro forçado no URL para um atributo `interno` (que
 * nunca chega a `ativos`, porque a API já o excluiu de `/api/attributes`)
 * fica sem efeito nenhum, em vez de rebentar ou de filtrar por um campo que
 * não existe em `combination`.
 */
export function filtrarPorAtributos(
  produtos: PublicProduct[],
  selecionados: Record<string, string[]>,
  ativos: AttributeDef[],
): PublicProduct[] {
  const porChave = new Map(ativos.map((a) => [a.chave, a]))
  let resultado = produtos

  for (const [chave, valores] of Object.entries(selecionados)) {
    const attr = porChave.get(chave)
    if (!attr || valores.length === 0) continue

    if (attr.tipo === 'intervalo') {
      const [minStr, maxStr] = valores
      const min = Number(minStr)
      const max = Number(maxStr)
      if (!Number.isFinite(min) || !Number.isFinite(max)) continue

      resultado = resultado.filter((p) =>
        p.variants.some((v) =>
          Object.entries(v.combination).some(([nomeOpcao, valor]) => {
            if (normalizar(nomeOpcao) !== chave) return false
            const n = Number(valor)
            return Number.isFinite(n) && n >= min && n <= max
          }),
        ),
      )
    } else {
      resultado = resultado.filter((p) =>
        p.variants.some((v) =>
          Object.entries(v.combination).some(
            ([nomeOpcao, valor]) => normalizar(nomeOpcao) === chave && valores.includes(valor),
          ),
        ),
      )
    }
  }

  return resultado
}
