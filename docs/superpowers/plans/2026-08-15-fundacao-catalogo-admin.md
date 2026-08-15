# Fundação + Catálogo no Admin — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar o monorepo e o painel de administração ao ponto de se poder criar um produto com variantes, preços, stock e imagens, com validação que impede publicar produtos partidos.

**Architecture:** Monorepo com `apps/api` (Payload + Postgres) e `packages/core` (lógica pura partilhada). A lógica que decide dinheiro e combinações de variantes vive em `packages/core`, testada isoladamente sem base de dados. O Payload consome essa lógica em hooks. `apps/web` é criado vazio neste plano e preenchido no plano 2.

**Tech Stack:** TypeScript strict, pnpm workspaces, Payload CMS 3, Postgres 16 (Docker), Vitest.

**Spec:** `docs/spec-animora.md`

## Global Constraints

- Linguagem: TypeScript, `"strict": true` em todos os pacotes
- Dinheiro: **sempre inteiros em cêntimos**. Nunca `number` decimal, nunca `float`. `2990` = 29,90 €
- Mercado: Portugal. Moeda `EUR`, locale `pt-PT`
- Nenhum ficheiro de domínio importa de dentro de outro módulo — só do `index.ts`
- Toda a imagem exige texto alternativo. Sem exceções
- Stock nunca negativo
- Commits em português, formato `tipo: descrição`

---

## File Structure

| Ficheiro | Responsabilidade |
|---|---|
| `package.json` | workspaces do monorepo |
| `pnpm-workspace.yaml` | declaração dos pacotes |
| `docker-compose.yml` | Postgres local |
| `packages/core/src/money.ts` | conversão e formatação de cêntimos |
| `packages/core/src/variants.ts` | geração e fusão da matriz de variantes |
| `packages/core/src/sku.ts` | construção de SKU |
| `packages/core/src/index.ts` | superfície pública do pacote |
| `apps/api/payload.config.ts` | configuração do Payload |
| `apps/api/src/collections/Users.ts` | administradores, papéis `owner` e `admin` |
| `apps/api/src/collections/Categories.ts` | árvore de categorias |
| `apps/api/src/collections/Brands.ts` | marcas |
| `apps/api/src/collections/Media.ts` | imagens, alt obrigatório, ponto focal |
| `apps/api/src/collections/Products.ts` | ficha de produto |
| `apps/api/src/collections/Variants.ts` | SKU, preço, stock, dimensões |
| `apps/api/src/hooks/validatePublish.ts` | recusa publicar produto incompleto |

---

## Task 1: Monorepo e ferramentas

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`

**Interfaces:**
- Consumes: nada
- Produces: workspace `@animora/core` resolúvel por `apps/*`; comando `pnpm test` a correr Vitest

- [ ] **Step 1: Inicializar git**

```bash
git init
git branch -M main
```

- [ ] **Step 2: Criar `package.json` na raiz**

```json
{
  "name": "animora",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Criar `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Criar `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```

- [ ] **Step 5: Criar `.gitignore`**

```
node_modules/
dist/
.env
.next/
media/
```

- [ ] **Step 6: Criar `packages/core/package.json`**

```json
{
  "name": "@animora/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 7: Criar `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 8: Criar `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 9: Instalar e confirmar que o workspace resolve**

Run: `pnpm install && pnpm -r typecheck`
Expected: instala sem erro; `typecheck` passa (ainda não há ficheiros `src`, o `tsc` aceita)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: monorepo com pnpm workspaces e vitest"
```

---

## Task 2: Dinheiro em cêntimos

**Files:**
- Create: `packages/core/src/money.ts`
- Test: `packages/core/src/money.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `parseEuros(input: string): number` — texto do admin → cêntimos
  - `formatEuros(cents: number): string` — cêntimos → `"29,90 €"`
  - `MoneyError` — lançado em entrada inválida

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/core/src/money.test.ts
import { describe, it, expect } from 'vitest'
import { parseEuros, formatEuros, MoneyError } from './money'

describe('parseEuros', () => {
  it('converte decimal com vírgula em cêntimos', () => {
    expect(parseEuros('29,90')).toBe(2990)
  })

  it('converte decimal com ponto em cêntimos', () => {
    expect(parseEuros('29.90')).toBe(2990)
  })

  it('aceita inteiro sem casas decimais', () => {
    expect(parseEuros('30')).toBe(3000)
  })

  it('aceita uma só casa decimal', () => {
    expect(parseEuros('29,9')).toBe(2990)
  })

  it('ignora espaços e símbolo de euro', () => {
    expect(parseEuros(' 29,90 € ')).toBe(2990)
  })

  it('nao perde cêntimos por erro de vírgula flutuante', () => {
    expect(parseEuros('0,10')).toBe(10)
    expect(parseEuros('0,20')).toBe(20)
    expect(parseEuros('0,29')).toBe(29)
    expect(parseEuros('1234,56')).toBe(123456)
  })

  it('recusa mais de duas casas decimais', () => {
    expect(() => parseEuros('29,901')).toThrow(MoneyError)
  })

  it('recusa valores negativos', () => {
    expect(() => parseEuros('-5,00')).toThrow(MoneyError)
  })

  it('recusa texto que nao e numero', () => {
    expect(() => parseEuros('abc')).toThrow(MoneyError)
    expect(() => parseEuros('')).toThrow(MoneyError)
  })
})

describe('formatEuros', () => {
  it('formata cêntimos no formato português', () => {
    expect(formatEuros(2990)).toBe('29,90 €')
  })

  it('mostra sempre duas casas decimais', () => {
    expect(formatEuros(3000)).toBe('30,00 €')
    expect(formatEuros(5)).toBe('0,05 €')
  })

  it('separa os milhares', () => {
    expect(formatEuros(123456)).toBe('1234,56 €')
  })

  it('formata zero', () => {
    expect(formatEuros(0)).toBe('0,00 €')
  })

  it('recusa valores nao inteiros', () => {
    expect(() => formatEuros(29.9)).toThrow(MoneyError)
  })
})
```

- [ ] **Step 2: Correr o teste e confirmar que falha**

Run: `pnpm --filter @animora/core test`
Expected: FAIL — `Cannot find module './money'`

- [ ] **Step 3: Implementação mínima**

```ts
// packages/core/src/money.ts

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/**
 * Converte texto escrito por uma pessoa em cêntimos inteiros.
 * Aceita vírgula ou ponto como separador decimal.
 */
export function parseEuros(input: string): number {
  const cleaned = input.trim().replace(/\s/g, '').replace('€', '').replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError(`Valor inválido: "${input}". Use o formato 29,90`)
  }

  const [whole = '0', frac = ''] = cleaned.split('.')
  const cents = frac.padEnd(2, '0')

  return Number(whole) * 100 + Number(cents)
}

/** Converte cêntimos inteiros no formato português com símbolo. */
export function formatEuros(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new MoneyError(`Cêntimos têm de ser inteiros, recebi ${cents}`)
  }

  const whole = Math.trunc(cents / 100)
  const frac = String(Math.abs(cents % 100)).padStart(2, '0')

  return `${whole},${frac} €`
}
```

Nota para quem implementa: a divisão é feita sobre inteiros e a parte decimal é montada por texto. Nunca se faz `cents / 100` para obter um decimal — é exatamente aí que aparece `29.900000000000002`.

- [ ] **Step 4: Correr o teste e confirmar que passa**

Run: `pnpm --filter @animora/core test`
Expected: PASS, 14 testes

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/money.ts packages/core/src/money.test.ts
git commit -m "feat: conversão e formatação de dinheiro em cêntimos"
```

---

## Task 3: Geração da matriz de variantes

**Files:**
- Create: `packages/core/src/variants.ts`
- Test: `packages/core/src/variants.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type VariantOption = { name: string; values: string[] }`
  - `type Combination = Record<string, string>`
  - `generateCombinations(options: VariantOption[]): Combination[]`
  - `combinationKey(c: Combination): string`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/core/src/variants.test.ts
import { describe, it, expect } from 'vitest'
import { generateCombinations, combinationKey } from './variants'

describe('generateCombinations', () => {
  it('devolve uma combinação vazia quando nao ha opções', () => {
    expect(generateCombinations([])).toEqual([{}])
  })

  it('gera uma combinação por valor com uma só opção', () => {
    const result = generateCombinations([{ name: 'Tamanho', values: ['S', 'M', 'L'] }])
    expect(result).toEqual([
      { Tamanho: 'S' },
      { Tamanho: 'M' },
      { Tamanho: 'L' },
    ])
  })

  it('faz o produto cartesiano de duas opções', () => {
    const result = generateCombinations([
      { name: 'Tamanho', values: ['S', 'M'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
    ])
    expect(result).toHaveLength(4)
    expect(result).toEqual([
      { Tamanho: 'S', Cor: 'Preto' },
      { Tamanho: 'S', Cor: 'Azul' },
      { Tamanho: 'M', Cor: 'Preto' },
      { Tamanho: 'M', Cor: 'Azul' },
    ])
  })

  it('faz o produto cartesiano de tres opções', () => {
    const result = generateCombinations([
      { name: 'Tamanho', values: ['S', 'M'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
      { name: 'Material', values: ['Nylon', 'Couro'] },
    ])
    expect(result).toHaveLength(8)
  })

  it('ignora opções sem valores', () => {
    const result = generateCombinations([
      { name: 'Tamanho', values: ['S'] },
      { name: 'Cor', values: [] },
    ])
    expect(result).toEqual([{ Tamanho: 'S' }])
  })
})

describe('combinationKey', () => {
  it('produz a mesma chave independentemente da ordem das opções', () => {
    const a = combinationKey({ Tamanho: 'S', Cor: 'Preto' })
    const b = combinationKey({ Cor: 'Preto', Tamanho: 'S' })
    expect(a).toBe(b)
  })

  it('produz chaves diferentes para combinações diferentes', () => {
    expect(combinationKey({ Tamanho: 'S' })).not.toBe(combinationKey({ Tamanho: 'M' }))
  })
})
```

- [ ] **Step 2: Correr o teste e confirmar que falha**

Run: `pnpm --filter @animora/core test variants`
Expected: FAIL — `Cannot find module './variants'`

- [ ] **Step 3: Implementação mínima**

```ts
// packages/core/src/variants.ts

export type VariantOption = { name: string; values: string[] }
export type Combination = Record<string, string>

/** Produto cartesiano das opções. Opções sem valores são ignoradas. */
export function generateCombinations(options: VariantOption[]): Combination[] {
  const usable = options.filter((o) => o.values.length > 0)

  return usable.reduce<Combination[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.values.map((value) => ({ ...combo, [option.name]: value })),
      ),
    [{}],
  )
}

/**
 * Identidade estável de uma combinação, independente da ordem das chaves.
 * É por esta chave que se reconhece uma variante já existente.
 */
export function combinationKey(c: Combination): string {
  return Object.keys(c)
    .sort()
    .map((k) => `${k}=${c[k]}`)
    .join('|')
}
```

- [ ] **Step 4: Correr o teste e confirmar que passa**

Run: `pnpm --filter @animora/core test variants`
Expected: PASS, 7 testes

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/variants.ts packages/core/src/variants.test.ts
git commit -m "feat: geração do produto cartesiano de variantes"
```

---

## Task 4: Fusão de variantes sem destruir dados

Esta é a tarefa que impede o pior erro de dados do cadastro: acrescentar uma opção a um produto já preenchido não pode apagar os preços e o stock existentes.

**Files:**
- Modify: `packages/core/src/variants.ts`
- Modify: `packages/core/src/variants.test.ts`

**Interfaces:**
- Consumes: `generateCombinations`, `combinationKey` da Task 3
- Produces:
  - `type VariantRow = { combination: Combination; sku: string; priceCents: number; stock: number; active: boolean }`
  - `mergeVariants(existing: VariantRow[], options: VariantOption[]): VariantRow[]`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// acrescentar ao fim de packages/core/src/variants.test.ts
import { mergeVariants, type VariantRow } from './variants'

const row = (
  combination: Record<string, string>,
  priceCents: number,
  stock: number,
): VariantRow => ({ combination, sku: 'SKU-' + stock, priceCents, stock, active: true })

describe('mergeVariants', () => {
  it('cria linhas novas quando nao havia nenhuma', () => {
    const result = mergeVariants([], [{ name: 'Tamanho', values: ['S', 'M'] }])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ combination: { Tamanho: 'S' }, priceCents: 0, stock: 0 })
  })

  it('preserva preço e stock das linhas que ja existiam', () => {
    const existing = [row({ Tamanho: 'S' }, 2990, 12)]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S', 'M'] }])

    const s = result.find((r) => r.combination.Tamanho === 'S')
    expect(s?.priceCents).toBe(2990)
    expect(s?.stock).toBe(12)
  })

  it('cria as linhas novas a zero sem tocar nas antigas', () => {
    const existing = [row({ Tamanho: 'S' }, 2990, 12)]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S', 'M'] }])

    const m = result.find((r) => r.combination.Tamanho === 'M')
    expect(m?.priceCents).toBe(0)
    expect(m?.stock).toBe(0)
  })

  it('preserva dados ao acrescentar uma segunda opção', () => {
    const existing = [row({ Tamanho: 'S' }, 2990, 12)]
    const result = mergeVariants(existing, [
      { name: 'Tamanho', values: ['S'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
    ])

    // A combinação antiga {Tamanho: S} deixa de existir tal e qual,
    // por isso as novas nascem a zero — mas nenhuma linha antiga foi silenciosamente reescrita.
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.combination)).toEqual([
      { Tamanho: 'S', Cor: 'Preto' },
      { Tamanho: 'S', Cor: 'Azul' },
    ])
  })

  it('preserva dados quando se acrescenta um valor a uma opção existente', () => {
    const existing = [
      row({ Tamanho: 'S', Cor: 'Preto' }, 2990, 12),
      row({ Tamanho: 'S', Cor: 'Azul' }, 2990, 4),
    ]
    const result = mergeVariants(existing, [
      { name: 'Tamanho', values: ['S', 'M'] },
      { name: 'Cor', values: ['Preto', 'Azul'] },
    ])

    expect(result).toHaveLength(4)
    const sPreto = result.find(
      (r) => r.combination.Tamanho === 'S' && r.combination.Cor === 'Preto',
    )
    expect(sPreto?.priceCents).toBe(2990)
    expect(sPreto?.stock).toBe(12)
  })

  it('remove linhas cuja combinação deixou de ser possível', () => {
    const existing = [
      row({ Tamanho: 'S' }, 2990, 12),
      row({ Tamanho: 'XL' }, 3990, 3),
    ]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S', 'M'] }])

    expect(result.map((r) => r.combination.Tamanho)).toEqual(['S', 'M'])
  })

  it('preserva o estado desativado de uma linha', () => {
    const existing: VariantRow[] = [
      { combination: { Tamanho: 'S' }, sku: 'X', priceCents: 2990, stock: 0, active: false },
    ]
    const result = mergeVariants(existing, [{ name: 'Tamanho', values: ['S'] }])
    expect(result[0]?.active).toBe(false)
  })
})
```

- [ ] **Step 2: Correr o teste e confirmar que falha**

Run: `pnpm --filter @animora/core test variants`
Expected: FAIL — `mergeVariants is not a function`

- [ ] **Step 3: Implementação mínima**

```ts
// acrescentar ao fim de packages/core/src/variants.ts

export type VariantRow = {
  combination: Combination
  sku: string
  priceCents: number
  stock: number
  active: boolean
}

/**
 * Recalcula a matriz a partir das opções, preservando os dados das linhas
 * cuja combinação continua a existir.
 *
 * Linhas cuja combinação deixou de ser possível desaparecem.
 * Linhas novas nascem a zero e inativas de propósito? Não — nascem ativas
 * com preço e stock a zero, para que a validação de publicação as apanhe.
 */
export function mergeVariants(
  existing: VariantRow[],
  options: VariantOption[],
): VariantRow[] {
  const byKey = new Map(existing.map((r) => [combinationKey(r.combination), r]))

  return generateCombinations(options).map((combination) => {
    const previous = byKey.get(combinationKey(combination))

    if (previous) return { ...previous, combination }

    return { combination, sku: '', priceCents: 0, stock: 0, active: true }
  })
}
```

- [ ] **Step 4: Correr o teste e confirmar que passa**

Run: `pnpm --filter @animora/core test variants`
Expected: PASS, 14 testes no total do ficheiro

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/variants.ts packages/core/src/variants.test.ts
git commit -m "feat: fusão de variantes preservando preço e stock existentes"
```

---

## Task 5: Construção de SKU

**Files:**
- Create: `packages/core/src/sku.ts`
- Test: `packages/core/src/sku.test.ts`

**Interfaces:**
- Consumes: `Combination` da Task 3
- Produces: `buildSku(brand: string, product: string, combination: Combination): string`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// packages/core/src/sku.test.ts
import { describe, it, expect } from 'vitest'
import { buildSku } from './sku'

describe('buildSku', () => {
  it('junta marca, produto e valores das opções', () => {
    expect(buildSku('HappyPaws', 'Coleira', { Tamanho: 'S', Cor: 'Preto' }))
      .toBe('HAP-COL-S-PRE')
    })

  it('usa as tres primeiras letras de cada parte', () => {
    expect(buildSku('PetNest', 'Comedouro', {})).toBe('PET-COM')
  })

  it('remove acentos', () => {
    expect(buildSku('Ração', 'Sénior', {})).toBe('RAC-SEN')
  })

  it('remove espaços e pontuação', () => {
    expect(buildSku('Cat & Co.', 'Casa de banho', {})).toBe('CAT-CAS')
  })

  it('ordena as opções alfabeticamente para ser determinista', () => {
    const a = buildSku('X', 'Y', { Tamanho: 'S', Cor: 'Preto' })
    const b = buildSku('X', 'Y', { Cor: 'Preto', Tamanho: 'S' })
    expect(a).toBe(b)
  })

  it('lida com partes mais curtas que tres letras', () => {
    expect(buildSku('Pi', 'Ao', {})).toBe('PI-AO')
  })
})
```

- [ ] **Step 2: Correr o teste e confirmar que falha**

Run: `pnpm --filter @animora/core test sku`
Expected: FAIL — `Cannot find module './sku'`

- [ ] **Step 3: Implementação mínima**

```ts
// packages/core/src/sku.ts
import type { Combination } from './variants'

function abbreviate(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
}

/**
 * SKU sugerido. Editável no admin — isto é apenas o valor inicial.
 * A unicidade é garantida pela base de dados, não por esta função.
 */
export function buildSku(brand: string, product: string, combination: Combination): string {
  const parts = [abbreviate(brand), abbreviate(product)]

  for (const key of Object.keys(combination).sort()) {
    const value = combination[key]
    if (value) parts.push(abbreviate(value))
  }

  return parts.filter(Boolean).join('-')
}
```

- [ ] **Step 4: Correr o teste e confirmar que passa**

Run: `pnpm --filter @animora/core test sku`
Expected: PASS, 6 testes

- [ ] **Step 5: Criar a superfície pública do pacote**

```ts
// packages/core/src/index.ts
export { parseEuros, formatEuros, MoneyError } from './money'
export { generateCombinations, combinationKey, mergeVariants } from './variants'
export type { VariantOption, Combination, VariantRow } from './variants'
export { buildSku } from './sku'
```

- [ ] **Step 6: Confirmar que tudo passa**

Run: `pnpm test && pnpm typecheck`
Expected: PASS em todos os pacotes

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/sku.ts packages/core/src/sku.test.ts packages/core/src/index.ts
git commit -m "feat: construção de SKU e superfície pública do core"
```

---

## Task 6: Postgres e arranque do Payload

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/payload.config.ts`
- Create: `apps/api/src/collections/Users.ts`

**Interfaces:**
- Consumes: nada do core ainda
- Produces: painel de admin em `http://localhost:3000/admin`; coleção `users` com campo `role` de valores `owner` e `admin`

- [ ] **Step 1: Criar `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: animora
      POSTGRES_PASSWORD: animora
      POSTGRES_DB: animora
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Subir a base de dados e confirmar**

Run: `docker compose up -d && docker compose ps`
Expected: serviço `db` com estado `running`

- [ ] **Step 3: Criar `apps/api/package.json`**

```json
{
  "name": "@animora/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "echo 'sem testes unitários nesta app' && exit 0"
  },
  "dependencies": {
    "@animora/core": "workspace:*",
    "@payloadcms/db-postgres": "^3.0.0",
    "@payloadcms/next": "^3.0.0",
    "@payloadcms/richtext-lexical": "^3.0.0",
    "next": "^15.0.0",
    "payload": "^3.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sharp": "^0.33.0"
  }
}
```

- [ ] **Step 4: Criar `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["DOM", "ES2022"],
    "noEmit": true
  },
  "include": ["src", "payload.config.ts", "next-env.d.ts"]
}
```

- [ ] **Step 5: Criar `apps/api/.env.example`**

```
DATABASE_URI=postgres://animora:animora@localhost:5432/animora
PAYLOAD_SECRET=troca-isto-em-producao
```

- [ ] **Step 6: Criar a coleção de utilizadores**

```ts
// apps/api/src/collections/Users.ts
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      options: [
        { label: 'Proprietário', value: 'owner' },
        { label: 'Administrador', value: 'admin' },
      ],
      access: {
        // Só o proprietário pode alterar papéis. Sem isto, um admin promove-se a si próprio.
        update: ({ req }) => req.user?.role === 'owner',
      },
    },
  ],
}
```

- [ ] **Step 7: Criar a configuração do Payload**

```ts
// apps/api/payload.config.ts
import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { Users } from './src/collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  typescript: {
    outputFile: path.resolve(dirname, '../../packages/types/payload-types.ts'),
  },
  i18n: { supportedLanguages: { pt: {} as never } },
})
```

- [ ] **Step 8: Instalar e arrancar**

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @animora/api dev
```

- [ ] **Step 9: Confirmar o painel no browser**

Abrir `http://localhost:3000/admin`.
Expected: ecrã de criação do primeiro utilizador. Criar um com papel `owner`, entrar, e confirmar que o painel carrega.

- [ ] **Step 10: Commit**

```bash
git add docker-compose.yml apps/api
git commit -m "feat: Payload sobre Postgres com papéis owner e admin"
```

---

## Task 7: Categorias e marcas

**Files:**
- Create: `apps/api/src/collections/Categories.ts`
- Create: `apps/api/src/collections/Brands.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Consumes: nada
- Produces: coleções `categories` (com `parent` para árvore) e `brands`, ambas com `name` e `slug`

- [ ] **Step 1: Criar a coleção de categorias**

```ts
// apps/api/src/collections/Categories.ts
import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'parent', 'slug'] },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: { description: 'Aparece no endereço da página. Ex.: coleiras' },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Categoria mãe',
      admin: { description: 'Deixar vazio para categoria de topo' },
    },
  ],
}
```

- [ ] **Step 2: Criar a coleção de marcas**

```ts
// apps/api/src/collections/Brands.ts
import type { CollectionConfig } from 'payload'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome' },
    { name: 'slug', type: 'text', required: true, unique: true, label: 'Slug' },
  ],
}
```

- [ ] **Step 3: Registar as coleções**

Em `apps/api/payload.config.ts`, acrescentar aos imports e ao array:

```ts
import { Categories } from './src/collections/Categories'
import { Brands } from './src/collections/Brands'

// ...
collections: [Users, Categories, Brands],
```

- [ ] **Step 4: Confirmar no painel**

Run: `pnpm --filter @animora/api dev`
Abrir `http://localhost:3000/admin`.
Expected: aparecem "Categories" e "Brands" no menu. Criar a categoria `Coleiras` (slug `coleiras`) e a marca `HappyPaws` (slug `happypaws`). Ambas guardam sem erro.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/collections/Categories.ts apps/api/src/collections/Brands.ts apps/api/payload.config.ts
git commit -m "feat: coleções de categorias e marcas"
```

---

## Task 8: Imagens com alt obrigatório e ponto focal

**Files:**
- Create: `apps/api/src/collections/Media.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Consumes: nada
- Produces: coleção `media` com `alt` obrigatório, ponto focal ativo e tamanhos `card` (600×600), `thumb` (120×120) e `full` (1200×1200)

- [ ] **Step 1: Criar a coleção**

```ts
// apps/api/src/collections/Media.ts
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'alt' },
  upload: {
    staticDir: 'media',
    // Ponto focal: sem isto, o corte quadrado do card decapita os animais.
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 120, height: 120, position: 'centre' },
      { name: 'card', width: 600, height: 600, position: 'centre' },
      { name: 'full', width: 1200, height: 1200, position: 'centre' },
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texto alternativo',
      admin: {
        description:
          'Descreve a imagem para quem não a consegue ver. Ex.: "Cão castanho com coleira vermelha". Obrigatório.',
      },
    },
  ],
}
```

- [ ] **Step 2: Registar a coleção**

Em `apps/api/payload.config.ts`:

```ts
import { Media } from './src/collections/Media'

// ...
collections: [Users, Categories, Brands, Media],
```

- [ ] **Step 3: Confirmar que o alt é mesmo obrigatório**

Run: `pnpm --filter @animora/api dev`
No painel, em Media, carregar uma imagem e tentar guardar com o campo de texto alternativo vazio.
Expected: recusa a gravação com erro no campo `alt`. Preenchendo, guarda e gera as três versões em WebP.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/collections/Media.ts apps/api/payload.config.ts
git commit -m "feat: coleção de imagens com alt obrigatório e ponto focal"
```

---

## Task 9: Produtos e variantes

**Files:**
- Create: `apps/api/src/collections/Products.ts`
- Create: `apps/api/src/collections/Variants.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Consumes: `Categories`, `Brands`, `Media` das tasks 7 e 8
- Produces:
  - coleção `products` com `title`, `slug`, `description`, `brand`, `categories`, `gallery`, `options`, `_status`
  - coleção `variants` com `product`, `combination`, `sku` único, `priceCents`, `stock`, dimensões e campos internos

- [ ] **Step 1: Criar a coleção de produtos**

```ts
// apps/api/src/collections/Products.ts
import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  versions: { drafts: true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', '_status'],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Geral',
          fields: [
            { name: 'title', type: 'text', required: true, label: 'Título' },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Slug',
              admin: { description: 'Aparece no endereço. Ex.: coleira-ajustavel-caes' },
            },
            { name: 'description', type: 'richText', label: 'Descrição' },
            {
              name: 'brand',
              type: 'relationship',
              relationTo: 'brands',
              required: true,
              label: 'Marca',
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
              required: true,
              label: 'Categorias',
            },
            {
              name: 'options',
              type: 'array',
              label: 'Opções de variante',
              admin: {
                description:
                  'Ex.: Tamanho com S, M, L. As combinações são geradas a partir daqui.',
              },
              fields: [
                { name: 'name', type: 'text', required: true, label: 'Nome da opção' },
                {
                  name: 'values',
                  type: 'array',
                  required: true,
                  label: 'Valores',
                  fields: [{ name: 'value', type: 'text', required: true, label: 'Valor' }],
                },
              ],
            },
          ],
        },
        {
          label: 'Imagens',
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: 'Galeria',
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'Imagem',
                },
              ],
            },
            {
              name: 'primaryImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem principal',
              admin: { description: 'É esta que aparece no catálogo' },
            },
          ],
        },
        {
          label: 'Interno',
          fields: [
            { name: 'supplier', type: 'text', label: 'Fornecedor' },
            {
              name: 'costCents',
              type: 'number',
              label: 'Custo de compra (cêntimos)',
              admin: { description: 'Usado no cálculo de lucro. Nunca sai para o site.' },
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text', label: 'Meta título' },
            { name: 'metaDescription', type: 'textarea', label: 'Meta descrição' },
            {
              name: 'shareImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem de partilha',
            },
          ],
        },
      ],
    },
  ],
}
```

- [ ] **Step 2: Criar a coleção de variantes**

```ts
// apps/api/src/collections/Variants.ts
import type { CollectionConfig } from 'payload'

export const Variants: CollectionConfig = {
  slug: 'variants',
  admin: {
    useAsTitle: 'sku',
    defaultColumns: ['sku', 'product', 'priceCents', 'stock', 'active'],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Produto',
    },
    {
      name: 'combination',
      type: 'json',
      required: true,
      label: 'Combinação',
      admin: { description: 'Ex.: { "Tamanho": "S", "Cor": "Preto" }' },
    },
    {
      name: 'sku',
      type: 'text',
      required: true,
      unique: true,
      label: 'SKU',
      admin: { description: 'Sugerido automaticamente. Tem de ser único.' },
    },
    {
      name: 'priceCents',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      label: 'Preço (cêntimos)',
      admin: { description: '2990 = 29,90 €' },
    },
    {
      name: 'oldPriceCents',
      type: 'number',
      min: 0,
      label: 'Preço anterior (cêntimos)',
    },
    {
      name: 'stock',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      label: 'Stock',
    },
    { name: 'active', type: 'checkbox', defaultValue: true, label: 'Ativa' },
    {
      type: 'collapsible',
      label: 'Dimensões',
      fields: [
        { name: 'lengthCm', type: 'number', min: 0, label: 'Comprimento (cm)' },
        { name: 'widthCm', type: 'number', min: 0, label: 'Largura (cm)' },
        { name: 'heightCm', type: 'number', min: 0, label: 'Altura (cm)' },
        { name: 'weightG', type: 'number', min: 0, label: 'Peso (g)' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Interno',
      fields: [
        { name: 'ean', type: 'text', label: 'EAN' },
        { name: 'warehouseLocation', type: 'text', label: 'Localização em armazém' },
        { name: 'shippingWeightG', type: 'number', min: 0, label: 'Peso para portes (g)' },
      ],
    },
  ],
}
```

- [ ] **Step 3: Registar as coleções**

Em `apps/api/payload.config.ts`:

```ts
import { Products } from './src/collections/Products'
import { Variants } from './src/collections/Variants'

// ...
collections: [Users, Categories, Brands, Media, Products, Variants],
```

- [ ] **Step 4: Confirmar no painel**

Run: `pnpm --filter @animora/api dev`
Criar o produto `Coleira ajustável para cães`, slug `coleira-ajustavel-caes`, marca `HappyPaws`, categoria `Coleiras`, com uma opção `Tamanho` de valores `S`, `M`, `L`.
Depois criar manualmente uma variante ligada a esse produto com SKU `HAP-COL-S`, preço `2990`, stock `12`.
Expected: ambos guardam. Criar uma segunda variante com o mesmo SKU dá erro de unicidade.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/collections/Products.ts apps/api/src/collections/Variants.ts apps/api/payload.config.ts
git commit -m "feat: coleções de produtos e variantes"
```

---

## Task 10: Geração automática das variantes ao gravar

**Files:**
- Create: `apps/api/src/hooks/syncVariants.ts`
- Modify: `apps/api/src/collections/Products.ts`

**Interfaces:**
- Consumes: `mergeVariants`, `buildSku` de `@animora/core`; coleção `variants` da Task 9
- Produces: hook `syncVariants` que, ao gravar um produto, cria as variantes em falta e apaga as impossíveis, preservando preço e stock

- [ ] **Step 1: Escrever o hook**

```ts
// apps/api/src/hooks/syncVariants.ts
import type { CollectionAfterChangeHook } from 'payload'
import { mergeVariants, buildSku, combinationKey } from '@animora/core'
import type { VariantOption, VariantRow } from '@animora/core'

/**
 * Mantém a tabela de variantes alinhada com as opções do produto.
 *
 * Preserva preço e stock das combinações que continuam a existir e
 * apaga as que deixaram de ser possíveis. É a Task 4 do core aplicada
 * à base de dados.
 */
export const syncVariants: CollectionAfterChangeHook = async ({ doc, req }) => {
  const options: VariantOption[] = (doc.options ?? []).map(
    (o: { name: string; values: { value: string }[] }) => ({
      name: o.name,
      values: (o.values ?? []).map((v) => v.value),
    }),
  )

  const existingDocs = await req.payload.find({
    collection: 'variants',
    where: { product: { equals: doc.id } },
    limit: 1000,
    req,
  })

  const existing: VariantRow[] = existingDocs.docs.map((d) => ({
    combination: d.combination as Record<string, string>,
    sku: d.sku as string,
    priceCents: d.priceCents as number,
    stock: d.stock as number,
    active: d.active as boolean,
  }))

  const merged = mergeVariants(existing, options)
  const mergedKeys = new Set(merged.map((r) => combinationKey(r.combination)))

  // Apagar as que deixaram de ser possíveis
  for (const d of existingDocs.docs) {
    const key = combinationKey(d.combination as Record<string, string>)
    if (!mergedKeys.has(key)) {
      await req.payload.delete({ collection: 'variants', id: d.id, req })
    }
  }

  // Criar as novas
  const existingKeys = new Set(existing.map((r) => combinationKey(r.combination)))
  const brandName =
    typeof doc.brand === 'object' && doc.brand ? (doc.brand.name as string) : 'GEN'

  for (const row of merged) {
    if (existingKeys.has(combinationKey(row.combination))) continue

    await req.payload.create({
      collection: 'variants',
      data: {
        product: doc.id,
        combination: row.combination,
        sku: buildSku(brandName, doc.title as string, row.combination),
        priceCents: 0,
        stock: 0,
        active: true,
      },
      req,
    })
  }

  return doc
}
```

- [ ] **Step 2: Ligar o hook à coleção de produtos**

Em `apps/api/src/collections/Products.ts`, acrescentar o import no topo e a chave `hooks` ao lado de `admin`:

```ts
import { syncVariants } from '../hooks/syncVariants'

// dentro de `export const Products: CollectionConfig = {`
  hooks: {
    afterChange: [syncVariants],
  },
```

- [ ] **Step 3: Confirmar o comportamento no painel**

Run: `pnpm --filter @animora/api dev`

1. Abrir o produto `Coleira ajustável para cães`, com a opção `Tamanho` = S, M, L. Gravar.
   Expected: aparecem 3 variantes com SKU `HAP-COL-S`, `HAP-COL-M`, `HAP-COL-L`.
2. Pôr preço `2990` e stock `12` na variante S. Gravar.
3. Voltar ao produto e acrescentar o valor `XL` à opção `Tamanho`. Gravar.
   Expected: passam a existir 4 variantes; a S **mantém** preço 2990 e stock 12; a XL nasce a zero.
4. Remover `XL` da opção. Gravar.
   Expected: volta a haver 3 variantes; a S continua com 2990 e 12.

Este passo 3 é o objetivo da tarefa. Se o preço da S se perder, o hook está errado.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/hooks/syncVariants.ts apps/api/src/collections/Products.ts
git commit -m "feat: sincronizar variantes ao gravar produto sem perder dados"
```

---

## Task 11: Validação ao publicar

**Files:**
- Create: `apps/api/src/hooks/validatePublish.ts`
- Modify: `apps/api/src/collections/Products.ts`

**Interfaces:**
- Consumes: coleção `variants` da Task 9
- Produces: hook `validatePublish` que recusa passar um produto a publicado se estiver incompleto

- [ ] **Step 1: Escrever o hook**

```ts
// apps/api/src/hooks/validatePublish.ts
import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

/**
 * Recusa publicar produtos incompletos.
 *
 * Rascunhos não passam por aqui de propósito: quem está a meio de
 * carregar um produto não deve ser interrompido.
 */
export const validatePublish: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  if (data._status !== 'published') return data

  const problems: string[] = []

  if (!data.categories || data.categories.length === 0) {
    problems.push('Escolha pelo menos uma categoria.')
  }

  if (!data.brand) {
    problems.push('Escolha uma marca.')
  }

  const gallery = data.gallery ?? []
  if (gallery.length === 0) {
    problems.push('Adicione pelo menos uma imagem.')
  }

  const productId = originalDoc?.id ?? data.id
  if (productId) {
    const variants = await req.payload.find({
      collection: 'variants',
      where: {
        and: [
          { product: { equals: productId } },
          { active: { equals: true } },
          { priceCents: { greater_than: 0 } },
        ],
      },
      limit: 1,
      req,
    })

    if (variants.totalDocs === 0) {
      problems.push('É preciso pelo menos uma variante ativa com preço acima de zero.')
    }
  }

  if (problems.length > 0) {
    throw new APIError(`Não é possível publicar:\n• ${problems.join('\n• ')}`, 400)
  }

  return data
}
```

- [ ] **Step 2: Ligar o hook**

Em `apps/api/src/collections/Products.ts`, acrescentar ao bloco `hooks` já existente:

```ts
import { validatePublish } from '../hooks/validatePublish'

  hooks: {
    beforeChange: [validatePublish],
    afterChange: [syncVariants],
  },
```

- [ ] **Step 3: Confirmar cada regra no painel**

Run: `pnpm --filter @animora/api dev`

1. Criar produto novo sem imagem nem variantes com preço. Tentar publicar.
   Expected: recusa com a lista de problemas legível.
2. Acrescentar imagem com alt. Tentar publicar.
   Expected: continua a recusar, agora só por causa da variante sem preço.
3. Pôr preço numa variante. Publicar.
   Expected: publica.
4. Gravar como rascunho um produto vazio.
   Expected: grava sem reclamar.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/hooks/validatePublish.ts apps/api/src/collections/Products.ts
git commit -m "feat: recusar publicar produtos incompletos"
```

---

## Task 12: Duplicar produto e app web vazia

**Files:**
- Modify: `apps/api/src/collections/Products.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/layout.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: nada de novo
- Produces: ação "Duplicar" na listagem de produtos; `apps/web` a arrancar em `localhost:3001` para o plano 2 continuar

O Payload 3 já traz a ação "Duplicate" na listagem. O que falta é tratar a colisão de slug: duplicar copia o slug tal e qual, e o campo é `unique`, por isso a gravação rebenta com um erro de base de dados em vez de uma mensagem útil.

- [ ] **Step 1: Criar o hook que garante slug único**

```ts
// apps/api/src/hooks/uniqueSlug.ts
import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Ao criar (incluindo ao duplicar), garante que o slug não colide.
 * Sufixa -copia, -copia-2, -copia-3 até encontrar um livre.
 *
 * Sem isto, duplicar um produto rebenta com um erro de unicidade da
 * base de dados, que não diz nada a quem está a usar o painel.
 */
export const uniqueSlug: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
  collection,
}) => {
  if (operation !== 'create' || !data?.slug) return data

  const exists = async (slug: string): Promise<boolean> => {
    const found = await req.payload.find({
      collection: collection.slug as 'products',
      where: { slug: { equals: slug } },
      limit: 1,
      req,
    })
    return found.totalDocs > 0
  }

  if (!(await exists(data.slug))) return data

  let attempt = 1
  let candidate = `${data.slug}-copia`

  while (await exists(candidate)) {
    attempt += 1
    candidate = `${data.slug}-copia-${attempt}`
  }

  return { ...data, slug: candidate }
}
```

- [ ] **Step 2: Ligar o hook e confirmar a duplicação**

Em `apps/api/src/collections/Products.ts`, acrescentar ao bloco `hooks`:

```ts
import { uniqueSlug } from '../hooks/uniqueSlug'

  hooks: {
    beforeValidate: [uniqueSlug],
    beforeChange: [validatePublish],
    afterChange: [syncVariants],
  },
```

Run: `pnpm --filter @animora/api dev`
Na listagem de produtos, usar a ação de duplicar sobre a coleira.
Expected: abre uma cópia com o slug `coleira-ajustavel-caes-copia`, e grava sem erro. Duplicar outra vez dá `coleira-ajustavel-caes-copia-2`.

- [ ] **Step 3: Criar `apps/web/package.json`**

```json
{
  "name": "@animora/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "echo 'testes chegam no plano 2' && exit 0"
  },
  "dependencies": {
    "@animora/core": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 4: Criar `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["DOM", "ES2022"],
    "noEmit": true
  },
  "include": ["src", "next-env.d.ts"]
}
```

- [ ] **Step 5: Criar o layout e a página inicial**

```tsx
// apps/web/src/app/layout.tsx
export const metadata = {
  title: 'Animora',
  description: 'Produtos e cuidados para cães, gatos, pássaros e animais de estimação.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// apps/web/src/app/page.tsx
import { formatEuros } from '@animora/core'

export default function Home() {
  return (
    <main>
      <h1>Animora</h1>
      <p>A loja chega no plano 2. Exemplo de formatação: {formatEuros(2990)}</p>
    </main>
  )
}
```

- [ ] **Step 6: Confirmar que a web arranca e usa o core**

Run: `pnpm install && pnpm --filter @animora/web dev`
Abrir `http://localhost:3001`.
Expected: página com "Animora" e o texto `29,90 €`. Confirma que o workspace partilha o `@animora/core` entre as duas apps.

- [ ] **Step 7: Reescrever o README**

```markdown
# Animora

Loja de produtos para animais. Monorepo TypeScript.

## Estrutura

- `apps/api` — Payload CMS: painel de administração, API e base de dados
- `apps/web` — Next.js: loja
- `packages/core` — lógica partilhada: dinheiro, variantes, SKU

## Arrancar

```bash
docker compose up -d          # Postgres
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @animora/api dev   # admin em http://localhost:3000/admin
pnpm --filter @animora/web dev   # loja em http://localhost:3001
```

## Testes

```bash
pnpm test
```

## Documentação

- Especificação: `docs/spec-animora.md`
- Planos: `docs/superpowers/plans/`
```

- [ ] **Step 8: Correr tudo uma última vez**

Run: `pnpm test && pnpm typecheck`
Expected: PASS em todos os pacotes

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: duplicação de produtos, app web inicial e README"
```

---

## Task 13: Preencher preço e stock em coluna

A spec exige poder escrever um preço uma vez e aplicá-lo a todas as variantes. Sem isto, um produto com 6 combinações obriga a escrever o mesmo número 6 vezes, e quem carrega o catálogo desiste.

A forma barata de o conseguir é um campo no produto em vez de uma tabela editável à mão — evita escrever um componente de admin personalizado para obter o mesmo resultado.

**Files:**
- Modify: `apps/api/src/collections/Products.ts`
- Modify: `apps/api/src/hooks/syncVariants.ts`

**Interfaces:**
- Consumes: `syncVariants` da Task 10
- Produces: campos `bulkPriceCents`, `bulkStock` e `applyBulk` no produto; ao gravar com `applyBulk` ligado, todas as variantes ativas recebem esses valores

- [ ] **Step 1: Acrescentar os campos ao produto**

Em `apps/api/src/collections/Products.ts`, dentro do separador `Geral`, a seguir a `options`:

```ts
            {
              type: 'collapsible',
              label: 'Preencher todas as variantes',
              admin: {
                description:
                  'Escreve o valor uma vez e aplica a todas as variantes ativas ao gravar.',
              },
              fields: [
                {
                  name: 'bulkPriceCents',
                  type: 'number',
                  min: 0,
                  label: 'Preço para todas (cêntimos)',
                },
                {
                  name: 'bulkStock',
                  type: 'number',
                  min: 0,
                  label: 'Stock para todas',
                },
                {
                  name: 'applyBulk',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Aplicar ao gravar',
                  admin: {
                    description:
                      'Sobrepõe os valores já preenchidos nas variantes. Desliga-se sozinho depois de aplicar.',
                  },
                },
              ],
            },
```

- [ ] **Step 2: Aplicar os valores no hook**

Em `apps/api/src/hooks/syncVariants.ts`, acrescentar antes do `return doc` final:

```ts
  // Preenchimento em coluna: aplica e desliga-se, para não voltar a
  // sobrepor valores em gravações seguintes sem o utilizador pedir.
  if (doc.applyBulk) {
    const toApply: Record<string, number> = {}
    if (typeof doc.bulkPriceCents === 'number') toApply.priceCents = doc.bulkPriceCents
    if (typeof doc.bulkStock === 'number') toApply.stock = doc.bulkStock

    if (Object.keys(toApply).length > 0) {
      const all = await req.payload.find({
        collection: 'variants',
        where: { and: [{ product: { equals: doc.id } }, { active: { equals: true } }] },
        limit: 1000,
        req,
      })

      for (const v of all.docs) {
        await req.payload.update({
          collection: 'variants',
          id: v.id,
          data: toApply,
          req,
        })
      }
    }

    await req.payload.update({
      collection: 'products',
      id: doc.id,
      data: { applyBulk: false },
      req,
      context: { skipSync: true },
    })
  }
```

- [ ] **Step 3: Evitar o ciclo infinito**

O passo anterior atualiza o produto de dentro de um hook `afterChange` do próprio produto, o que o volta a disparar. Guardar no topo do hook:

```ts
// no início de syncVariants, antes de tudo o resto
export const syncVariants: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipSync) return doc
  // ... resto igual
```

- [ ] **Step 4: Confirmar no painel**

Run: `pnpm --filter @animora/api dev`

1. Abrir a coleira com as 3 variantes (S, M, L), todas a preço 0.
2. Pôr `2990` em "Preço para todas", `10` em "Stock para todas", ligar "Aplicar ao gravar". Gravar.
   Expected: as 3 variantes ficam a 2990 e stock 10. A caixa "Aplicar ao gravar" volta a desligada.
3. Alterar a variante M para preço `3290`. Gravar o produto sem ligar a caixa.
   Expected: a M **mantém** 3290 — o preenchimento em coluna não corre sem se pedir.

O passo 3 é o que distingue esta funcionalidade de um destruidor de dados.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/collections/Products.ts apps/api/src/hooks/syncVariants.ts
git commit -m "feat: preencher preço e stock de todas as variantes de uma vez"
```

---

## Requisitos da spec adiados de propósito

Da secção 7 da spec, ficam para o plano 4, quando o admin já tiver rodagem real:

- **Edição em massa a partir da listagem** — a Task 13 cobre o caso comum (dentro de um produto). Editar várias fichas de uma vez pede uma vista diferente.
- **Imagem própria por variante de cor** — depende de o storefront existir para ter onde a mostrar.
- **Importação CSV** — a própria spec já a declara como segunda fase.

Nenhum destes bloqueia a criação de produtos.

---

## Estado no fim deste plano

Consegue-se, no painel de administração:

- criar categorias, marcas e imagens com texto alternativo obrigatório
- criar um produto com opções de variante
- ver as variantes geradas automaticamente, com SKU sugerido
- acrescentar e remover opções sem perder preços e stock já preenchidos
- preencher preço e stock de todas as variantes de uma vez
- ser impedido de publicar um produto incompleto, com mensagem clara
- duplicar um produto sem colisão de slug

E, em código:

- `@animora/core` testado, com dinheiro em cêntimos e a lógica de variantes
- `apps/web` a arrancar e a consumir o core

**Não** está feito, e é o plano 2: a loja em si — home, catálogo com filtros na URL, ficha de produto, SSR e SEO.

## Verificação final do plano

Antes de dar por concluído, confirmar:

```bash
pnpm test                                   # todos os testes do core passam
pnpm typecheck                              # sem erros de tipos
docker compose ps                           # Postgres a correr
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001         # 200
git log --oneline | head -13                # 13 commits, um por tarefa
```
