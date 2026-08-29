# Catálogo no Shopify: o espelho — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O catálogo passa a ser propriedade do Shopify e é espelhado no Postgres por sincronização GraphQL, com a edição fechada no painel Payload e a loja a ler exatamente como hoje.

**Architecture:** Um módulo `apps/api/src/shopify/` lê a Admin API GraphQL e faz upsert nas coleções existentes por um campo novo `shopifyId`. As coleções de catálogo passam a só-leitura e os ~700 linhas de hooks que defendiam o formulário de edição são apagados. O web não muda, exceto a descrição do produto, que deixa de ser Lexical e passa a HTML sanitizado.

**Tech Stack:** Payload 3 (Local API), Postgres, Shopify Admin API GraphQL 2025-07, `fetch` nativo, vitest, `sanitize-html`.

**Spec:** `docs/superpowers/specs/2026-08-29-catalogo-shopify-design.md`

**Nota de faseamento:** este plano funde as Fases 1 e 2 do spec. Mantê-las separadas obrigava a escrever o `espelhar.ts` duas vezes — uma contra os hooks vivos, outra depois de os apagar. A Fase 3 (webhooks e ajuste de inventário pós-venda) fica para um plano próprio.

## Global Constraints

- **Idioma:** todo o código, comentários, mensagens de erro e nomes de variáveis em português europeu, como o resto do repositório.
- **Versão da API Shopify:** `2025-07`, fixa numa constante. Nunca `unstable`.
- **Testes sem mocks de base de dados:** os testes de integração falam com o Postgres real, criam com o prefixo `zteste` e limpam no fim. Só as respostas HTTP do Shopify são fixtures.
- **Segredos:** `SHOPIFY_LOJA`, `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_WEBHOOK_SECRET`. Nenhum leva o prefixo `NEXT_PUBLIC_`.
- **Dinheiro:** cêntimos inteiros, sempre. A conversão de texto para cêntimos é `parseEuros` de `@animora/core` — nunca `parseFloat` seguido de `* 100`.
- **Comandos:** `pnpm --filter @animora/api test` para os testes da API, `pnpm -r typecheck` para os tipos. O Postgres tem de estar de pé (`docker compose up -d`).
- **Commits:** um por tarefa, mensagem em português, prefixo convencional (`feat:`, `refactor:`, `test:`).

---

### Task 1: Campo `shopifyId` nas coleções de catálogo

A chave que liga os dois sistemas. Aditivo: nada parte, tudo continua a funcionar.

**Files:**
- Modify: `apps/api/src/collections/Products.ts`
- Modify: `apps/api/src/collections/Variants.ts`
- Modify: `apps/api/src/collections/Categories.ts`
- Modify: `apps/api/src/collections/Brands.ts`
- Create: `apps/api/src/shopify/campos.ts`
- Test: `apps/api/src/integracao.test.ts`

**Interfaces:**
- Produces: `campoShopifyId: Field` — o campo partilhado pelas quatro coleções.

- [ ] **Step 1: Escrever o campo partilhado**

Criar `apps/api/src/shopify/campos.ts`:

```ts
import type { Field } from 'payload'

/**
 * A única ligação entre este projeto e o Shopify.
 *
 * `unique` não é decoração: é o que torna o upsert do sync seguro. Sem ele,
 * um backfill interrompido a meio e recomeçado duplicava o catálogo inteiro
 * em vez de o reencontrar.
 *
 * Guarda o GID completo (`gid://shopify/Product/123`) e não o número: é o que
 * as respostas da API devolvem e o que as mutações aceitam, e converter nos
 * dois sentidos é uma oportunidade de enganar-se sem nada em troca.
 */
export const campoShopifyId: Field = {
  name: 'shopifyId',
  type: 'text',
  unique: true,
  index: true,
  label: 'ID Shopify',
  admin: {
    readOnly: true,
    description: 'Preenchido pela sincronização. Não editar.',
  },
}
```

- [ ] **Step 2: Escrever o teste que falha**

Acrescentar a `apps/api/src/integracao.test.ts`, dentro do `describe` de produtos:

```ts
it('recusa dois produtos com o mesmo shopifyId', async () => {
  const gid = `gid://shopify/Product/${P}-duplicado`

  await payload.create({
    collection: 'products',
    data: {
      title: 'Zteste shopify um',
      slug: `${P}-shopify-um`,
      brand: marca,
      categories: [categoria],
      gallery: [{ image: imagem }],
      options: [],
      shopifyId: gid,
    },
  })

  await expect(
    payload.create({
      collection: 'products',
      data: {
        title: 'Zteste shopify dois',
        slug: `${P}-shopify-dois`,
        brand: marca,
        categories: [categoria],
        gallery: [{ image: imagem }],
        options: [],
        shopifyId: gid,
      },
    }),
  ).rejects.toThrow()
})
```

- [ ] **Step 3: Correr o teste e confirmar que falha**

Run: `pnpm --filter @animora/api test -- -t "mesmo shopifyId"`
Expected: FAIL — o campo `shopifyId` ainda não existe, por isso o Payload ignora-o e o segundo produto é criado sem erro.

- [ ] **Step 4: Acrescentar o campo às quatro coleções**

Em `Products.ts`, `Variants.ts`, `Categories.ts` e `Brands.ts`, importar e juntar ao array `fields`:

```ts
import { campoShopifyId } from '../shopify/campos'
```

Em `Products.ts` o campo entra no array de topo (fora das `tabs`), a seguir aos `tabs`. Nas outras três, no fim do array `fields`.

- [ ] **Step 5: Correr o teste e confirmar que passa**

Run: `pnpm --filter @animora/api test -- -t "mesmo shopifyId"`
Expected: PASS

- [ ] **Step 6: Correr a bateria toda e o typecheck**

Run: `pnpm --filter @animora/api test && pnpm -r typecheck`
Expected: tudo verde. Nada mais devia ter mudado de comportamento.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shopify/campos.ts apps/api/src/collections apps/api/src/integracao.test.ts
git commit -m "feat(shopify): campo shopifyId nas colecoes de catalogo"
```

---

### Task 2: Cliente GraphQL da Admin API

Um POST com um token. Sem SDK.

**Files:**
- Create: `apps/api/src/shopify/cliente.ts`
- Create: `apps/api/src/shopify/cliente.test.ts`
- Modify: `apps/api/.env.example`

**Interfaces:**
- Produces:
  - `type RespostaGraphQL<T> = { data: T }`
  - `consultarShopify<T>(consulta: string, variaveis?: Record<string, unknown>, buscar?: typeof fetch): Promise<T>`
  - `class ShopifyError extends Error { readonly estado?: number }`
  - `VERSAO_API = '2025-07'`

- [ ] **Step 1: Escrever os testes que falham**

Criar `apps/api/src/shopify/cliente.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { consultarShopify, ShopifyError } from './cliente'

const OK = (dados: unknown) =>
  new Response(JSON.stringify({ data: dados }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('consultarShopify', () => {
  it('envia o token e a versao da API no endereco', async () => {
    const buscar = vi.fn(async () => OK({ shop: { name: 'Animora' } }))

    await consultarShopify('{ shop { name } }', {}, buscar as unknown as typeof fetch)

    const [url, opcoes] = buscar.mock.calls[0]!
    expect(String(url)).toBe('https://exemplo.myshopify.com/admin/api/2025-07/graphql.json')
    expect((opcoes as RequestInit).method).toBe('POST')
    const cabecalhos = (opcoes as RequestInit).headers as Record<string, string>
    expect(cabecalhos['X-Shopify-Access-Token']).toBe('shpat-teste')
  })

  it('devolve o campo data e nao o envelope', async () => {
    const buscar = vi.fn(async () => OK({ shop: { name: 'Animora' } }))

    const resultado = await consultarShopify<{ shop: { name: string } }>(
      '{ shop { name } }',
      {},
      buscar as unknown as typeof fetch,
    )

    expect(resultado).toEqual({ shop: { name: 'Animora' } })
  })

  it('atira quando a resposta traz erros de GraphQL, mesmo com estado 200', async () => {
    const buscar = vi.fn(
      async () =>
        new Response(JSON.stringify({ errors: [{ message: 'Campo desconhecido: bananas' }] }), {
          status: 200,
        }),
    )

    await expect(
      consultarShopify('{ bananas }', {}, buscar as unknown as typeof fetch),
    ).rejects.toThrow(/bananas/)
  })

  it('repete quando o Shopify estrangula e acaba por devolver os dados', async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: [{ extensions: { code: 'THROTTLED' } }] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(OK({ shop: { name: 'Animora' } }))

    const resultado = await consultarShopify<{ shop: { name: string } }>(
      '{ shop { name } }',
      {},
      buscar as unknown as typeof fetch,
    )

    expect(resultado).toEqual({ shop: { name: 'Animora' } })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('desiste depois de tres tentativas estranguladas', async () => {
    const buscar = vi.fn(
      async () =>
        new Response(JSON.stringify({ errors: [{ extensions: { code: 'THROTTLED' } }] }), {
          status: 200,
        }),
    )

    await expect(
      consultarShopify('{ shop { name } }', {}, buscar as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(ShopifyError)
    expect(buscar).toHaveBeenCalledTimes(3)
  })
})
```

O teste precisa das variáveis de ambiente. No topo do ficheiro, antes dos imports do módulo, pôr:

```ts
process.env.SHOPIFY_LOJA = 'exemplo.myshopify.com'
process.env.SHOPIFY_ADMIN_TOKEN = 'shpat-teste'
```

- [ ] **Step 2: Correr os testes e confirmar que falham**

Run: `pnpm --filter @animora/api test -- cliente.test`
Expected: FAIL — `Cannot find module './cliente'`.

- [ ] **Step 3: Escrever o cliente**

Criar `apps/api/src/shopify/cliente.ts`:

```ts
/**
 * O cliente da Admin API do Shopify.
 *
 * É um POST com JSON e um header de token. Um SDK para isto seria uma
 * dependência, uma cadência de atualizações e uma camada de tipos gerados por
 * cima de trinta linhas de `fetch`.
 *
 * `buscar` é injetável só para os testes poderem observar o pedido sem rede.
 * Em produção é sempre o `fetch` global.
 */
const VERSAO_API = '2025-07'

/** Quantas vezes se insiste quando o Shopify estrangula o pedido. */
const TENTATIVAS = 3

export class ShopifyError extends Error {
  constructor(
    message: string,
    readonly estado?: number,
  ) {
    super(message)
    this.name = 'ShopifyError'
  }
}

type Envelope<T> = {
  data?: T
  errors?: { message?: string; extensions?: { code?: string } }[]
}

function ambiente(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new ShopifyError(`Falta a variável de ambiente ${nome}`)
  }
  return valor
}

const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

export async function consultarShopify<T>(
  consulta: string,
  variaveis: Record<string, unknown> = {},
  buscar: typeof fetch = fetch,
): Promise<T> {
  const url = `https://${ambiente('SHOPIFY_LOJA')}/admin/api/${VERSAO_API}/graphql.json`

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const resposta = await buscar(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ambiente('SHOPIFY_ADMIN_TOKEN'),
      },
      body: JSON.stringify({ query: consulta, variables: variaveis }),
    })

    if (!resposta.ok) {
      throw new ShopifyError(`Shopify devolveu ${resposta.status}`, resposta.status)
    }

    const envelope = (await resposta.json()) as Envelope<T>

    // O GraphQL responde 200 mesmo quando falha: os erros vêm no corpo, e um
    // cliente que só olhe para o estado HTTP grava `undefined` no espelho.
    if (envelope.errors?.length) {
      const estrangulado = envelope.errors.some((e) => e.extensions?.code === 'THROTTLED')

      if (estrangulado && tentativa < TENTATIVAS) {
        await espera(2 ** tentativa * 500)
        continue
      }

      const mensagens = envelope.errors.map((e) => e.message ?? e.extensions?.code).join('; ')
      throw new ShopifyError(`Shopify recusou a consulta: ${mensagens}`)
    }

    if (!envelope.data) {
      throw new ShopifyError('Shopify respondeu sem dados nem erros')
    }

    return envelope.data
  }

  throw new ShopifyError(`Shopify estrangulou ${TENTATIVAS} tentativas seguidas`)
}

export { VERSAO_API }
```

- [ ] **Step 4: Correr os testes e confirmar que passam**

Run: `pnpm --filter @animora/api test -- cliente.test`
Expected: PASS, 5 testes.

- [ ] **Step 5: Documentar as variáveis de ambiente**

Acrescentar a `apps/api/.env.example`:

```
# Shopify — catálogo. Token de um custom app com read_products,
# read_inventory e write_inventory. Nunca NEXT_PUBLIC_.
SHOPIFY_LOJA=animora.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_troca-isto
SHOPIFY_WEBHOOK_SECRET=troca-isto
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shopify/cliente.ts apps/api/src/shopify/cliente.test.ts apps/api/.env.example
git commit -m "feat(shopify): cliente da Admin API GraphQL"
```

---

### Task 3: A consulta de catálogo, validada contra a loja real

**Esta tarefa tem um passo manual e é de propósito.** O plano não pode garantir que cada campo existe com este nome na versão 2025-07 — a consulta é validada contra a loja antes de qualquer código depender da sua forma.

**Files:**
- Create: `apps/api/src/shopify/consultas.ts`
- Create: `apps/api/src/shopify/fixtures/produtos.json`
- Create: `apps/api/src/shopify/validar-consulta.ts`

**Interfaces:**
- Produces:
  - `CONSULTA_PRODUTOS: string`
  - `type ProdutoShopify` — o tipo da resposta, consumido por `espelhar.ts`
  - `type PaginaProdutos = { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ProdutoShopify[] } }`

- [ ] **Step 1: Escrever a consulta e os tipos**

Criar `apps/api/src/shopify/consultas.ts`:

```ts
/**
 * As consultas GraphQL, como constantes.
 *
 * Uma página são 250 produtos, o máximo que a Admin API dá de uma vez. As
 * variantes vêm aninhadas: 100 por produto chega folgadamente para este
 * catálogo e evita uma segunda ronda de pedidos por produto.
 *
 * ponytail: paginação simples com cursor. Teto: um catálogo de dezenas de
 * milhares de produtos torna o backfill lento (uma página de cada vez).
 * Quando isso doer, passa a `bulkOperationRunQuery`, que devolve um JSONL
 * de uma vez — mais código e mais estados, sem valor nenhum a esta escala.
 */
export const CONSULTA_PRODUTOS = /* GraphQL */ `
  query Produtos($cursor: String) {
    products(first: 250, after: $cursor, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        descriptionHtml
        vendor
        status
        seo {
          title
          description
        }
        options {
          name
          optionValues {
            name
          }
        }
        collections(first: 20) {
          nodes {
            id
            title
            handle
          }
        }
        media(first: 20) {
          nodes {
            ... on MediaImage {
              id
              alt
              image {
                url
                width
                height
              }
            }
          }
        }
        metafields(first: 20, namespace: "animora") {
          nodes {
            key
            value
          }
        }
        variants(first: 100) {
          nodes {
            id
            sku
            barcode
            price
            compareAtPrice
            inventoryQuantity
            selectedOptions {
              name
              value
            }
            inventoryItem {
              id
              unitCost {
                amount
              }
              measurement {
                weight {
                  value
                  unit
                }
              }
            }
          }
        }
      }
    }
  }
`

export type ImagemShopify = {
  id: string
  alt: string | null
  image: { url: string; width: number | null; height: number | null } | null
}

export type VarianteShopify = {
  id: string
  sku: string | null
  barcode: string | null
  price: string
  compareAtPrice: string | null
  inventoryQuantity: number | null
  selectedOptions: { name: string; value: string }[]
  inventoryItem: {
    id: string
    unitCost: { amount: string } | null
    measurement: { weight: { value: number; unit: string } | null } | null
  } | null
}

export type ProdutoShopify = {
  id: string
  title: string
  handle: string
  descriptionHtml: string | null
  vendor: string | null
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'
  seo: { title: string | null; description: string | null } | null
  options: { name: string; optionValues: { name: string }[] }[]
  collections: { nodes: { id: string; title: string; handle: string }[] }
  media: { nodes: (ImagemShopify | Record<string, never>)[] }
  metafields: { nodes: { key: string; value: string }[] }
  variants: { nodes: VarianteShopify[] }
}

export type PaginaProdutos = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
    nodes: ProdutoShopify[]
  }
}
```

- [ ] **Step 2: Escrever o validador**

Criar `apps/api/src/shopify/validar-consulta.ts`:

```ts
/**
 * Corre a consulta contra a loja real e escreve a primeira página em
 * `fixtures/produtos.json`.
 *
 * Existe porque este plano não pode garantir que cada campo se chama assim na
 * versão 2025-07. Correr isto é a verificação — e a fixture que sai daqui é
 * uma resposta verdadeira, não uma invenção do plano.
 *
 * Uso: pnpm --filter @animora/api shopify:validar
 */
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { consultarShopify } from './cliente'
import { CONSULTA_PRODUTOS, type PaginaProdutos } from './consultas'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const pagina = await consultarShopify<PaginaProdutos>(CONSULTA_PRODUTOS)
const destino = path.join(dirname, 'fixtures', 'produtos.json')

await writeFile(destino, JSON.stringify(pagina, null, 2), 'utf8')

console.log(
  `${pagina.products.nodes.length} produtos escritos em ${destino}. ` +
    `Há mais páginas: ${pagina.products.pageInfo.hasNextPage}`,
)
```

Acrescentar ao `scripts` de `apps/api/package.json`:

```json
"shopify:validar": "payload run src/shopify/validar-consulta.ts"
```

- [ ] **Step 3: Correr contra a loja real**

Run: `pnpm --filter @animora/api shopify:validar`

Expected: escreve `apps/api/src/shopify/fixtures/produtos.json` com produtos verdadeiros.

**Se falhar com `Campo desconhecido: X`:** a consulta precisa de correção para a versão em uso. Consultar `https://shopify.dev/docs/api/admin-graphql/2025-07/objects/Product`, corrigir `CONSULTA_PRODUTOS` e o tipo correspondente em `consultas.ts`, e voltar a correr. **Não avançar para a Task 4 sem esta fixture.** Todo o mapeamento depende da forma real da resposta.

**Se não houver ainda loja Shopify com produtos:** parar aqui e reportar. As tarefas 4 a 6 não podem ser verificadas sem dados reais — é a questão em aberto da secção 11 do spec.

- [ ] **Step 4: Reduzir a fixture ao necessário**

A fixture não precisa de 250 produtos. Editá-la à mão para ficar com **três** produtos que cubram os casos que interessam, mantendo a estrutura intacta:

1. um produto com opções e várias variantes;
2. um produto sem opções (uma variante única, `selectedOptions` com `Title: Default Title`);
3. um produto com `compareAtPrice` preenchido, um metafield `animora` e pelo menos duas imagens.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shopify/consultas.ts apps/api/src/shopify/validar-consulta.ts apps/api/src/shopify/fixtures apps/api/package.json
git commit -m "feat(shopify): consulta de catalogo validada contra a loja"
```

---

### Task 4: O esquema deixa de ser um formulário e passa a ser um espelho

As imagens passam a URLs do CDN, a descrição passa a HTML, e os campos que só existiam para serem escondidos saem. Esta tarefa parte o seed e alguns testes de propósito, e arruma-os na mesma passagem.

**Files:**
- Modify: `apps/api/src/collections/Products.ts`
- Modify: `apps/api/src/collections/Variants.ts`
- Delete: `apps/api/src/collections/Media.ts`
- Modify: `apps/api/payload.config.ts`
- Modify: `apps/api/package.json` (remover `sharp`)
- Modify: `apps/api/src/seed.ts`
- Modify: `apps/api/src/integracao.test.ts`
- Modify: `apps/web/src/modules/catalog/sanitize.ts`
- Modify: `apps/web/src/modules/catalog/sanitize.test.ts`
- Modify: `apps/web/src/modules/catalog/types.ts`

**Interfaces:**
- Produces: o grupo de imagem `{ url: string; alt: string; width?: number; height?: number }`, com a mesma forma que `sanitize.ts` já extrai. `PublicProduct` **não muda**.

- [ ] **Step 1: Escrever o campo de imagem partilhado**

Acrescentar a `apps/api/src/shopify/campos.ts`:

```ts
/**
 * Uma imagem do CDN do Shopify.
 *
 * Era um `upload` para a coleção `media`, com o ficheiro guardado neste
 * projeto e três dimensões geradas pelo sharp. Agora o ficheiro vive no CDN
 * do Shopify e isto guarda o endereço.
 *
 * A forma é exatamente a que o `sanitize.ts` do web já extraía de um upload
 * povoado (`url`, `alt`, `width`, `height`) — é por isso que `PublicProduct`
 * não muda e a loja não dá por nada.
 */
export const camposImagem: Field[] = [
  { name: 'url', type: 'text', required: true, label: 'Endereço' },
  { name: 'alt', type: 'text', required: true, label: 'Texto alternativo' },
  { name: 'width', type: 'number', label: 'Largura' },
  { name: 'height', type: 'number', label: 'Altura' },
]
```

- [ ] **Step 2: Trocar os campos de imagem e a descrição em `Products.ts`**

- `gallery`: continua `type: 'array'`, mas o subcampo `image` passa de `upload` a `{ name: 'image', type: 'group', fields: camposImagem }`.
- `primaryImage` e `shareImage`: passam de `upload` a `{ type: 'group', fields: camposImagem }`.
- `description`: passa de `richText` a `{ name: 'description', type: 'textarea', label: 'Descrição (HTML)' }`.
- Apagar o campo `supplier`.

- [ ] **Step 3: Apagar os campos órfãos de `Variants.ts`**

Apagar `lengthCm`, `widthCm`, `heightCm`, `warehouseLocation` e `shippingWeightG`. Manter `weightG`, `ean` e `costCents` — os três têm origem no Shopify (ver a tabela de mapeamento do spec) e são usados.

- [ ] **Step 4: Tirar a coleção Media e o sharp do config**

Em `apps/api/payload.config.ts`: apagar o import de `Media`, a entrada no array `collections`, o import de `sharp` e a propriedade `sharp` (com o comentário do cast, que deixa de ter assunto). Apagar `apps/api/src/collections/Media.ts` e remover `sharp` das dependências de `apps/api/package.json`.

- [ ] **Step 5: Correr o typecheck para ver tudo o que parte**

Run: `pnpm -r typecheck`
Expected: FAIL, com uma lista de sítios que referenciam `media`, `supplier`, os campos órfãos e a descrição Lexical. Essa lista é a lista de trabalho dos passos seguintes.

- [ ] **Step 6: Arrumar o `sanitize.ts` do web**

Em `apps/web/src/modules/catalog/sanitize.ts`, a lista de campos internos encolhe:

```ts
export const INTERNAL_PRODUCT_FIELDS = [] as const
export const INTERNAL_VARIANT_FIELDS = [
  'ean',
  // O custo de compra vive na VARIANTE, não no produto: um saco de ração de
  // 2 kg e outro de 10 kg são variantes do mesmo produto com custos
  // diferentes. Vem do `unitCost` do InventoryItem do Shopify.
  'costCents',
] as const
```

**`pickImage` não muda uma linha** — verificado: já aceita qualquer objeto com
`url`, `alt`, `width` e `height`, que é exatamente a forma do grupo novo. Era
essa a razão de o espelho reaproveitar esses nomes.

O que muda é `sanitizeVariant`, que perde três campos:

```ts
function sanitizeVariant(raw: Raw): PublicVariant {
  return {
    id: Number(raw.id),
    sku: String(raw.sku ?? ''),
    combination: (raw.combination ?? {}) as Record<string, string>,
    priceCents: Number(raw.priceCents ?? 0),
    oldPriceCents: typeof raw.oldPriceCents === 'number' ? raw.oldPriceCents : null,
    stock: Number(raw.stock ?? 0),
    weightG: typeof raw.weightG === 'number' ? raw.weightG : null,
  }
}
```

E `apps/web/src/modules/catalog/types.ts`, onde `PublicVariant` perde
`lengthCm`, `widthCm` e `heightCm`. Ajustar `sanitize.test.ts`, apagando os
casos que testavam os campos que já não existem.

Se `INTERNAL_PRODUCT_FIELDS` ficar vazio, **não apagar a constante** — é o sítio onde o próximo campo interno de produto se inscreve, e o `sanitize` já a percorre.

- [ ] **Step 7: Arrumar o seed**

A parte de catálogo do `seed.ts` sai: `CATEGORIAS`, `MARCAS`, `ATRIBUTOS`, `PRODUTOS`, `criarProduto`, `gerarImagemProduto`, `deriveOptions`, `paragrafo`, `criarCategorias`, `criarMarcas`, `criarAtributos` e o import de `sharp`.

Ficam os clientes e as encomendas — mas passam a precisar de um catálogo que já esteja no espelho. No `main()`, antes de criar encomendas:

```ts
const { docs: variantesVendaveis } = await payload.find({
  collection: 'variants',
  where: { and: [{ active: { equals: true } }, { stock: { greater_than: 0 } }] },
  depth: 0,
  limit: 100,
})

if (variantesVendaveis.length === 0) {
  throw new Error(
    'O espelho está vazio: corre `pnpm --filter @animora/api shopify:sync` antes do seed. ' +
      'O catálogo é do Shopify; este seeder só cria clientes e encomendas.',
  )
}
```

Actualizar o cabeçalho do ficheiro e a secção do `README.md` que descreve o seeder: já não cria catálogo.

- [ ] **Step 8: Apagar os testes que perderam assunto**

Em `apps/api/src/integracao.test.ts`, apagar os testes que criam `media` e os que exercitam campos apagados. O helper `imagem` deixa de ser um upload e passa a um objeto literal:

```ts
const imagem = {
  url: 'https://cdn.shopify.com/s/files/1/0000/0000/zteste.png',
  alt: 'Imagem de teste',
  width: 1,
  height: 1,
}
```

A constante `PNG` e o `beforeAll` que criava a imagem saem.

- [ ] **Step 9: Correr tudo**

Run: `pnpm -r typecheck && pnpm -r test`
Expected: verde. Se o seed for corrido agora, atira a mensagem do passo 7 — é o comportamento pretendido.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(catalogo): esquema de espelho, imagens do CDN e descricao em HTML"
```

---

### Task 5: `espelhar.ts` — do Shopify para o Payload

O coração. Um produto do Shopify entra, um produto do Payload sai, e correr duas vezes dá o mesmo.

**Files:**
- Create: `apps/api/src/shopify/espelhar.ts`
- Create: `apps/api/src/shopify/espelhar.test.ts`

**Interfaces:**
- Consumes: `ProdutoShopify` (Task 3), `campoShopifyId` (Task 1), `parseEuros` de `@animora/core`.
- Produces:
  - `espelharProduto(payload: Payload, produto: ProdutoShopify): Promise<{ produtoId: Id; variantes: number }>`
  - `garantirMarca(payload: Payload, vendor: string | null): Promise<Id | null>`
  - `garantirCategorias(payload: Payload, colecoes: { id: string; title: string; handle: string }[]): Promise<Id[]>`
  - `combinacaoDaVariante(produto: ProdutoShopify, variante: VarianteShopify): Record<string, string>`

- [ ] **Step 1: Escrever os testes que falham**

Criar `apps/api/src/shopify/espelhar.test.ts`. Usa o Postgres real, com o prefixo `zteste`, e a fixture da Task 3:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '../../payload.config'
import { espelharProduto, combinacaoDaVariante } from './espelhar'
import type { PaginaProdutos, ProdutoShopify } from './consultas'
import fixture from './fixtures/produtos.json' assert { type: 'json' }

const P = 'zteste'
let payload: Payload

/** A fixture é uma resposta real; prefixa-se para não colidir com o catálogo. */
function comPrefixo(produto: ProdutoShopify, sufixo: string): ProdutoShopify {
  return {
    ...produto,
    id: `gid://shopify/Product/${P}-${sufixo}`,
    handle: `${P}-${sufixo}`,
    title: `Zteste ${produto.title}`,
    variants: {
      nodes: produto.variants.nodes.map((v, i) => ({
        ...v,
        id: `gid://shopify/ProductVariant/${P}-${sufixo}-${i}`,
        sku: `${P}-${sufixo}-${i}`,
      })),
    },
  }
}

const pagina = fixture as unknown as PaginaProdutos
const comOpcoes = comPrefixo(pagina.products.nodes[0]!, 'opcoes')

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const colecao of ['variants', 'products', 'categories', 'brands'] as const) {
    await payload.delete({
      collection: colecao,
      where: { shopifyId: { like: P } },
    })
  }
  await payload.destroy()
})

describe('espelharProduto', () => {
  it('cria o produto, a marca, as categorias e as variantes', async () => {
    const { produtoId, variantes } = await espelharProduto(payload, comOpcoes)

    expect(variantes).toBe(comOpcoes.variants.nodes.length)

    const produto = await payload.findByID({ collection: 'products', id: produtoId, depth: 1 })
    expect(produto.slug).toBe(comOpcoes.handle)
    expect(produto.shopifyId).toBe(comOpcoes.id)
    expect(produto._status).toBe('published')
  })

  it('corre duas vezes sem duplicar nada', async () => {
    const primeira = await espelharProduto(payload, comOpcoes)
    const segunda = await espelharProduto(payload, comOpcoes)

    expect(segunda.produtoId).toBe(primeira.produtoId)

    const { totalDocs } = await payload.find({
      collection: 'variants',
      where: { 'product.shopifyId': { equals: comOpcoes.id } },
      limit: 0,
    })
    expect(totalDocs).toBe(comOpcoes.variants.nodes.length)
  })

  it('converte preços para cêntimos inteiros sem passar por vírgula flutuante', async () => {
    const produto = comPrefixo(pagina.products.nodes[0]!, 'precos')
    produto.variants.nodes[0]!.price = '12.90'
    produto.variants.nodes[0]!.compareAtPrice = '19.99'

    await espelharProduto(payload, produto)

    const { docs } = await payload.find({
      collection: 'variants',
      where: { shopifyId: { equals: produto.variants.nodes[0]!.id } },
      limit: 1,
    })
    expect(docs[0]!.priceCents).toBe(1290)
    expect(docs[0]!.oldPriceCents).toBe(1999)
  })

  it('desativa a variante que desapareceu do Shopify, sem a apagar', async () => {
    const produto = comPrefixo(pagina.products.nodes[0]!, 'removida')
    if (produto.variants.nodes.length < 2) {
      throw new Error('A fixture precisa de um produto com duas variantes — ver Task 3')
    }

    await espelharProduto(payload, produto)
    const desaparecida = produto.variants.nodes[1]!

    // O Shopify deixa de a devolver: foi apagada lá.
    await espelharProduto(payload, {
      ...produto,
      variants: { nodes: [produto.variants.nodes[0]!] },
    })

    const { docs } = await payload.find({
      collection: 'variants',
      where: { shopifyId: { equals: desaparecida.id } },
      limit: 1,
    })

    // Continua a existir — uma encomenda antiga pode referenciá-la — mas já
    // não se vende.
    expect(docs).toHaveLength(1)
    expect(docs[0]!.active).toBe(false)
  })

  it('despublica quando o produto deixa de estar ACTIVE no Shopify', async () => {
    const produto = comPrefixo(pagina.products.nodes[0]!, 'arquivado')
    const { produtoId } = await espelharProduto(payload, produto)

    await espelharProduto(payload, { ...produto, status: 'ARCHIVED' })

    const depois = await payload.findByID({ collection: 'products', id: produtoId })
    expect(depois._status).toBe('draft')
  })
})

describe('combinacaoDaVariante', () => {
  it('ignora a opção artificial de um produto sem opções', () => {
    const produto = pagina.products.nodes.find((p) => p.options.length === 0)
    if (!produto) throw new Error('A fixture precisa de um produto sem opções — ver Task 3')

    const combinacao = combinacaoDaVariante(produto, produto.variants.nodes[0]!)

    expect(combinacao).toEqual({})
  })

  it('junta os metafields do produto às opções da variante', () => {
    const produto = {
      ...pagina.products.nodes[0]!,
      metafields: { nodes: [{ key: 'porte', value: 'Grande' }] },
    }
    const variante = {
      ...produto.variants.nodes[0]!,
      selectedOptions: [{ name: 'Tamanho', value: 'M' }],
    }

    expect(combinacaoDaVariante(produto, variante)).toEqual({ Tamanho: 'M', porte: 'Grande' })
  })
})
```

- [ ] **Step 2: Correr os testes e confirmar que falham**

Run: `pnpm --filter @animora/api test -- espelhar.test`
Expected: FAIL — `Cannot find module './espelhar'`.

- [ ] **Step 3: Escrever o `espelhar.ts`**

Criar `apps/api/src/shopify/espelhar.ts`:

```ts
/**
 * Um produto do Shopify escrito nas coleções deste projeto.
 *
 * Não sabe de onde veio o produto: serve o backfill e (na fase seguinte) os
 * webhooks pela mesma porta. Toda a escrita é upsert por `shopifyId` — é o
 * que torna correr isto duas vezes indistinguível de correr uma.
 */
import type { Payload } from 'payload'
import { parseEuros } from '@animora/core'

import type { ImagemShopify, ProdutoShopify, VarianteShopify } from './consultas'

type Id = string | number

/**
 * O Shopify dá sempre uma opção a um produto que não tem nenhuma:
 * `Title: Default Title`. Espelhá-la enchia as facetas da loja com um filtro
 * "Title" que não quer dizer nada.
 */
const OPCAO_ARTIFICIAL = 'Title'

/** `"12.90"` → `1290`. Ver `parseEuros`: nunca passa por vírgula flutuante. */
function centimos(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  return parseEuros(valor)
}

function primeiraImagem(produto: ProdutoShopify): ImagemShopify | null {
  for (const no of produto.media.nodes) {
    if ('image' in no && no.image) return no as ImagemShopify
  }
  return null
}

function paraImagem(media: ImagemShopify, tituloProduto: string) {
  return {
    url: media.image!.url,
    // O `alt` é obrigatório no esquema e o do Shopify é opcional. Um alt
    // vazio numa fotografia de produto é pior do que um alt genérico: o
    // leitor de ecrã anuncia "imagem" e o cliente não sabe do que se trata.
    alt: media.alt?.trim() || `Fotografia do produto ${tituloProduto}`,
    width: media.image!.width ?? undefined,
    height: media.image!.height ?? undefined,
  }
}

export function combinacaoDaVariante(
  produto: ProdutoShopify,
  variante: VarianteShopify,
): Record<string, string> {
  const combinacao: Record<string, string> = {}

  for (const opcao of variante.selectedOptions) {
    if (opcao.name === OPCAO_ARTIFICIAL) continue
    combinacao[opcao.name] = opcao.value
  }

  // ponytail: os atributos de produto (Animal de destino, Porte) são copiados
  // para a combinação de TODAS as variantes. Teto: repete o mesmo par por
  // variante e um produto com muitas variantes multiplica-o. É o que mantém
  // `facets.ts` no web sem uma linha de alteração — ver secção 5.2 do spec.
  // Passa a atributos ao nível do produto quando as facetas justificarem a
  // reescrita.
  for (const metafield of produto.metafields.nodes) {
    combinacao[metafield.key] = metafield.value
  }

  return combinacao
}

/** Encontra por `shopifyId` e cria se faltar. Devolve sempre o id do Payload. */
async function garantir(
  payload: Payload,
  collection: 'brands' | 'categories',
  shopifyId: string,
  dados: Record<string, unknown>,
): Promise<Id> {
  const { docs } = await payload.find({
    collection,
    where: { shopifyId: { equals: shopifyId } },
    depth: 0,
    limit: 1,
  })

  if (docs[0]) {
    const existente = docs[0]
    await payload.update({ collection, id: existente.id, data: dados })
    return existente.id
  }

  const criado = await payload.create({ collection, data: { ...dados, shopifyId } })
  return criado.id
}

export async function garantirMarca(payload: Payload, vendor: string | null): Promise<Id | null> {
  if (!vendor?.trim()) return null

  // O `vendor` do Shopify é texto livre, não uma entidade com id — o nome é a
  // identidade, e é dele que sai a chave.
  const nome = vendor.trim()
  const slug = slugificar(nome)

  return garantir(payload, 'brands', `vendor:${slug}`, { name: nome, slug })
}

export async function garantirCategorias(
  payload: Payload,
  colecoes: { id: string; title: string; handle: string }[],
): Promise<Id[]> {
  const ids: Id[] = []
  for (const colecao of colecoes) {
    ids.push(
      await garantir(payload, 'categories', colecao.id, {
        name: colecao.title,
        slug: colecao.handle,
      }),
    )
  }
  return ids
}

function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function espelharProduto(
  payload: Payload,
  produto: ProdutoShopify,
): Promise<{ produtoId: Id; variantes: number }> {
  const marca = await garantirMarca(payload, produto.vendor)
  const categorias = await garantirCategorias(payload, produto.collections.nodes)
  const capa = primeiraImagem(produto)

  const galeria = produto.media.nodes
    .filter((no): no is ImagemShopify => 'image' in no && Boolean(no.image))
    .map((media) => ({ image: paraImagem(media, produto.title) }))

  const dados = {
    title: produto.title,
    slug: produto.handle,
    description: produto.descriptionHtml ?? '',
    ...(marca ? { brand: marca } : {}),
    categories: categorias,
    options: produto.options
      .filter((o) => o.name !== OPCAO_ARTIFICIAL)
      .map((o) => ({ name: o.name, values: o.optionValues.map((v) => ({ value: v.name })) })),
    gallery: galeria,
    ...(capa ? { primaryImage: paraImagem(capa, produto.title) } : {}),
    metaTitle: produto.seo?.title ?? null,
    metaDescription: produto.seo?.description ?? null,
    // Só um produto ACTIVE no Shopify está à venda aqui. Arquivar ou pôr em
    // rascunho lá tem de o tirar da loja — senão o espelho vende o que a
    // fonte já retirou.
    _status: produto.status === 'ACTIVE' ? 'published' : 'draft',
  }

  const { docs } = await payload.find({
    collection: 'products',
    where: { shopifyId: { equals: produto.id } },
    depth: 0,
    limit: 1,
  })

  const produtoId = docs[0]
    ? (await payload.update({ collection: 'products', id: docs[0].id, data: dados })).id
    : (await payload.create({ collection: 'products', data: { ...dados, shopifyId: produto.id } }))
        .id

  let variantes = 0
  for (const variante of produto.variants.nodes) {
    await espelharVariante(payload, produto, variante, produtoId)
    variantes++
  }

  await desativarVariantesDesaparecidas(payload, produtoId, produto.variants.nodes)

  return { produtoId, variantes }
}

/**
 * Uma variante apagada no Shopify deixa de vir na resposta — e sem isto ficava
 * no espelho para sempre, ativa e à venda. O sync é a única coisa que a pode
 * apanhar: ninguém mais olha para ela outra vez.
 *
 * Desativar, nunca apagar: uma encomenda antiga referencia a variante que
 * vendeu, e apagá-la partia o histórico e o dashboard.
 */
async function desativarVariantesDesaparecidas(
  payload: Payload,
  produtoId: Id,
  vivas: VarianteShopify[],
): Promise<void> {
  const idsVivos = new Set(vivas.map((v) => v.id))

  const { docs } = await payload.find({
    collection: 'variants',
    where: { and: [{ product: { equals: produtoId } }, { active: { equals: true } }] },
    depth: 0,
    limit: 0,
  })

  for (const doc of docs) {
    if (idsVivos.has(String(doc.shopifyId))) continue
    await payload.update({
      collection: 'variants',
      id: doc.id,
      data: { active: false, stock: 0 },
    })
  }
}

async function espelharVariante(
  payload: Payload,
  produto: ProdutoShopify,
  variante: VarianteShopify,
  produtoId: Id,
): Promise<void> {
  const peso = variante.inventoryItem?.measurement?.weight ?? null

  const dados = {
    product: produtoId,
    combination: combinacaoDaVariante(produto, variante),
    sku: variante.sku ?? variante.id,
    priceCents: centimos(variante.price) ?? 0,
    oldPriceCents: centimos(variante.compareAtPrice),
    stock: variante.inventoryQuantity ?? 0,
    active: true,
    ean: variante.barcode ?? null,
    costCents: centimos(variante.inventoryItem?.unitCost?.amount),
    weightG: peso ? emGramas(peso.value, peso.unit) : null,
  }

  const { docs } = await payload.find({
    collection: 'variants',
    where: { shopifyId: { equals: variante.id } },
    depth: 0,
    limit: 1,
  })

  if (docs[0]) {
    await payload.update({ collection: 'variants', id: docs[0].id, data: dados })
    return
  }

  await payload.create({ collection: 'variants', data: { ...dados, shopifyId: variante.id } })
}

/** O Shopify dá o peso na unidade que o gestor escolheu; aqui é sempre grama. */
function emGramas(valor: number, unidade: string): number {
  switch (unidade) {
    case 'GRAMS':
      return Math.round(valor)
    case 'KILOGRAMS':
      return Math.round(valor * 1000)
    case 'OUNCES':
      return Math.round(valor * 28.3495)
    case 'POUNDS':
      return Math.round(valor * 453.592)
    default:
      throw new Error(`Unidade de peso desconhecida do Shopify: ${unidade}`)
  }
}
```

- [ ] **Step 4: Correr os testes e confirmar que passam**

Run: `pnpm --filter @animora/api test -- espelhar.test`
Expected: PASS, 6 testes.

Se o teste de despublicar falhar porque `blockDeleteIfPublished` ou `validatePublish` recusam a transição, **não contornar o hook** — a Task 6 apaga-o. Marcar o teste com `it.skip` e uma linha a dizer porquê, e desmarcá-lo no fim da Task 6.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shopify/espelhar.ts apps/api/src/shopify/espelhar.test.ts
git commit -m "feat(shopify): espelhar produtos, variantes, marcas e categorias"
```

---

### Task 6: `sync.ts` e o comando de backfill

**Files:**
- Create: `apps/api/src/shopify/sync.ts`
- Modify: `apps/api/package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `consultarShopify`, `CONSULTA_PRODUTOS`, `PaginaProdutos`, `espelharProduto`.
- Produces: `sincronizarCatalogo(payload: Payload): Promise<{ produtos: number; variantes: number; paginas: number }>`

- [ ] **Step 1: Escrever o sync**

Criar `apps/api/src/shopify/sync.ts`:

```ts
/**
 * O backfill do catálogo, e a reconciliação.
 *
 * É o mesmo caminho para as duas coisas: percorre o catálogo do Shopify
 * página a página e espelha cada produto. Como o `espelharProduto` é upsert
 * por `shopifyId`, correr isto sobre um espelho já cheio corrige-o em vez de
 * o duplicar — é para isso que serve quando se desconfia dos números.
 *
 * Uso: pnpm --filter @animora/api shopify:sync
 */
import { getPayload, type Payload } from 'payload'

import config from '../../payload.config'
import { consultarShopify } from './cliente'
import { CONSULTA_PRODUTOS, type PaginaProdutos } from './consultas'
import { espelharProduto } from './espelhar'

export async function sincronizarCatalogo(
  payload: Payload,
): Promise<{ produtos: number; variantes: number; paginas: number }> {
  let cursor: string | null = null
  let produtos = 0
  let variantes = 0
  let paginas = 0

  do {
    const pagina: PaginaProdutos = await consultarShopify<PaginaProdutos>(CONSULTA_PRODUTOS, {
      cursor,
    })
    paginas++

    for (const produto of pagina.products.nodes) {
      const resultado = await espelharProduto(payload, produto)
      produtos++
      variantes += resultado.variantes
      console.log(`  ${produto.handle} (${resultado.variantes} variantes)`)
    }

    cursor = pagina.products.pageInfo.hasNextPage ? pagina.products.pageInfo.endCursor : null
  } while (cursor)

  return { produtos, variantes, paginas }
}

const payload = await getPayload({ config })

try {
  console.log('A sincronizar o catálogo do Shopify...')
  const resumo = await sincronizarCatalogo(payload)
  console.log(
    `\nConcluído: ${resumo.produtos} produtos, ${resumo.variantes} variantes, ` +
      `${resumo.paginas} página(s).`,
  )
} finally {
  await payload.destroy()
}
```

- [ ] **Step 2: Registar o comando**

Em `apps/api/package.json`, no `scripts`:

```json
"shopify:sync": "payload run src/shopify/sync.ts"
```

- [ ] **Step 3: Correr o backfill a sério**

Run: `pnpm --filter @animora/api shopify:sync`
Expected: lista os produtos e termina com o resumo. Sem erros.

- [ ] **Step 4: Correr outra vez e confirmar que não duplica**

Run: `pnpm --filter @animora/api shopify:sync`
Expected: o mesmo número de produtos e variantes da primeira corrida. É a idempotência a ser verificada contra a base real, não contra uma fixture.

- [ ] **Step 5: Ver a loja**

Run: `pnpm --filter @animora/web dev` e abrir `/produtos`.
Expected: o catálogo do Shopify, com imagens do CDN.

Se as imagens não carregarem com erro do otimizador, é o `remotePatterns` — está na Task 8. Confirmar que os produtos e preços aparecem e seguir.

- [ ] **Step 6: Actualizar o README**

Na secção "Arrancar", o passo do seed passa a dois:

```bash
pnpm --filter @animora/api shopify:sync   # catálogo, do Shopify
pnpm seed                                  # clientes e encomendas de demonstração
```

E a secção "Seeder" passa a dizer o que o seeder é agora: clientes e encomendas sobre o catálogo espelhado, e que exige o sync antes.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shopify/sync.ts apps/api/package.json README.md
git commit -m "feat(shopify): backfill e reconciliacao do catalogo"
```

---

### Task 7: A edição fecha e os hooks saem

~700 linhas que defendiam um formulário que já ninguém usa.

**Files:**
- Modify: `apps/api/src/collections/Products.ts`, `Variants.ts`, `Categories.ts`, `Brands.ts`
- Delete: `apps/api/src/hooks/syncVariants.ts`, `validatePublish.ts`, `blockOffMatrix.ts`, `ajustarStock.ts`, `uniqueSlug.ts`, `blockDeleteIfPublished.ts`
- Modify: `apps/api/src/hooks/blockUnsellable.ts`
- Modify: `apps/api/src/integracao.test.ts`
- Create: `apps/api/src/shopify/acesso.ts`

**Interfaces:**
- Produces: `soLeitura` — negação de create/update/delete para as coleções espelhadas.
- Preserva: `idDaRelacao`, hoje exportado de `blockUnsellable.ts` e importado por `checkout.ts` e `dashboard.ts`. **A assinatura não muda.**

- [ ] **Step 1: Escrever a guarda de só-leitura**

Criar `apps/api/src/shopify/acesso.ts`:

```ts
import type { Access } from 'payload'

/**
 * As coleções espelhadas não se editam aqui.
 *
 * A negação é no acesso e não só na interface: esconder os botões deixava a
 * REST e a Local API abertas, e uma escrita que passasse por aí seria
 * silenciosamente revertida pelo próximo sync — o pior dos dois mundos, um
 * campo que aceita a alteração e a perde sem avisar.
 *
 * A leitura fica como está: é dela que a loja vive.
 */
export const soLeitura: Access = () => false
```

- [ ] **Step 2: Escrever o teste que falha**

Acrescentar a `apps/api/src/integracao.test.ts`:

```ts
it('recusa criar produtos pela API: o catálogo é do Shopify', async () => {
  // Cria o seu próprio owner, com o prefixo do ficheiro. O teste de escalada
  // de privilégios faz o mesmo (`criarConta`) e pela mesma razão: atacar o
  // owner verdadeiro deixava rasto na base de desenvolvimento.
  const owner = await payload.create({
    collection: 'users',
    data: {
      email: `${P}-so-leitura@animora.pt`,
      password: 'animora123',
      role: 'owner',
    },
  })

  await expect(
    payload.create({
      collection: 'products',
      data: { title: 'Zteste manual', slug: `${P}-manual`, options: [] },
      overrideAccess: false,
      user: { ...owner, collection: 'users' } as never,
    }),
  ).rejects.toThrow()

  await payload.delete({ collection: 'users', id: owner.id })
})
```

O utilizador é um `owner` de propósito: o ponto é que **nem o dono da loja**
consegue escrever no catálogo por aqui.

- [ ] **Step 3: Correr e confirmar que falha**

Run: `pnpm --filter @animora/api test -- -t "catálogo é do Shopify"`
Expected: FAIL — o produto é criado.

- [ ] **Step 4: Fechar as quatro coleções**

Em cada uma das quatro, no objeto de configuração:

```ts
access: {
  read: <o que já lá está>,
  create: soLeitura,
  update: soLeitura,
  delete: soLeitura,
},
```

Manter a função de leitura existente intacta. Nos `admin`, acrescentar `description` a dizer que o catálogo vem do Shopify e onde se edita.

**A Local API do sync ignora o acesso por omissão** (`overrideAccess` é `true` quando não se passa `req`), por isso o `espelhar.ts` continua a escrever. É por isso que o teste do passo 2 passa `overrideAccess: false`.

- [ ] **Step 5: Correr e confirmar que passa**

Run: `pnpm --filter @animora/api test -- -t "catálogo é do Shopify"`
Expected: PASS

- [ ] **Step 6: Preservar o `idDaRelacao` e encolher o `blockUnsellable`**

`checkout.ts` e `dashboard.ts` importam `idDaRelacao` de `hooks/blockUnsellable`. Mover essa função para `apps/api/src/hooks/relacoes.ts`, com o mesmo corpo e a mesma assinatura, e actualizar os dois imports.

Do `blockUnsellable.ts` fica **só** o que o checkout usa. Tudo o que era guarda de edição do painel (o `beforeDelete`, o conjunto `SEM_VENDA`, a interação com `syncVariants`) sai.

- [ ] **Step 7: Apagar os seis hooks**

```bash
git rm apps/api/src/hooks/syncVariants.ts \
       apps/api/src/hooks/validatePublish.ts \
       apps/api/src/hooks/blockOffMatrix.ts \
       apps/api/src/hooks/ajustarStock.ts \
       apps/api/src/hooks/uniqueSlug.ts \
       apps/api/src/hooks/blockDeleteIfPublished.ts
```

Apagar os registos de hooks correspondentes em `Products.ts`, `Variants.ts`, `Categories.ts`, `Brands.ts` e `globals/ConfiguracaoFiltros.ts`, e o campo `ajusteStock` de `Variants.ts`.

**`hooks/serializar.ts` fica.** O `checkout.ts` depende dele — é o lock que serializa as vendas, e não tem nada que ver com o formulário de edição.

- [ ] **Step 8: Apagar os testes que perderam assunto**

Em `integracao.test.ts`, apagar os blocos que exercitam sincronização de variantes, gravação de rascunho sobre publicado, publicação com opções alteradas e atribuição concorrente de SKU. **Manter** os de checkout, concorrência de venda e escalada de privilégios: continuam a valer.

Actualizar o cabeçalho do ficheiro, que hoje descreve os defeitos da fase 1 como razão de existir.

- [ ] **Step 9: Desmarcar o teste adiado da Task 5**

Se o teste de despublicar ficou `it.skip`, tirar o `skip` agora.

- [ ] **Step 10: Correr tudo**

Run: `pnpm -r typecheck && pnpm -r test`
Expected: verde.

- [ ] **Step 11: Correr o sync outra vez**

Run: `pnpm --filter @animora/api shopify:sync`
Expected: continua a funcionar sem os hooks — e agora as variantes são criadas pelo `espelhar.ts` e não geradas pelo `syncVariants`. Confirmar que o número de variantes bate com o da Task 6.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor(catalogo): so-leitura nas colecoes espelhadas, hooks de edicao apagados"
```

---

### Task 8: O web recebe HTML em vez de Lexical

**Files:**
- Modify: `apps/web/src/app/[locale]/produto/[slug]/page.tsx`
- Delete: `apps/web/src/lib/richtext.ts`, `apps/web/src/lib/richtext.test.ts`
- Create: `apps/web/src/lib/descricao.ts`
- Create: `apps/web/src/lib/descricao.test.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.mjs`

**Interfaces:**
- Produces: `descricaoSegura(html: unknown): string | null` — substitui `descriptionToHtml`, com a mesma forma de retorno (`null` quando não há descrição, para a página não desenhar uma secção vazia).

- [ ] **Step 1: Instalar a dependência**

```bash
pnpm --filter @animora/web add sanitize-html
pnpm --filter @animora/web add -D @types/sanitize-html
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `apps/web/src/lib/descricao.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { descricaoSegura } from './descricao'

describe('descricaoSegura', () => {
  it('devolve null quando não há descrição', () => {
    expect(descricaoSegura(null)).toBeNull()
    expect(descricaoSegura('')).toBeNull()
    expect(descricaoSegura('   ')).toBeNull()
  })

  it('mantém a formatação que o Shopify usa', () => {
    const html = '<p>Ração <strong>premium</strong></p><ul><li>2 kg</li></ul>'
    expect(descricaoSegura(html)).toBe(html)
  })

  it('remove script', () => {
    const resultado = descricaoSegura('<p>ok</p><script>alert(1)</script>')
    expect(resultado).toBe('<p>ok</p>')
  })

  it('remove atributos de evento', () => {
    const resultado = descricaoSegura('<p onclick="roubar()">ok</p>')
    expect(resultado).toBe('<p>ok</p>')
  })

  it('remove href com javascript:', () => {
    const resultado = descricaoSegura('<a href="javascript:alert(1)">clica</a>')
    expect(resultado).not.toContain('javascript:')
  })

  it('remove iframe', () => {
    expect(descricaoSegura('<iframe src="https://mau.exemplo"></iframe>')).toBe('')
  })
})
```

- [ ] **Step 3: Correr e confirmar que falham**

Run: `pnpm --filter @animora/web test -- descricao.test`
Expected: FAIL — `Cannot find module './descricao'`.

- [ ] **Step 4: Escrever o sanitizador**

Criar `apps/web/src/lib/descricao.ts`:

```ts
import sanitizeHtml from 'sanitize-html'

/**
 * A descrição do produto, vinda do Shopify, pronta para o DOM.
 *
 * Antes era Lexical, e o `convertLexicalToHTML` garantia o HTML seguro por
 * construção: só percorria nós conhecidos e escapava texto e endereços. Agora
 * o HTML chega feito, de um sistema que não é este — a garantia tem de ser
 * explícita, e é esta função.
 *
 * A lista é de permissões, nunca de proibições: o que não estiver aqui não
 * passa. Uma lista de proibições fica sempre atrás do próximo vetor.
 */
const PERMITIDO = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li',
    'h2', 'h3', 'h4',
    'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
  },
  // Sem `javascript:` nem `data:`, que é como um href se torna executável.
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // Um link de descrição de produto sai do site: `noopener` impede a página
    // de destino de mexer nesta pela `window.opener`.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener nofollow', target: '_blank' }),
  },
}

export function descricaoSegura(html: unknown): string | null {
  if (typeof html !== 'string' || !html.trim()) return null
  return sanitizeHtml(html, PERMITIDO)
}
```

- [ ] **Step 5: Correr e confirmar que passam**

Run: `pnpm --filter @animora/web test -- descricao.test`
Expected: PASS, 6 testes.

O teste "mantém a formatação" pode falhar por causa do `transformTags` acrescentar `rel`/`target` a `<a>` — não há `<a>` nesse caso, por isso deve passar tal como está escrito. Se falhar por espaços ou aspas, ajustar o **teste** ao que o `sanitize-html` produz, nunca afrouxar a lista de permissões.

- [ ] **Step 6: Trocar na ficha de produto**

Em `apps/web/src/app/[locale]/produto/[slug]/page.tsx`:

```ts
import { descricaoSegura } from '../../../../lib/descricao'
```

e

```ts
const descricaoHtml = descricaoSegura(p.description)
```

O resto da página não muda: `descricaoHtml` continua a ser `string | null` e a ir para o mesmo `dangerouslySetInnerHTML`.

- [ ] **Step 7: Apagar o Lexical do web**

```bash
git rm apps/web/src/lib/richtext.ts apps/web/src/lib/richtext.test.ts
pnpm --filter @animora/web remove @payloadcms/richtext-lexical
```

- [ ] **Step 8: Autorizar o CDN do Shopify no otimizador de imagens**

Em `apps/web/next.config.mjs`, dentro de `images.remotePatterns`:

```js
{ protocol: 'https', hostname: 'cdn.shopify.com' },
```

Sem isto, o `next/image` recusa as imagens do catálogo com 400 — o mesmo defeito que o comentário do `mediaUrl` em `lib/api.ts` descreve, noutro sítio.

- [ ] **Step 9: Correr tudo e ver a loja**

Run: `pnpm -r typecheck && pnpm -r test`
Expected: verde.

Run: `pnpm --filter @animora/web dev`, abrir `/produtos` e uma ficha de produto.
Expected: catálogo do Shopify com imagens do CDN a carregar, e a descrição formatada na ficha.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(loja): descricao em HTML sanitizado e imagens do CDN do Shopify"
```

---

## Verificação final

- [ ] `docker compose up -d && pnpm -r typecheck && pnpm -r test` — tudo verde
- [ ] `pnpm --filter @animora/api shopify:sync` duas vezes seguidas — mesmos números
- [ ] `pnpm seed` — cria clientes e encomendas sobre o catálogo espelhado
- [ ] Painel em `/admin`: os produtos vêem-se, não se editam; não há botão de criar
- [ ] Painel em `/admin/vendas`: o dashboard continua a dar números
- [ ] Loja: `/produtos` filtra e ordena, a ficha mostra descrição e imagens, `/de` continua bilingue
- [ ] Uma compra de ponta a ponta pelo checkout, e a encomenda aparece no painel

## O que fica para o plano seguinte (Fase 3 do spec)

Webhooks com verificação HMAC, o ajuste de inventário no Shopify a seguir a cada venda e a fila `ajustes_pendentes`. **Até lá o espelho só está fresco depois de correr o sync à mão, e o Shopify não sabe das vendas feitas por este checkout** — é exatamente o furo descrito na secção 3 do spec, e fica aberto durante este plano.
