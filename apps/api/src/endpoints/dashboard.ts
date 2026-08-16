import type { Endpoint, PayloadRequest } from 'payload'
import { agregarVendas, type LinhaVendida, type ResumoVendas } from '@animora/core'

import { ehStaff } from '../access/staff'
import { idDaRelacao } from '../hooks/blockUnsellable'

/**
 * `GET /api/dashboard` — o dashboard de vendas, com trava comercial.
 *
 * ## A trava
 *
 * A verificação é aqui, no servidor. Com a trava ligada o caminho que lê a
 * base de dados (`lerDaBase`) **não é chamado**: a fonte de dados é a constante
 * `DEMONSTRACAO` e a resposta leva `locked: true` mais o aviso. Não é filtrar
 * números reais à saída — é nunca os ir buscar. Ver `globals/Definicoes.ts`
 * para quem pode ligar o interruptor (só o `owner`) e para o alcance honesto
 * disto.
 *
 * O código de agregação é o mesmo nos dois estados: `construirDashboard`
 * recebe uma `Fonte` e não sabe de onde veio. Só muda quem a preenche. É por
 * isso que o dashboard bloqueado tem exatamente a mesma forma do desbloqueado
 * — o comprador vê o produto todo, com os números de outra loja.
 *
 * ## A rotulagem
 *
 * `locked: true` traz sempre o `aviso`. Não é escrúpulo a mais: quem olhar
 * para faturação inventada a pensar que é a sua toma decisões de negócio com
 * números falsos, e isso rebenta na mão de quem vendeu o site. Rotulado, o
 * bloqueio faz o mesmo trabalho comercial.
 *
 * ## Honestidade dos números
 *
 * **Faturação é a receita dos artigos, sem portes.** Os portes são um custo
 * que passa ao transportador, não margem da loja, e misturá-los inflava a
 * faturação e enviesava a margem sem que se visse porquê. O total que o cliente
 * pagou está na encomenda; o que este ecrã responde é "quanto vendi e quanto
 * ganhei com isso".
 *
 * `agregarVendas` (`packages/core`) recusa-se a inventar precisão: com uma
 * linha sem custo registado a margem vem `null` e as unidades afetadas são
 * contadas à parte. Este endpoint propaga isso tal e qual — uma margem
 * desconhecida nunca sai como 0% nem como 100%. A variação face ao período
 * anterior segue o mesmo princípio: crescer a partir de zero não é uma
 * percentagem, é `null`.
 */

/** Quantos artigos entram em cada lista de "mais vendidos". */
const TOPO = 5

/** Acima de zero e até aqui é "stock baixo"; zero é rutura. */
const LIMIAR_STOCK_BAIXO = 5

const DIAS_POR_OMISSAO = 30
const DIA_MS = 86_400_000

/** Linhas de encomendas de produtos entretanto apagados, ou sem categoria. */
const SEM_CATEGORIA = 'Sem categoria'

/**
 * Faixa permanente do estado bloqueado. Vai na resposta, e não só no ecrã do
 * painel, para que qualquer consumidor do endpoint (o painel hoje, a loja
 * amanhã) receba o rótulo junto com os números e não possa mostrar uns sem o
 * outro.
 */
export const AVISO_DEMONSTRACAO = {
  titulo: 'Dados de demonstração — não são as suas vendas',
  texto: 'Para ativar os dados reais: (19) 98252-1727',
  botao: 'Falar no WhatsApp',
  url: 'https://wa.me/5519982521727',
} as const

/** Meio-aberta: `[de, ate)`. `ate` é o começo do dia a seguir ao último pedido. */
export type Janela = { de: Date; ate: Date }

export type LinhaDashboard = LinhaVendida & {
  /** Id da encomenda — para contar encomendas e ticket médio sem uma segunda consulta. */
  encomenda: string
  sku: string
  titulo: string
  categoria: string
}

export type ArtigoStock = { sku: string; titulo: string; stock: number }

/**
 * Tudo o que o dashboard precisa, já lido. Vem da base de dados quando a trava
 * está desligada e da constante `DEMONSTRACAO` quando está ligada.
 */
export type Fonte = {
  periodo: LinhaDashboard[]
  anterior: LinhaDashboard[]
  clientesNovos: number
  clientesRecorrentes: number
  /** Variantes ativas de produtos publicados sem stock nenhum. */
  ruturas: ArtigoStock[]
  stockBaixo: ArtigoStock[]
}

export type Artigo = { sku: string; titulo: string; unidades: number; receitaCents: number }
export type Vendas = ResumoVendas & { encomendas: number; ticketMedioCents: number }

export type Dashboard = {
  locked: boolean
  aviso: typeof AVISO_DEMONSTRACAO | null
  periodo: { de: string; ate: string; dias: number }
  vendas: Vendas
  comparacao: Vendas & {
    periodo: { de: string; ate: string; dias: number }
    /** Centésimos de ponto percentual, como a margem. `null` quando o período anterior é zero. */
    variacaoFaturacaoPercent: number | null
  }
  maisVendidosPorUnidades: Artigo[]
  maisVendidosPorReceita: Artigo[]
  receitaPorCategoria: { categoria: string; unidades: number; receitaCents: number }[]
  stock: { ruturas: ArtigoStock[]; baixo: ArtigoStock[] }
  clientes: { novos: number; recorrentes: number }
}

/** Pedido mal formado. O chamador decide o código HTTP. */
export class DashboardError extends Error {}

// ---------------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------------

/**
 * O dia da loja acaba à meia-noite de Lisboa, não à meia-noite UTC.
 *
 * Cortar em UTC deslocava todos os relatórios uma hora durante a hora de verão
 * — cerca de sete meses por ano em Portugal. Medido: uma encomenda das **00:30
 * de 16/08 em Lisboa** (23:30 UTC de 15/08) saía no relatório de 15/08. Num
 * fecho de mês isso é a última noite de julho a cair em junho: o relatório não
 * bate com os livros da loja, e ninguém percebe porquê.
 *
 * O comentário que aqui estava justificava UTC com "não depender do fuso da
 * máquina". A objeção é boa e continua respeitada: `Europe/Lisbon` é fixo no
 * código, não é `process.env.TZ` — o mesmo pedido dá o mesmo número em Lisboa,
 * em Frankfurt ou num contentor a correr em UTC. Só que agora é o âncora do
 * mercado declarado, e não um âncora emprestado.
 *
 * Quem abrir uma loja noutro fuso muda esta constante (ou passa-a a definição
 * da loja); o resto do ficheiro não sabe qual é.
 */
const FUSO = 'Europe/Lisbon'

/** O dia civil em Lisboa (`2026-08-16`) a que um instante pertence. */
const diaISO = (data: Date): string => data.toLocaleDateString('en-CA', { timeZone: FUSO })

/** Desvio de Lisboa face a UTC no instante dado, em ms: 0 no inverno, uma hora no verão. */
const desvioDeLisboa = (instante: Date): number => {
  const marca =
    new Intl.DateTimeFormat('en-US', { timeZone: FUSO, timeZoneName: 'longOffset' })
      .formatToParts(instante)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const partes = /^GMT([+-])(\d\d):(\d\d)$/.exec(marca)
  if (!partes) return 0
  const [, sinal, horas, minutos] = partes
  return (sinal === '-' ? -1 : 1) * (Number(horas) * 3_600_000 + Number(minutos) * 60_000)
}

/** O instante em que o dia civil dado começa em Lisboa. */
const inicioDoDia = (dia: string): Date => {
  const meiaNoiteUTC = new Date(`${dia}T00:00:00.000Z`).getTime()
  // Duas passagens: a primeira pergunta o desvio ao instante errado (a meia-noite
  // UTC), a segunda ao instante que ele indica. Chega e sobra em Portugal, onde a
  // mudança da hora é às 01:00 de um domingo e nunca faz a meia-noite desaparecer.
  const aproximado = meiaNoiteUTC - desvioDeLisboa(new Date(meiaNoiteUTC))
  return new Date(meiaNoiteUTC - desvioDeLisboa(new Date(aproximado)))
}

/**
 * `dia` mais `n` dias de calendário. Aritmética de dias civis, não de 24 horas:
 * somar `DIA_MS` a um instante atravessa a mudança da hora e cai às 23:00 ou à
 * 01:00 do dia seguinte, e o corte do dia deixava de ser à meia-noite.
 */
const somarDias = (dia: string, n: number): string =>
  new Date(new Date(`${dia}T00:00:00.000Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10)

const lerDia = (valor: unknown, nome: string): string => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new DashboardError(`"${nome}" tem de ser uma data no formato 2026-08-16.`)
  }
  const data = new Date(`${valor}T00:00:00.000Z`)
  // O `Date` não recusa o 30 de fevereiro: transborda em silêncio para 2 de
  // março, e o relatório saía de um mês diferente do pedido sem dizer nada. A
  // ida e volta apanha isso — é a única maneira de o `Date` o admitir. Em UTC de
  // propósito: aqui trata-se de validar o texto do pedido, não de situar um
  // instante no fuso da loja.
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new DashboardError(`"${nome}" não é uma data que exista: ${valor}.`)
  }
  return valor
}

/**
 * `?de=2026-07-01&ate=2026-07-31`, ambas inclusivas, ou nenhuma das duas para
 * os últimos 30 dias. Uma só das duas é recusada em vez de adivinhada: um
 * período meio escolhido é um relatório que ninguém sabe ler.
 *
 * Os dois extremos — e o "hoje" por omissão — são dias civis de Lisboa,
 * convertidos em instantes só à saída. Ver `FUSO`.
 */
export const lerJanela = (query: Record<string, unknown>): Janela => {
  const { de, ate } = query

  if (de === undefined && ate === undefined) {
    const hoje = diaISO(new Date())
    return {
      de: inicioDoDia(somarDias(hoje, 1 - DIAS_POR_OMISSAO)),
      ate: inicioDoDia(somarDias(hoje, 1)),
    }
  }
  if (de === undefined || ate === undefined) {
    throw new DashboardError('Indique "de" e "ate", ou nenhuma das duas para os últimos 30 dias.')
  }

  const inicio = lerDia(de, 'de')
  // Inclusiva para quem pede, meio-aberta cá dentro: sem isto, as encomendas
  // do último dia depois da meia-noite ficavam de fora do relatório.
  const janela = { de: inicioDoDia(inicio), ate: inicioDoDia(somarDias(lerDia(ate, 'ate'), 1)) }

  if (janela.ate <= janela.de) {
    throw new DashboardError(`O fim do período ("${String(ate)}") é anterior ao início.`)
  }
  return janela
}

/** Dias de calendário, e não horas a dividir: uma janela com mudança da hora lá
 * dentro tem 23 ou 25 horas num dos dias, e o arredondamento é o que a fecha. */
const diasDe = (janela: Janela): number => Math.round((janela.ate.getTime() - janela.de.getTime()) / DIA_MS)

/** O período imediatamente anterior, com o mesmo comprimento em dias. */
const anteriorDe = (janela: Janela): Janela => ({
  de: inicioDoDia(somarDias(diaISO(janela.de), -diasDe(janela))),
  ate: janela.de,
})

const descrever = (janela: Janela) => ({
  de: diaISO(janela.de),
  // De volta a inclusiva, que é como foi pedida.
  ate: somarDias(diaISO(janela.ate), -1),
  dias: diasDe(janela),
})

// ---------------------------------------------------------------------------
// Agregação — a mesma nos dois estados da trava
// ---------------------------------------------------------------------------

const resumir = (linhas: LinhaDashboard[]): Vendas => {
  const resumo = agregarVendas(linhas)
  const encomendas = new Set(linhas.map((l) => l.encomenda)).size
  return {
    ...resumo,
    encomendas,
    ticketMedioCents: encomendas === 0 ? 0 : Math.round(resumo.faturacaoCents / encomendas),
  }
}

/**
 * Agrupa por SKU — o congelado na linha da encomenda, não o do catálogo de
 * hoje. Uma variante apagada continua a contar para o que foi vendido.
 */
const porArtigo = (linhas: LinhaDashboard[]): Artigo[] => {
  const artigos = new Map<string, Artigo>()

  for (const l of linhas) {
    const artigo = artigos.get(l.sku) ?? { sku: l.sku, titulo: l.titulo, unidades: 0, receitaCents: 0 }
    artigo.unidades += l.quantidade
    artigo.receitaCents += l.precoUnitarioCents * l.quantidade
    artigos.set(l.sku, artigo)
  }

  return [...artigos.values()]
}

/** Desempate pelo SKU para a lista não dançar entre dois pedidos iguais. */
const maiorPrimeiro = (medida: (a: Artigo) => number) => (a: Artigo, b: Artigo) =>
  medida(b) - medida(a) || a.sku.localeCompare(b.sku, 'pt-PT')

/**
 * `null` quando o período anterior é zero: crescer a partir de nada não é uma
 * percentagem, e escrever 100% ou ∞ seria inventar precisão — o mesmo motivo
 * por que `agregarVendas` devolve `margemPercent: null` sem custos conhecidos.
 */
const variacaoPercent = (agora: number, antes: number): number | null =>
  antes === 0 ? null : Math.round(((agora - antes) / antes) * 10000) || 0

export const construirDashboard = (fonte: Fonte, janela: Janela, locked: boolean): Dashboard => {
  const vendas = resumir(fonte.periodo)
  const anterior = resumir(fonte.anterior)
  const artigos = porArtigo(fonte.periodo)

  const categorias = new Map<string, { categoria: string; unidades: number; receitaCents: number }>()
  for (const l of fonte.periodo) {
    const linha = categorias.get(l.categoria) ?? { categoria: l.categoria, unidades: 0, receitaCents: 0 }
    linha.unidades += l.quantidade
    linha.receitaCents += l.precoUnitarioCents * l.quantidade
    categorias.set(l.categoria, linha)
  }

  return {
    locked,
    aviso: locked ? AVISO_DEMONSTRACAO : null,
    periodo: descrever(janela),
    vendas,
    comparacao: {
      ...anterior,
      periodo: descrever(anteriorDe(janela)),
      variacaoFaturacaoPercent: variacaoPercent(vendas.faturacaoCents, anterior.faturacaoCents),
    },
    // Duas listas e não uma ordenada de duas maneiras: quem vende mais
    // unidades raramente é quem traz mais dinheiro, e é a diferença entre as
    // duas que diz o que fazer.
    maisVendidosPorUnidades: [...artigos].sort(maiorPrimeiro((a) => a.unidades)).slice(0, TOPO),
    maisVendidosPorReceita: [...artigos].sort(maiorPrimeiro((a) => a.receitaCents)).slice(0, TOPO),
    receitaPorCategoria: [...categorias.values()].sort(
      (a, b) => b.receitaCents - a.receitaCents || a.categoria.localeCompare(b.categoria, 'pt-PT'),
    ),
    stock: { ruturas: fonte.ruturas, baixo: fonte.stockBaixo },
    clientes: { novos: fonte.clientesNovos, recorrentes: fonte.clientesRecorrentes },
  }
}

// ---------------------------------------------------------------------------
// Fonte real
// ---------------------------------------------------------------------------

type LinhaEncomenda = {
  variante?: unknown
  titulo?: unknown
  sku?: unknown
  quantidade?: unknown
  precoUnitarioCents?: unknown
  custoUnitarioCents?: unknown
}
type Encomenda = { id: number | string; cliente?: unknown; linhas?: LinhaEncomenda[] | null }
type Variante = { id: number | string; product?: unknown; sku?: unknown; stock?: unknown }
type Ficha = { titulo: string; categoria: string; publicado: boolean }

const chaves = (valores: (number | string | undefined | null)[]): (number | string)[] => [
  ...new Set(valores.filter((v): v is number | string => v !== undefined && v !== null)),
]

/**
 * Cancelada não é venda: o stock foi devolvido ao catálogo e o dinheiro não
 * entrou. Todos os outros estados contam — incluindo `a-aguardar-pagamento`,
 * porque é o estado em que uma encomenda nasce e ainda não há passarela de
 * pagamento que a faça avançar. Quando houver, é aqui que se decide se "vendido"
 * passa a querer dizer "pago".
 */
const encomendasDe = async (req: PayloadRequest, janela: Janela): Promise<Encomenda[]> => {
  const { docs } = await req.payload.find({
    collection: 'orders',
    where: {
      and: [
        { createdAt: { greater_than_equal: janela.de.toISOString() } },
        { createdAt: { less_than: janela.ate.toISOString() } },
        { estado: { not_equals: 'cancelado' } },
      ],
    },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })
  return docs as unknown as Encomenda[]
}

const fichasDe = async (
  req: PayloadRequest,
  idsProdutos: (number | string)[],
): Promise<Map<string, Ficha>> => {
  if (idsProdutos.length === 0) return new Map()

  const { docs: produtos } = await req.payload.find({
    collection: 'products',
    where: { id: { in: idsProdutos } },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })

  const categoriaDoProduto = new Map<string, number | string>()
  for (const p of produtos) {
    // Com `depth: 0` a relação vem como lista de ids. A primeira categoria é a
    // que classifica o artigo: um produto em duas categorias contaria a receita
    // duas vezes e a soma por categoria deixava de bater com a faturação.
    const primeira = (p.categories as (number | string)[] | null | undefined)?.[0]
    if (primeira !== undefined && primeira !== null) {
      categoriaDoProduto.set(String(p.id), idDaRelacao(primeira) ?? primeira)
    }
  }

  const { docs: categorias } = await req.payload.find({
    collection: 'categories',
    where: { id: { in: chaves([...categoriaDoProduto.values()]) } },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })
  const nomeDaCategoria = new Map(categorias.map((c) => [String(c.id), String(c.name)]))

  return new Map(
    produtos.map((p) => [
      String(p.id),
      {
        titulo: String(p.title),
        categoria: nomeDaCategoria.get(String(categoriaDoProduto.get(String(p.id)))) ?? SEM_CATEGORIA,
        publicado: p._status === 'published',
      },
    ]),
  )
}

/**
 * A categoria não está congelada na encomenda (o título, o SKU, o preço e o
 * custo estão). Chega-se lá pela variante e pelo produto — e quando algum já
 * não existe a linha cai em "Sem categoria" em vez de desaparecer: o dinheiro
 * entrou na mesma.
 */
const categoriasDasLinhas = async (
  req: PayloadRequest,
  encomendas: Encomenda[],
): Promise<Map<string, string>> => {
  const idsVariantes = chaves(
    encomendas.flatMap((e) => (e.linhas ?? []).map((l) => idDaRelacao(l.variante))),
  )
  if (idsVariantes.length === 0) return new Map()

  const { docs } = await req.payload.find({
    collection: 'variants',
    where: { id: { in: idsVariantes } },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })
  const variantes = docs as unknown as Variante[]

  const fichas = await fichasDe(req, chaves(variantes.map((v) => idDaRelacao(v.product))))

  return new Map(
    variantes.map((v) => [
      String(v.id),
      fichas.get(String(idDaRelacao(v.product)))?.categoria ?? SEM_CATEGORIA,
    ]),
  )
}

const linhasDe = (encomendas: Encomenda[], categorias: Map<string, string>): LinhaDashboard[] =>
  encomendas.flatMap((e) =>
    (e.linhas ?? []).map((l) => ({
      encomenda: String(e.id),
      sku: String(l.sku ?? ''),
      titulo: String(l.titulo ?? ''),
      categoria: categorias.get(String(idDaRelacao(l.variante))) ?? SEM_CATEGORIA,
      quantidade: Number(l.quantidade),
      precoUnitarioCents: Number(l.precoUnitarioCents),
      // `null` e não zero: a encomenda antiga sem custo congelado não custou
      // nada de graça — não se sabe quanto custou. É a diferença que faz a
      // margem vir desconhecida em vez de 100%.
      custoUnitarioCents:
        l.custoUnitarioCents === undefined || l.custoUnitarioCents === null
          ? null
          : Number(l.custoUnitarioCents),
    })),
  )

/**
 * Novo é quem comprou no período e nunca antes. Uma encomenda sem cliente (a
 * conta foi apagada a pedido, ver `hooks/anonimizarEncomendas.ts`) não entra em
 * nenhuma das duas contas — a faturação dela continua a contar, mas a pessoa já
 * não existe para ser classificada.
 */
const clientesDe = async (
  req: PayloadRequest,
  janela: Janela,
  encomendas: Encomenda[],
): Promise<{ novos: number; recorrentes: number }> => {
  const ids = chaves(encomendas.map((e) => idDaRelacao(e.cliente)))
  if (ids.length === 0) return { novos: 0, recorrentes: 0 }

  const { docs } = await req.payload.find({
    collection: 'orders',
    where: {
      and: [
        { cliente: { in: ids } },
        { createdAt: { less_than: janela.de.toISOString() } },
        { estado: { not_equals: 'cancelado' } },
      ],
    },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })

  const recorrentes = new Set(
    (docs as unknown as Encomenda[]).map((e) => String(idDaRelacao(e.cliente))),
  )
  return { novos: ids.length - recorrentes.size, recorrentes: recorrentes.size }
}

/**
 * Rutura e stock baixo numa consulta só: `stock <= 5` traz as duas e a
 * separação faz-se em memória.
 *
 * Só variantes ativas de produtos publicados. Uma rutura num rascunho não é
 * uma venda perdida — é um produto que ainda não está à venda, e enchia a lista
 * de ruído.
 */
const stockDe = async (
  req: PayloadRequest,
): Promise<{ ruturas: ArtigoStock[]; baixo: ArtigoStock[] }> => {
  const { docs } = await req.payload.find({
    collection: 'variants',
    where: {
      and: [{ active: { equals: true } }, { stock: { less_than_equal: LIMIAR_STOCK_BAIXO } }],
    },
    depth: 0,
    limit: 0,
    sort: 'stock',
    overrideAccess: true,
    req,
  })
  const variantes = docs as unknown as Variante[]
  const fichas = await fichasDe(req, chaves(variantes.map((v) => idDaRelacao(v.product))))

  const artigos: { stock: number; artigo: ArtigoStock }[] = []
  for (const v of variantes) {
    const ficha = fichas.get(String(idDaRelacao(v.product)))
    if (!ficha?.publicado) continue
    const stock = Number(v.stock)
    artigos.push({ stock, artigo: { sku: String(v.sku ?? ''), titulo: ficha.titulo, stock } })
  }

  return {
    ruturas: artigos.filter((a) => a.stock <= 0).map((a) => a.artigo),
    baixo: artigos.filter((a) => a.stock > 0).map((a) => a.artigo),
  }
}

/**
 * ponytail: lê as encomendas do período todas de uma vez (`limit: 0`) e agrega
 * em memória. Teto assumido: uma pet shop portuguesa não faz dezenas de
 * milhares de encomendas por mês. Quando fizer, isto passa a `SUM`/`GROUP BY`
 * em SQL — e aí a agregação deixa de ser a mesma nos dois estados da trava, que
 * é precisamente o que se ganha em ser aqui.
 */
const lerDaBase = async (req: PayloadRequest, janela: Janela): Promise<Fonte> => {
  const doPeriodo = await encomendasDe(req, janela)
  const doAnterior = await encomendasDe(req, anteriorDe(janela))

  const categorias = await categoriasDasLinhas(req, doPeriodo)
  const clientes = await clientesDe(req, janela, doPeriodo)
  const stock = await stockDe(req)

  return {
    periodo: linhasDe(doPeriodo, categorias),
    // O período anterior só entra em totais — poupa-se-lhe a resolução de
    // categorias, que é a parte cara.
    anterior: linhasDe(doAnterior, new Map()),
    clientesNovos: clientes.novos,
    clientesRecorrentes: clientes.recorrentes,
    ruturas: stock.ruturas,
    stockBaixo: stock.baixo,
  }
}

// ---------------------------------------------------------------------------
// Fonte de demonstração
// ---------------------------------------------------------------------------

/**
 * Uma pet shop inventada, fixa e independente do período pedido.
 *
 * Fixa de propósito: um gerador aleatório dava números diferentes a cada
 * carregamento (que se percebe logo que é falso, e aí não demonstra nada) ou
 * números derivados dos reais (que é exatamente o que a trava existe para
 * impedir). Sendo constantes, a prova de que nenhum número real sai daqui é
 * lê-los neste ficheiro.
 *
 * Os SKUs levam `DEMO-` à frente pela mesma razão da faixa: quem estiver a
 * olhar não pode confundir isto com o seu catálogo.
 *
 * As duas listas de mais vendidos saem diferentes com estes valores — os
 * snacks lideram em unidades, a ração em dinheiro — porque é essa diferença
 * que o dashboard existe para mostrar.
 */
const artigoDemo = (
  sku: string,
  titulo: string,
  categoria: string,
  precoUnitarioCents: number,
  custoUnitarioCents: number,
) => (encomenda: string, quantidade: number): LinhaDashboard => ({
  encomenda,
  sku,
  titulo,
  categoria,
  quantidade,
  precoUnitarioCents,
  custoUnitarioCents,
})

const racao = artigoDemo('DEMO-RAC-15', 'Ração cão adulto 15 kg', 'Alimentação', 3990, 2600)
const snack = artigoDemo('DEMO-SNK-07', 'Snack dental (pack 7)', 'Alimentação', 349, 140)
const areia = artigoDemo('DEMO-ARE-10', 'Areia aglomerante 10 L', 'Higiene', 899, 550)
const champo = artigoDemo('DEMO-CHM-25', 'Champô pelo sensível 250 ml', 'Higiene', 1290, 620)
const coleira = artigoDemo('DEMO-COL-AP', 'Coleira antiparasitária', 'Acessórios', 2450, 1200)
const corda = artigoDemo('DEMO-BRQ-CD', 'Brinquedo de corda', 'Brinquedos', 599, 210)
const cama = artigoDemo('DEMO-CAM-M', 'Cama ortopédica M', 'Conforto', 5990, 3400)

const DEMONSTRACAO: Fonte = {
  periodo: [
    racao('D1', 1),
    snack('D1', 3),
    areia('D2', 2),
    cama('D3', 1),
    snack('D4', 6),
    corda('D4', 2),
    coleira('D5', 1),
    racao('D6', 2),
    champo('D7', 1),
    snack('D7', 4),
    corda('D8', 5),
    areia('D9', 3),
  ],
  anterior: [
    racao('E1', 1),
    areia('E2', 2),
    snack('E3', 5),
    coleira('E4', 1),
    corda('E5', 3),
    champo('E6', 2),
  ],
  clientesNovos: 4,
  clientesRecorrentes: 3,
  ruturas: [
    { sku: 'DEMO-ARE-10', titulo: 'Areia aglomerante 10 L', stock: 0 },
    { sku: 'DEMO-CAM-M', titulo: 'Cama ortopédica M', stock: 0 },
  ],
  stockBaixo: [
    { sku: 'DEMO-SNK-07', titulo: 'Snack dental (pack 7)', stock: 2 },
    { sku: 'DEMO-COL-AP', titulo: 'Coleira antiparasitária', stock: 4 },
  ],
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/**
 * O dashboard, para quem já provou ser staff. É o mesmo caminho para o endpoint
 * HTTP e para o ecrã do painel — a decisão da trava não pode viver em dois
 * sítios que possam divergir.
 */
export const lerDashboard = async (
  req: PayloadRequest,
  query: Record<string, unknown>,
): Promise<Dashboard> => {
  const janela = lerJanela(query)

  // `overrideAccess: true` de propósito: o `access.read` do campo esconde o
  // interruptor de quem não é dono, e sem isto o servidor lia `undefined` numa
  // sessão de `admin`. O valor da trava tem de ser o que está na base, não o
  // que a sessão pode ver.
  const definicoes = await req.payload.findGlobal({
    slug: 'definicoes',
    depth: 0,
    overrideAccess: true,
    req,
  })
  const desbloqueado = definicoes.dashboardDesbloqueado === true

  // Bloqueado, `lerDaBase` não corre. Os números reais não saem da base porque
  // não são lidos.
  const fonte = desbloqueado ? await lerDaBase(req, janela) : DEMONSTRACAO

  return construirDashboard(fonte, janela, !desbloqueado)
}

export const dashboard: Endpoint = {
  path: '/dashboard',
  method: 'get',
  handler: async (req) => {
    // Sem sessão não responde de todo: nem demonstração. O dashboard é do
    // interior da loja, e um endpoint anónimo que devolve a forma toda dos
    // dados é um mapa do que existe cá dentro.
    if (!req.user) {
      return Response.json({ erro: 'É preciso entrar no painel.' }, { status: 401 })
    }
    // Um cliente registado tem sessão e não é staff — foi assim que a fase 2
    // deixou fugir o custo de compra. Ver `access/staff.ts`.
    if (!ehStaff(req.user)) {
      return Response.json(
        { erro: 'Esta sessão é de cliente. O dashboard é da administração da loja.' },
        { status: 403 },
      )
    }

    try {
      return Response.json(await lerDashboard(req, req.query))
    } catch (erro) {
      if (erro instanceof DashboardError) {
        return Response.json({ erro: erro.message }, { status: 400 })
      }
      throw erro
    }
  },
}
