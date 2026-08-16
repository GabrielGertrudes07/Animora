/**
 * Testes de integração contra o Postgres real, pela Local API do Payload.
 *
 * Existem por um motivo concreto: os dois defeitos mais graves deste ramo
 * (rascunho a apagar variantes publicadas, e publicar com opções alteradas no
 * mesmo pedido a deixar passar variantes a zero) sobreviveram a quatro rondas
 * de verificação manual, porque cada ronda testou o cenário que o pedido
 * nomeava. Ninguém gravou um rascunho. Ninguém publicou e mudou opções ao
 * mesmo tempo. Estes testes fixam os cenários que este ramo já sabe que
 * quebram, para que o próximo refactor os volte a correr sem se lembrar deles.
 *
 * Precisam do Postgres a correr (`docker compose up -d`) e de `apps/api/.env`.
 * Correm contra a base de dados de desenvolvimento e limpam o que criam: tudo
 * o que criam leva o prefixo `zteste`.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type Payload } from 'payload'
import { combinationKey } from '@animora/core'

import config from '../payload.config'
import { dentroDoLimite, finalizarCompra } from './endpoints/checkout'
import { AVISO_DEMONSTRACAO, dashboard, lerDashboard } from './endpoints/dashboard'

const P = 'zteste'

/** 1×1 PNG — o mínimo que o sharp aceita para haver imagem na galeria. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** O Payload tipa os ids como `string | number` — este adaptador usa inteiros. */
type Id = string | number

type Linha = {
  id: Id
  combination: Record<string, string>
  sku: string
  priceCents: number
  stock: number
  active: boolean
}

let payload: Payload
let marca: Id
let categoria: Id
let imagem: Id

const opcao = (nome: string, ...valores: string[]) => ({
  name: nome,
  values: valores.map((value) => ({ value })),
})

const criarRascunho = async (sufixo: string, options: ReturnType<typeof opcao>[] = []) =>
  payload.create({
    collection: 'products',
    data: {
      title: `Zteste ${sufixo}`,
      slug: `${P}-${sufixo}`,
      brand: marca,
      categories: [categoria],
      gallery: [{ image: imagem }],
      options,
    },
  })

const publicar = (id: Id) =>
  payload.update({ collection: 'products', id, data: { _status: 'published' } })

/**
 * O caminho do botão "Publicar" da lista do painel: `PATCH ?where=...&draft=true`.
 *
 * Não é o mesmo código do documento único e não se comporta como ele: o
 * adaptador Postgres não define `bulkOperationsSingleTransaction`, por isso não
 * há transação por documento e um erro de hook não desfaz nada — vai para
 * `errors[]` e a transação exterior confirma à mesma. Daí este helper devolver
 * o resultado em vez de rebentar, e daí os testes que o usam confirmarem sempre
 * o estado real na base de dados.
 */
const publicarEmMassa = (data: Record<string, unknown> = {}) =>
  payload.update({
    collection: 'products',
    where: { slug: { contains: P } },
    draft: true,
    data: { _status: 'published', ...data },
  })

const variantesDe = async (produto: Id): Promise<Linha[]> => {
  const { docs } = await payload.find({
    collection: 'variants',
    where: { product: { equals: produto } },
    depth: 0,
    limit: 0,
    sort: 'id',
  })
  return docs as unknown as Linha[]
}

/**
 * Põe o stock num número, pelo único caminho que existe: um ajuste.
 *
 * `data: { stock: n }` não faz nada de propósito — um valor absoluto submetido é
 * descartado, porque é sempre o valor de quando quem o submete o leu (ver
 * `hooks/ajustarStock.ts`). Os testes preparam o cenário como o lojista o
 * prepararia: dizendo quanto muda.
 */
const definirStock = async (variante: Id, unidades: number): Promise<void> => {
  const atual = (await payload.findByID({ collection: 'variants', id: variante, depth: 0 }))
    .stock as number
  await payload.update({
    collection: 'variants',
    id: variante,
    data: { ajusteStock: unidades - atual },
  })
}

const porTamanho = (linhas: Linha[], tamanho: string): Linha | undefined =>
  linhas.find((l) => l.combination.Tamanho === tamanho)

const limparCatalogo = async () => {
  // Encomendas primeiro: apontam para clientes e para variantes, que os passos
  // seguintes apagam. Pelo email e não só pelo número: as do checkout são
  // numeradas pelo servidor (`AN-2026-0001`) e não levam o prefixo de teste.
  await payload.delete({
    collection: 'orders',
    where: {
      or: [
        { numero: { contains: P } },
        { email: { contains: P } },
        // As encomendas de um cliente apagado perdem o email de teste: passam a
        // `apagado-an-2026-0001@rgpd.invalido`. Só as anonimizadas batem aqui.
        { email: { contains: 'rgpd.invalido' } },
      ],
    },
  })
  // Produtos a seguir: apagá-los apaga as variantes, e um produto publicado
  // impede a eliminação da marca, da categoria e da imagem que usa.
  await payload.delete({ collection: 'products', where: { slug: { contains: P } } })
  await payload.delete({ collection: 'users', where: { email: { contains: P } } })
  await payload.delete({ collection: 'customers', where: { email: { contains: P } } })
}

beforeAll(async () => {
  payload = await getPayload({ config })

  await limparCatalogo()
  await payload.delete({ collection: 'brands', where: { slug: { contains: P } } })
  await payload.delete({ collection: 'categories', where: { slug: { contains: P } } })
  await payload.delete({ collection: 'media', where: { alt: { contains: P } } })

  marca = (
    await payload.create({ collection: 'brands', data: { name: 'Zteste', slug: `${P}-marca` } })
  ).id
  categoria = (
    await payload.create({
      collection: 'categories',
      data: { name: 'Zteste', slug: `${P}-categoria` },
    })
  ).id
  imagem = (
    await payload.create({
      collection: 'media',
      data: { alt: `${P} imagem` },
      file: { data: PNG, mimetype: 'image/png', name: `${P}.png`, size: PNG.length },
    })
  ).id
})

afterEach(limparCatalogo)

afterAll(async () => {
  await limparCatalogo()
  await payload.delete({ collection: 'brands', where: { slug: { contains: P } } })
  await payload.delete({ collection: 'categories', where: { slug: { contains: P } } })
  await payload.delete({ collection: 'media', where: { alt: { contains: P } } })
})

describe('sincronização de variantes', () => {
  it('acrescentar um valor preserva preço, stock e id das variantes existentes', async () => {
    const produto = await criarRascunho('acrescentar', [opcao('Tamanho', 'S', 'M')])
    const antes = await variantesDe(produto.id)
    expect(antes).toHaveLength(2)

    const s = porTamanho(antes, 'S')!
    await payload.update({
      collection: 'variants',
      id: s.id,
      data: { priceCents: 2990, ajusteStock: 12 },
    })
    await publicar(produto.id)

    await payload.update({
      collection: 'products',
      id: produto.id,
      data: { options: [opcao('Tamanho', 'S', 'M', 'L')] },
    })

    const depois = await variantesDe(produto.id)
    expect(depois).toHaveLength(3)

    const sDepois = porTamanho(depois, 'S')!
    // O id é a prova de que a linha não foi recriada: preço e stock certos numa
    // linha nova significariam que o hook a reescreve, e não que nunca lhe toca.
    expect(sDepois.id).toBe(s.id)
    expect(sDepois.priceCents).toBe(2990)
    expect(sDepois.stock).toBe(12)
    expect(porTamanho(depois, 'L')!.priceCents).toBe(0)
  })

  it('remover um valor apaga só a variante correspondente', async () => {
    const produto = await criarRascunho('remover', [opcao('Tamanho', 'S', 'M', 'L')])
    for (const [i, linha] of (await variantesDe(produto.id)).entries()) {
      await payload.update({
        collection: 'variants',
        id: linha.id,
        data: { priceCents: 1000 + i, ajusteStock: 5 },
      })
    }
    await publicar(produto.id)

    // Um preço diferente por variante: se o hook trocasse as linhas em vez de
    // as preservar, o preço aparecia na combinação errada e não só a zero.
    const antes = await variantesDe(produto.id)

    await payload.update({
      collection: 'products',
      id: produto.id,
      data: { options: [opcao('Tamanho', 'S', 'M')] },
    })

    const depois = await variantesDe(produto.id)
    expect(depois.map((l) => l.combination.Tamanho).sort()).toEqual(['M', 'S'])
    for (const tamanho of ['S', 'M']) {
      expect(porTamanho(depois, tamanho)!.id).toBe(porTamanho(antes, tamanho)!.id)
      expect(porTamanho(depois, tamanho)!.priceCents).toBe(porTamanho(antes, tamanho)!.priceCents)
    }
  })

  it('com mais de dez variantes, mudar opções preserva ids e preços de todas', async () => {
    // 4 tamanhos × 3 cores = 12 linhas, acima do `limit` por defeito de 10 do
    // `find`. É o único teste que distingue o `limit: 0` do `syncVariants` do
    // limite por omissão: sem ele, as variantes acima da décima são lidas como
    // inexistentes, não entram no conjunto conhecido, e são recriadas a zero —
    // preços apagados em silêncio. Nenhum produto dos outros testes passa das
    // três variantes, por isso todos continuavam verdes com a regressão posta.
    const cores = ['Preto', 'Branco', 'Azul']
    const produto = await criarRascunho('doze', [
      opcao('Tamanho', 'P', 'M', 'G', 'GG'),
      opcao('Cor', ...cores),
    ])

    const antes = await variantesDe(produto.id)
    expect(antes).toHaveLength(12)

    // Um preço diferente por linha: uma linha recriada dá 0, e uma linha trocada
    // dá o preço de outra combinação — os dois casos aparecem.
    for (const [i, linha] of antes.entries()) {
      await payload.update({
        collection: 'variants',
        id: linha.id,
        data: { priceCents: 1000 + i * 10, ajusteStock: i + 1 },
      })
    }
    await publicar(produto.id)

    const original = new Map(
      (await variantesDe(produto.id)).map((l) => [combinationKey(l.combination), l]),
    )

    await payload.update({
      collection: 'products',
      id: produto.id,
      data: { options: [opcao('Tamanho', 'P', 'M', 'G'), opcao('Cor', ...cores)] },
    })

    const depois = await variantesDe(produto.id)
    expect(depois).toHaveLength(9)
    for (const linha of depois) {
      const antiga = original.get(combinationKey(linha.combination))
      expect(antiga).toBeDefined()
      expect(linha.id).toBe(antiga!.id)
      expect(linha.priceCents).toBe(antiga!.priceCents)
      expect(linha.stock).toBe(antiga!.stock)
    }
  })

  it('gravar um rascunho não apaga variantes do estado publicado', async () => {
    const produto = await criarRascunho('rascunho', [opcao('Tamanho', 'S', 'M', 'L')])
    const antes = await variantesDe(produto.id)
    for (const linha of antes) {
      await payload.update({
        collection: 'variants',
        id: linha.id,
        data: { priceCents: 2990, ajusteStock: 12 },
      })
    }
    await publicar(produto.id)

    // O painel grava assim: guardar sem publicar, com as opções reduzidas.
    await payload.update({
      collection: 'products',
      id: produto.id,
      draft: true,
      data: { options: [opcao('Tamanho', 'S', 'M')] },
    })

    const depois = await variantesDe(produto.id)
    const l = porTamanho(depois, 'L')
    expect(l).toBeDefined()
    expect(l!.priceCents).toBe(2990)
    expect(l!.stock).toBe(12)

    // E a versão publicada continua a anunciar o L, coerente com a variante.
    const publicado = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })
    expect(JSON.stringify(publicado.options)).toContain('L')
  })

  it('publicar com opções alteradas no mesmo pedido não deixa passar variantes a zero', async () => {
    const produto = await criarRascunho('publicar-e-mudar', [opcao('Tamanho', 'S')])
    const [s] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: s!.id,
      data: { priceCents: 2990, ajusteStock: 12 },
    })

    // Um só pedido que publica E troca a opção: a variante com preço desaparece
    // e a nova nasce a zero. Tem de ser recusado.
    await expect(
      payload.update({
        collection: 'products',
        id: produto.id,
        data: { _status: 'published', options: [opcao('Tamanho', 'XL')] },
      }),
      // A mensagem nomeia a variante com preço que ia ficar de fora, em vez de
      // pedir preços a quem já os tem preenchidos.
    ).rejects.toThrow(/não correspondem a nenhuma combinação/)

    const depois = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })
    expect(depois._status).not.toBe('published')

    // E a recusa desfaz o que o syncVariants já tinha feito: a S continua lá.
    const linhas = await variantesDe(produto.id)
    expect(porTamanho(linhas, 'S')?.priceCents).toBe(2990)
    expect(porTamanho(linhas, 'XL')).toBeUndefined()
  })

  it('publicar um produto sem preços é recusado', async () => {
    const produto = await criarRascunho('sem-precos', [opcao('Tamanho', 'S', 'M')])

    await expect(publicar(produto.id)).rejects.toThrow(/variante ativa com preço/)

    const depois = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })
    expect(depois._status).not.toBe('published')
  })

  it('controlo positivo: com preço, imagem, marca e categoria publica', async () => {
    // Sem isto, uma guarda a recusar tudo passava por correção. As quatro
    // exigências da publicação estão aqui todas satisfeitas.
    const produto = await criarRascunho('controlo', [opcao('Tamanho', 'S')])
    const [s] = await variantesDe(produto.id)
    await payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 2990 } })

    const publicado = await publicar(produto.id)

    expect(publicado._status).toBe('published')
    expect(await variantesDe(produto.id)).toHaveLength(1)
  })

  it('em massa: publicar sem preços é recusado e não grava nada', async () => {
    const produto = await criarRascunho('massa-sem-precos', [opcao('Tamanho', 'S', 'M')])

    const { docs, errors } = await publicarEmMassa()

    expect(docs).toHaveLength(0)
    expect(errors[0]?.message).toMatch(/variante ativa com preço/)
    const depois = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })
    expect(depois._status).not.toBe('published')
  })

  it('em massa: publicar e mudar opções no mesmo pedido não apaga os preços', async () => {
    const produto = await criarRascunho('massa-mudar', [opcao('Tamanho', 'S')])
    const [s] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: s!.id,
      data: { priceCents: 4990, ajusteStock: 5 },
    })
    await publicar(produto.id)

    const { errors } = await publicarEmMassa({ options: [opcao('Tamanho', 'XL')] })

    expect(errors).toHaveLength(1)
    // O sintoma que motivou este teste: o pedido era recusado com 400 e mesmo
    // assim a variante S desaparecia com os 4990, substituída por uma XL a zero.
    const linhas = await variantesDe(produto.id)
    expect(linhas).toHaveLength(1)
    expect(porTamanho(linhas, 'S')!.id).toBe(s!.id)
    expect(porTamanho(linhas, 'S')!.priceCents).toBe(4990)
  })

  it('em massa: um produto já precificado continua a poder ser publicado', async () => {
    const bom = await criarRascunho('massa-bom', [opcao('Tamanho', 'S')])
    const mau = await criarRascunho('massa-mau', [opcao('Tamanho', 'S')])
    const [s] = await variantesDe(bom.id)
    await payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 1990 } })

    // Lote misto: cada produto é independente — o válido publica, o inválido não.
    const { docs, errors } = await publicarEmMassa()

    expect(docs).toHaveLength(1)
    expect(errors).toHaveLength(1)
    const publicado = await payload.findByID({ collection: 'products', id: bom.id, depth: 0 })
    const recusado = await payload.findByID({ collection: 'products', id: mau.id, depth: 0 })
    expect(publicado._status).toBe('published')
    expect(recusado._status).not.toBe('published')
  })

  it('criações concorrentes da mesma marca geram SKUs distintos', async () => {
    const produtos = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        payload.create({
          collection: 'products',
          data: {
            title: 'Zteste coleira',
            slug: `${P}-concorrente-${i}`,
            brand: marca,
            categories: [categoria],
          },
        }),
      ),
    )

    const skus = (
      await Promise.all(produtos.map(async (p) => (await variantesDe(p.id))[0]!.sku))
    ).sort()

    expect(skus).toHaveLength(8)
    expect(new Set(skus).size).toBe(8)
  })

  it('apagar um produto apaga as suas variantes', async () => {
    const produto = await criarRascunho('apagar', [opcao('Tamanho', 'S', 'M')])
    expect(await variantesDe(produto.id)).toHaveLength(2)

    await payload.delete({ collection: 'products', id: produto.id })

    expect(await variantesDe(produto.id)).toHaveLength(0)
  })
})

describe('invariante do produto publicado, pelo lado da variante', () => {
  /** Produto publicado com uma única variante vendável. */
  const publicadoComPreco = async (sufixo: string, valores: string[] = ['S']) => {
    const produto = await criarRascunho(sufixo, [opcao('Tamanho', ...valores)])
    const [primeira] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: primeira!.id,
      data: { priceCents: 2990, ajusteStock: 4 },
    })
    await publicar(produto.id)
    return { produto, variante: primeira! }
  }

  it('apagar a última variante com preço é recusado', async () => {
    const { produto, variante } = await publicadoComPreco('ultima-apagar')

    await expect(payload.delete({ collection: 'variants', id: variante.id })).rejects.toThrow(
      /última variante ativa com preço/,
    )

    // Sem a guarda isto devolvia 200 e deixava o produto publicado com zero
    // variantes — à venda sem nada para vender, e impossível de voltar a gravar.
    expect(await variantesDe(produto.id)).toHaveLength(1)
  })

  it('zerar o preço ou desativar a última variante com preço é recusado', async () => {
    const { variante } = await publicadoComPreco('ultima-zerar')

    for (const data of [{ priceCents: 0 }, { active: false }]) {
      await expect(
        payload.update({ collection: 'variants', id: variante.id, data }),
      ).rejects.toThrow(/última variante ativa com preço/)
    }

    const depois = await payload.findByID({ collection: 'variants', id: variante.id, depth: 0 })
    expect(depois.priceCents).toBe(2990)
    expect(depois.active).toBe(true)
  })

  it('a guarda não estorva o que é legítimo', async () => {
    // Rascunho: ainda não está à venda, mexe-se à vontade.
    const rascunho = await criarRascunho('guarda-rascunho', [opcao('Tamanho', 'S')])
    const [linha] = await variantesDe(rascunho.id)
    await payload.update({ collection: 'variants', id: linha!.id, data: { priceCents: 0 } })

    // Publicado com duas variantes vendáveis: zerar uma delas não deixa o
    // produto sem nada para vender.
    const { produto, variante } = await publicadoComPreco('guarda-duas', ['S', 'M'])
    const outra = (await variantesDe(produto.id)).find((l) => l.id !== variante.id)!
    await payload.update({ collection: 'variants', id: outra.id, data: { priceCents: 1990 } })
    await payload.update({ collection: 'variants', id: variante.id, data: { priceCents: 0 } })

    // E apagar o produto publicado continua a levar as variantes à frente.
    await payload.delete({ collection: 'products', id: produto.id })
    expect(await variantesDe(produto.id)).toHaveLength(0)
  })
})

/**
 * O caminho em massa e o caminho paralelo, para cada guarda que conta antes de
 * decidir.
 *
 * Estes testes existem porque o mesmo defeito apareceu quatro vezes neste ramo,
 * sempre pela mesma porta: uma guarda que conta os irmãos passa quando os
 * irmãos estão a ser mudados ao mesmo tempo. Toda a verificação anterior foi
 * feita com um documento de cada vez, que é o único caminho onde essas guardas
 * funcionavam. Sem estes testes, a quinta instância entra pela mesma porta.
 */
describe('guardas em massa e em paralelo', () => {
  const publicadoComDuas = async (sufixo: string) => {
    const produto = await criarRascunho(sufixo, [opcao('Tamanho', 'S', 'M')])
    const linhas = await variantesDe(produto.id)
    await payload.update({ collection: 'variants', id: linhas[0]!.id, data: { priceCents: 1990 } })
    await payload.update({ collection: 'variants', id: linhas[1]!.id, data: { priceCents: 4990 } })
    await publicar(produto.id)
    return produto
  }

  const vendaveis = async (produto: Id) =>
    (
      await payload.count({
        collection: 'variants',
        where: {
          and: [
            { product: { equals: produto } },
            { active: { equals: true } },
            { priceCents: { greater_than: 0 } },
          ],
        },
      })
    ).totalDocs

  const estaPublicado = async (produto: Id) =>
    (await payload.findByID({ collection: 'products', id: produto, depth: 0 }))._status ===
    'published'

  it('em massa: desativar todas as variantes de um produto publicado é recusado', async () => {
    const produto = await publicadoComDuas('massa-desativar')

    // O caminho do painel: escolher as linhas na lista e desativar de uma vez.
    // Cada guarda via a irmã ainda vendável, todas passavam, e o produto ficava
    // publicado com zero para vender — 200, sem erro nenhum.
    const { errors } = await payload.update({
      collection: 'variants',
      where: { product: { equals: produto.id } },
      data: { active: false },
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(await estaPublicado(produto.id)).toBe(true)
    expect(await vendaveis(produto.id)).toBeGreaterThan(0)
  })

  it('em massa: apagar todas as variantes de um produto publicado é recusado', async () => {
    const produto = await publicadoComDuas('massa-apagar')

    const { errors } = await payload.delete({
      collection: 'variants',
      where: { product: { equals: produto.id } },
    })

    expect(errors.length).toBeGreaterThan(0)
    expect(await vendaveis(produto.id)).toBeGreaterThan(0)
  })

  it('em paralelo: dois pedidos a zerar o preço não deixam o produto sem venda', async () => {
    const produto = await publicadoComDuas('paralelo-zerar')
    const linhas = await variantesDe(produto.id)

    // Pedidos separados, transações separadas: aqui não há `req` partilhado, é
    // o lock consultivo que os põe em fila.
    const r = await Promise.allSettled(
      linhas.map((l) =>
        payload.update({ collection: 'variants', id: l.id, data: { priceCents: 0 } }),
      ),
    )

    expect(r.some((x) => x.status === 'rejected')).toBe(true)
    expect(await estaPublicado(produto.id)).toBe(true)
    expect(await vendaveis(produto.id)).toBeGreaterThan(0)
  })

  it('em paralelo: publicar e zerar o preço da única variante não passam os dois', async () => {
    const produto = await criarRascunho('paralelo-publicar', [opcao('Tamanho', 'S')])
    const [s] = await variantesDe(produto.id)
    await payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 1990 } })

    // O `validatePublish` calcula o conjunto futuro, o que chega para os
    // documentos do mesmo pedido — mas não para outro pedido a mexer nas
    // variantes ao mesmo tempo: um lia o preço antigo, o outro via o produto
    // ainda em rascunho, e passavam os dois.
    await Promise.allSettled([
      payload.update({ collection: 'products', id: produto.id, data: { _status: 'published' } }),
      payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 0 } }),
    ])

    expect((await estaPublicado(produto.id)) && (await vendaveis(produto.id)) === 0).toBe(false)
  })

  it('em massa: apagar marcas que produtos publicados usam é recusado', async () => {
    // Só a via DENTRO do pedido. Aqui os irmãos do lote não se afetam — apagar a
    // marca A não muda quantos produtos publicados usam a marca B — e por isso
    // esta guarda não precisa da reserva em `req.context` que as outras têm.
    //
    // A versão anterior deste comentário parava aqui e concluía que a guarda
    // "não tem o mesmo defeito", para poupar a análise à leitura seguinte. A
    // metade que faltava era a que interessava: entre pedidos furava, e ficou
    // por apanhar precisamente porque estava escrito aqui que não era preciso
    // olhar. Uma publicação a entrar entre a contagem desta guarda e a
    // eliminação da linha deixava um produto `published` com `brand: null`, à
    // venda e impossível de gravar. Está fechado pelo lock consultivo em
    // `blockDeleteIfPublished`, e é o teste a seguir que o verifica — em vez de
    // um comentário a afirmá-lo.
    const marcas: Id[] = []
    for (const letra of ['a', 'b', 'c']) {
      const m = (
        await payload.create({
          collection: 'brands',
          data: { name: `Zteste ${letra}`, slug: `${P}-massa-marca-${letra}` },
        })
      ).id
      marcas.push(m)
      const produto = await payload.create({
        collection: 'products',
        data: {
          title: `Zteste marca ${letra}`,
          slug: `${P}-usa-marca-${letra}`,
          brand: m,
          categories: [categoria],
          gallery: [{ image: imagem }],
          options: [opcao('Tamanho', 'S')],
        },
      })
      const [s] = await variantesDe(produto.id)
      await payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 1990 } })
      await publicar(produto.id)
    }

    const { errors } = await payload.delete({
      collection: 'brands',
      where: { slug: { contains: `${P}-massa-marca-` } },
    })

    expect(errors).toHaveLength(3)
    expect(
      (
        await payload.count({
          collection: 'brands',
          where: { slug: { contains: `${P}-massa-marca-` } },
        })
      ).totalDocs,
    ).toBe(3)

    await payload.delete({ collection: 'products', where: { slug: { contains: `${P}-usa-marca-` } } })
    await payload.delete({ collection: 'brands', where: { slug: { contains: `${P}-massa-marca-` } } })
  })

  /**
   * A via ENTRE PEDIDOS da guarda de eliminação — a que o teste acima não cobre
   * e que um comentário confiante deu por analisada durante uma ronda inteira.
   *
   * A eliminação conta os produtos publicados que usam a marca, e a contagem lê
   * o estado anterior às escritas dos outros pedidos. Uma publicação que
   * confirme entre essa contagem e a eliminação da linha passa despercebida: a
   * chave estrangeira `ON DELETE SET NULL` põe `brand` a null num produto já
   * publicado, que fica à venda e impossível de gravar.
   *
   * Reproduzido por HTTP antes da correção, em 5 de 6 corridas (e nas três
   * coleções: `brands`, `categories`, `media`). A janela desloca-se com a
   * duração do pedido — a 0 e a 50 ms não aparecia — por isso o teste varre três
   * desfasamentos em vez de fixar um. Não é determinista pelo lado da falha: é
   * determinista pelo lado da correção, porque com o lock nenhuma ordem produz
   * o estado partido.
   */
  it('entre pedidos: publicar durante uma eliminação em lote de marcas não deixa o produto sem marca', async () => {
    const LOTE = `${P}-lote-marca`
    const SLUG = `${P}-lote-produto`

    const limparLote = async () => {
      await payload.delete({ collection: 'products', where: { slug: { contains: SLUG } } })
      await payload.delete({ collection: 'brands', where: { slug: { contains: LOTE } } })
    }

    const preparar = async (enchimento = 120) => {
      // A marca do produto é criada por ÚLTIMO. O lote é processado do mais
      // recente para o mais antigo, e as guardas de todos os documentos correm
      // antes das eliminações de todos (`docs.map` + `Promise.all` sobre uma só
      // ligação). Quem entra no início do lote tem a janela mais larga entre a
      // sua contagem e a eliminação da sua linha — é essa janela que a
      // publicação tem de atravessar. As restantes marcas só existem para a
      // alargar; sem elas a janela é curta demais para o defeito aparecer.
      for (let i = 0; i < enchimento; i++) {
        await payload.create({
          collection: 'brands',
          data: { name: `Zteste lote ${i}`, slug: `${LOTE}-${i}` },
        })
      }
      const alvo = await payload.create({
        collection: 'brands',
        data: { name: 'Zteste lote alvo', slug: `${LOTE}-alvo` },
      })
      const produto = await payload.create({
        collection: 'products',
        data: {
          title: 'Zteste lote',
          slug: SLUG,
          brand: alvo.id,
          categories: [categoria],
          gallery: [{ image: imagem }],
          options: [opcao('Tamanho', 'S')],
        },
      })
      const [s] = await variantesDe(produto.id)
      await payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 1990 } })
      return { alvo, produto }
    }

    try {
      for (const atraso of [0, 60, 150]) {
        const { alvo, produto } = await preparar()

        await Promise.allSettled([
          payload.delete({ collection: 'brands', where: { slug: { contains: LOTE } } }),
          new Promise((r) => setTimeout(r, atraso)).then(() =>
            payload.update({
              collection: 'products',
              id: produto.id,
              data: { _status: 'published' },
            }),
          ),
        ])

        const depois = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })

        // O estado que esta guarda existe para impedir, e que ela deixava passar.
        //
        // As duas ordens seguras chegam aqui e as duas passam: ou a publicação
        // confirma primeiro e a contagem vê-a (marca intacta, produto publicado),
        // ou a eliminação confirma primeiro e a publicação é recusada (marca
        // apagada, produto ainda rascunho — legítimo, um rascunho sem marca é
        // permitido). O que não pode existir é o cruzamento das duas.
        expect(depois._status === 'published' && !depois.brand).toBe(false)

        await limparLote()
      }

      // Controlo positivo, sem concorrência: apagar uma marca que nenhum produto
      // publicado usa continua a ser um 200, e publicar continua a publicar.
      const livre = await payload.create({
        collection: 'brands',
        data: { name: 'Zteste lote livre', slug: `${LOTE}-livre` },
      })
      const { errors } = await payload.delete({
        collection: 'brands',
        where: { id: { equals: livre.id } },
      })
      expect(errors).toHaveLength(0)

      const { produto } = await preparar(0)
      expect((await publicar(produto.id))._status).toBe('published')
    } finally {
      await limparLote()
    }
  })

  it('os fluxos legítimos continuam a passar no caminho em massa', async () => {
    // Despublicar e limpar: fora da loja, mexe-se à vontade, também em massa.
    const limpar = await publicadoComDuas('massa-legitimo-limpar')
    await payload.update({ collection: 'products', id: limpar.id, data: { _status: 'draft' } })
    const desativadas = await payload.update({
      collection: 'variants',
      where: { product: { equals: limpar.id } },
      data: { active: false },
    })
    expect(desativadas.errors).toHaveLength(0)
    expect(await vendaveis(limpar.id)).toBe(0)

    // Apagar o produto inteiro leva as variantes à frente, publicado ou não.
    const apagar = await publicadoComDuas('massa-legitimo-apagar')
    await payload.delete({ collection: 'products', id: apagar.id })
    expect(await variantesDe(apagar.id)).toHaveLength(0)

    // Substituir uma variante por outra: precificar a nova antes de tirar a
    // velha continua a funcionar num produto publicado.
    const trocar = await publicadoComDuas('massa-legitimo-trocar')
    const linhas = await variantesDe(trocar.id)
    await payload.update({ collection: 'variants', id: linhas[1]!.id, data: { priceCents: 5990 } })
    await payload.delete({ collection: 'variants', id: linhas[0]!.id })
    expect(await vendaveis(trocar.id)).toBe(1)
    expect(await estaPublicado(trocar.id)).toBe(true)
  })
})

describe('combinação fora da matriz do produto', () => {
  it('mudar a combinação para fora das opções do produto é recusado', async () => {
    const produto = await criarRascunho('fora-matriz', [opcao('Tamanho', 'S')])
    const [s] = await variantesDe(produto.id)
    await payload.update({ collection: 'variants', id: s!.id, data: { priceCents: 1990 } })
    await publicar(produto.id)

    // Devolvia 200. O produto ficava publicado, com variante ativa e com preço,
    // e à mesma encravado: a linha XL não corresponde a nenhuma opção, portanto
    // não conta para a publicação e desaparece na gravação seguinte.
    await expect(
      payload.update({
        collection: 'variants',
        id: s!.id,
        data: { combination: { Tamanho: 'XL' } },
      }),
    ).rejects.toThrow(/não corresponde a nenhuma opção/)

    // E o produto continua a poder ser gravado, que era o que se perdia.
    await payload.update({
      collection: 'products',
      id: produto.id,
      data: { title: 'Zteste fora matriz 2' },
    })
    expect(await variantesDe(produto.id)).toHaveLength(1)
  })

  it('mudar para uma combinação que existe na matriz é permitido', async () => {
    const produto = await criarRascunho('dentro-matriz', [opcao('Tamanho', 'S', 'M')])
    const linhas = await variantesDe(produto.id)
    const m = porTamanho(linhas, 'M')!

    // Corrigir uma combinação errada à mão tem de continuar a ser possível.
    await payload.delete({ collection: 'variants', id: porTamanho(linhas, 'S')!.id })
    await payload.update({
      collection: 'variants',
      id: m.id,
      data: { combination: { Tamanho: 'S' } },
    })

    const depois = await variantesDe(produto.id)
    expect(porTamanho(depois, 'S')!.id).toBe(m.id)
  })

  it('a guarda não estorva o rascunho que reduziu as opções', async () => {
    const produto = await criarRascunho('matriz-rascunho', [opcao('Tamanho', 'S', 'L')])
    for (const linha of await variantesDe(produto.id)) {
      await payload.update({ collection: 'variants', id: linha.id, data: { priceCents: 2990 } })
    }
    await publicar(produto.id)

    // O rascunho cria mas nunca apaga: a variante L fica fora da matriz do
    // rascunho e dentro da matriz publicada. Tem de continuar editável — era
    // esta a maneira de partir o fluxo de rascunho com uma guarda de matriz.
    await payload.update({
      collection: 'products',
      id: produto.id,
      draft: true,
      data: { options: [opcao('Tamanho', 'S')] },
    })

    const l = porTamanho(await variantesDe(produto.id), 'L')!
    await payload.update({ collection: 'variants', id: l.id, data: { priceCents: 3990, ajusteStock: 2 } })
    const depois = await payload.findByID({ collection: 'variants', id: l.id, depth: 0 })
    expect(depois.priceCents).toBe(3990)
  })
})

/**
 * Estes testes nunca tocam na conta de desenvolvimento.
 *
 * A versão anterior atacava o `owner` verdadeiro: fazia login com a password
 * errada contra ele — três corridas e a conta bloqueia (`loginAttempts` e
 * `lockUntil`), ninguém entra no painel com as credenciais certas — e, se uma
 * mutação desfizesse a guarda, mudava-lhe a password e não a repunha. Um teste
 * que estraga o ambiente quando o código está errado é pior do que não existir:
 * é precisamente quando se está a corrigir que se precisa de entrar no painel.
 *
 * Cada corrida cria o seu `owner` e o seu `admin`, ambos com o prefixo `zteste`,
 * e apaga-os no fim como o resto do catálogo.
 */
describe('escalada de privilégios', () => {
  const criarConta = async (sufixo: string, role: 'admin' | 'owner') =>
    payload.create({
      collection: 'users',
      data: { email: `${P}-${sufixo}@animora.pt`, password: 'animora123', role },
    })

  const como = (utilizador: { id: Id }) => ({
    user: { ...utilizador, collection: 'users' },
    overrideAccess: false,
  })

  it('um admin não se consegue tornar owner por nenhum dos cinco caminhos', async () => {
    const admin = await criarConta('admin', 'admin')
    const alvo = (await criarConta('dono', 'owner')) as unknown as {
      id: Id
      email: string
      role: string
    }
    expect(admin.role).toBe('admin')
    expect(alvo.role).toBe('owner')
    // O alvo do ataque é sempre descartável. Se alguém voltar a apontá-lo à
    // conta de desenvolvimento, falha aqui em vez de a bloquear.
    expect(alvo.email).toContain(P)

    // 1) criar uma conta nova já com o papel owner e entrar nela
    const criada = await payload.create({
      collection: 'users',
      data: { email: `${P}-backdoor@animora.pt`, password: 'animora123', role: 'owner' },
      ...como(admin),
    })
    expect(criada.role).toBe('admin')

    // 2) promover-se a si próprio
    const promovido = await payload.update({
      collection: 'users',
      id: admin.id,
      data: { role: 'owner' },
      ...como(admin),
    })
    expect(promovido.role).toBe('admin')

    // 3) mudar a password do owner e entrar na conta dele
    await expect(
      payload.update({
        collection: 'users',
        id: alvo.id,
        data: { password: 'apanhado123' },
        ...como(admin),
      }),
    ).rejects.toThrow()
    await expect(
      payload.login({
        collection: 'users',
        data: { email: alvo.email, password: 'apanhado123' },
      }),
    ).rejects.toThrow()

    // 4) apagar o owner
    await expect(
      payload.delete({ collection: 'users', id: alvo.id, ...como(admin) }),
    ).rejects.toThrow()

    // 5) esvaziar a tabela para reabrir o `first-register`, que corre com
    //    overrideAccess e honra o papel submetido. O admin não consegue apagar
    //    ninguém — nem a si próprio.
    await expect(
      payload.delete({ collection: 'users', id: admin.id, ...como(admin) }),
    ).rejects.toThrow()

    // O owner do teste continua a ser o único owner além do legítimo: nenhum
    // dos cinco caminhos produziu contas com poderes a mais.
    const donos = await payload.find({
      collection: 'users',
      where: { role: { equals: 'owner' } },
      limit: 0,
      depth: 0,
    })
    expect(donos.docs.filter((d) => String(d.email).includes(P))).toHaveLength(1)
  })

  /**
   * A guarda do último proprietário só decide quando os owners que sobram são
   * os que o pedido está a apagar — e a base de desenvolvimento tem sempre lá o
   * legítimo. A versão anterior deste teste contornava isso com um `req` de
   * fachada, o que testava a decisão mas nunca o caminho em massa nem o
   * paralelo, que é exatamente onde a guarda estava furada.
   *
   * Para o cenário existir, o owner de desenvolvimento é despromovido a admin
   * durante o teste e reposto no `finally`. A tabela nunca fica vazia (ele
   * continua lá), portanto o `first-register` nunca reabre a meio.
   */
  it('em massa e em paralelo: os proprietários não podem ser apagados todos', async () => {
    const dev = (
      await payload.find({
        collection: 'users',
        where: { email: { equals: 'admin@animora.pt' } },
        limit: 1,
      })
    ).docs[0]!

    const papelDoDev = (role: 'owner' | 'admin') =>
      payload.update({ collection: 'users', id: dev.id, data: { role } })

    const criarDono = (sufixo: string) =>
      payload.create({
        collection: 'users',
        data: { email: `${P}-${sufixo}@animora.pt`, password: 'animora123', role: 'owner' },
      })

    const donos = async () =>
      (await payload.count({ collection: 'users', where: { role: { equals: 'owner' } } })).totalDocs

    /** Entre passos: só o dev consegue apagar owners que a guarda protege. */
    const limparDonos = async () => {
      await papelDoDev('owner')
      await payload.delete({ collection: 'users', where: { email: { contains: P } } })
      await papelDoDev('admin')
    }

    try {
      await papelDoDev('admin')

      // 1) Em massa. Cada guarda contava dois owners, concluía "não sou o
      //    último" e passava — as duas. Zero owners, tabela vazia,
      //    `first-register` reaberto a aceitar qualquer papel sem autenticação.
      await criarDono('dono-a')
      await criarDono('dono-b')
      const massa = await payload.delete({
        collection: 'users',
        where: { email: { contains: `${P}-dono-` } },
      })
      expect(massa.docs).toHaveLength(0)
      expect(massa.errors).toHaveLength(2)
      expect(await donos()).toBe(2)
      await limparDonos()

      // 2) Dois pedidos em paralelo, o mesmo defeito por outro caminho.
      const paralelos = [await criarDono('par-a'), await criarDono('par-b')]
      const r = await Promise.allSettled(
        paralelos.map((d) => payload.delete({ collection: 'users', id: d.id })),
      )
      expect(r.some((x) => x.status === 'rejected')).toBe(true)
      expect(await donos()).toBeGreaterThan(0)
      await limparDonos()

      // 3) O que é legítimo continua a passar: com dois owners, apagar um é
      //    normal; o que sobra é que não se apaga.
      const [primeiro, segundo] = [await criarDono('ok-a'), await criarDono('ok-b')]
      await payload.delete({ collection: 'users', id: primeiro.id })
      expect(await donos()).toBe(1)
      await expect(payload.delete({ collection: 'users', id: segundo.id })).rejects.toThrow(
        /último proprietário/,
      )
      expect(await donos()).toBe(1)
    } finally {
      await papelDoDev('owner')
      await payload.delete({ collection: 'users', where: { email: { contains: P } } })
    }
  })
})

/**
 * Leitura anónima — a loja lê a API sem sessão nenhuma, e o endereço da API vai
 * no HTML de todas as páginas, por isso qualquer visitante lhe pode pedir o que
 * quiser. Estes testes correm com `overrideAccess: false` e sem `user`: é o que
 * a Local API faz corresponder a um `GET` sem cookie.
 *
 * Existiram porque durante um tempo o `access: { read: () => true }` das
 * coleções deixou sair custo de compra, fornecedor, EAN, localização em armazém
 * e produtos por publicar — e um comentário no código afirmava que a
 * `sanitizeProduct` da loja tratava disso, o que era falso.
 */
describe('leitura anónima da API', () => {
  const anonimo = { overrideAccess: false, depth: 0, limit: 0 } as const

  /** Publicar exige pelo menos uma variante ativa com preço — ver `validatePublish`. */
  const criarPublicado = async (sufixo: string) => {
    const p = await criarRascunho(sufixo)
    const [linha] = await variantesDe(p.id)
    await payload.update({ collection: 'variants', id: linha!.id, data: { priceCents: 2990 } })
    await publicar(p.id)
    return p
  }

  it('não devolve os campos internos da variante a quem não tem sessão', async () => {
    const produto = await criarPublicado('anon-var')
    const [linha] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: linha!.id,
      data: {
        costCents: 1200,
        ean: '5601234567890',
        warehouseLocation: 'A-12-3',
        shippingWeightG: 150,
      },
    })

    const { docs } = await payload.find({ collection: 'variants', ...anonimo })
    expect(docs.length).toBeGreaterThan(0)
    for (const d of docs) {
      for (const campo of ['costCents', 'ean', 'warehouseLocation', 'shippingWeightG']) {
        expect(d).not.toHaveProperty(campo)
      }
    }

    // Controlo negativo: com sessão os mesmos campos continuam a sair, senão
    // este teste passaria por o painel ter deixado de os ver.
    const comSessao = await payload.findByID({ collection: 'variants', id: linha!.id, depth: 0 })
    expect(comSessao).toMatchObject({ costCents: 1200, ean: '5601234567890' })
  })

  it('não devolve o fornecedor do produto a quem não tem sessão', async () => {
    const produto = await criarPublicado('anon-forn')
    await payload.update({
      collection: 'products',
      id: produto.id,
      data: { supplier: 'Fornecedor Secreto Lda' },
    })

    const { docs } = await payload.find({ collection: 'products', ...anonimo })
    expect(docs.length).toBeGreaterThan(0)
    for (const d of docs) expect(d).not.toHaveProperty('supplier')

    const comSessao = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })
    expect(comSessao).toMatchObject({ supplier: 'Fornecedor Secreto Lda' })
  })

  it('esconde os rascunhos de quem não tem sessão, por lista, por id e com ?draft=true', async () => {
    const rascunho = await criarRascunho('anon-rascunho')
    const publicado = await criarPublicado('anon-publicado')

    for (const draft of [false, true]) {
      const { docs } = await payload.find({ collection: 'products', ...anonimo, draft })
      const ids = docs.map((d) => d.id)
      expect(ids).toContain(publicado.id)
      expect(ids).not.toContain(rascunho.id)
      expect(docs.every((d) => d._status === 'published')).toBe(true)
    }

    await expect(
      payload.findByID({ collection: 'products', id: rascunho.id, overrideAccess: false }),
    ).rejects.toThrow()

    // Com sessão o rascunho continua a ver-se — a regra é sobre quem pede, não
    // sobre o documento.
    const { docs: comSessao } = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 0,
      draft: true,
    })
    expect(comSessao.map((d) => d.id)).toContain(rascunho.id)
  })

  it('esconde as variantes de um produto por publicar — o SKU vem do título', async () => {
    const rascunho = await criarRascunho('anon-sku-secreto')
    const daBase = await variantesDe(rascunho.id)
    expect(daBase.length).toBeGreaterThan(0)

    const { docs } = await payload.find({ collection: 'variants', ...anonimo })
    const ids = docs.map((d) => d.id)
    for (const linha of daBase) expect(ids).not.toContain(linha.id)

    await expect(
      payload.findByID({ collection: 'variants', id: daBase[0]!.id, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('um rascunho pendente sobre um produto publicado não substitui o conteúdo público', async () => {
    const produto = await criarPublicado('anon-pendente')
    await payload.update({
      collection: 'products',
      id: produto.id,
      draft: true,
      data: { title: 'RASCUNHO PENDENTE SECRETO' },
    })

    const publico = await payload.findByID({
      collection: 'products',
      id: produto.id,
      overrideAccess: false,
      draft: true,
      depth: 0,
    })
    expect(publico.title).not.toBe('RASCUNHO PENDENTE SECRETO')

    const comSessao = await payload.findByID({
      collection: 'products',
      id: produto.id,
      draft: true,
      depth: 0,
    })
    expect(comSessao.title).toBe('RASCUNHO PENDENTE SECRETO')
  })

  it('recusa filtrar por um campo interno em vez de o revelar por adivinhação', async () => {
    await criarPublicado('anon-filtro')
    await expect(
      payload.find({
        collection: 'variants',
        ...anonimo,
        where: { costCents: { greater_than: 0 } },
      }),
    ).rejects.toThrow()
  })
})

/**
 * Contas de cliente.
 *
 * Duas famílias de teste, e a segunda é a que ninguém pediu:
 *
 * 1. **Isolamento entre contas.** Uma coleção de clientes não tem campos
 *    "internos" a proteger um a um — é o documento inteiro que é sensível.
 *
 * 2. **Um cliente não é staff.** Criar uma coleção com `auth: true` muda o
 *    significado de `req.user` em TODO o projeto: deixa de querer dizer "staff"
 *    e passa a querer dizer "qualquer pessoa que se registou na loja". Todas as
 *    regras escritas como `Boolean(req.user)` mudaram de sentido ao mesmo
 *    tempo, e as operações que nenhuma coleção declarava (`create`, `update`,
 *    `delete`) já eram `Boolean(req.user)` por omissão do Payload. Estes testes
 *    falham todos com `ehStaff = Boolean(user)` — foi assim que o problema foi
 *    encontrado, e é isso que o controlo negativo abaixo fixa.
 */
describe('contas de cliente', () => {
  const como = (u: { id: Id }, collection: 'customers' | 'users') => ({
    user: { ...u, collection },
    overrideAccess: false,
  })

  const morada = {
    etiqueta: 'Casa',
    nomeDestinatario: 'Ana Silva',
    linha1: 'Rua das Flores 12',
    codigoPostal: '1234-567',
    localidade: 'Lisboa',
    telefone: '910000000',
  }

  const criarCliente = (sufixo: string) =>
    payload.create({
      collection: 'customers',
      data: {
        email: `${P}-${sufixo}@cliente.pt`,
        password: 'animora123',
        nome: `Cliente ${sufixo}`,
        moradas: [morada],
      },
      overrideAccess: false,
    })

  const nomeNaBase = async (id: Id) =>
    (await payload.findByID({ collection: 'customers', id, depth: 0 })).nome

  it('um cliente vê-se a si próprio e mais ninguém', async () => {
    const a = await criarCliente('a')
    const b = await criarCliente('b')

    const { docs } = await payload.find({
      collection: 'customers',
      limit: 0,
      depth: 0,
      ...como(a, 'customers'),
    })
    expect(docs.map((d) => d.id)).toEqual([a.id])

    await expect(
      payload.findByID({ collection: 'customers', id: b.id, ...como(a, 'customers') }),
    ).rejects.toThrow()

    // Sem sessão não se lê ninguém — nem a lista, nem um id concreto. Aqui a
    // regra devolve `false` em vez de um `Where`, e o Payload recusa o pedido
    // inteiro (`executeAccess`) em vez de devolver uma lista vazia.
    await expect(
      payload.find({ collection: 'customers', limit: 0, depth: 0, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'customers', id: a.id, overrideAccess: false }),
    ).rejects.toThrow()

    // O staff vê os dois: a regra é sobre quem pergunta.
    const staff = await payload.find({
      collection: 'customers',
      where: { email: { contains: P } },
      limit: 0,
      depth: 0,
      ...como({ id: 1 }, 'users'),
    })
    expect(staff.docs.map((d) => d.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('um cliente não altera nem apaga a conta de outro', async () => {
    const a = await criarCliente('a')
    const b = await criarCliente('b')

    await expect(
      payload.update({
        collection: 'customers',
        id: b.id,
        data: { nome: 'INVADIDO' },
        ...como(a, 'customers'),
      }),
    ).rejects.toThrow()
    // O código HTTP não é a prova; o nome na base é.
    expect(await nomeNaBase(b.id)).toBe('Cliente b')

    await expect(
      payload.delete({ collection: 'customers', id: b.id, ...como(a, 'customers') }),
    ).rejects.toThrow()
    expect(await nomeNaBase(b.id)).toBe('Cliente b')

    // Controlo positivo: na sua própria conta mexe à vontade.
    await payload.update({
      collection: 'customers',
      id: a.id,
      data: { nome: 'Ana Renomeada' },
      ...como(a, 'customers'),
    })
    expect(await nomeNaBase(a.id)).toBe('Ana Renomeada')
  })

  it('o código postal tem de ser português: 1234-567 e não 1234567', async () => {
    const a = await criarCliente('a')

    await expect(
      payload.update({
        collection: 'customers',
        id: a.id,
        data: { moradas: [{ ...morada, codigoPostal: '1234567' }] },
      }),
    ).rejects.toThrow()

    const guardado = await payload.update({
      collection: 'customers',
      id: a.id,
      data: { moradas: [{ ...morada, codigoPostal: '4700-001' }] },
    })
    expect(guardado.moradas?.[0]?.codigoPostal).toBe('4700-001')
  })

  it('um cliente não é staff: não lê nem escreve nada do painel', async () => {
    const a = await criarCliente('a')
    const sessao = como(a, 'customers')

    // Um produto publicado, com custo de compra e fornecedor preenchidos.
    const produto = await criarRascunho('cliente-staff')
    const [linha] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: linha!.id,
      data: { priceCents: 2990, costCents: 1200, ean: '5601234567890' },
    })
    await publicar(produto.id)
    const rascunho = await criarRascunho('cliente-rascunho')

    // 1) a tabela de staff não é assunto de clientes
    await expect(
      payload.find({ collection: 'users', limit: 0, depth: 0, ...sessao }),
    ).rejects.toThrow()

    // 2) e muito menos criar uma conta de staff: `admin` já entra no painel
    await expect(
      payload.create({
        collection: 'users',
        data: { email: `${P}-invasor@animora.pt`, password: 'animora123' },
        ...sessao,
      }),
    ).rejects.toThrow()
    const invasores = await payload.find({
      collection: 'users',
      where: { email: { contains: `${P}-invasor` } },
      limit: 0,
      depth: 0,
    })
    expect(invasores.docs).toHaveLength(0)

    // 3) o catálogo é de leitura para quem compra
    await expect(
      payload.update({
        collection: 'products',
        id: produto.id,
        data: { title: 'PIRATEADO' },
        ...sessao,
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({ collection: 'products', id: produto.id, ...sessao }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'variants',
        id: linha!.id,
        data: { priceCents: 1 },
        ...sessao,
      }),
    ).rejects.toThrow()
    const naBase = await payload.findByID({ collection: 'products', id: produto.id, depth: 0 })
    expect(naBase.title).not.toBe('PIRATEADO')
    expect((await variantesDe(produto.id)).map((l) => l.priceCents)).toContain(2990)

    // 4) a margem não é do cliente — é a fuga da fase 2 por outra porta
    const variantes = await payload.find({ collection: 'variants', limit: 0, depth: 0, ...sessao })
    expect(variantes.docs.length).toBeGreaterThan(0)
    for (const d of variantes.docs) {
      for (const campo of ['costCents', 'ean', 'warehouseLocation', 'shippingWeightG']) {
        expect(d).not.toHaveProperty(campo)
      }
    }

    // 5) nem os produtos que ainda não saíram do painel
    const produtos = await payload.find({
      collection: 'products',
      limit: 0,
      depth: 0,
      draft: true,
      ...sessao,
    })
    expect(produtos.docs.map((d) => d.id)).not.toContain(rascunho.id)
    expect(produtos.docs.every((d) => d._status === 'published')).toBe(true)
    for (const d of produtos.docs) expect(d).not.toHaveProperty('supplier')
  })
})

/**
 * Encomendas.
 *
 * Duas invariantes, e nenhuma delas se mede pelo código HTTP:
 *
 * 1. **Uma encomenda não nasce de um pedido do cliente.** `create` é `false`
 *    para toda a gente; o checkout escreve-a com `overrideAccess`. Se nascesse
 *    de um POST, quem o fizesse escolhia os totais que paga.
 *
 * 2. **O custo unitário é margem.** O cliente vê a sua encomenda inteira menos
 *    esse número. Foi por um campo interno legível que a fase 2 falhou, e a
 *    verificação que a deixou passar foi "responde?" em vez de "o que é que
 *    veio lá dentro?". Por isso estes testes serializam o documento todo e
 *    procuram o número, em vez de olhar para o campo que esperam encontrar.
 */
describe('encomendas', () => {
  const como = (u: { id: Id }, collection: 'customers' | 'users') => ({
    user: { ...u, collection },
    overrideAccess: false,
  })

  const moradaEnvio = {
    nomeDestinatario: 'Ana Silva',
    linha1: 'Rua das Flores 12',
    codigoPostal: '1234-567',
    localidade: 'Lisboa',
  }

  const criarCliente = (sufixo: string) =>
    payload.create({
      collection: 'customers',
      data: {
        email: `${P}-${sufixo}@cliente.pt`,
        password: 'animora123',
        nome: `Cliente ${sufixo}`,
      },
    })

  /** Um produto publicado com preço e custo, para as linhas terem de onde copiar. */
  const criarVariante = async (sufixo: string) => {
    const produto = await criarRascunho(`enc-${sufixo}`)
    const [linha] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: linha!.id,
      data: { priceCents: 2990, costCents: 1200 },
    })
    await publicar(produto.id)
    return linha!
  }

  const dados = (
    numero: string,
    cliente: { id: Id; email: string },
    variante: Id,
    linha: Record<string, unknown> = {},
  ) => ({
    numero: `${P}-${numero}`,
    cliente: cliente.id,
    email: cliente.email,
    linhas: [
      {
        variante,
        titulo: 'Zteste artigo',
        sku: 'ZTESTE-1',
        opcoes: { Tamanho: 'S' },
        quantidade: 2,
        precoUnitarioCents: 2990,
        custoUnitarioCents: 1200,
        ...linha,
      },
    ],
    subtotalCents: 5980,
    portesCents: 0,
    totalCents: 5980,
    moradaEnvio,
  })

  const quantasNaBase = async () =>
    (await payload.count({ collection: 'orders', where: { numero: { contains: P } } })).totalDocs

  it('uma encomenda não nasce de um pedido do cliente, nem do staff', async () => {
    const cliente = (await criarCliente('a')) as unknown as { id: Id; email: string }
    const variante = await criarVariante('nasce')

    for (const sessao of [como(cliente, 'customers'), como({ id: 1 }, 'users')]) {
      await expect(
        payload.create({
          collection: 'orders',
          data: dados('0001', cliente, variante.id),
          ...sessao,
        }),
      ).rejects.toThrow()
    }
    // O que conta não é o 403: é não haver linha nenhuma na base.
    expect(await quantasNaBase()).toBe(0)

    // O checkout escreve com `overrideAccess` — é o único caminho.
    const criada = await payload.create({
      collection: 'orders',
      data: dados('0001', cliente, variante.id),
      overrideAccess: true,
    })
    expect(criada.numero).toBe(`${P}-0001`)
    expect(await quantasNaBase()).toBe(1)
  })

  it('o cliente vê as suas encomendas e nunca o custo unitário', async () => {
    const a = (await criarCliente('a')) as unknown as { id: Id; email: string }
    const b = (await criarCliente('b')) as unknown as { id: Id; email: string }
    const variante = await criarVariante('ver')

    await payload.create({ collection: 'orders', data: dados('0001', a, variante.id) })
    const deB = await payload.create({
      collection: 'orders',
      data: dados('0002', b, variante.id),
    })

    // Só as suas — e o id de outra pessoa não é atalho nenhum.
    const { docs } = await payload.find({
      collection: 'orders',
      limit: 0,
      depth: 0,
      ...como(a, 'customers'),
    })
    expect(docs.map((d) => d.numero)).toEqual([`${P}-0001`])
    await expect(
      payload.findByID({ collection: 'orders', id: deB.id, ...como(a, 'customers') }),
    ).rejects.toThrow()

    // Sem sessão não há encomendas nenhumas.
    await expect(
      payload.find({ collection: 'orders', limit: 0, overrideAccess: false }),
    ).rejects.toThrow()

    // O custo não sai em linha nenhuma — com qualquer `depth`. A `depth` é a
    // parte que não é óbvia: a linha traz a variante populada, e a variante
    // também tem `costCents`. São dois caminhos para o mesmo número.
    for (const depth of [0, 1, 2]) {
      const resposta = await payload.find({
        collection: 'orders',
        limit: 0,
        depth,
        ...como(a, 'customers'),
      })
      expect(resposta.docs.length).toBeGreaterThan(0)
      // Com `depth`, a variante vem mesmo populada (e o produto dentro dela) —
      // senão a procura pelo custo, mais abaixo, passava por não haver lá nada.
      const linhaVariante = resposta.docs[0]!.linhas![0]!.variante
      expect(typeof linhaVariante === 'object' && linhaVariante !== null).toBe(depth > 0)

      const texto = JSON.stringify(resposta.docs)
      expect(texto).not.toContain('custoUnitarioCents')
      expect(texto).not.toContain('costCents')
      expect(texto).not.toContain('1200')
      // Controlo positivo: o resto da encomenda dele continua lá.
      expect(texto).toContain('precoUnitarioCents')
      expect(texto).toContain('2990')
    }

    // O staff vê as duas encomendas e vê o custo — senão este teste passaria
    // por o campo ter deixado de existir.
    const staff = await payload.find({
      collection: 'orders',
      where: { numero: { contains: P } },
      limit: 0,
      depth: 0,
      ...como({ id: 1 }, 'users'),
    })
    expect(staff.docs).toHaveLength(2)
    expect(JSON.stringify(staff.docs)).toContain('custoUnitarioCents')
    expect(staff.docs.every((d) => d.linhas?.[0]?.custoUnitarioCents === 1200)).toBe(true)
  })

  it('dinheiro e quantidades só em inteiros', async () => {
    const cliente = (await criarCliente('a')) as unknown as { id: Id; email: string }
    const variante = await criarVariante('inteiros')

    const recusado = async (linha: Record<string, unknown>) => {
      await expect(
        payload.create({ collection: 'orders', data: dados('0001', cliente, variante.id, linha) }),
      ).rejects.toThrow()
      expect(await quantasNaBase()).toBe(0)
    }

    await recusado({ precoUnitarioCents: 29.9 })
    await recusado({ precoUnitarioCents: -1 })
    await recusado({ custoUnitarioCents: 12.5 })
    await recusado({ quantidade: 1.5 })
    // `min: 1` só sobrevive porque o `validarInteiro` corre a validação nativa
    // do Payload antes da sua: um `validate` personalizado substitui-a.
    await recusado({ quantidade: 0 })

    const total = await payload.create({
      collection: 'orders',
      data: { ...dados('0002', cliente, variante.id), totalCents: 59.8 },
    }).catch((e: unknown) => e)
    expect(total).toBeInstanceOf(Error)

    // Controlo positivo: com inteiros grava.
    await payload.create({ collection: 'orders', data: dados('0003', cliente, variante.id) })
    expect(await quantasNaBase()).toBe(1)
  })

  it('a morada de envio exige código postal português', async () => {
    const cliente = (await criarCliente('a')) as unknown as { id: Id; email: string }
    const variante = await criarVariante('morada')

    await expect(
      payload.create({
        collection: 'orders',
        data: {
          ...dados('0001', cliente, variante.id),
          moradaEnvio: { ...moradaEnvio, codigoPostal: '1234567' },
        },
      }),
    ).rejects.toThrow()
    expect(await quantasNaBase()).toBe(0)
  })

  it('não se grava uma encomenda cujo total não bate certo com as linhas', async () => {
    const cliente = (await criarCliente('a')) as unknown as { id: Id; email: string }
    const variante = await criarVariante('totais')

    // 2 × 2990 = 5980. Cada um destes é um total que o cliente pagaria a mais ou
    // a menos do que aquilo que a encomenda diz conter.
    for (const adulterado of [
      { subtotalCents: 1, totalCents: 1 },
      { totalCents: 5000 },
      { portesCents: 499 },
      { linhas: [{ ...dados('x', cliente, variante.id).linhas[0], quantidade: 1 }] },
    ]) {
      await expect(
        payload.create({
          collection: 'orders',
          data: { ...dados('0001', cliente, variante.id), ...adulterado },
        }),
      ).rejects.toThrow(/[Tt]otais incoerentes/)
      expect(await quantasNaBase()).toBe(0)
    }

    // Controlo positivo: coerente grava, e portes por cima do subtotal também.
    await payload.create({
      collection: 'orders',
      data: {
        ...dados('0002', cliente, variante.id),
        portesCents: 499,
        totalCents: 6479,
      },
    })
    expect(await quantasNaBase()).toBe(1)
  })
})

/**
 * Checkout — o caminho onde o stock desce e o dinheiro fica registado.
 *
 * Estes testes chamam a função do endpoint pela Local API, e não por HTTP, por
 * uma razão só: a corrida da última unidade tem de ser um teste automático. Uma
 * medição manual com cinco `curl` prova o dia em que foi feita; o que impede a
 * regressão é isto correr a cada `pnpm test`.
 *
 * Nenhuma asserção se contenta com o código HTTP. O que interessa é o que ficou
 * na base: o stock da variante, o número de encomendas, e os cêntimos gravados
 * nas linhas.
 */
describe('checkout', () => {
  const moradaEnvio = {
    nomeDestinatario: 'Ana Silva',
    linha1: 'Rua das Flores 12',
    codigoPostal: '1234-567',
    localidade: 'Lisboa',
  }

  type Cliente = { id: Id; email: string; collection: 'customers' }

  const criarCliente = async (sufixo: string): Promise<Cliente> => {
    const c = await payload.create({
      collection: 'customers',
      data: {
        email: `${P}-${sufixo}@cliente.pt`,
        password: 'animora123',
        nome: `Cliente ${sufixo}`,
      },
    })
    return { id: c.id, email: String(c.email), collection: 'customers' }
  }

  /**
   * Produto publicado com uma variante só, com preço, custo e stock à medida.
   * A variante nasce a 0 unidades, por isso o ajuste é o stock que fica.
   */
  const criarArtigo = async (
    sufixo: string,
    { preco = 2990, custo = 1200, stock = 5 } = {},
  ): Promise<Linha> => {
    const produto = await criarRascunho(`ck-${sufixo}`)
    const [variante] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: variante!.id,
      data: { priceCents: preco, costCents: custo, ajusteStock: stock },
    })
    await publicar(produto.id)
    return variante!
  }

  const pedir = async (utilizador: unknown, corpo: unknown): Promise<Response> =>
    finalizarCompra(await createLocalReq({ user: utilizador as never }, payload), corpo)

  const comprar = (cliente: Cliente, linhas: unknown[]) =>
    pedir(cliente, { linhas, moradaEnvio })

  const stockDe = async (variante: Id): Promise<unknown> =>
    (await payload.findByID({ collection: 'variants', id: variante, depth: 0 })).stock

  /** As encomendas dos clientes de teste, como estão mesmo na base. */
  const naBase = async () =>
    (
      await payload.find({
        collection: 'orders',
        where: { email: { contains: P } },
        limit: 0,
        depth: 0,
        sort: 'id',
      })
    ).docs

  it('compra normal: 201, encomenda criada e stock desce pela quantidade comprada', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('normal', { preco: 2990, custo: 1200, stock: 5 })

    const resposta = await comprar(cliente, [{ variantId: variante.id, qty: 2 }])
    expect(resposta.status).toBe(201)

    const corpo = (await resposta.json()) as Record<string, unknown>
    const encomendas = await naBase()
    expect(encomendas).toHaveLength(1)

    const encomenda = encomendas[0]!
    expect(encomenda.numero).toBe(corpo.numero)
    expect(encomenda.estado).toBe('a-aguardar-pagamento')
    expect(encomenda.cliente).toBe(cliente.id)
    expect(encomenda.email).toBe(cliente.email)
    expect(encomenda.linhas).toHaveLength(1)
    expect(encomenda.linhas![0]).toMatchObject({
      variante: variante.id,
      quantidade: 2,
      precoUnitarioCents: 2990,
      custoUnitarioCents: 1200,
    })
    expect(encomenda.subtotalCents).toBe(5980)
    expect(encomenda.portesCents).toBe(0)
    expect(encomenda.totalCents).toBe(5980)

    // 5 − 2. O que interessa não é o 201, é esta linha.
    expect(await stockDe(variante.id)).toBe(3)

    // A resposta ao cliente não leva a margem — a encomenda criada traz o custo
    // e o corpo é escolhido campo a campo.
    expect(JSON.stringify(corpo)).not.toContain('1200')
  })

  it('um preço enviado no corpo é ignorado: fica o preço real da variante', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('forjado', { preco: 2990, custo: 1200, stock: 5 })

    const resposta = await comprar(cliente, [
      { variantId: variante.id, qty: 1, unitPriceCents: 1, precoUnitarioCents: 1, totalCents: 1 },
    ])
    expect(resposta.status).toBe(201)

    const encomenda = (await naBase())[0]!
    expect(encomenda.linhas![0]!.precoUnitarioCents).toBe(2990)
    expect(encomenda.subtotalCents).toBe(2990)
    // 2990 < 5000: os portes são os de uma compra pequena, não os de 1 cêntimo.
    expect(encomenda.portesCents).toBe(499)
    expect(encomenda.totalCents).toBe(3489)
  })

  it('stock insuficiente: 409, nada gravado e stock inalterado', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('sem-stock', { stock: 2 })

    const resposta = await comprar(cliente, [{ variantId: variante.id, qty: 5 }])
    expect(resposta.status).toBe(409)
    expect(await naBase()).toHaveLength(0)
    expect(await stockDe(variante.id)).toBe(2)

    // Duas linhas da mesma variante são uma só de 2 — verificadas uma a uma
    // contra a mesma leitura, passavam ambas com uma unidade em armazém.
    await definirStock(variante.id, 1)
    const duplicada = await comprar(cliente, [
      { variantId: variante.id, qty: 1 },
      { variantId: variante.id, qty: 1 },
    ])
    expect(duplicada.status).toBe(409)
    expect(await naBase()).toHaveLength(0)
    expect(await stockDe(variante.id)).toBe(1)
  })

  /**
   * O critério de falha desta tarefa.
   *
   * Cinco pedidos simultâneos à última unidade: um leva, quatro recebem uma
   * recusa clara, e o stock acaba em 0 — nunca em -4, nunca com duas encomendas.
   * Seis corridas porque uma corrida que passa por acaso passa uma vez.
   */
  it('a última unidade em concorrência: cinco pedidos, uma encomenda, seis corridas', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('corrida', { stock: 1 })

    for (let corrida = 1; corrida <= 6; corrida++) {
      await definirStock(variante.id, 1)

      const respostas = await Promise.all(
        Array.from({ length: 5 }, () => comprar(cliente, [{ variantId: variante.id, qty: 1 }])),
      )

      const criadas = respostas.filter((r) => r.status === 201)
      const recusadas = respostas.filter((r) => r.status === 409)
      const stock = await stockDe(variante.id)
      const encomendas = await naBase()

      // eslint-disable-next-line no-console
      console.log(
        `[última unidade] corrida ${corrida}: ${criadas.length} encomenda(s), ` +
          `${recusadas.length} recusa(s), ${respostas.length - criadas.length - recusadas.length} ` +
          `outro(s), stock final ${String(stock)}`,
      )

      expect(criadas).toHaveLength(1)
      expect(recusadas).toHaveLength(4)
      expect(stock).toBe(0)
      expect(encomendas).toHaveLength(1)

      await payload.delete({ collection: 'orders', where: { email: { contains: P } } })
    }
  })

  it('falha a meio: uma linha sem stock recusa o carrinho inteiro', async () => {
    const cliente = await criarCliente('a')
    const boa = await criarArtigo('meio-boa', { stock: 10 })
    const ma = await criarArtigo('meio-ma', { stock: 1 })

    const resposta = await comprar(cliente, [
      { variantId: boa.id, qty: 2 },
      { variantId: ma.id, qty: 3 },
    ])

    expect(resposta.status).toBe(409)
    // Zero encomendas, e o stock das DUAS variantes intacto: nem meia encomenda,
    // nem stock descido na linha que tinha.
    expect(await naBase()).toHaveLength(0)
    expect(await stockDe(boa.id)).toBe(10)
    expect(await stockDe(ma.id)).toBe(1)

    // Controlo positivo: com stock nas duas, o mesmo carrinho passa.
    await definirStock(ma.id, 3)
    const segunda = await comprar(cliente, [
      { variantId: boa.id, qty: 2 },
      { variantId: ma.id, qty: 3 },
    ])
    expect(segunda.status).toBe(201)
    expect(await stockDe(boa.id)).toBe(8)
    expect(await stockDe(ma.id)).toBe(0)
  })

  it('a encomenda congela preço e custo: mudar o catálogo não reescreve o passado', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('congelado', { preco: 2990, custo: 1200, stock: 5 })

    expect((await comprar(cliente, [{ variantId: variante.id, qty: 1 }])).status).toBe(201)

    await payload.update({
      collection: 'variants',
      id: variante.id,
      data: { priceCents: 4990, costCents: 3000 },
    })

    const encomenda = (await naBase())[0]!
    expect(encomenda.linhas![0]!.precoUnitarioCents).toBe(2990)
    expect(encomenda.linhas![0]!.custoUnitarioCents).toBe(1200)
    expect(encomenda.subtotalCents).toBe(2990)
    expect(encomenda.totalCents).toBe(3489)
  })

  it('portes: 499 abaixo de 50 €, grátis a partir de 50 € exatos', async () => {
    const cliente = await criarCliente('a')
    const barato = await criarArtigo('portes-1990', { preco: 1990, stock: 10 })
    const meio = await criarArtigo('portes-2500', { preco: 2500, stock: 10 })
    const caro = await criarArtigo('portes-6000', { preco: 6000, stock: 10 })

    const casos = [
      { linhas: [{ variantId: barato.id, qty: 1 }], subtotal: 1990, portes: 499 },
      // 50,00 € exatos: a fronteira é "a partir de", não "acima de".
      { linhas: [{ variantId: meio.id, qty: 2 }], subtotal: 5000, portes: 0 },
      { linhas: [{ variantId: caro.id, qty: 1 }], subtotal: 6000, portes: 0 },
    ]

    for (const caso of casos) {
      const resposta = await comprar(cliente, caso.linhas)
      expect(resposta.status).toBe(201)
      const corpo = (await resposta.json()) as Record<string, number>
      expect(corpo.subtotalCents).toBe(caso.subtotal)
      expect(corpo.portesCents).toBe(caso.portes)
      expect(corpo.totalCents).toBe(caso.subtotal + caso.portes)
    }

    const encomendas = await naBase()
    expect(encomendas.map((e) => e.totalCents)).toEqual([2489, 5000, 6000])
  })

  it('sem sessão é 401; com sessão de staff é 403 — e nenhuma das duas grava nada', async () => {
    await criarCliente('a')
    const variante = await criarArtigo('sessao', { stock: 5 })
    const linhas = [{ variantId: variante.id, qty: 1 }]

    // Contagem relativa, não absoluta: uma base de dados de desenvolvimento
    // com histórico de encomendas real (do seeder do catálogo, por exemplo)
    // já tem encomendas `AN-` antes deste teste correr. O que se prova é que
    // NENHUMA NOVA nasceu destas duas tentativas — não que a tabela está vazia.
    const antesDoTeste = (
      await payload.count({ collection: 'orders', where: { numero: { like: 'AN-' } } })
    ).totalDocs

    const semSessao = await pedir(null, { linhas, moradaEnvio })
    expect(semSessao.status).toBe(401)

    // O staff está autenticado — não tem nada para repetir no login — mas a
    // encomenda pertence a um `customers`, e ele não é um. Ver o endpoint.
    const staff = await pedir({ id: 1, collection: 'users' }, { linhas, moradaEnvio })
    expect(staff.status).toBe(403)

    expect(await naBase()).toHaveLength(0)
    expect(
      (await payload.count({ collection: 'orders', where: { numero: { like: 'AN-' } } })).totalDocs,
    ).toBe(antesDoTeste)
    expect(await stockDe(variante.id)).toBe(5)
  })

  it('variante inexistente, desativada ou de produto por publicar: 400 e nada gravado', async () => {
    const cliente = await criarCliente('a')
    const publicada = await criarArtigo('publicada', { stock: 5 })

    // Duas variantes com preço: desativar uma delas é legítimo (a guarda da fase
    // 1 só recusa a última vendável de um produto publicado).
    const comDuas = await criarRascunho('ck-inativa', [opcao('Tamanho', 'S', 'M')])
    const irmas = await variantesDe(comDuas.id)
    for (const irma of irmas) {
      await payload.update({
        collection: 'variants',
        id: irma.id,
        data: { priceCents: 1990, ajusteStock: 4 },
      })
    }
    await publicar(comDuas.id)
    const desativada = irmas[0]!
    await payload.update({ collection: 'variants', id: desativada.id, data: { active: false } })

    // Um rascunho não está à venda — e as suas variantes também não, mesmo com
    // preço e stock. É o mesmo critério com que a loja as esconde.
    const rascunho = await criarRascunho('ck-rascunho')
    const [porPublicar] = await variantesDe(rascunho.id)
    await payload.update({
      collection: 'variants',
      id: porPublicar!.id,
      data: { priceCents: 1990, ajusteStock: 9 },
    })

    for (const variantId of [999999, porPublicar!.id, desativada.id]) {
      const resposta = await comprar(cliente, [{ variantId }])
      expect(resposta.status).toBe(400)
      expect(await naBase()).toHaveLength(0)
    }

    expect(await stockDe(porPublicar!.id)).toBe(9)
    expect(await stockDe(desativada.id)).toBe(4)

    // Controlo positivo: a variante publicada e ativa passa pelo mesmo caminho.
    expect((await comprar(cliente, [{ variantId: publicada.id, qty: 1 }])).status).toBe(201)
  })

  it('quantidades: zero, negativa, decimal, ausente e carrinho vazio são 400', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('quantidades', { stock: 5 })

    const corpos = [
      { linhas: [{ variantId: variante.id, qty: 0 }] },
      { linhas: [{ variantId: variante.id, qty: -1 }] },
      { linhas: [{ variantId: variante.id, qty: 1.5 }] },
      { linhas: [{ variantId: variante.id, qty: '2' }] },
      { linhas: [{ variantId: variante.id }] },
      { linhas: [{ qty: 1 }] },
      { linhas: [] },
      {},
      undefined,
    ]

    for (const corpo of corpos) {
      const resposta = await pedir(cliente, corpo ? { ...corpo, moradaEnvio } : undefined)
      expect(resposta.status).toBe(400)
    }

    // Uma morada sem código postal português também não passa, e também não
    // grava nem desce stock — a validação da coleção corre dentro da transação.
    const morada = await pedir(cliente, {
      linhas: [{ variantId: variante.id, qty: 1 }],
      moradaEnvio: { ...moradaEnvio, codigoPostal: '1234567' },
    })
    expect(morada.status).toBe(400)

    expect(await naBase()).toHaveLength(0)
    expect(await stockDe(variante.id)).toBe(5)
  })

  it('o total gravado é a soma das linhas mais os portes', async () => {
    const cliente = await criarCliente('a')
    const a = await criarArtigo('coerente-a', { preco: 1990, stock: 10 })
    const b = await criarArtigo('coerente-b', { preco: 750, stock: 10 })

    expect(
      (
        await comprar(cliente, [
          { variantId: a.id, qty: 2 },
          { variantId: b.id, qty: 3 },
        ])
      ).status,
    ).toBe(201)

    const encomenda = (await naBase())[0]!
    const soma = (
      encomenda.linhas as { quantidade: number; precoUnitarioCents: number }[]
    ).reduce((s, l) => s + l.quantidade * l.precoUnitarioCents, 0)
    expect(soma).toBe(1990 * 2 + 750 * 3)
    expect(encomenda.subtotalCents).toBe(soma)
    expect(encomenda.totalCents).toBe(soma + encomenda.portesCents)
  })

  it('o número é gerado, legível e único, e a encomenda é só de quem a fez', async () => {
    const a = await criarCliente('a')
    const b = await criarCliente('b')
    const variante = await criarArtigo('numero', { stock: 10 })

    const numeros: string[] = []
    for (const cliente of [a, a, b]) {
      const resposta = await comprar(cliente, [{ variantId: variante.id, qty: 1 }])
      expect(resposta.status).toBe(201)
      numeros.push(String(((await resposta.json()) as { numero: string }).numero))
    }

    // `AN-2026-0001`: ditável ao telefone e ordenável na lista do painel.
    for (const numero of numeros) expect(numero).toMatch(/^AN-\d{4}-\d{4}$/)
    expect(new Set(numeros).size).toBe(3)
    expect(Number(numeros[1]!.slice(-4))).toBe(Number(numeros[0]!.slice(-4)) + 1)

    // O cliente A vê as suas duas e não vê a de B — nem pela lista, nem pelo id.
    const comoA = { user: { ...a }, overrideAccess: false } as const
    const { docs } = await payload.find({ collection: 'orders', limit: 0, depth: 0, ...comoA })
    expect(docs.map((d) => d.numero).sort()).toEqual([numeros[0], numeros[1]].sort())

    const deB = (await naBase()).find((e) => e.numero === numeros[2])!
    await expect(
      payload.findByID({ collection: 'orders', id: deB.id, ...comoA }),
    ).rejects.toThrow()
  })

  /**
   * O defeito Critical, exatamente como foi reproduzido.
   *
   * Não precisa de concorrência nenhuma: a janela é o tempo que o formulário do
   * painel fica aberto. Ele submete o documento inteiro, com o `stock` que leu
   * quando abriu, e ganha o último a gravar.
   */
  it('uma gravação no painel não ressuscita o stock que as vendas desceram', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('painel', { stock: 5 })

    // O gestor abre o formulário: lê o documento inteiro.
    const formulario = await payload.findByID({
      collection: 'variants',
      id: variante.id,
      depth: 0,
    })
    expect(formulario.stock).toBe(5)

    for (let i = 0; i < 3; i++) {
      expect((await comprar(cliente, [{ variantId: variante.id, qty: 1 }])).status).toBe(201)
    }
    expect(await stockDe(variante.id)).toBe(2)

    // O gestor grava. Só corrigiu o EAN — mas o corpo leva o stock de há bocado.
    await payload.update({
      collection: 'variants',
      id: variante.id,
      data: { ...formulario, ean: '5601234567890' },
    })

    // O critério: as três vendas continuam feitas.
    expect(await stockDe(variante.id)).toBe(2)
    expect(await naBase()).toHaveLength(3)
    expect((await payload.findByID({ collection: 'variants', id: variante.id, depth: 0 })).ean).toBe(
      '5601234567890',
    )
  })

  it('o lojista ajusta o stock a sério, e o ajuste nunca o deixa negativo', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('ajuste', { stock: 5 })

    // Recebeu mercadoria.
    await payload.update({ collection: 'variants', id: variante.id, data: { ajusteStock: 10 } })
    expect(await stockDe(variante.id)).toBe(15)

    // Partiu-se uma unidade.
    await payload.update({ collection: 'variants', id: variante.id, data: { ajusteStock: -1 } })
    expect(await stockDe(variante.id)).toBe(14)

    // O ajuste é somado ao stock do momento, não ao que o formulário viu: uma
    // venda pelo meio conta.
    expect((await comprar(cliente, [{ variantId: variante.id, qty: 4 }])).status).toBe(201)
    await payload.update({ collection: 'variants', id: variante.id, data: { ajusteStock: 1 } })
    expect(await stockDe(variante.id)).toBe(11)

    // E não há ajuste que ponha o stock abaixo de zero.
    await expect(
      payload.update({ collection: 'variants', id: variante.id, data: { ajusteStock: -12 } }),
    ).rejects.toThrow(/negativo/i)
    expect(await stockDe(variante.id)).toBe(11)

    // O campo não guarda nada: é uma ordem de movimento, não um estado.
    expect(
      (await payload.findByID({ collection: 'variants', id: variante.id, depth: 0 })).ajusteStock,
    ).toBeNull()
  })

  it('dez pedidos simultâneos a três unidades: exatamente três encomendas', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('dez', { stock: 3 })

    const respostas = await Promise.all(
      Array.from({ length: 10 }, () => comprar(cliente, [{ variantId: variante.id, qty: 1 }])),
    )

    expect(respostas.filter((r) => r.status === 201)).toHaveLength(3)
    expect(respostas.filter((r) => r.status === 409)).toHaveLength(7)
    expect(await naBase()).toHaveLength(3)
    expect(await stockDe(variante.id)).toBe(0)
  })

  it('cancelar repõe o stock, e uma encomenda cancelada não volta atrás', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('cancelar', { stock: 5 })

    expect((await comprar(cliente, [{ variantId: variante.id, qty: 2 }])).status).toBe(201)
    expect(await stockDe(variante.id)).toBe(3)

    const encomenda = (await naBase())[0]!
    await payload.update({ collection: 'orders', id: encomenda.id, data: { estado: 'cancelado' } })
    expect(await stockDe(variante.id)).toBe(5)

    // Cancelar outra vez não repõe duas vezes.
    await payload.update({ collection: 'orders', id: encomenda.id, data: { estado: 'cancelado' } })
    expect(await stockDe(variante.id)).toBe(5)

    // E não se descancela: o stock já foi devolvido e pode ter sido vendido.
    await expect(
      payload.update({ collection: 'orders', id: encomenda.id, data: { estado: 'pago' } }),
    ).rejects.toThrow(/cancelada/i)
    expect(await stockDe(variante.id)).toBe(5)

    // Os outros estados continuam a mudar à vontade.
    const outra = await comprar(cliente, [{ variantId: variante.id, qty: 1 }])
    expect(outra.status).toBe(201)
    const segunda = (await naBase()).find((e) => e.id !== encomenda.id)!
    await payload.update({ collection: 'orders', id: segunda.id, data: { estado: 'pago' } })
    await payload.update({ collection: 'orders', id: segunda.id, data: { estado: 'enviado' } })
    expect(await stockDe(variante.id)).toBe(4)
  })

  it('apagar um cliente com encomendas anonimiza o histórico em vez de rebentar', async () => {
    const cliente = await criarCliente('a')
    const variante = await criarArtigo('rgpd', { stock: 5 })

    expect((await comprar(cliente, [{ variantId: variante.id, qty: 2 }])).status).toBe(201)
    const antes = (await naBase())[0]!

    await payload.delete({ collection: 'customers', id: cliente.id })

    // A conta desapareceu…
    await expect(
      payload.findByID({ collection: 'customers', id: cliente.id }),
    ).rejects.toThrow()

    // …e a venda sobreviveu, sem nada que identifique a pessoa.
    const depois = await payload.findByID({
      collection: 'orders',
      id: antes.id,
      depth: 0,
    })
    expect(depois.numero).toBe(antes.numero)
    expect(depois.totalCents).toBe(antes.totalCents)
    expect(depois.linhas![0]).toMatchObject({ quantidade: 2, precoUnitarioCents: 2990 })
    expect(depois.cliente).toBeNull()
    expect(depois.email).not.toContain(String(cliente.email))
    expect(JSON.stringify(depois.moradaEnvio)).not.toContain('Ana Silva')
    expect(JSON.stringify(depois.moradaEnvio)).not.toContain('Rua das Flores')

    // Sem encomendas continua a apagar como antes.
    const semCompras = await criarCliente('b')
    await payload.delete({ collection: 'customers', id: semCompras.id })
    await expect(payload.findByID({ collection: 'customers', id: semCompras.id })).rejects.toThrow()
  })

  it('a palavra-passe do registo tem um mínimo', async () => {
    await expect(
      payload.create({
        collection: 'customers',
        data: { email: `${P}-curta@cliente.pt`, password: 'abc', nome: 'Curta' },
      }),
    ).rejects.toThrow(/palavra-passe/i)

    expect(
      await payload.count({ collection: 'customers', where: { email: { contains: 'curta' } } }),
    ).toMatchObject({ totalDocs: 0 })

    // Controlo positivo: com oito caracteres regista.
    await criarCliente('a')
  })

  it('o limite de ritmo do endpoint fecha ao fim de dez pedidos por minuto', () => {
    const agora = Date.now()
    const chave = `${P}-limite`

    for (let i = 0; i < 10; i++) expect(dentroDoLimite(chave, agora + i)).toBe(true)
    expect(dentroDoLimite(chave, agora + 10)).toBe(false)

    // Chaves diferentes não se estorvam, e a janela deslizante volta a abrir.
    expect(dentroDoLimite(`${chave}-outro`, agora)).toBe(true)
    expect(dentroDoLimite(chave, agora + 60_001)).toBe(true)
  })
})

/**
 * Atributos de catálogo com alcance (`filtro`, `ficha`, `interno`).
 *
 * O mesmo erro da fase 2 (C1: abrir `read` numa coleção expõe todos os campos
 * e documentos) reaparece aqui noutra roupagem — não há campos internos
 * dentro do documento, é o próprio documento que é interno ou não, via
 * `alcance`. Estes testes fixam que a leitura pública nunca devolve um
 * documento `interno`, nem por pedido explícito, e que um cliente autenticado
 * não é staff — as duas armadilhas nomeadas no brief deste lote.
 */
describe('atributos de catálogo com alcance', () => {
  const PA = `${P}-attr`

  const criarAtributo = (
    alcance: 'filtro' | 'ficha' | 'interno',
    sufixo: string,
    extra: Record<string, unknown> = {},
  ) =>
    payload.create({
      collection: 'attributes',
      data: {
        nome: `Zteste ${sufixo}`,
        chave: `${PA}-${sufixo}`,
        tipo: 'select',
        alcance,
        controlo: 'caixas',
        ...extra,
      },
    })

  const limparAtributos = () =>
    payload.delete({ collection: 'attributes', where: { chave: { contains: PA } } })

  const criarClienteAttr = (sufixo: string) =>
    payload.create({
      collection: 'customers',
      data: { email: `${PA}-${sufixo}@cliente.pt`, password: 'animora123', nome: 'Zteste' },
      overrideAccess: false,
    })

  const comoCliente = (u: { id: Id }) => ({
    user: { ...u, collection: 'customers' },
    overrideAccess: false,
  })

  beforeAll(limparAtributos)
  afterEach(limparAtributos)

  it('sem sessão só devolve alcance filtro e ficha — nunca interno, nem por pedido direto', async () => {
    await criarAtributo('filtro', 'a')
    await criarAtributo('ficha', 'b')
    const interno = await criarAtributo('interno', 'c')

    const { docs } = await payload.find({
      collection: 'attributes',
      where: { chave: { contains: PA } },
      overrideAccess: false,
      depth: 0,
      limit: 0,
    })
    expect((docs as unknown as { alcance: string }[]).map((d) => d.alcance).sort()).toEqual(['ficha', 'filtro'])
    expect(docs.map((d) => d.id)).not.toContain(interno.id)

    // Pedir o interno explicitamente por `where` não o revela: a condição de
    // acesso combina com `and`, por isso o pedido fica sempre vazio.
    const { docs: porId } = await payload.find({
      collection: 'attributes',
      where: { id: { equals: interno.id } },
      overrideAccess: false,
      depth: 0,
    })
    expect(porId).toHaveLength(0)

    const { docs: porAlcance } = await payload.find({
      collection: 'attributes',
      where: { and: [{ chave: { contains: PA } }, { alcance: { equals: 'interno' } }] },
      overrideAccess: false,
      depth: 0,
    })
    expect(porAlcance).toHaveLength(0)

    await expect(
      payload.findByID({ collection: 'attributes', id: interno.id, overrideAccess: false }),
    ).rejects.toThrow()

    // Controlo positivo: com sessão o interno continua a ver-se.
    const comSessao = await payload.findByID({ collection: 'attributes', id: interno.id, depth: 0 })
    expect(comSessao.alcance).toBe('interno')
  })

  it('um cliente autenticado vê o mesmo que o anónimo — um cliente não é staff', async () => {
    await criarAtributo('filtro', 'cliente-filtro')
    await criarAtributo('ficha', 'cliente-ficha')
    const interno = await criarAtributo('interno', 'cliente-interno')
    const cliente = await criarClienteAttr('leitura')

    const { docs } = await payload.find({
      collection: 'attributes',
      where: { chave: { contains: PA } },
      depth: 0,
      limit: 0,
      ...comoCliente(cliente),
    })
    expect((docs as unknown as { alcance: string }[]).map((d) => d.alcance).sort()).toEqual(['ficha', 'filtro'])
    expect(docs.map((d) => d.id)).not.toContain(interno.id)

    await expect(
      payload.findByID({ collection: 'attributes', id: interno.id, ...comoCliente(cliente) }),
    ).rejects.toThrow()
  })

  it('escrita só por staff — cliente e anónimo são recusados', async () => {
    const atributo = await criarAtributo('filtro', 'escrita')
    const cliente = await criarClienteAttr('escrita')
    const sessao = comoCliente(cliente)

    const dadosNovo = {
      nome: 'X',
      chave: `${PA}-invasor`,
      tipo: 'select' as const,
      alcance: 'filtro' as const,
      controlo: 'caixas' as const,
    }
    await expect(
      payload.create({ collection: 'attributes', data: dadosNovo, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'attributes', data: dadosNovo, ...sessao }),
    ).rejects.toThrow()

    await expect(
      payload.update({
        collection: 'attributes',
        id: atributo.id,
        data: { nome: 'Invadido' },
        ...sessao,
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({ collection: 'attributes', id: atributo.id, ...sessao }),
    ).rejects.toThrow()

    // O código HTTP não é a prova; o estado na base é.
    const naBase = await payload.findByID({ collection: 'attributes', id: atributo.id, depth: 0 })
    expect(naBase.nome).not.toBe('Invadido')
  })

  it('chave duplicada é recusada', async () => {
    await criarAtributo('filtro', 'dup')
    await expect(criarAtributo('filtro', 'dup')).rejects.toThrow()
  })

  it('chave com espaços e maiúsculas é normalizada para minúsculas sem espaços', async () => {
    const doc = await payload.create({
      collection: 'attributes',
      data: {
        nome: 'Peso do Animal',
        chave: `  ${PA} Peso DO Animal  `,
        tipo: 'intervalo',
        alcance: 'ficha',
        controlo: 'intervalo',
      },
    })
    expect(doc.chave).toBe(`${PA} peso do animal`.toLowerCase().replace(/\s+/g, '-'))
  })
})

/**
 * Ecrã de configuração dos filtros do catálogo (`configuracao-filtros`).
 *
 * `ordem`, `controlo` e `abertoPorOmissao` já são campos do próprio atributo
 * — este global só decide, por cima, quais ficam ativos, por que posição (a
 * ordem do array, que o hook não recalcula) e a substituição por categoria.
 * O ponto central é o mesmo do resto do lote: um atributo `interno` não pode
 * ser tornado público por aqui, nem por um pedido direto que salte a UI.
 */
describe('configuração de filtros do catálogo', () => {
  const PC = `${P}-cfg`
  type LinhaFiltro = { atributo: Id; visivel?: boolean | null }

  const criarAtributoCfg = (alcance: 'filtro' | 'ficha' | 'interno', sufixo: string, ordem = 0) =>
    payload.create({
      collection: 'attributes',
      data: {
        nome: `Zteste ${sufixo}`,
        chave: `${PC}-${sufixo}`,
        tipo: 'select',
        alcance,
        controlo: 'caixas',
        ordem,
      },
    })

  const criarCategoriaCfg = (sufixo: string) =>
    payload.create({ collection: 'categories', data: { name: `Zteste ${sufixo}`, slug: `${PC}-${sufixo}` } })

  /**
   * A configuração real da loja é estado de entrega (os filtros que o site
   * mostra), não sobra de teste: guarda-se à entrada e repõe-se no fim. Sem
   * isto, uma corrida de testes deixava a loja entregue sem filtro nenhum — que
   * é exatamente o defeito que a última ronda mandou fechar.
   */
  let configEntregue: { padrao?: unknown; porCategoria?: unknown } = {}

  const limparConfigFiltros = async () => {
    await payload.updateGlobal({
      slug: 'configuracao-filtros',
      data: { padrao: [], porCategoria: [] },
    })
    await payload.delete({ collection: 'attributes', where: { chave: { contains: PC } } })
    await payload.delete({ collection: 'categories', where: { slug: { contains: PC } } })
  }

  beforeAll(async () => {
    const lido = await payload.findGlobal({ slug: 'configuracao-filtros', depth: 0 })
    configEntregue = { padrao: lido.padrao ?? [], porCategoria: lido.porCategoria ?? [] }
    await limparConfigFiltros()
  })
  afterEach(limparConfigFiltros)
  afterAll(async () => {
    await payload.updateGlobal({ slug: 'configuracao-filtros', data: configEntregue as never })
  })

  it('reordenar altera a ordem, e desligar a visibilidade tira o atributo dos visíveis', async () => {
    // O `ordem` de cada atributo está de propósito ao contrário da configuração:
    // qualquer camada que volte a ordenar por `ordem` — como a loja fazia — sai
    // daqui com a lista trocada. A prova do lado da loja, do URL à barra de
    // filtros, está em `apps/web/src/modules/catalog/facets.test.ts`.
    const peso = await criarAtributoCfg('filtro', 'peso', 1)
    const tamanho = await criarAtributoCfg('filtro', 'tamanho', 2)

    await payload.updateGlobal({
      slug: 'configuracao-filtros',
      data: {
        padrao: [
          { atributo: tamanho.id, visivel: true },
          { atributo: peso.id, visivel: true },
        ],
      },
    })
    const lido = await payload.findGlobal({ slug: 'configuracao-filtros', depth: 0 })
    expect((lido.padrao ?? []).map((l: LinhaFiltro) => l.atributo)).toEqual([tamanho.id, peso.id])

    // Reordenar: inverte a posição.
    await payload.updateGlobal({
      slug: 'configuracao-filtros',
      data: {
        padrao: [
          { atributo: peso.id, visivel: false },
          { atributo: tamanho.id, visivel: true },
        ],
      },
    })
    const depois = await payload.findGlobal({ slug: 'configuracao-filtros', depth: 0 })
    expect((depois.padrao ?? []).map((l: LinhaFiltro) => l.atributo)).toEqual([peso.id, tamanho.id])

    const visiveis = (depois.padrao ?? [])
      .filter((l: LinhaFiltro) => l.visivel)
      .map((l: LinhaFiltro) => l.atributo)
    expect(visiveis).toEqual([tamanho.id])
    expect(visiveis).not.toContain(peso.id)
  })

  it('um atributo interno não pode ser tornado público — nem em "padrao" nem em "porCategoria"', async () => {
    const cor = await criarAtributoCfg('filtro', 'cor')
    const custo = await criarAtributoCfg('interno', 'custo')
    const categoria = await criarCategoriaCfg('generica')

    await expect(
      payload.updateGlobal({
        slug: 'configuracao-filtros',
        data: {
          padrao: [
            { atributo: cor.id, visivel: true },
            { atributo: custo.id, visivel: true },
          ],
        },
      }),
    ).rejects.toThrow(/interno/)

    // A recusa não deixa o interno gravado a meio.
    const naBase = await payload.findGlobal({ slug: 'configuracao-filtros', depth: 0 })
    expect((naBase.padrao ?? []).map((l: LinhaFiltro) => l.atributo)).not.toContain(custo.id)

    await expect(
      payload.updateGlobal({
        slug: 'configuracao-filtros',
        data: {
          porCategoria: [{ categoria: categoria.id, atributos: [{ atributo: custo.id, visivel: true }] }],
        },
      }),
    ).rejects.toThrow(/interno/)
  })

  /**
   * A terceira aparição da armadilha `ON DELETE SET NULL` sobre coluna
   * `NOT NULL` (produtos→variantes na fase 1, clientes→encomendas na fase 3).
   * Aqui a escolha foi recusar, não apagar a linha em cascata: a posição da
   * linha é a ordem dos filtros na loja e não se repõe sozinha. Ver o porquê
   * em `globals/ConfiguracaoFiltros.ts`.
   */
  it('um atributo em uso na configuração não se apaga — recusa com instruções, e não 500', async () => {
    const cor = await criarAtributoCfg('filtro', 'cor-usada')
    const livre = await criarAtributoCfg('filtro', 'sem-uso')
    const racao = await criarCategoriaCfg('racao-uso')

    await payload.updateGlobal({
      slug: 'configuracao-filtros',
      data: {
        padrao: [{ atributo: cor.id, visivel: true }],
        porCategoria: [{ categoria: racao.id, atributos: [{ atributo: cor.id, visivel: true }] }],
      },
    })

    const recusa = await payload
      .delete({ collection: 'attributes', id: cor.id })
      .then(() => null, (e: Error) => e)

    // Não é um erro qualquer: diz o nome, os dois sítios onde está em uso, e o
    // que o lojista tem de fazer. Um 500 "Something went wrong" não dizia nada.
    expect(recusa?.message).toContain(String(cor.nome))
    expect(recusa?.message).toContain('filtros por omissão')
    expect(recusa?.message).toContain('substituição por categoria')
    expect(recusa?.message).toContain('Configuração de filtros')

    // E não apagou nada a meio.
    expect(await payload.findByID({ collection: 'attributes', id: cor.id, depth: 0 })).toBeTruthy()

    // Um atributo que ninguém configurou apaga-se como sempre.
    await payload.delete({ collection: 'attributes', id: livre.id })
    const restantes = await payload.find({
      collection: 'attributes',
      where: { chave: { contains: PC } },
      depth: 0,
      limit: 0,
    })
    expect(restantes.docs.map((d) => d.id)).not.toContain(livre.id)

    // Tirada a linha da configuração — o passo que a mensagem manda dar — o
    // atributo apaga-se.
    await payload.updateGlobal({ slug: 'configuracao-filtros', data: { padrao: [], porCategoria: [] } })
    await payload.delete({ collection: 'attributes', id: cor.id })
    await expect(
      payload.findByID({ collection: 'attributes', id: cor.id, depth: 0 }),
    ).rejects.toThrow()
  })

  it('escrita só por staff — anónimo é recusado', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'configuracao-filtros',
        data: { padrao: [] },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('substituição por categoria: Ração filtra por peso, Coleiras por tamanho', async () => {
    const peso = await criarAtributoCfg('filtro', 'peso2')
    const tamanho = await criarAtributoCfg('filtro', 'tamanho2')
    const racao = await criarCategoriaCfg('racao')
    const coleiras = await criarCategoriaCfg('coleiras')

    await payload.updateGlobal({
      slug: 'configuracao-filtros',
      data: {
        padrao: [{ atributo: peso.id, visivel: true }],
        porCategoria: [
          { categoria: racao.id, atributos: [{ atributo: peso.id, visivel: true }] },
          { categoria: coleiras.id, atributos: [{ atributo: tamanho.id, visivel: true }] },
        ],
      },
    })

    const lido = await payload.findGlobal({ slug: 'configuracao-filtros', depth: 0 })
    const overrides = new Map(
      (lido.porCategoria ?? []).map((o: { categoria: Id; atributos?: LinhaFiltro[] | null }) => [
        o.categoria,
        (o.atributos ?? []).map((a: LinhaFiltro) => a.atributo),
      ]),
    )
    expect(overrides.get(racao.id)).toEqual([peso.id])
    expect(overrides.get(coleiras.id)).toEqual([tamanho.id])
    // O conjunto por omissão continua distinto das substituições.
    expect((lido.padrao ?? []).map((l: LinhaFiltro) => l.atributo)).toEqual([peso.id])
  })
})

/**
 * A trava comercial do dashboard.
 *
 * O que estes testes fixam não é o formato do relatório — é a garantia que se
 * vende: com a trava ligada, **nenhum número real sai da base**. A asserção
 * central não compara com literais escritas à mão; compara a resposta bloqueada
 * com a resposta desbloqueada da mesma base, no mesmo instante, e exige que não
 * coincidam em número nenhum. Uma literal envelhecida passaria à mesma; isto
 * não.
 *
 * A trava fica **ligada** no fim, que é o estado de entrega.
 */
describe('dashboard de vendas com trava comercial', () => {
  type Utilizador = { id: Id; role: string; collection: 'users' }

  const como = (utilizador: Utilizador) => ({ user: utilizador, overrideAccess: false })

  /**
   * O `role` viaja no utilizador de propósito: é o que `ehDono` lê. Um objeto
   * só com `id` passaria por `admin` sem que o teste desse por isso, e o teste
   * do owner falharia por motivo errado.
   */
  const criarStaff = async (sufixo: string, role: 'admin' | 'owner'): Promise<Utilizador> => {
    const u = await payload.create({
      collection: 'users',
      data: { email: `${P}-dash-${sufixo}@animora.pt`, password: 'animora123', role },
    })
    expect(u.role).toBe(role)
    return { id: u.id, role: String(u.role), collection: 'users' }
  }

  /** O interruptor, pelo caminho legítimo (Local API com `overrideAccess`). */
  const desbloquear = (ligado: boolean) =>
    payload.updateGlobal({ slug: 'definicoes', data: { dashboardDesbloqueado: ligado } })

  const naBase = async (): Promise<unknown> =>
    (await payload.findGlobal({ slug: 'definicoes', depth: 0 })).dashboardDesbloqueado

  const ver = async (utilizador: Utilizador) =>
    lerDashboard(await createLocalReq({ user: utilizador as never }, payload), {})

  /** Uma variante publicada com preço, custo e stock à medida. `custo: null` deixa-o por registar. */
  const artigo = async (
    sufixo: string,
    { preco, custo, stock }: { preco: number; custo: number | null; stock: number },
  ): Promise<Linha> => {
    const produto = await criarRascunho(`dash-${sufixo}`)
    const [variante] = await variantesDe(produto.id)
    await payload.update({
      collection: 'variants',
      id: variante!.id,
      data: { priceCents: preco, ajusteStock: stock, ...(custo === null ? {} : { costCents: custo }) },
    })
    await publicar(produto.id)
    return (await payload.findByID({
      collection: 'variants',
      id: variante!.id,
      depth: 0,
    })) as unknown as Linha
  }

  const moradaEnvio = {
    nomeDestinatario: 'Ana Silva',
    linha1: 'Rua das Flores 12',
    codigoPostal: '1234-567',
    localidade: 'Lisboa',
  }

  /**
   * O cenário conhecido, calculado à mão:
   *
   * ```
   * E1  racao 1 x 9000 (custo 6000)  +  snack 10 x 500 (custo 200)   = 14000
   * E2  snack 2 x  500 (custo  200)  +  coleira 1 x 2000 (SEM custo) =  3000
   * E3  racao 2 x 9000                                CANCELADA      = 18000
   *
   * faturação 17000   custo 8400   lucro 6600   margem null (falta um custo)
   * unidades 14       sem custo 1  encomendas 2  ticket médio 8500
   * ```
   */
  const REAL = {
    faturacaoCents: 17000,
    custoCents: 8400,
    lucroCents: 6600,
    margemPercent: null,
    unidades: 14,
    unidadesSemCustoConhecido: 1,
    encomendas: 2,
    ticketMedioCents: 8500,
  }

  const cenario = async () => {
    const racao = await artigo('racao', { preco: 9000, custo: 6000, stock: 100 })
    const snack = await artigo('snack', { preco: 500, custo: 200, stock: 100 })
    const coleira = await artigo('coleira', { preco: 2000, custo: null, stock: 100 })

    const cliente = await payload.create({
      collection: 'customers',
      data: { email: `${P}-dash@cliente.pt`, password: 'animora123', nome: 'Ana' },
    })

    const comprar = async (linhas: { variantId: Id; qty: number }[]) => {
      const req = await createLocalReq({ user: { ...cliente, collection: 'customers' } as never }, payload)
      const resposta = await finalizarCompra(req, { linhas, moradaEnvio })
      expect(resposta.status).toBe(201)
      return (await resposta.json()) as { id: Id }
    }

    await comprar([
      { variantId: racao.id, qty: 1 },
      { variantId: snack.id, qty: 10 },
    ])
    await comprar([
      { variantId: snack.id, qty: 2 },
      { variantId: coleira.id, qty: 1 },
    ])
    const cancelada = await comprar([{ variantId: racao.id, qty: 2 }])
    await payload.update({
      collection: 'orders',
      id: cancelada.id,
      data: { estado: 'cancelado' },
    })

    return { racao, snack, coleira }
  }

  // Entregue com a trava ligada, aconteça o que acontecer aos testes.
  afterAll(async () => {
    await desbloquear(false)
  })

  /**
   * Isolamento total antes de CADA teste deste bloco — não só do que o
   * `zteste` prefixa.
   *
   * Estes testes fazem contas exatas (`toMatchObject(REAL)`, uma faturação de
   * "3870" num dia certo) sobre `orders` inteira: `lerDashboard` agrega por
   * janela de datas, sem filtro nenhum de prefixo de teste — é a mesma função
   * que lê o histórico real da loja. Uma única encomenda alheia a este bloco,
   * de outra fonte qualquer (histórico de demonstração do seeder do
   * catálogo, uma compra manual feita a testar o admin), que caia na janela
   * pedida — os últimos 30 dias por omissão, ou os dias fixos do teste de
   * fuso-horário — muda o total e o teste falha por um motivo que não é seu.
   * Verificado: 20 encomendas de demonstração no período bastavam para fazer
   * 5 destes testes falharem, incluindo o de fuso-horário com datas fixas no
   * passado.
   *
   * Apagar tudo aqui é seguro: só corre dentro deste `describe`, nunca antes
   * dos outros blocos de testes, e a `afterAll` do topo do ficheiro já limpa o
   * resto no fim da corrida toda.
   */
  beforeEach(async () => {
    await payload.delete({ collection: 'orders', where: { id: { exists: true } } })
  })

  it('bloqueado: o admin recebe demonstração e nenhum número real da base', async () => {
    const admin = await criarStaff('admin', 'admin')
    const { racao, snack, coleira } = await cenario()

    await desbloquear(true)
    const reais = await ver(admin)
    expect(reais.locked).toBe(false)
    expect(reais.vendas).toMatchObject(REAL)

    await desbloquear(false)
    const demo = await ver(admin)

    expect(demo.locked).toBe(true)
    // Número a número, contra os reais lidos da mesma base há um instante.
    for (const chave of Object.keys(REAL) as (keyof typeof REAL)[]) {
      expect(demo.vendas[chave]).not.toBe(reais.vendas[chave])
    }

    // E não é só nos totais: nenhum valor real aparece em sítio nenhum da
    // resposta — nem SKU, nem título, nem cêntimos.
    const texto = JSON.stringify(demo)
    for (const v of [racao, snack, coleira]) {
      expect(texto).not.toContain(v.sku)
    }
    for (const cents of [17000, 8400, 6600, 8500, 14000, 9000]) {
      expect(texto).not.toContain(String(cents))
    }
    expect(demo.maisVendidosPorUnidades.every((a) => a.sku.startsWith('DEMO-'))).toBe(true)
  })

  it('bloqueado: o admin não vê o interruptor e não o consegue ligar', async () => {
    const admin = await criarStaff('admin', 'admin')
    await desbloquear(false)

    // O campo nem sai na resposta de quem não é dono.
    const comoAdmin = await payload.findGlobal({ slug: 'definicoes', depth: 0, ...como(admin) })
    expect(comoAdmin).not.toHaveProperty('dashboardDesbloqueado')

    await expect(
      payload.updateGlobal({
        slug: 'definicoes',
        data: { dashboardDesbloqueado: true },
        ...como(admin),
      }),
    ).rejects.toThrow()

    // O código de erro não é o sinal: o sinal é a base.
    expect(await naBase()).toBe(false)
    expect((await ver(admin)).locked).toBe(true)
  })

  it('o owner liga e desliga, e o estado persiste', async () => {
    const dono = await criarStaff('dono', 'owner')

    await payload.updateGlobal({
      slug: 'definicoes',
      data: { dashboardDesbloqueado: true },
      ...como(dono),
    })
    expect(await naBase()).toBe(true)
    expect((await ver(dono)).locked).toBe(false)

    await payload.updateGlobal({
      slug: 'definicoes',
      data: { dashboardDesbloqueado: false },
      ...como(dono),
    })
    expect(await naBase()).toBe(false)
    expect((await ver(dono)).locked).toBe(true)
  })

  it('a faixa de demonstração aparece sempre que locked, e nunca quando não está', async () => {
    const admin = await criarStaff('admin', 'admin')

    await desbloquear(false)
    const bloqueado = await ver(admin)
    expect(bloqueado.aviso).toEqual(AVISO_DEMONSTRACAO)
    expect(bloqueado.aviso?.titulo).toContain('não são as suas vendas')
    expect(bloqueado.aviso?.texto).toContain('98252-1727')
    expect(bloqueado.aviso?.url).toBe('https://wa.me/5519982521727')

    await desbloquear(true)
    expect((await ver(admin)).aviso).toBeNull()
  })

  it('sem sessão o endpoint não responde de todo, e um cliente também não', async () => {
    await desbloquear(false)

    const anonimo = await dashboard.handler(await createLocalReq({}, payload))
    expect(anonimo.status).toBe(401)
    expect(await anonimo.text()).not.toContain('faturacaoCents')

    const cliente = await payload.create({
      collection: 'customers',
      data: { email: `${P}-dash-anon@cliente.pt`, password: 'animora123', nome: 'Ana' },
    })
    const comoCliente = await dashboard.handler(
      await createLocalReq({ user: { ...cliente, collection: 'customers' } as never }, payload),
    )
    expect(comoCliente.status).toBe(403)
    expect(await comoCliente.text()).not.toContain('faturacaoCents')
  })

  it('desbloqueado: os números batem certo, e a encomenda cancelada não conta', async () => {
    const dono = await criarStaff('dono', 'owner')
    await cenario()
    await desbloquear(true)

    const d = await ver(dono)
    expect(d.locked).toBe(false)
    expect(d.vendas).toMatchObject(REAL)

    // Com a cancelada a contar seriam mais 2 × 9000 e mais uma encomenda.
    expect(d.vendas.faturacaoCents).not.toBe(REAL.faturacaoCents + 18000)
    expect(d.vendas.encomendas).toBe(2)
    const naBaseTotal = await payload.find({
      collection: 'orders',
      where: { email: { contains: P } },
      limit: 0,
      depth: 0,
    })
    // As três estão lá: a cancelada é excluída do relatório, não da base.
    expect(naBaseTotal.totalDocs).toBe(3)

    // A receita por categoria soma exatamente a faturação — nenhuma linha se
    // perde nem é contada duas vezes ao passar pelo produto.
    expect(d.receitaPorCategoria.reduce((s, c) => s + c.receitaCents, 0)).toBe(REAL.faturacaoCents)
  })

  /**
   * O corte do dia é o de Lisboa, não o de UTC.
   *
   * Medido antes da correção: uma encomenda de 38,70 € criada às 00:30 de
   * Lisboa saía no relatório do dia ANTERIOR durante a hora de verão — sete
   * meses por ano. Num fecho de mês é a última noite a cair no mês errado, e o
   * relatório deixa de bater com os livros da loja.
   *
   * Datas fixas e no passado de propósito: o resultado não pode depender do dia
   * em que os testes correm, nem apanhar encomendas de outros testes.
   */
  it('desbloqueado: a encomenda das 00:30 conta no dia de Lisboa, dentro e fora da hora de verão', async () => {
    const dono = await criarStaff('fuso', 'owner')
    const fronteira = await artigo('fronteira', { preco: 3870, custo: 2000, stock: 10 })

    const cliente = await payload.create({
      collection: 'customers',
      data: { email: `${P}-fuso@cliente.pt`, password: 'animora123', nome: 'Ana' },
    })
    const resposta = await finalizarCompra(
      await createLocalReq({ user: { ...cliente, collection: 'customers' } as never }, payload),
      { linhas: [{ variantId: fronteira.id, qty: 1 }], moradaEnvio },
    )
    expect(resposta.status).toBe(201)
    const { id } = (await resposta.json()) as { id: Id }

    await desbloquear(true)

    const criadaEm = async (instante: string) => {
      await payload.update({ collection: 'orders', id, data: { createdAt: instante } })
      const lida = await payload.findByID({ collection: 'orders', id, depth: 0 })
      expect(new Date(lida.createdAt).toISOString()).toBe(instante)
    }
    const faturacaoDe = async (dia: string) =>
      (
        await lerDashboard(await createLocalReq({ user: dono as never }, payload), { de: dia, ate: dia })
      ).vendas.faturacaoCents

    // Hora de verão: 00:30 de 16/07 em Lisboa são 23:30 UTC de 15/07.
    await criadaEm('2026-07-15T23:30:00.000Z')
    expect(await faturacaoDe('2026-07-16')).toBe(3870)
    expect(await faturacaoDe('2026-07-15')).toBe(0)

    // Fora da hora de verão Lisboa é UTC, e o corte é à meia-noite UTC.
    await criadaEm('2026-01-15T00:30:00.000Z')
    expect(await faturacaoDe('2026-01-15')).toBe(3870)
    expect(await faturacaoDe('2026-01-14')).toBe(0)
  })

  it('desbloqueado: mais vendidos por unidades não é a mesma lista que por receita', async () => {
    const dono = await criarStaff('dono', 'owner')
    const { racao, snack } = await cenario()
    await desbloquear(true)

    const d = await ver(dono)
    expect(d.maisVendidosPorUnidades[0]).toMatchObject({ sku: snack.sku, unidades: 12, receitaCents: 6000 })
    expect(d.maisVendidosPorReceita[0]).toMatchObject({ sku: racao.sku, unidades: 1, receitaCents: 9000 })
    expect(d.maisVendidosPorUnidades).not.toEqual(d.maisVendidosPorReceita)
  })

  it('desbloqueado: uma margem desconhecida não vira 0% nem 100%', async () => {
    const dono = await criarStaff('dono', 'owner')
    await cenario()
    await desbloquear(true)

    const d = await ver(dono)
    // Uma linha sem custo registado (a coleira) chega para a margem agregada se
    // recusar. Tratar custo desconhecido como zero daria 100%; ignorá-lo daria
    // um número bonito e errado.
    expect(d.vendas.margemPercent).toBeNull()
    expect(d.vendas.unidadesSemCustoConhecido).toBe(1)
    // O lucro continua a ser o das linhas conhecidas, não zero.
    expect(d.vendas.lucroCents).toBe(6600)
  })

  it('desbloqueado: um período sem vendas nenhumas não tem margem — não é 0,00 %', async () => {
    const dono = await criarStaff('vazio', 'owner')
    await cenario()
    await desbloquear(true)

    // Fevereiro de 2020: a loja não existia. Zero faturação não é margem zero —
    // é uma divisão que não se faz, e o painel escreve "desconhecida".
    const d = await lerDashboard(await createLocalReq({ user: dono as never }, payload), {
      de: '2020-02-01',
      ate: '2020-02-29',
    })
    expect(d.vendas.faturacaoCents).toBe(0)
    expect(d.vendas.unidades).toBe(0)
    expect(d.vendas.margemPercent).toBeNull()
  })

  it('desbloqueado: ruturas e stock baixo saem do catálogo publicado', async () => {
    const dono = await criarStaff('dono', 'owner')
    const { racao, snack } = await cenario()
    await desbloquear(true)

    await payload.update({ collection: 'variants', id: snack.id, data: { ajusteStock: -88 } })
    await payload.update({ collection: 'variants', id: racao.id, data: { ajusteStock: -96 } })

    const d = await ver(dono)
    // 100 − 10 − 2 = 88 vendidos, e o ajuste leva a zero.
    expect(d.stock.ruturas.find((a) => a.sku === snack.sku)).toMatchObject({ stock: 0 })
    // 100 − 1 da E1 − 2 da E3, que voltaram ao cancelar = 99; menos 96 = 3.
    expect(d.stock.baixo.find((a) => a.sku === racao.sku)).toMatchObject({ stock: 3 })
    expect(d.stock.ruturas.some((a) => a.sku === racao.sku)).toBe(false)
  })
})
