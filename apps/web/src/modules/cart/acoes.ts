'use server'

import { mensagemDeErro, pedirComSessao, type Morada } from '../account/sessao'
import { normalizar, paraCheckout, type ItemCarrinho } from './carrinho'
import { resolverLinhas, type ResolucaoCarrinho } from './linhas'

/**
 * As duas coisas que o carrinho pede ao servidor: os preços, e a compra.
 *
 * O que chega aqui vem do `localStorage`, ou seja, de fora — passa pelo
 * `normalizar` antes de mais nada. Não é paranoia: uma linha corrompida no
 * browser (uma versão antiga da loja, um dedo no devtools) chegaria à API e
 * daria um 400 sem explicação em vez de simplesmente não existir.
 */

export async function carregarLinhas(itens: ItemCarrinho[]): Promise<ResolucaoCarrinho> {
  return resolverLinhas(normalizar(itens))
}

export type FaltaStock = {
  variantId: number
  titulo: string
  sku: string
  pedido: number
  disponivel: number
}

export type EncomendaCriada = {
  id: number
  numero: string
  totalCents: number
}

export type ResultadoCompra =
  | { ok: true; encomenda: EncomendaCriada }
  | { ok: false; erro: string; semStock?: FaltaStock[]; precisaEntrar?: boolean }

/**
 * `POST /api/checkout` — e é tudo o que a loja tem a dizer sobre dinheiro.
 *
 * O corpo leva **identificadores e quantidades** (`paraCheckout`) e a morada.
 * Nenhum preço, nenhum total. O servidor relê os preços da base dentro da
 * transação, refaz a conta com o mesmo `calcularTotais` que o ecrã usou, desce
 * o stock e grava. É por isso que o total mostrado é o total cobrado: os dois
 * números saem da mesma função alimentada pela mesma fonte.
 *
 * O 409 devolve a lista do que falta — outra pessoa levou a última unidade
 * entretanto. A página mostra-a e **não mexe no carrinho**: quem estava a
 * comprar cinco coisas não perde as outras quatro por causa de uma.
 */
export async function comprar(
  itens: ItemCarrinho[],
  moradaEnvio: Morada,
): Promise<ResultadoCompra> {
  const linhas = paraCheckout(normalizar(itens))
  if (linhas.length === 0) return { ok: false, erro: 'O carrinho está vazio.' }

  const res = await pedirComSessao('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ linhas, moradaEnvio }),
  })

  if (res.status === 201) {
    const e = (await res.json()) as { id?: unknown; numero?: unknown; totalCents?: unknown }
    return {
      ok: true,
      encomenda: {
        id: Number(e.id),
        numero: String(e.numero ?? ''),
        totalCents: Number(e.totalCents ?? 0),
      },
    }
  }

  const corpo = (await res.clone().json().catch(() => null)) as { semStock?: FaltaStock[] } | null
  const erro = await mensagemDeErro(res, 'Não foi possível finalizar a compra.')

  return {
    ok: false,
    erro,
    ...(corpo?.semStock ? { semStock: corpo.semStock } : {}),
    // 401 é "identifique-se"; 403 é uma sessão de staff, que também precisa de
    // entrar — com a conta de cliente. Nos dois casos o caminho é o mesmo ecrã.
    ...(res.status === 401 || res.status === 403 ? { precisaEntrar: true } : {}),
  }
}
