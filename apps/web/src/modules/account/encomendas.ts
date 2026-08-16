import { pedirComSessao, moradaDe, type Morada } from './sessao'

/**
 * As encomendas do cliente, lidas do servidor.
 *
 * A API já protege isto de duas maneiras: um cliente só encontra as suas
 * (`proprioOuStaff` devolve um `Where`, por isso o id de outra pessoa dá 404 e
 * não os dados dela) e o `custoUnitarioCents` está fechado a quem não é staff.
 *
 * Mesmo assim, o objeto é construído campo a campo aqui, como a
 * `sanitizeProduct` do catálogo e pela mesma razão: **a margem da loja não pode
 * chegar ao HTML por nenhum caminho**. Se um dia alguém acrescentar um campo à
 * coleção, ou relaxar uma regra de acesso, este ficheiro continua a mandar para
 * o ecrã só o que aqui está escrito. Uma lista de exclusão fazia o contrário —
 * o campo novo passava por omissão.
 */

export type LinhaEncomenda = {
  titulo: string
  sku: string
  /** "Tamanho: L", já formatado a partir do JSON congelado na linha. */
  opcoes: string
  quantidade: number
  precoUnitarioCents: number
}

export type Encomenda = {
  id: number
  numero: string
  estado: string
  criadaEm: string
  subtotalCents: number
  portesCents: number
  totalCents: number
  linhas: LinhaEncomenda[]
  moradaEnvio: Morada
}

const ESTADOS: Record<string, string> = {
  'a-aguardar-pagamento': 'A aguardar pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const estadoLegivel = (estado: string): string => ESTADOS[estado] ?? estado

export const dataLegivel = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

type Bruto = Record<string, unknown>

const inteiro = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) ? v : 0)

const opcoesLegiveis = (opcoes: unknown): string => {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) return ''
  return Object.entries(opcoes as Record<string, unknown>)
    .map(([nome, valor]) => `${nome}: ${String(valor)}`)
    .join(' · ')
}

function encomendaDe(bruta: unknown): Encomenda {
  const e = (bruta ?? {}) as Bruto
  const linhas = Array.isArray(e.linhas) ? e.linhas : []

  return {
    id: Number(e.id),
    numero: String(e.numero ?? ''),
    estado: String(e.estado ?? ''),
    criadaEm: String(e.createdAt ?? ''),
    subtotalCents: inteiro(e.subtotalCents),
    portesCents: inteiro(e.portesCents),
    totalCents: inteiro(e.totalCents),
    linhas: linhas.map((cru) => {
      const l = (cru ?? {}) as Bruto
      return {
        titulo: String(l.titulo ?? ''),
        sku: String(l.sku ?? ''),
        opcoes: opcoesLegiveis(l.opcoes),
        quantidade: inteiro(l.quantidade),
        // O preço congelado no momento da compra. O custo, que está ao lado
        // dele na coleção, não é lido aqui nem em lado nenhum da loja.
        precoUnitarioCents: inteiro(l.precoUnitarioCents),
      }
    }),
    moradaEnvio: moradaDe(e.moradaEnvio),
  }
}

export async function listarEncomendas(): Promise<Encomenda[]> {
  // `depth=0` porque não é preciso popular nada: a linha guarda o título, o SKU
  // e as opções em texto. Com `depth`, a variante vinha populada — e a variante
  // é o segundo caminho para o custo de compra.
  const res = await pedirComSessao('/api/orders?depth=0&limit=0&sort=-createdAt')
  if (!res.ok) return []

  const corpo = (await res.json()) as { docs?: unknown[] }
  return (corpo.docs ?? []).map(encomendaDe)
}

/**
 * Uma encomenda pelo id. `null` quando não é desta pessoa — que é o mesmo que
 * "não existe", e é deliberado: distinguir os dois casos contava a quem tentou
 * que a encomenda existe e é de outra pessoa.
 */
export async function obterEncomenda(id: string): Promise<Encomenda | null> {
  if (!/^\d+$/.test(id)) return null

  const res = await pedirComSessao(`/api/orders/${id}?depth=0`)
  if (!res.ok) return null

  return encomendaDe(await res.json())
}
