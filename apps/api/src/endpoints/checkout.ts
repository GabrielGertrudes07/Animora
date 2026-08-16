import type { Endpoint, PayloadRequest } from 'payload'
import { APIError, commitTransaction, initTransaction, killTransaction } from 'payload'
import { calcularTotais } from '@animora/core'

import { idDaRelacao } from '../hooks/blockUnsellable'
import { serializarGuarda } from '../hooks/serializar'

/**
 * `POST /api/checkout` — o único sítio onde o stock desce e o dinheiro fica
 * registado.
 *
 * ## O que vem do cliente e o que vem do servidor
 *
 * Do cliente: `{ linhas: [{ variantId, qty }], moradaEnvio }`. Mais nada é lido.
 * Um `unitPriceCents` no corpo não é recusado nem validado — é **ignorado**, que
 * é diferente: validar um preço submetido é aceitar que exista um preço
 * submetido, e a partir daí a segurança passa a depender de a validação estar
 * certa. Aqui o preço nunca entra no caminho.
 *
 * Do servidor, dentro da transação: preço, custo, título, SKU, opções e stock.
 * A encomenda congela `precoUnitarioCents` e `custoUnitarioCents` no instante da
 * compra — mudar o catálogo amanhã não reescreve as encomendas de hoje.
 *
 * ## Porque é tudo dentro de uma transação com o lock consultivo
 *
 * "Ler o stock, decidir, escrever" é exatamente a forma de guarda que a fase 1
 * viu ser atravessada cinco vezes: duas transações concorrentes leem ambas o
 * estado anterior às escritas uma da outra, ambas concluem que há stock, e a
 * última unidade é vendida duas vezes. O `serializarGuarda` põe os checkouts em
 * fila (`pg_advisory_xact_lock`, ver `hooks/serializar.ts`), e é pedido **antes
 * da primeira leitura que decide** — pedi-lo depois de ler o stock não serializa
 * decisão nenhuma.
 *
 * A mesma fila resolve o número da encomenda, que é `unique` e é escolhido a
 * partir do último existente: sem serialização, duas compras simultâneas
 * escolhiam o mesmo.
 *
 * Tudo o que se segue corre na mesma transação e com o mesmo `req`, por isso ou
 * confirma inteiro ou desfaz inteiro: não há encomenda parcial nem stock descido
 * a meio. Qualquer recusa faz `killTransaction` antes de responder.
 *
 * ponytail: o lock é o mesmo do catálogo — uma chave global para o projeto
 * inteiro. Serializa checkouts de artigos sem relação entre si durante os
 * milissegundos de cada transação. Teto assumido: uma pet shop portuguesa não
 * tem cem compras por segundo. Quando tiver, passa a uma chave por variante
 * (`hashtext` do id) — e aí é obrigatório fixar uma ordem de aquisição única e
 * respeitá-la em todos os caminhos, incluindo o `syncVariants`, que escreve
 * antes de bloquear (ver `serializar.ts`).
 *
 * Sem pagamento: a encomenda nasce `a-aguardar-pagamento`. É a costura para o
 * Stripe, que fica para outra tarefa.
 */

/** Um carrinho é um carrinho, não um lote de importação. */
const MAX_LINHAS = 100

/** Recusa com resposta pronta. Atirar em vez de devolver garante o rollback. */
class Recusa extends Error {
  constructor(
    readonly estado: number,
    readonly corpo: Record<string, unknown>,
  ) {
    super(String(corpo.erro))
  }
}

/** A variante como sai da base com `depth: 0`. */
type Variante = {
  id: number | string
  product: unknown
  sku: string
  combination: unknown
  priceCents: number
  costCents?: number | null
  stock: number
  active?: boolean | null
}

const texto = (valor: unknown): string | undefined => (typeof valor === 'string' ? valor : undefined)

/**
 * Identificadores e quantidades, agregados por variante.
 *
 * A agregação não é cosmética: duas linhas da mesma variante com `qty: 1` cada,
 * verificadas uma a uma contra a mesma leitura de stock, passavam as duas com
 * uma só unidade em armazém. Somadas, é uma linha de 2 e a verificação é uma só.
 */
const lerLinhas = (corpo: unknown): Map<string, number> => {
  const pedidas = (corpo as { linhas?: unknown } | null | undefined)?.linhas

  if (!Array.isArray(pedidas) || pedidas.length === 0) {
    throw new Recusa(400, { erro: 'O carrinho está vazio.' })
  }
  if (pedidas.length > MAX_LINHAS) {
    throw new Recusa(400, { erro: `Um carrinho não pode ter mais de ${MAX_LINHAS} linhas.` })
  }

  const linhas = new Map<string, number>()

  for (const bruta of pedidas) {
    const { variantId, qty } = (bruta ?? {}) as { variantId?: unknown; qty?: unknown }

    if (
      (typeof variantId !== 'number' && typeof variantId !== 'string') ||
      String(variantId).trim() === ''
    ) {
      throw new Recusa(400, { erro: 'Cada linha do carrinho tem de identificar a variante.' })
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
      throw new Recusa(400, {
        erro: `Quantidade inválida: ${JSON.stringify(qty)}. Tem de ser um número inteiro igual ou maior que 1.`,
      })
    }

    const chave = String(variantId)
    linhas.set(chave, (linhas.get(chave) ?? 0) + qty)
  }

  return linhas
}

/**
 * Só os campos da morada, e só como texto.
 *
 * O que falta ou está mal formatado é recusado pela própria coleção (código
 * postal português incluído) — a regra vive num sítio só, em `validacoes.ts`, e
 * a `ValidationError` que ela atira sai daqui como 400 sem nada gravado.
 */
const lerMorada = (corpo: unknown): Record<string, string | undefined> => {
  const m = ((corpo as { moradaEnvio?: unknown } | null | undefined)?.moradaEnvio ?? {}) as Record<
    string,
    unknown
  >
  return {
    nomeDestinatario: texto(m.nomeDestinatario),
    linha1: texto(m.linha1),
    linha2: texto(m.linha2),
    codigoPostal: texto(m.codigoPostal),
    localidade: texto(m.localidade),
    telefone: texto(m.telefone),
  }
}

/**
 * `AN-2026-0001` — para alguém ditar ao telefone e para o staff procurar.
 *
 * Do último do ano, e não de uma contagem: encomendas apagadas fariam a contagem
 * recuar e o número seguinte colidir com um que já existe (`numero` é `unique`).
 * A corrida entre dois checkouts a escolher o mesmo número é fechada pelo lock,
 * que já está seguro quando isto corre.
 */
const proximoNumero = async (req: PayloadRequest): Promise<string> => {
  const prefixo = `AN-${new Date().getFullYear()}-`

  const { docs } = await req.payload.find({
    collection: 'orders',
    where: { numero: { like: prefixo } },
    sort: '-numero',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const ultimo = docs[0]?.numero
  const sequencia = ultimo === undefined ? 0 : Number(String(ultimo).slice(prefixo.length))

  if (!Number.isInteger(sequencia)) {
    throw new APIError(`Número de encomenda ilegível na base: "${String(ultimo)}".`, 500)
  }

  return `${prefixo}${String(sequencia + 1).padStart(4, '0')}`
}

const comprar = async (
  req: PayloadRequest,
  cliente: { id: number | string; email?: unknown },
  corpo: unknown,
): Promise<Record<string, unknown>> => {
  const pedidas = lerLinhas(corpo)
  const moradaEnvio = lerMorada(corpo)

  // Antes de ler o que quer que decida alguma coisa. Ver o cabeçalho.
  await serializarGuarda(req)

  const { docs } = await req.payload.find({
    collection: 'variants',
    where: { id: { in: [...pedidas.keys()] } },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })
  const variantes = new Map((docs as unknown as Variante[]).map((v) => [String(v.id), v]))

  // Um produto por publicar não está à venda — e as suas variantes também não,
  // pela mesma razão por que a loja não as mostra (`soDeProdutosPublicados`).
  const { docs: produtos } = await req.payload.find({
    collection: 'products',
    where: {
      and: [
        {
          id: {
            in: [...variantes.values()]
              .map((v) => idDaRelacao(v.product))
              .filter((id) => id !== undefined),
          },
        },
        { _status: { equals: 'published' } },
      ],
    },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })
  const titulos = new Map(produtos.map((p) => [String(p.id), String(p.title)]))

  const indisponiveis: (number | string)[] = []
  const semStock: Record<string, unknown>[] = []
  const linhas: { variante: number | string; quantidade: number; dados: Record<string, unknown> }[] =
    []

  for (const [id, quantidade] of pedidas) {
    const v = variantes.get(id)
    const titulo = v && titulos.get(String(idDaRelacao(v.product)))

    // Inexistente, desativada, sem preço ou de um produto por publicar: são
    // todas a mesma resposta ao cliente — este artigo não está à venda.
    if (!v || !titulo || v.active !== true || !(v.priceCents > 0)) {
      indisponiveis.push(id)
      continue
    }

    if (v.stock < quantidade) {
      semStock.push({ variantId: v.id, titulo, sku: v.sku, pedido: quantidade, disponivel: v.stock })
      continue
    }

    linhas.push({
      variante: v.id,
      quantidade,
      dados: {
        variante: v.id,
        titulo,
        sku: v.sku,
        opcoes: v.combination,
        quantidade,
        // Congelados aqui, lidos da variante neste instante.
        precoUnitarioCents: v.priceCents,
        custoUnitarioCents: v.costCents ?? null,
      },
    })
  }

  if (indisponiveis.length > 0) {
    throw new Recusa(400, {
      erro: 'Há artigos no carrinho que já não estão à venda.',
      indisponiveis,
    })
  }

  // Uma linha sem stock chega para recusar o carrinho inteiro: nada é gravado e
  // nenhum stock desce. Meia encomenda seria pior do que nenhuma.
  if (semStock.length > 0) {
    throw new Recusa(409, {
      erro: 'Não há stock suficiente para finalizar a compra.',
      semStock,
    })
  }

  // Quanto DESCE, não quanto fica: um valor absoluto calculado aqui é um valor
  // velho no instante em que chega à base, e é assim que uma gravação do painel
  // ressuscitava vendas. Ver `hooks/ajustarStock.ts`, que é quem escreve.
  for (const linha of linhas) {
    await req.payload.update({
      collection: 'variants',
      id: linha.variante,
      data: { ajusteStock: -linha.quantidade },
      overrideAccess: true,
      req,
    })
  }

  const totais = calcularTotais(
    linhas.map((l) => ({
      variantId: Number(l.variante),
      qty: l.dados.quantidade as number,
      unitPriceCents: l.dados.precoUnitarioCents as number,
    })),
  )

  const encomenda = await req.payload.create({
    collection: 'orders',
    // As encomendas não nascem de um `POST /api/orders` — `create` é `false`
    // para toda a gente, e este é o único caminho.
    overrideAccess: true,
    req,
    data: {
      numero: await proximoNumero(req),
      cliente: cliente.id,
      email: String(cliente.email ?? ''),
      estado: 'a-aguardar-pagamento',
      linhas: linhas.map((l) => l.dados),
      subtotalCents: totais.subtotalCents,
      portesCents: totais.shippingCents,
      totalCents: totais.totalCents,
      moradaEnvio,
    },
  })

  // Escolhido campo a campo: o documento criado traz o custo unitário, e o
  // cliente nunca o pode ler (é a margem — foi assim que a fase 2 falhou).
  return {
    id: encomenda.id,
    numero: encomenda.numero,
    estado: encomenda.estado,
    subtotalCents: totais.subtotalCents,
    portesCents: totais.shippingCents,
    totalCents: totais.totalCents,
    linhas: linhas.map((l) => ({
      variantId: l.variante,
      titulo: l.dados.titulo,
      sku: l.dados.sku,
      quantidade: l.dados.quantidade,
      precoUnitarioCents: l.dados.precoUnitarioCents,
    })),
  }
}

/**
 * O checkout sem o embrulho HTTP, para os testes de integração o poderem correr
 * em paralelo pela Local API — é a única forma de a corrida da última unidade
 * ser um teste automático e não uma medição manual.
 */
export const finalizarCompra = async (req: PayloadRequest, corpo: unknown): Promise<Response> => {
  const cliente = req.user

  if (!cliente) {
    return Response.json(
      { erro: 'É preciso entrar na conta para finalizar a compra.' },
      { status: 401 },
    )
  }

  // Uma sessão de staff é uma sessão — só não é a de um cliente. 403 e não 401:
  // quem está autenticado não tem nada para repetir no login. A encomenda tem
  // dono (`cliente` é obrigatório e aponta para `customers`), e o staff não é um
  // deles; deixar passar exigiria inventar a quem pertence a encomenda. Quem
  // trabalha na loja e quer comprar usa a sua conta de cliente, como toda a
  // gente.
  if (cliente.collection !== 'customers') {
    return Response.json(
      {
        erro: 'Esta sessão é da administração, não de um cliente. Entre com a sua conta de cliente para comprar.',
      },
      { status: 403 },
    )
  }

  // O endpoint é sempre a raiz do pedido: não há transação em curso para herdar.
  await initTransaction(req)

  try {
    const resposta = await comprar(req, cliente, corpo)
    await commitTransaction(req)
    return Response.json(resposta, { status: 201 })
  } catch (erro) {
    // Antes de responder seja o que for: uma recusa com a transação por fechar
    // deixaria o stock descido para quem viesse a seguir.
    await killTransaction(req)

    if (erro instanceof Recusa) return Response.json(erro.corpo, { status: erro.estado })
    // Inclui a `ValidationError` da morada de envio — 400, sem nada gravado.
    if (erro instanceof APIError) {
      return Response.json({ erro: erro.message }, { status: erro.status })
    }
    throw erro
  }
}

/**
 * Limite de ritmo, janela deslizante em memória.
 *
 * Sem ele, uma pessoa registada dispara centenas de checkouts em rajada e prende
 * o stock de todo o catálogo em encomendas por pagar — medido: mais de cem
 * pedidos seguidos sem um único 429. Cancelar já repõe o stock, mas isso é a
 * limpeza; isto é o travão.
 *
 * Vive no `handler` HTTP e não no `finalizarCompra`: é uma defesa da fronteira,
 * não uma regra do negócio, e a Local API dos testes (que dispara cinco compras
 * simultâneas de propósito) tem de continuar a poder fazê-lo.
 *
 * ponytail: um `Map` por processo. Não sobrevive a reiniciar nem se soma entre
 * instâncias, e as chaves não são podadas (uma entrada por cliente que compre).
 * Chega para o que isto protege — uma pet shop com um processo. Se um dia
 * houver mais do que um, o sítio disto é o proxy à frente, não este ficheiro.
 */
const JANELA_MS = 60_000
const MAX_POR_JANELA = 10
const historico = new Map<string, number[]>()

export const dentroDoLimite = (chave: string, agora: number = Date.now()): boolean => {
  const recentes = (historico.get(chave) ?? []).filter((t) => agora - t < JANELA_MS)
  historico.set(chave, recentes)

  if (recentes.length >= MAX_POR_JANELA) return false

  recentes.push(agora)
  return true
}

export const checkout: Endpoint = {
  path: '/checkout',
  method: 'post',
  handler: async (req) => {
    // Por conta, que é o que o endpoint exige de qualquer maneira; sem sessão,
    // por origem, para uma rajada anónima também não chegar ao resto.
    const chave = req.user
      ? `${String(req.user.collection)}:${String(req.user.id)}`
      : `anon:${req.headers?.get('x-forwarded-for') ?? 'desconhecida'}`

    if (!dentroDoLimite(chave)) {
      return Response.json(
        { erro: 'Demasiadas compras seguidas. Tente daqui a um minuto.' },
        { status: 429, headers: { 'Retry-After': String(JANELA_MS / 1000) } },
      )
    }

    let corpo: unknown
    try {
      corpo = await req.json?.()
    } catch {
      return Response.json({ erro: 'O corpo do pedido não é JSON válido.' }, { status: 400 })
    }
    return finalizarCompra(req, corpo)
  },
}
