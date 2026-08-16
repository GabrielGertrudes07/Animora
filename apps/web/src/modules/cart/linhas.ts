import { listProductsByVariantIds, type PublicProduct } from '../catalog'
import { mediaUrl } from '../../lib/api'
import type { ItemCarrinho, LinhaCarrinho } from './carrinho'

/**
 * O outro lado da regra: **os preços vêm sempre daqui**, do servidor, a cada
 * abertura do carrinho.
 *
 * O browser dá ids e quantidades; isto devolve o que o catálogo diz sobre eles
 * neste instante. Um preço alterado no painel aparece no carrinho ao recarregar
 * a página, sem sincronização nenhuma para escrever — é só não haver cópia
 * guardada em lado nenhum.
 *
 * Corre no servidor (é chamado por uma Server Action) e devolve um objeto
 * estreito de propósito: `titulo`, `slug`, `opcoes`, preço, stock e imagem.
 * Nunca o `PublicProduct` inteiro. Um objeto que atravessa a fronteira
 * servidor→cliente leva consigo tudo o que tiver dentro, e vai parar ao estado
 * serializado do React dentro do HTML — a descrição em Lexical, os metadados,
 * o que for. A `sanitizeProduct` já garante que campos internos não chegam
 * aqui; escolher os campos outra vez é a mesma disciplina aplicada à segunda
 * fronteira.
 */

export type ResolucaoCarrinho = {
  linhas: LinhaCarrinho[]
  /**
   * Ids que o catálogo já não reconhece: variante apagada, desativada, ou
   * produto despublicado. A página tira-os do `localStorage` e diz-o —
   * deixá-los lá dava um 400 no checkout sem explicação nenhuma.
   */
  indisponiveis: number[]
}

const legendaOpcoes = (combination: Record<string, string>): string =>
  Object.entries(combination)
    .map(([nome, valor]) => `${nome}: ${valor}`)
    .join(' · ')

/**
 * Toda a imagem sai daqui com `alt`, `width` e `height`.
 *
 * O `alt` vazio (uma media carregada sem texto alternativo) é substituído pelo
 * título do produto: um `alt=""` numa imagem que é o conteúdo da linha esconde
 * a linha inteira de quem usa leitor de ecrã.
 */
const imagemDa = (p: PublicProduct): LinhaCarrinho['imagem'] => {
  const img = p.primaryImage ?? p.gallery[0]?.image ?? null
  if (!img) return null

  return {
    url: mediaUrl(img.url),
    alt: img.alt.trim() === '' ? p.title : img.alt,
    width: img.width ?? 600,
    height: img.height ?? 600,
  }
}

export async function resolverLinhas(itens: ItemCarrinho[]): Promise<ResolucaoCarrinho> {
  if (itens.length === 0) return { linhas: [], indisponiveis: [] }

  const produtos = await listProductsByVariantIds(itens.map((i) => i.variantId))

  const porVariante = new Map(
    produtos.flatMap((p) => p.variants.map((v) => [v.id, { produto: p, variante: v }] as const)),
  )

  const linhas: LinhaCarrinho[] = []
  const indisponiveis: number[] = []

  for (const item of itens) {
    const achado = porVariante.get(item.variantId)
    if (!achado) {
      indisponiveis.push(item.variantId)
      continue
    }

    const { produto, variante } = achado
    linhas.push({
      variantId: variante.id,
      qty: item.qty,
      titulo: produto.title,
      slug: produto.slug,
      opcoes: legendaOpcoes(variante.combination),
      // Lido agora, da base. Nunca do browser.
      precoUnitarioCents: variante.priceCents,
      stock: variante.stock,
      imagem: imagemDa(produto),
    })
  }

  return { linhas, indisponiveis }
}
