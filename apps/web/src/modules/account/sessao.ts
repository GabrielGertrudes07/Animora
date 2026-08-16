import { cookies } from 'next/headers'

/**
 * A sessão do cliente na loja, vista do servidor.
 *
 * ## Porque é que a loja fala com a API só a partir do servidor
 *
 * A API corre em `localhost:3000` e a loja em `localhost:3001` — origens
 * diferentes. Um `fetch` do browser para a API precisava de CORS configurado do
 * lado do Payload, e o Payload é território fechado nesta tarefa. Mas há uma
 * razão melhor para não o fazer de qualquer forma: assim o token de sessão nunca
 * passa por JavaScript. Entra como cookie `HttpOnly` posto pela própria loja,
 * viaja nos pedidos que o servidor da loja faz à API, e o browser nunca lhe toca.
 *
 * O que o browser chama são Server Actions (`acoes.ts`). O que atravessa a
 * fronteira para o cliente é sempre um objeto construído campo a campo aqui — a
 * resposta do `/me` traz `sessions` com os identificadores de sessão ativos, e
 * essa lista não tem nada que fazer no HTML.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

/** O nome que o Payload usa. A loja põe o mesmo, para o mesmo `localhost`. */
export const COOKIE_SESSAO = 'payload-token'

export type Morada = {
  etiqueta: string
  nomeDestinatario: string
  linha1: string
  linha2: string
  codigoPostal: string
  localidade: string
  telefone: string
}

export type Cliente = {
  id: number
  nome: string
  email: string
  moradas: Morada[]
  /** Ids de produto. Os produtos em si são lidos pelo catálogo, como sempre. */
  favoritos: number[]
}

type Bruto = Record<string, unknown>

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '')

/**
 * Um pedido à API com a sessão do cliente, sem cache nenhuma.
 *
 * `cache: 'no-store'` não é otimização ao contrário: uma resposta com dados de
 * uma conta guardada em cache é a conta de outra pessoa a aparecer no ecrã de
 * quem vier a seguir.
 */
export async function pedirComSessao(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value

  return fetch(`${BASE}${caminho}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `${COOKIE_SESSAO}=${token}` } : {}),
      ...init.headers,
    },
  })
}

export const moradaDe = (bruta: unknown): Morada => {
  const m = (bruta ?? {}) as Bruto
  return {
    etiqueta: texto(m.etiqueta),
    nomeDestinatario: texto(m.nomeDestinatario),
    linha1: texto(m.linha1),
    linha2: texto(m.linha2),
    codigoPostal: texto(m.codigoPostal),
    localidade: texto(m.localidade),
    telefone: texto(m.telefone),
  }
}

/**
 * Quem está autenticado, ou `null`.
 *
 * `null` também quando a sessão é de staff: o painel e a loja são contas
 * diferentes, e é o próprio checkout que o diz (403, "entre com a sua conta de
 * cliente"). Tratar aqui um `owner` como cliente só adiava a recusa para depois
 * de ele ter preenchido a morada.
 */
export async function clienteAtual(): Promise<Cliente | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value
  if (!token) return null

  const res = await pedirComSessao('/api/customers/me?depth=0')
  if (!res.ok) return null

  const corpo = (await res.json()) as { user?: Bruto; collection?: unknown }
  const u = corpo.user
  if (!u || corpo.collection !== 'customers') return null

  const moradas = Array.isArray(u.moradas) ? u.moradas : []
  const favoritos = Array.isArray(u.favoritos) ? u.favoritos : []

  return {
    id: Number(u.id),
    nome: texto(u.nome),
    email: texto(u.email),
    moradas: moradas.map(moradaDe),
    favoritos: favoritos.map(Number).filter(Number.isInteger),
  }
}

/**
 * A mensagem do Payload, em português, tal como ele a escreve.
 *
 * Vale a pena desembrulhar: a mensagem de topo é "O campo a seguir está
 * inválido: Moradas 1 > Código postal", e a útil — "Código postal inválido. Use
 * o formato 1234-567." — está uma camada abaixo, em `data.errors`. Mostrar só a
 * de topo é dizer a alguém que errou sem dizer o quê.
 */
export async function mensagemDeErro(res: Response, alternativa: string): Promise<string> {
  const corpo = (await res.json().catch(() => null)) as {
    erro?: unknown
    errors?: { message?: unknown; data?: { errors?: { message?: unknown }[] } }[]
  } | null

  if (typeof corpo?.erro === 'string') return corpo.erro

  const primeiro = corpo?.errors?.[0]
  const detalhes = (primeiro?.data?.errors ?? [])
    .map((e) => texto(e.message))
    .filter((m) => m !== '')

  if (detalhes.length > 0) return detalhes.join(' ')
  if (typeof primeiro?.message === 'string') return primeiro.message

  return alternativa
}
