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
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import { combinationKey } from '@animora/core'

import config from '../payload.config'

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

const porTamanho = (linhas: Linha[], tamanho: string): Linha | undefined =>
  linhas.find((l) => l.combination.Tamanho === tamanho)

const limparCatalogo = async () => {
  // Produtos primeiro: apagá-los apaga as variantes, e um produto publicado
  // impede a eliminação da marca, da categoria e da imagem que usa.
  await payload.delete({ collection: 'products', where: { slug: { contains: P } } })
  await payload.delete({ collection: 'users', where: { email: { contains: P } } })
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
      data: { priceCents: 2990, stock: 12 },
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
        data: { priceCents: 1000 + i, stock: 5 },
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
        data: { priceCents: 1000 + i * 10, stock: i + 1 },
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
        data: { priceCents: 2990, stock: 12 },
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
      data: { priceCents: 2990, stock: 12 },
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
      data: { priceCents: 4990, stock: 5 },
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
      data: { priceCents: 2990, stock: 4 },
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
    await payload.update({ collection: 'variants', id: l.id, data: { priceCents: 3990, stock: 2 } })
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
