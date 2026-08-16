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
import { protectLastOwner } from './collections/Users'

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

  it('o último proprietário não pode ser apagado', async () => {
    // A outra metade do caminho 5: mesmo o owner não pode esvaziar a tabela.
    //
    // Testado com um `req` de fachada, e não contra a base de dados, porque a
    // guarda só dispara quando existe exatamente UM owner — e a base de
    // desenvolvimento tem sempre lá o legítimo. Chegar a "um só owner" com uma
    // conta descartável obrigava a apagar a conta real, que é exatamente o que
    // estes testes não podem fazer. O que se verifica aqui é a decisão da
    // guarda; que ela está ligada à coleção vê-se em `Users.ts`.
    const args = (donos: { id: Id }[], id: Id) =>
      ({
        id,
        req: { payload: { find: async () => ({ docs: donos }) } },
      }) as unknown as Parameters<typeof protectLastOwner>[0]

    await expect(protectLastOwner(args([{ id: 1 }], 1))).rejects.toThrow(/último proprietário/)
    // Controlo: com outro owner na tabela, apagar é legítimo e passa.
    await expect(protectLastOwner(args([{ id: 1 }, { id: 2 }], 1))).resolves.toBeUndefined()
  })
})
