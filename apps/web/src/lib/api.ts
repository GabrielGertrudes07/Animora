const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

/**
 * O Payload devolve URLs de media relativas (sem `serverURL` configurado),
 * mas a loja corre numa origem diferente da API. `next/image` só resolve
 * caminhos relativos contra a própria origem (a loja), não contra a API —
 * sem isto, toda a imagem do catálogo dava 400 no otimizador.
 */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${BASE}${url}` : url
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Leitura da API do Payload. Só GET — a loja não escreve nada nesta fase.
 * `revalidate` em segundos; 0 desliga a cache.
 */
export async function apiGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new ApiError(`GET ${path} devolveu ${res.status}`, res.status)
  }

  return (await res.json()) as T
}
