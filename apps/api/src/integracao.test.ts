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
let dono: { id: Id; email: string }

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

  const { docs } = await payload.find({
    collection: 'users',
    where: { role: { equals: 'owner' } },
    limit: 1,
    depth: 0,
  })
  dono = docs[0] as unknown as { id: Id; email: string }
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
    ).rejects.toThrow(/variante ativa com preço/)

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

describe('escalada de privilégios', () => {
  const criarAdmin = async (sufixo: string) =>
    payload.create({
      collection: 'users',
      data: { email: `${P}-${sufixo}@animora.pt`, password: 'animora123', role: 'admin' },
    })

  const como = (utilizador: { id: Id }) => ({
    user: { ...utilizador, collection: 'users' },
    overrideAccess: false,
  })

  it('um admin não se consegue tornar owner por nenhum dos cinco caminhos', async () => {
    const admin = await criarAdmin('admin')
    expect(admin.role).toBe('admin')

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
        id: dono.id,
        data: { password: 'apanhado123' },
        ...como(admin),
      }),
    ).rejects.toThrow()
    await expect(
      payload.login({
        collection: 'users',
        data: { email: dono.email, password: 'apanhado123' },
      }),
    ).rejects.toThrow()

    // 4) apagar o owner
    await expect(
      payload.delete({ collection: 'users', id: dono.id, ...como(admin) }),
    ).rejects.toThrow()

    // 5) esvaziar a tabela para reabrir o `first-register`, que corre com
    //    overrideAccess e honra o papel submetido. O admin não consegue apagar
    //    ninguém — nem a si próprio — e nem sequer o owner consegue apagar o
    //    último owner, por isso a precondição do ataque é inalcançável.
    await expect(
      payload.delete({ collection: 'users', id: admin.id, ...como(admin) }),
    ).rejects.toThrow()
    await expect(
      payload.delete({ collection: 'users', id: dono.id, ...como(dono) }),
    ).rejects.toThrow(/último proprietário/)

    const donos = await payload.count({
      collection: 'users',
      where: { role: { equals: 'owner' } },
    })
    expect(donos.totalDocs).toBe(1)
  })
})
