'use server'

import { cookies } from 'next/headers'

import {
  clienteAtual,
  COOKIE_SESSAO,
  mensagemDeErro,
  moradaDe,
  pedirComSessao,
  type Morada,
} from './sessao'

/**
 * As escritas da conta, como Server Actions.
 *
 * Todas devolvem `{ ok }` em vez de atirar: um erro atirado numa Server Action
 * chega ao browser como "an error occurred in the Server Components render",
 * sem mensagem nenhuma em produção. Quem escreveu mal o código postal merece
 * ler o que está mal.
 */

export type Resultado = { ok: true } | { ok: false; erro: string }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

/**
 * O cookie de sessão é posto pela loja, a partir do token que a API devolve no
 * corpo do login — e não reencaminhando o `Set-Cookie` da API. Assim fica com o
 * domínio e o caminho da loja, `HttpOnly` (nenhum script lhe toca) e
 * `sameSite: 'lax'`, que é o que impede um site terceiro de disparar um
 * checkout com a sessão de quem o visita.
 */
async function guardarSessao(token: string, exp: number): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(exp * 1000),
  })
}

export type ResultadoEntrada = { ok: true; clienteId: number } | { ok: false; erro: string }

export async function entrar(email: string, password: string): Promise<ResultadoEntrada> {
  const res = await fetch(`${BASE}/api/customers/login`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    return { ok: false, erro: await mensagemDeErro(res, 'Não foi possível entrar.') }
  }

  const corpo = (await res.json()) as { token?: string; exp?: number; user?: { id?: number } }
  if (!corpo.token || !corpo.exp || corpo.user?.id === undefined) {
    return { ok: false, erro: 'A resposta da autenticação veio incompleta.' }
  }

  await guardarSessao(corpo.token, corpo.exp)
  return { ok: true, clienteId: Number(corpo.user.id) }
}

/**
 * Registar não autentica: o `POST /api/customers` cria a conta e não devolve
 * sessão nenhuma. Entrar logo a seguir é o que evita que a pessoa escreva a
 * palavra-passe duas vezes seguidas.
 */
export async function registar(
  nome: string,
  email: string,
  password: string,
): Promise<ResultadoEntrada> {
  const res = await fetch(`${BASE}/api/customers`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ nome, email, password }),
  })

  if (!res.ok) {
    return { ok: false, erro: await mensagemDeErro(res, 'Não foi possível criar a conta.') }
  }

  return entrar(email, password)
}

export async function sair(): Promise<void> {
  // Invalidar a sessão do lado da API antes de deitar fora o cookie: apagá-lo
  // só faz o browser esquecer o token, e um token esquecido continua válido.
  await pedirComSessao('/api/customers/logout', { method: 'POST' }).catch(() => null)
  ;(await cookies()).delete(COOKIE_SESSAO)
}

/** Para o carrinho saber em que conta está, e portanto que carrinho carregar. */
export async function sessaoClienteId(): Promise<number | null> {
  return (await clienteAtual())?.id ?? null
}

async function gravarCliente(id: number, dados: Record<string, unknown>): Promise<Resultado> {
  const res = await pedirComSessao(`/api/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  })

  if (!res.ok) return { ok: false, erro: await mensagemDeErro(res, 'Não foi possível gravar.') }
  return { ok: true }
}

/**
 * O formato do código postal (`NNNN-NNN`) é validado pela coleção, não aqui.
 * Repetir a expressão nesta camada dava dois sítios para a mesma regra e um dia
 * dois resultados diferentes; a coleção é a que decide o que fica gravado.
 */
export async function guardarMorada(nova: Morada): Promise<Resultado> {
  const cliente = await clienteAtual()
  if (!cliente) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' }

  return gravarCliente(cliente.id, { moradas: [...cliente.moradas, moradaDe(nova)] })
}

export async function apagarMorada(indice: number): Promise<Resultado> {
  const cliente = await clienteAtual()
  if (!cliente) return { ok: false, erro: 'Sessão terminada. Entre outra vez.' }

  return gravarCliente(cliente.id, {
    moradas: cliente.moradas.filter((_, i) => i !== indice),
  })
}

export type ResultadoFavorito = { ok: true; favorito: boolean } | { ok: false; erro: string }

export async function alternarFavorito(productId: number): Promise<ResultadoFavorito> {
  const cliente = await clienteAtual()
  if (!cliente) return { ok: false, erro: 'Entre na sua conta para guardar favoritos.' }

  const jaEra = cliente.favoritos.includes(productId)
  const favoritos = jaEra
    ? cliente.favoritos.filter((id) => id !== productId)
    : [...cliente.favoritos, productId]

  const r = await gravarCliente(cliente.id, { favoritos })
  return r.ok ? { ok: true, favorito: !jaEra } : r
}

/** Para o coração da ficha de produto saber como nascer. `null` = sem sessão. */
export async function ehFavorito(productId: number): Promise<boolean | null> {
  const cliente = await clienteAtual()
  return cliente ? cliente.favoritos.includes(productId) : null
}
