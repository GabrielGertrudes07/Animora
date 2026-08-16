# Carrinho, Contas e Encomendas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir comprar. Carrinho que sobrevive à sessão, contas de cliente, e encomendas que registam o que foi vendido e a que preço, com o stock a descer exatamente uma vez.

**Architecture:** O carrinho de convidado vive no browser; ao entrar na conta funde com o do servidor. **O servidor nunca aceita preços vindos do cliente** — recalcula tudo a partir da base de dados. A encomenda congela cópia do título, SKU, preço e custo no momento da compra. O stock desce numa transação serializada, com a mesma ferramenta que a fase 1 usou para as guardas.

**Tech Stack:** Next.js 15 (App Router), Payload CMS 3.88, Postgres, TypeScript strict, `@animora/core` para dinheiro.

**Spec:** `docs/spec-animora.md`
**Planos anteriores:** `docs/superpowers/plans/2026-08-15-fundacao-catalogo-admin.md`, `docs/superpowers/plans/2026-08-15-loja-catalogo-ficha.md`

## Global Constraints

- TypeScript `"strict": true`
- **Dinheiro SEMPRE em inteiros de cêntimos.** Nunca decimais, nunca float. `2990` = 29,90 €
- Mercado **Portugal**: EUR, `pt-PT`, código postal `NNNN-NNN`, IVA 23%
- **Envio grátis a partir de 50 € (5000 cêntimos); abaixo disso, 4,99 € (499 cêntimos)**
- Stock inteiro, nunca negativo
- **O cliente nunca envia preços.** Envia identificadores e quantidades; o servidor calcula
- Nenhum módulo importa ficheiros internos de outro, só o `index.ts`
- Commits em português, `tipo: descrição`

---

## O que as fases 1 e 2 ensinaram, e que esta fase não pode redescobrir

Cada um destes custou pelo menos uma ronda de correção.

1. **Guardas que "contam irmãos e depois decidem" são atravessadas.** O Payload processa lotes em paralelo na mesma transação; qualquer verificação do tipo "conta quantos restam, decide" falha sob concorrência. Apareceu **cinco vezes** na fase 1. Existe `apps/api/src/hooks/serializar.ts` com as duas metades resolvidas — lock consultivo para o caminho entre pedidos, reserva em `req.context` para o caminho dentro do pedido. **Usa-o. Não reinventes.**
2. **Abrir `access.read` numa coleção abre todos os campos dela.** Foi assim que o custo de compra e os fornecedores ficaram públicos na fase 2. Access por campo é obrigatório em tudo o que for sensível — e os dados de cliente são todos sensíveis.
3. **Um comentário que afirma segurança sem a verificar é pior que nenhum comentário.** Aconteceu duas vezes neste projeto; da primeira cegou uma ronda inteira de revisão. Se escreveres "isto está protegido porque X", tem de haver um teste a provar X.
4. **`limit: 0` no Payload significa "sem limite"**, não zero resultados.
5. **`depth=0` devolve relações como ids**; sem ele vêm como objetos.
6. **Verificar "responde?" e "não vaza?" não é verificar "está certo?".** Os três piores defeitos deste projeto passaram por várias rondas porque ninguém testou o conteúdo. Aqui, a pergunta é sempre sobre o dinheiro e o stock.
7. O Next em dev compila rotas ao primeiro acesso; o `zsh` come `?where[...]`; Postgres em `localhost:5442`; `build` e `dev` partilham `.next`.

---

## File Structure

| Ficheiro | Responsabilidade |
|---|---|
| `packages/core/src/cart.ts` | totais, portes, regra do envio grátis — lógica pura |
| `apps/api/src/collections/Customers.ts` | conta de cliente, moradas, favoritos |
| `apps/api/src/collections/Orders.ts` | encomenda e linhas com cópia congelada |
| `apps/api/src/hooks/reservarStock.ts` | desce o stock de forma serializada |
| `apps/api/src/endpoints/checkout.ts` | cria a encomenda a partir de identificadores |
| `apps/web/src/modules/cart/` | carrinho no browser, fusão no login |
| `apps/web/src/app/carrinho/page.tsx` | ver e alterar o carrinho |
| `apps/web/src/app/checkout/page.tsx` | morada e confirmação |
| `apps/web/src/app/conta/` | encomendas, moradas, favoritos |

---

## Task 1: Aritmética do carrinho (lógica pura)

Antes de existir carrinho, existe a aritmética. É pura, é testável sem base de dados, e é onde os erros de dinheiro se apanham barato.

**Files:**
- Create: `packages/core/src/cart.ts`
- Test: `packages/core/src/cart.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type CartLine = { variantId: number; qty: number; unitPriceCents: number }`
  - `type CartTotals = { subtotalCents: number; shippingCents: number; totalCents: number; faltaParaEnvioGratisCents: number }`
  - `ENVIO_GRATIS_ACIMA_DE = 5000`, `PORTES_CENTS = 499`
  - `calcularTotais(linhas: CartLine[]): CartTotals`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/core/src/cart.test.ts
import { describe, it, expect } from 'vitest'
import { calcularTotais, ENVIO_GRATIS_ACIMA_DE, PORTES_CENTS } from './cart'

const linha = (unitPriceCents: number, qty = 1, variantId = 1) => ({ variantId, qty, unitPriceCents })

describe('calcularTotais', () => {
  it('carrinho vazio nao tem portes nem total', () => {
    expect(calcularTotais([])).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      faltaParaEnvioGratisCents: ENVIO_GRATIS_ACIMA_DE,
    })
  })

  it('soma preço vezes quantidade', () => {
    expect(calcularTotais([linha(2990, 2)]).subtotalCents).toBe(5980)
  })

  it('soma várias linhas', () => {
    const t = calcularTotais([linha(1990, 1, 1), linha(2990, 2, 2)])
    expect(t.subtotalCents).toBe(1990 + 5980)
  })

  it('cobra portes abaixo do limiar', () => {
    const t = calcularTotais([linha(1990)])
    expect(t.shippingCents).toBe(PORTES_CENTS)
    expect(t.totalCents).toBe(1990 + PORTES_CENTS)
  })

  it('nao cobra portes exatamente no limiar', () => {
    const t = calcularTotais([linha(ENVIO_GRATIS_ACIMA_DE)])
    expect(t.shippingCents).toBe(0)
    expect(t.totalCents).toBe(ENVIO_GRATIS_ACIMA_DE)
  })

  it('nao cobra portes acima do limiar', () => {
    expect(calcularTotais([linha(9999)]).shippingCents).toBe(0)
  })

  it('cobra portes um cêntimo abaixo do limiar', () => {
    expect(calcularTotais([linha(ENVIO_GRATIS_ACIMA_DE - 1)]).shippingCents).toBe(PORTES_CENTS)
  })

  it('diz quanto falta para o envio grátis', () => {
    expect(calcularTotais([linha(3000)]).faltaParaEnvioGratisCents).toBe(2000)
  })

  it('diz zero quando o envio já é grátis', () => {
    expect(calcularTotais([linha(6000)]).faltaParaEnvioGratisCents).toBe(0)
  })

  it('todos os valores sao inteiros, sempre', () => {
    for (const linhas of [[linha(1)], [linha(4999, 3)], [linha(333, 7), linha(777, 3)]]) {
      const t = calcularTotais(linhas)
      for (const v of Object.values(t)) expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('recusa quantidade zero ou negativa', () => {
    expect(() => calcularTotais([linha(1000, 0)])).toThrow()
    expect(() => calcularTotais([linha(1000, -1)])).toThrow()
  })

  it('recusa preço negativo', () => {
    expect(() => calcularTotais([linha(-1)])).toThrow()
  })

  it('recusa valores nao inteiros', () => {
    expect(() => calcularTotais([linha(29.9)])).toThrow()
    expect(() => calcularTotais([linha(1000, 1.5)])).toThrow()
  })
})
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/core test cart`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar**

```ts
// packages/core/src/cart.ts

/** Envio grátis a partir de 50 €. Regra de negócio, não constante técnica. */
export const ENVIO_GRATIS_ACIMA_DE = 5000
export const PORTES_CENTS = 499

export type CartLine = {
  variantId: number
  qty: number
  unitPriceCents: number
}

export type CartTotals = {
  subtotalCents: number
  shippingCents: number
  totalCents: number
  /** Quanto falta gastar para o envio ficar grátis. Zero se já for. */
  faltaParaEnvioGratisCents: number
}

export class CartError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CartError'
  }
}

/**
 * Totais do carrinho, em cêntimos inteiros do princípio ao fim.
 *
 * Recusa entradas inválidas em vez de as arredondar: um preço decimal aqui
 * é sempre sintoma de dinheiro tratado como float noutro sítio, e mascará-lo
 * esconde o defeito real.
 */
export function calcularTotais(linhas: CartLine[]): CartTotals {
  for (const l of linhas) {
    if (!Number.isInteger(l.unitPriceCents) || l.unitPriceCents < 0) {
      throw new CartError(`Preço inválido: ${l.unitPriceCents}. Tem de ser cêntimos inteiros não negativos.`)
    }
    if (!Number.isInteger(l.qty) || l.qty < 1) {
      throw new CartError(`Quantidade inválida: ${l.qty}. Tem de ser um inteiro igual ou maior que 1.`)
    }
  }

  const subtotalCents = linhas.reduce((s, l) => s + l.unitPriceCents * l.qty, 0)
  const gratis = subtotalCents >= ENVIO_GRATIS_ACIMA_DE
  const shippingCents = subtotalCents === 0 || gratis ? 0 : PORTES_CENTS

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    faltaParaEnvioGratisCents: Math.max(0, ENVIO_GRATIS_ACIMA_DE - subtotalCents),
  }
}
```

- [ ] **Step 4: Correr e confirmar que passa**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/core test`
Expected: PASS, 13 testes novos, os 39 anteriores intactos

- [ ] **Step 5: Exportar e commitar**

```ts
// acrescentar a packages/core/src/index.ts
export { calcularTotais, ENVIO_GRATIS_ACIMA_DE, PORTES_CENTS, CartError } from './cart'
export type { CartLine, CartTotals } from './cart'
```

```bash
git add packages/core
git commit -m "feat: aritmética do carrinho com portes e envio grátis"
```

---

## Task 2: Contas de cliente

**Files:**
- Create: `apps/api/src/collections/Customers.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Consumes: nada
- Produces: coleção `customers` com autenticação, moradas e favoritos

**Atenção — os dados de cliente são todos sensíveis.** A fase 2 expôs custos de compra por se ter aberto `access.read` sem access por campo. Aqui o erro equivalente expõe moradas e emails de pessoas reais.

- [ ] **Step 1: Criar a coleção**

```ts
// apps/api/src/collections/Customers.ts
import type { CollectionConfig } from 'payload'

/** Um cliente só se vê a si próprio. O staff vê todos. Ninguém mais vê nada. */
const proprioOuStaff = ({ req }: { req: { user?: { id?: number; collection?: string } | null } }) => {
  const u = req.user
  if (!u) return false
  if (u.collection === 'users') return true // staff do painel
  return { id: { equals: u.id } }
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: true,
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'nome', 'createdAt'] },
  access: {
    read: proprioOuStaff,
    update: proprioOuStaff,
    delete: ({ req }) => req.user?.collection === 'users',
    // Qualquer pessoa se pode registar; é o que "criar conta" significa.
    create: () => true,
  },
  fields: [
    { name: 'nome', type: 'text', required: true, label: 'Nome' },
    {
      name: 'moradas',
      type: 'array',
      label: 'Moradas',
      fields: [
        { name: 'etiqueta', type: 'text', label: 'Etiqueta', admin: { description: 'Casa, Trabalho…' } },
        { name: 'nomeDestinatario', type: 'text', required: true, label: 'Destinatário' },
        { name: 'linha1', type: 'text', required: true, label: 'Morada' },
        { name: 'linha2', type: 'text', label: 'Morada (cont.)' },
        {
          name: 'codigoPostal',
          type: 'text',
          required: true,
          label: 'Código postal',
          admin: { description: 'Formato português: 1234-567' },
          validate: (v: unknown) =>
            (typeof v === 'string' && /^\d{4}-\d{3}$/.test(v)) ||
            'Código postal inválido. Use o formato 1234-567.',
        },
        { name: 'localidade', type: 'text', required: true, label: 'Localidade' },
        { name: 'telefone', type: 'text', label: 'Telefone' },
      ],
    },
    {
      name: 'favoritos',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Favoritos',
    },
  ],
}
```

- [ ] **Step 2: Registar e confirmar o isolamento**

Acrescentar `Customers` ao array `collections` do `payload.config.ts`.

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/api dev`

Confirmar por REST, com dois clientes A e B:
1. A regista-se (`POST /api/customers`) → 201
2. A autentica-se (`POST /api/customers/login`) → 200
3. A lê `/api/customers` → vê **só a si próprio**
4. A tenta ler o id de B diretamente → **404 ou 403, nunca os dados de B**
5. A tenta alterar B → recusado
6. Sem sessão, `GET /api/customers` → não devolve ninguém
7. Código postal `1234567` (sem hífen) → recusado; `1234-567` → aceite

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/collections/Customers.ts apps/api/payload.config.ts
git commit -m "feat: contas de cliente com moradas e isolamento entre contas"
```

---

## Task 3: Encomendas com cópia congelada

A decisão nº2 da spec: **as linhas guardam cópia, não referência.** Se referenciassem o produto vivo, mudar um preço amanhã reescrevia o histórico e as faturas deixavam de bater certo.

**Files:**
- Create: `apps/api/src/collections/Orders.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Consumes: `customers` (Task 2)
- Produces: coleção `orders` com linhas congeladas e totais

- [ ] **Step 1: Criar a coleção**

```ts
// apps/api/src/collections/Orders.ts
import type { CollectionConfig } from 'payload'

const inteiroNaoNegativo = (v: unknown) =>
  (typeof v === 'number' && Number.isInteger(v) && v >= 0) || 'Tem de ser um inteiro não negativo.'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: { useAsTitle: 'numero', defaultColumns: ['numero', 'cliente', 'estado', 'totalCents', 'createdAt'] },
  access: {
    // O cliente vê as suas encomendas; o staff vê todas.
    read: ({ req }) => {
      const u = req.user
      if (!u) return false
      if (u.collection === 'users') return true
      return { cliente: { equals: u.id } }
    },
    // As encomendas nascem só pelo endpoint de checkout, que corre com overrideAccess.
    create: () => false,
    update: ({ req }) => req.user?.collection === 'users',
    delete: () => false,
  },
  fields: [
    { name: 'numero', type: 'text', required: true, unique: true, label: 'Número' },
    { name: 'cliente', type: 'relationship', relationTo: 'customers', required: true, label: 'Cliente' },
    { name: 'email', type: 'email', required: true, label: 'Email' },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'a-aguardar-pagamento',
      label: 'Estado',
      options: [
        { label: 'A aguardar pagamento', value: 'a-aguardar-pagamento' },
        { label: 'Pago', value: 'pago' },
        { label: 'Enviado', value: 'enviado' },
        { label: 'Entregue', value: 'entregue' },
        { label: 'Cancelado', value: 'cancelado' },
      ],
    },
    {
      name: 'linhas',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Linhas',
      admin: {
        description:
          'Cópia congelada no momento da compra. Alterar um produto no catálogo NÃO altera encomendas passadas — é essa a intenção.',
      },
      fields: [
        { name: 'variante', type: 'relationship', relationTo: 'variants', label: 'Variante (referência)' },
        { name: 'titulo', type: 'text', required: true, label: 'Título' },
        { name: 'sku', type: 'text', required: true, label: 'SKU' },
        { name: 'opcoes', type: 'json', label: 'Opções' },
        { name: 'quantidade', type: 'number', required: true, min: 1, validate: inteiroNaoNegativo },
        {
          name: 'precoUnitarioCents',
          type: 'number',
          required: true,
          min: 0,
          label: 'Preço unitário (cêntimos)',
          validate: inteiroNaoNegativo,
        },
        {
          name: 'custoUnitarioCents',
          type: 'number',
          min: 0,
          label: 'Custo unitário (cêntimos)',
          validate: inteiroNaoNegativo,
          access: {
            // Margem. O cliente nunca pode ler isto — foi o erro da fase 2.
            read: ({ req }) => req.user?.collection === 'users',
          },
        },
      ],
    },
    { name: 'subtotalCents', type: 'number', required: true, min: 0, validate: inteiroNaoNegativo },
    { name: 'portesCents', type: 'number', required: true, min: 0, validate: inteiroNaoNegativo },
    { name: 'totalCents', type: 'number', required: true, min: 0, validate: inteiroNaoNegativo },
    {
      name: 'moradaEnvio',
      type: 'group',
      label: 'Morada de envio',
      fields: [
        { name: 'nomeDestinatario', type: 'text', required: true },
        { name: 'linha1', type: 'text', required: true },
        { name: 'linha2', type: 'text' },
        { name: 'codigoPostal', type: 'text', required: true },
        { name: 'localidade', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 2: Registar e confirmar**

Acrescentar `Orders` ao `payload.config.ts`.

Confirmar por REST:
1. `POST /api/orders` com sessão de cliente → **recusado** (as encomendas só nascem no checkout)
2. Criar uma encomenda pela Local API com `overrideAccess` → aceite
3. O cliente A lê `/api/orders` → vê **só as suas**
4. O cliente A não vê `custoUnitarioCents` em nenhuma linha
5. O staff vê todas as encomendas e vê o custo
6. `precoUnitarioCents: 29.9` → recusado

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/collections/Orders.ts apps/api/payload.config.ts
git commit -m "feat: encomendas com linhas congeladas e custo invisível ao cliente"
```

---

## Task 4: Checkout — a tarefa mais perigosa desta fase

Aqui o stock desce e o dinheiro fica registado. **É a tarefa onde um defeito cobra mal a uma pessoa real.**

**Files:**
- Create: `apps/api/src/endpoints/checkout.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Consumes: `serializarGuarda` de `apps/api/src/hooks/serializar.ts`; `calcularTotais` de `@animora/core`; coleções `variants`, `orders`, `customers`
- Produces: `POST /api/checkout`

### Regras inegociáveis

**1. O cliente envia identificadores e quantidades. Nunca preços.**
O corpo aceito é `{ linhas: [{ variantId, qty }], moradaEnvio }`. Qualquer preço que venha no corpo é **ignorado**, não validado — validar convida a confiar.

**2. O preço vem da variante, lido no servidor, dentro da transação.**

**3. O stock desce de forma serializada.** Duas pessoas a comprar a última unidade ao mesmo tempo: uma leva, a outra recebe uma recusa clara. Usa `serializarGuarda` — a fase 1 provou cinco vezes que contar-e-decidir sem serialização é atravessado.

**4. Se qualquer linha falhar, nada acontece.** Sem encomenda parcial, sem stock descido a meio.

**5. A encomenda congela `precoUnitarioCents` **e** `custoUnitarioCents`**, ambos lidos da variante nesse momento.

**6. Sem pagamento.** A encomenda nasce `a-aguardar-pagamento`. É a costura limpa para o Stripe depois.

- [ ] **Step 1: Escrever o endpoint**

O esqueleto abaixo é o contrato; a implementação exata do acesso à base fica ao critério de quem implementa, desde que respeite as seis regras.

```ts
// apps/api/src/endpoints/checkout.ts
import type { Endpoint } from 'payload'
import { calcularTotais } from '@animora/core'
import { serializarGuarda } from '../hooks/serializar'

type LinhaPedida = { variantId: number; qty: number }

export const checkout: Endpoint = {
  path: '/checkout',
  method: 'post',
  handler: async (req) => {
    const cliente = req.user
    if (!cliente || cliente.collection !== 'customers') {
      return Response.json({ erro: 'É preciso entrar na conta para finalizar a compra.' }, { status: 401 })
    }

    const corpo = (await req.json?.()) as { linhas?: LinhaPedida[]; moradaEnvio?: unknown }
    const pedidas = corpo?.linhas ?? []

    if (pedidas.length === 0) {
      return Response.json({ erro: 'O carrinho está vazio.' }, { status: 400 })
    }

    // Serializa a atribuição de stock: duas compras da última unidade
    // não podem ambas ver "há 1 disponível". Mesma ferramenta que as
    // guardas da fase 1 — ver o comentário ponytail em serializar.ts.
    await serializarGuarda(req)

    // Ler as variantes AQUI, dentro da transação. O preço e o custo
    // que vão para a encomenda são os que existem neste instante.
    // ... implementação ...

    // Se alguma linha não tiver stock suficiente, devolver 409 com
    // a lista do que falta, e NÃO gravar nada.

    // Descer o stock, criar a encomenda com overrideAccess, devolver o número.
  },
}
```

- [ ] **Step 2: Verificação — cada uma destas é um cenário de dinheiro**

Com o servidor a correr, e um cliente autenticado:

1. **Compra normal** → 201, encomenda criada, stock desce exatamente pela quantidade comprada
2. **Preço forjado**: enviar `{ variantId, qty: 1, unitPriceCents: 1 }` → a encomenda regista o preço **real** da variante, não o enviado
3. **Stock insuficiente**: pedir 5 de uma variante com 2 → 409, **nada gravado**, stock inalterado
4. **Última unidade em concorrência**: 5 pedidos simultâneos da última unidade → exatamente **1** encomenda criada, 4 recusas, stock final **0** e nunca negativo. Correr 6 vezes
5. **Falha a meio**: carrinho com uma linha válida e uma sem stock → 409, **zero** encomendas, stock das duas inalterado
6. **Custo congelado**: alterar o `costCents` da variante depois da compra → a encomenda mantém o custo antigo
7. **Preço congelado**: alterar o `priceCents` depois da compra → a encomenda mantém o preço antigo
8. **Portes**: compra de 19,90 € → portes 4,99 €; compra de 60 € → portes 0
9. **Sem sessão** → 401
10. **Variante inexistente** → 400, nada gravado
11. **Quantidade 0 ou negativa** → 400
12. **Cliente A não vê a encomenda de B**

O ponto 4 é o critério de falha desta tarefa. Se duas encomendas forem criadas para a última unidade, está errada.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/endpoints/checkout.ts apps/api/payload.config.ts
git commit -m "feat: checkout com stock serializado e preços lidos no servidor"
```

---

## Task 5: Carrinho no browser e fusão no login

**Files:**
- Create: `apps/web/src/modules/cart/`
- Create: `apps/web/src/app/carrinho/page.tsx`

**Interfaces:**
- Consumes: `calcularTotais` de `@animora/core`; `getProductBySlug` do módulo `catalog`
- Produces: carrinho persistente, fusão no login, página de carrinho

**Regra:** o carrinho no browser guarda **identificadores e quantidades**, nunca preços. Os preços são sempre relidos do servidor — senão um carrinho velho mostra preços velhos, e o total no ecrã deixa de bater com o cobrado.

- [ ] **Step 1: Módulo do carrinho com testes**

Guarda em `localStorage` `{ variantId, qty }[]`. Ao entrar na conta, funde com o do servidor: para cada variante, fica a **maior** das quantidades (nunca a soma — quem tinha 2 no browser e 2 no servidor quer 2, não 4).

Testes: acrescentar, alterar quantidade, remover, esvaziar, fundir (com sobreposição e sem), e recusar quantidade inválida.

- [ ] **Step 2: Página do carrinho**

Linhas com imagem, título, opções, preço unitário e subtotal. Totais com portes. **Mensagem de quanto falta para o envio grátis** — a regra existia no site antigo e nunca era comunicada; foi apontada na crítica como a alavanca de conversão mais barata desperdiçada.

Estado vazio com ligação ao catálogo.

- [ ] **Step 3: Verificação**

1. Acrescentar ao carrinho, fechar o browser, reabrir → o carrinho continua lá
2. Alterar quantidade e remover funcionam
3. Um preço alterado no painel reflete-se no carrinho ao recarregar
4. Convidado com 2 unidades + conta com 2 unidades → funde para 2, não 4
5. Total no ecrã igual ao total cobrado no checkout
6. Falta-para-envio-grátis correto, e desaparece acima de 50 €

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/modules/cart apps/web/src/app/carrinho
git commit -m "feat: carrinho persistente com fusão no login"
```

---

## Task 6: Checkout e conta na loja

**Files:**
- Create: `apps/web/src/app/checkout/page.tsx`
- Create: `apps/web/src/app/conta/`
- Modify: cabeçalho (ligar o carrinho, que estava marcado "em breve")

- [ ] **Step 1: Página de checkout**

Morada (nova ou guardada), resumo com totais, botão de confirmar. Sem pagamento — a encomenda nasce a aguardar. A confirmação mostra o número da encomenda e o que foi comprado.

- [ ] **Step 2: Conta**

Entrar, registar, ver encomendas com o seu conteúdo congelado, gerir moradas, ver favoritos.

- [ ] **Step 3: Ligar o carrinho no cabeçalho**

Tirar o "em breve", mostrar o número de artigos.

- [ ] **Step 4: Verificação**

1. Fluxo completo: escolher produto → carrinho → entrar → morada → confirmar → número de encomenda
2. A encomenda aparece em `/conta/encomendas` com os preços do momento da compra
3. Sem sessão, `/checkout` leva a entrar e **não perde o carrinho**
4. Cliente A não acede às encomendas de B por URL direto
5. Mobile 390px sem scroll horizontal
6. **Zero campos internos e zero custos no HTML**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app
git commit -m "feat: checkout, conta e carrinho ligado no cabeçalho"
```

---

## Verificação final da fase

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r test        # 110 anteriores + os novos
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r typecheck   # limpo
```

E, sem sessão nenhuma:
```bash
curl -s "http://localhost:3000/api/orders?limit=0"     # nada
curl -s "http://localhost:3000/api/customers?limit=0"  # nada
```

**O critério de aceitação desta fase é um só:** cinco pessoas a comprar a última unidade ao mesmo tempo dão **uma** encomenda, quatro recusas claras, e stock zero. Nunca negativo, nunca duas encomendas.
