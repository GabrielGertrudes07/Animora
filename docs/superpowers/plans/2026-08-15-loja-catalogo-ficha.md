# Loja: Catálogo e Ficha de Produto — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr a loja de pé: home, catálogo com filtros na URL e ficha de produto com endereço próprio, renderizadas no servidor e indexáveis pelo Google.

**Architecture:** `apps/web` (Next.js App Router) consome a API REST do `apps/api` (Payload). Tudo Server Component por omissão; passa a Client só o que precisa de interação. Os filtros vivem na query string, lidos no servidor, para que a página filtrada seja renderizada e indexável. A camada que fala com a API isola-se em `src/modules/catalog`, e nenhum componente chama `fetch` diretamente.

**Tech Stack:** Next.js 15.4.11, React 19, TypeScript strict, Tailwind, `@animora/core` para dinheiro.

**Spec:** `docs/spec-animora.md`
**Plano anterior:** `docs/superpowers/plans/2026-08-15-fundacao-catalogo-admin.md`

## Global Constraints

- TypeScript com `"strict": true`
- Dinheiro SEMPRE em inteiros de cêntimos; formatar só na apresentação com `formatEuros` de `@animora/core`
- Mercado Portugal: EUR, locale `pt-PT`
- Toda a imagem renderizada usa o `alt` vindo do Payload; nunca `alt=""` num produto
- Nenhum componente em `src/components/` decide preço, stock ou disponibilidade — isso é dos módulos
- Nenhum módulo importa ficheiros internos de outro módulo, só o `index.ts`
- Mensagens de commit em português, formato `tipo: descrição`
- `next` fica fixado em `15.4.11` (peer dependency do `@payloadcms/next`); não passar para `^`

## O que a fase 1 nos ensinou e que este plano tem de respeitar

Estes pontos custaram rondas de correção na fase 1. Não os redescubram.

1. **Agrupar campos numa aba "Interno" no admin NÃO os protege.** A resposta REST do Payload é plana: `supplier`, `costCents`, `ean`, `warehouseLocation` e `shippingWeightG` saem como chaves de topo, exatamente como os campos públicos. **A loja tem de os remover explicitamente**, e é isso que a Task 2 faz. Assumir que a organização do formulário protege alguma coisa expõe o custo de compra e os fornecedores ao cliente.
2. **`limit: 0` no Payload significa "sem limite"**, não "zero resultados" (confirmado em `@payloadcms/drizzle/dist/find/findMany.js`). Um `limit` numérico baixo em consultas de catálogo trunca em silêncio.
3. **`depth=0` devolve as relações como ids; sem ele vêm como objetos.** Decidir conscientemente qual se quer em cada consulta.
4. **O Next em dev compila rotas ao primeiro acesso.** `/admin` responder 200 não significa que `/api/*` esteja pronto. Ao verificar por HTTP, aquecer as rotas antes de medir.
5. **O `zsh` come as queries `?where[...]`** (trata `[...]` como padrão de ficheiro). Ao verificar por linha de comandos, usar Python com `urllib`, ou aspas simples.
6. **Postgres corre em `localhost:5442`**, não 5432.

---

## File Structure

| Ficheiro | Responsabilidade |
|---|---|
| `apps/web/src/lib/api.ts` | cliente HTTP para a API do Payload, com tipos |
| `apps/web/src/modules/catalog/types.ts` | tipos públicos do catálogo (sem campos internos) |
| `apps/web/src/modules/catalog/sanitize.ts` | remove campos internos da resposta da API |
| `apps/web/src/modules/catalog/queries.ts` | consultas: listar, por slug, facetas |
| `apps/web/src/modules/catalog/filters.ts` | ler e escrever filtros na query string |
| `apps/web/src/modules/catalog/index.ts` | superfície pública do módulo |
| `apps/web/src/components/ui/Price.tsx` | formata cêntimos |
| `apps/web/src/components/ui/ProductCard.tsx` | card do catálogo |
| `apps/web/src/components/icons/sprite.tsx` | sprite SVG e `<Icon>` |
| `apps/web/src/app/layout.tsx` | layout, tipografia, tokens |
| `apps/web/src/app/page.tsx` | home |
| `apps/web/src/app/[categoria]/page.tsx` | catálogo com filtros |
| `apps/web/src/app/produto/[slug]/page.tsx` | ficha de produto |
| `apps/web/src/styles/globals.css` | Tailwind e tokens da paleta |

---

## Task 1: Tailwind, tokens e layout base

**Files:**
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: nada
- Produces: classes Tailwind disponíveis; tokens de cor `animora-*`; `lang="pt-PT"` no `<html>`

A paleta vem do site antigo, que está em `legacy/styles.css` e é boa — não a inventem de novo.

- [ ] **Step 1: Instalar Tailwind**

```bash
cd apps/web
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm add -D tailwindcss@^3.4.0 postcss autoprefixer
```

- [ ] **Step 2: Criar `apps/web/postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 3: Criar `apps/web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta herdada de legacy/styles.css — verde escuro, terracota, creme
        ink: '#18352A',
        'ink-muted': '#4F685F',
        terracota: { DEFAULT: '#D9825B', dark: '#BF6A44', strong: '#C76E47' },
        sage: { DEFAULT: '#6F8F72', dark: '#58735E' },
        cream: '#F7F5EF',
        line: 'rgba(111, 143, 114, 0.18)',
      },
      borderRadius: { card: '18px' },
      boxShadow: {
        sm: '0 10px 20px rgba(24, 53, 42, 0.06)',
        md: '0 18px 45px rgba(24, 53, 42, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Criar `apps/web/src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply bg-cream text-ink antialiased;
  }
  /* O site antigo não tinha nenhum estilo de foco visível — foi um dos
     defeitos apontados na crítica. Aqui é a camada base, num sítio só. */
  :focus-visible {
    @apply outline-none ring-2 ring-terracota ring-offset-2 ring-offset-cream;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Substituir `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Animora — cuidados para o teu animal',
    template: '%s · Animora',
  },
  description:
    'Alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos animais.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          Saltar para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}
```

O skip link estava em falta no site antigo e foi apontado na crítica. Fica aqui, numa camada que todas as páginas herdam.

- [ ] **Step 6: Confirmar que compila e o Tailwind aplica**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/web dev`
Abrir `http://localhost:3001` e confirmar por HTTP que a página responde 200 e que o HTML contém `lang="pt-PT"`:
```bash
curl -s http://localhost:3001 | grep -o 'lang="pt-PT"'
curl -s http://localhost:3001 | grep -c "Saltar para o conteúdo"
```
Expected: `lang="pt-PT"` presente, skip link presente.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: Tailwind, tokens da paleta e layout base da loja"
```

---

## Task 2: Cliente da API e remoção de campos internos

Esta é a tarefa de segurança deste plano. Os campos internos **não** estão protegidos pela API — a fase 1 confirmou que saem na resposta como quaisquer outros. É aqui que se cortam.

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/modules/catalog/types.ts`
- Create: `apps/web/src/modules/catalog/sanitize.ts`
- Test: `apps/web/src/modules/catalog/sanitize.test.ts`
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: nada
- Produces:
  - `apiGet<T>(path: string, revalidate?: number): Promise<T>`
  - `type PublicProduct`, `type PublicVariant`
  - `sanitizeProduct(raw: unknown): PublicProduct`
  - `INTERNAL_PRODUCT_FIELDS`, `INTERNAL_VARIANT_FIELDS`

- [ ] **Step 1: Configurar Vitest em `apps/web`**

`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
```

Em `apps/web/package.json`, trocar o script `test`:
```json
"test": "vitest run"
```

- [ ] **Step 2: Escrever o teste que falha**

```ts
// apps/web/src/modules/catalog/sanitize.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeProduct, INTERNAL_PRODUCT_FIELDS, INTERNAL_VARIANT_FIELDS } from './sanitize'

const cru = {
  id: 1,
  title: 'Coleira ajustável para cães',
  slug: 'coleira-ajustavel-caes',
  brand: { id: 1, name: 'HappyPaws', slug: 'happypaws' },
  categories: [{ id: 1, name: 'Coleiras', slug: 'coleiras' }],
  gallery: [],
  // campos internos que a API devolve e que NUNCA podem chegar ao browser
  supplier: 'Fornecedor Secreto Lda',
  variants: [
    {
      id: 1,
      sku: 'HAP-COL-S',
      combination: { Tamanho: 'S' },
      priceCents: 2990,
      stock: 12,
      active: true,
      ean: '5601234567890',
      warehouseLocation: 'A-12-3',
      shippingWeightG: 150,
      costCents: 1200,
    },
  ],
}

describe('sanitizeProduct', () => {
  it('mantém os campos públicos', () => {
    const p = sanitizeProduct(cru)
    expect(p.title).toBe('Coleira ajustável para cães')
    expect(p.slug).toBe('coleira-ajustavel-caes')
    expect(p.brand.name).toBe('HappyPaws')
    expect(p.variants[0]?.priceCents).toBe(2990)
    expect(p.variants[0]?.stock).toBe(12)
  })

  it('remove o fornecedor do produto', () => {
    const p = sanitizeProduct(cru) as unknown as Record<string, unknown>
    expect(p.supplier).toBeUndefined()
  })

  it('remove EAN, armazém, peso de portes e CUSTO DE COMPRA das variantes', () => {
    const v = sanitizeProduct(cru).variants[0] as unknown as Record<string, unknown>
    expect(v.ean).toBeUndefined()
    expect(v.warehouseLocation).toBeUndefined()
    expect(v.shippingWeightG).toBeUndefined()
    // O custo vive na variante desde a fase 1. Se este teste passar por o campo
    // não existir no produto, em vez de por ser removido da variante, o custo
    // de compra vaza para a loja.
    expect(v.costCents).toBeUndefined()
  })

  it('nao deixa passar nenhum campo interno, mesmo que a API acrescente outros', () => {
    const serializado = JSON.stringify(sanitizeProduct(cru))
    for (const campo of [...INTERNAL_PRODUCT_FIELDS, ...INTERNAL_VARIANT_FIELDS]) {
      expect(serializado).not.toContain(campo)
    }
    expect(serializado).not.toContain('Fornecedor Secreto')
    expect(serializado).not.toContain('A-12-3')
  })

  it('descarta variantes inativas', () => {
    const comInativa = {
      ...cru,
      variants: [...cru.variants, { ...cru.variants[0], id: 2, sku: 'X', active: false }],
    }
    expect(sanitizeProduct(comInativa).variants).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Correr e confirmar que falha**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/web test`
Expected: FAIL — `Cannot find module './sanitize'`

- [ ] **Step 4: Implementar**

```ts
// apps/web/src/modules/catalog/types.ts
export type PublicVariant = {
  id: number
  sku: string
  combination: Record<string, string>
  priceCents: number
  oldPriceCents?: number | null
  stock: number
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightG?: number | null
}

export type PublicProduct = {
  id: number
  title: string
  slug: string
  description?: unknown
  brand: { id: number; name: string; slug: string }
  categories: { id: number; name: string; slug: string }[]
  gallery: { image: { url: string; alt: string; width?: number; height?: number } }[]
  primaryImage?: { url: string; alt: string; width?: number; height?: number } | null
  metaTitle?: string | null
  metaDescription?: string | null
  variants: PublicVariant[]
}
```

```ts
// apps/web/src/modules/catalog/sanitize.ts
import type { PublicProduct, PublicVariant } from './types'

/**
 * Campos que existem no Payload para gestão e relatórios e que NUNCA
 * podem chegar ao browser.
 *
 * Atenção: no admin estes campos estão agrupados numa aba "Interno", mas
 * isso é só organização visual — a resposta REST do Payload é plana e
 * devolve-os ao lado dos públicos. Esta lista é a única barreira real.
 */
export const INTERNAL_PRODUCT_FIELDS = ['supplier'] as const
export const INTERNAL_VARIANT_FIELDS = [
  'ean',
  'warehouseLocation',
  'shippingWeightG',
  // O custo de compra vive na VARIANTE, não no produto: um saco de ração de
  // 2 kg e outro de 10 kg são variantes do mesmo produto com custos diferentes.
  // Foi movido durante a fase 1 — se procurares por ele no produto, não está lá.
  'costCents',
] as const

type Raw = Record<string, unknown>

function pickImage(raw: unknown): { url: string; alt: string; width?: number; height?: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Raw
  if (typeof m.url !== 'string') return null
  return {
    url: m.url,
    alt: typeof m.alt === 'string' ? m.alt : '',
    ...(typeof m.width === 'number' ? { width: m.width } : {}),
    ...(typeof m.height === 'number' ? { height: m.height } : {}),
  }
}

function sanitizeVariant(raw: Raw): PublicVariant {
  return {
    id: Number(raw.id),
    sku: String(raw.sku ?? ''),
    combination: (raw.combination ?? {}) as Record<string, string>,
    priceCents: Number(raw.priceCents ?? 0),
    oldPriceCents: typeof raw.oldPriceCents === 'number' ? raw.oldPriceCents : null,
    stock: Number(raw.stock ?? 0),
    lengthCm: typeof raw.lengthCm === 'number' ? raw.lengthCm : null,
    widthCm: typeof raw.widthCm === 'number' ? raw.widthCm : null,
    heightCm: typeof raw.heightCm === 'number' ? raw.heightCm : null,
    weightG: typeof raw.weightG === 'number' ? raw.weightG : null,
  }
}

/**
 * Constrói o objeto público campo a campo, em vez de apagar os internos
 * do objeto da API. É deliberado: com uma lista de exclusão, qualquer
 * campo novo acrescentado ao Payload amanhã vazaria por omissão. Assim,
 * um campo novo só chega ao browser se alguém o acrescentar aqui de propósito.
 */
export function sanitizeProduct(raw: unknown): PublicProduct {
  const p = (raw ?? {}) as Raw
  const brand = (p.brand ?? {}) as Raw
  const cats = Array.isArray(p.categories) ? p.categories : []
  const gallery = Array.isArray(p.gallery) ? p.gallery : []
  const variants = Array.isArray(p.variants) ? p.variants : []

  return {
    id: Number(p.id),
    title: String(p.title ?? ''),
    slug: String(p.slug ?? ''),
    description: p.description,
    brand: {
      id: Number(brand.id ?? 0),
      name: String(brand.name ?? ''),
      slug: String(brand.slug ?? ''),
    },
    categories: cats.map((c) => {
      const cat = c as Raw
      return {
        id: Number(cat.id ?? 0),
        name: String(cat.name ?? ''),
        slug: String(cat.slug ?? ''),
      }
    }),
    gallery: gallery
      .map((g) => pickImage((g as Raw).image))
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .map((image) => ({ image })),
    primaryImage: pickImage(p.primaryImage),
    metaTitle: typeof p.metaTitle === 'string' ? p.metaTitle : null,
    metaDescription: typeof p.metaDescription === 'string' ? p.metaDescription : null,
    variants: variants
      .map((v) => v as Raw)
      .filter((v) => v.active !== false)
      .map(sanitizeVariant),
  }
}
```

```ts
// apps/web/src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Leitura da API do Payload. Só GET — a loja não escreve nada nesta fase.
 * `revalidate` em segundos; 0 desliga a cache.
 */
export async function apiGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new ApiError(`GET ${path} devolveu ${res.status}`, res.status)
  }

  return (await res.json()) as T
}
```

- [ ] **Step 5: Correr e confirmar que passa**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/web test`
Expected: PASS, 5 testes

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib apps/web/src/modules apps/web/vitest.config.ts apps/web/package.json
git commit -m "feat: cliente da API e remoção de campos internos do catálogo"
```

---

## Task 3: Filtros na query string

**Files:**
- Create: `apps/web/src/modules/catalog/filters.ts`
- Test: `apps/web/src/modules/catalog/filters.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type CatalogFilters = { categoria?: string; marca?: string[]; precoMin?: number; precoMax?: number; ordem: SortKey }`
  - `type SortKey = 'relevancia' | 'preco-asc' | 'preco-desc'`
  - `parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters`
  - `filtersToQuery(f: CatalogFilters): string`

Os filtros vivem na URL para que a página filtrada seja renderizada no servidor e indexável, e para que o botão "voltar" funcione. No site antigo viviam em `localStorage`, invisíveis ao endereço.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/web/src/modules/catalog/filters.test.ts
import { describe, it, expect } from 'vitest'
import { parseFilters, filtersToQuery } from './filters'

describe('parseFilters', () => {
  it('devolve valores por omissão quando nao ha nada na query', () => {
    expect(parseFilters({})).toEqual({ ordem: 'relevancia' })
  })

  it('lê uma marca simples', () => {
    expect(parseFilters({ marca: 'happypaws' }).marca).toEqual(['happypaws'])
  })

  it('lê várias marcas', () => {
    expect(parseFilters({ marca: ['happypaws', 'petnest'] }).marca).toEqual([
      'happypaws',
      'petnest',
    ])
  })

  it('lê o intervalo de preço em euros e converte para cêntimos', () => {
    const f = parseFilters({ preco: '10-50' })
    expect(f.precoMin).toBe(1000)
    expect(f.precoMax).toBe(5000)
  })

  it('ignora intervalos de preço malformados', () => {
    expect(parseFilters({ preco: 'abc' }).precoMin).toBeUndefined()
    expect(parseFilters({ preco: '10-' }).precoMin).toBeUndefined()
    expect(parseFilters({ preco: '-5-10' }).precoMin).toBeUndefined()
  })

  it('troca os limites se vierem ao contrário', () => {
    const f = parseFilters({ preco: '50-10' })
    expect(f.precoMin).toBe(1000)
    expect(f.precoMax).toBe(5000)
  })

  it('aceita apenas chaves de ordenação conhecidas', () => {
    expect(parseFilters({ ordem: 'preco-asc' }).ordem).toBe('preco-asc')
    expect(parseFilters({ ordem: 'inventada' }).ordem).toBe('relevancia')
  })

  it('ignora parâmetros que nao sao filtros públicos', () => {
    const f = parseFilters({ fornecedor: 'x', costCents: '100' }) as Record<string, unknown>
    expect(f.fornecedor).toBeUndefined()
    expect(f.costCents).toBeUndefined()
  })
})

describe('filtersToQuery', () => {
  it('omite a ordenação por omissão', () => {
    expect(filtersToQuery({ ordem: 'relevancia' })).toBe('')
  })

  it('escreve marcas e preço', () => {
    const q = filtersToQuery({ ordem: 'preco-asc', marca: ['happypaws'], precoMin: 1000, precoMax: 5000 })
    expect(q).toContain('marca=happypaws')
    expect(q).toContain('preco=10-50')
    expect(q).toContain('ordem=preco-asc')
  })

  it('faz a viagem de ida e volta', () => {
    const original = { ordem: 'preco-desc' as const, marca: ['a', 'b'], precoMin: 500, precoMax: 12000 }
    const sp = Object.fromEntries(new URLSearchParams(filtersToQuery(original)))
    const voltou = parseFilters({ ...sp, marca: ['a', 'b'] })
    expect(voltou).toEqual(original)
  })
})
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/web test filters`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar**

```ts
// apps/web/src/modules/catalog/filters.ts

export type SortKey = 'relevancia' | 'preco-asc' | 'preco-desc'

const SORT_KEYS: readonly SortKey[] = ['relevancia', 'preco-asc', 'preco-desc']

export type CatalogFilters = {
  marca?: string[]
  precoMin?: number
  precoMax?: number
  ordem: SortKey
}

type SearchParams = Record<string, string | string[] | undefined>

function toArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

/**
 * Lê os filtros da query string.
 *
 * Só reconhece parâmetros públicos. Qualquer outro — incluindo tentativas
 * de filtrar por campos internos como `fornecedor` ou `costCents` — é
 * ignorado em silêncio, e nunca chega à consulta à API.
 */
export function parseFilters(sp: SearchParams): CatalogFilters {
  const f: CatalogFilters = { ordem: 'relevancia' }

  const marca = toArray(sp.marca)
  if (marca && marca.length > 0) f.marca = marca

  const preco = typeof sp.preco === 'string' ? sp.preco : undefined
  if (preco && /^\d+-\d+$/.test(preco)) {
    const [a, b] = preco.split('-').map((n) => Number(n) * 100)
    if (a !== undefined && b !== undefined) {
      f.precoMin = Math.min(a, b)
      f.precoMax = Math.max(a, b)
    }
  }

  const ordem = typeof sp.ordem === 'string' ? sp.ordem : undefined
  if (ordem && (SORT_KEYS as readonly string[]).includes(ordem)) {
    f.ordem = ordem as SortKey
  }

  return f
}

/** Escreve os filtros de volta na query string, omitindo o que é omissão. */
export function filtersToQuery(f: CatalogFilters): string {
  const p = new URLSearchParams()

  for (const m of f.marca ?? []) p.append('marca', m)

  if (f.precoMin !== undefined && f.precoMax !== undefined) {
    p.set('preco', `${f.precoMin / 100}-${f.precoMax / 100}`)
  }

  if (f.ordem !== 'relevancia') p.set('ordem', f.ordem)

  return p.toString()
}
```

- [ ] **Step 4: Correr e confirmar que passa**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/web test filters`
Expected: PASS, 11 testes

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/catalog/filters.ts apps/web/src/modules/catalog/filters.test.ts
git commit -m "feat: filtros do catálogo lidos e escritos na query string"
```

---

## Task 4: Consultas ao catálogo

**Files:**
- Create: `apps/web/src/modules/catalog/queries.ts`
- Create: `apps/web/src/modules/catalog/index.ts`

**Interfaces:**
- Consumes: `apiGet` (Task 2), `sanitizeProduct` (Task 2), `CatalogFilters` (Task 3)
- Produces:
  - `listProducts(f: CatalogFilters): Promise<PublicProduct[]>`
  - `getProductBySlug(slug: string): Promise<PublicProduct | null>`
  - `listAllSlugs(): Promise<string[]>`
  - `listBrands(): Promise<{ name: string; slug: string }[]>`

- [ ] **Step 1: Implementar as consultas**

```ts
// apps/web/src/modules/catalog/queries.ts
import { apiGet } from '../../lib/api'
import { sanitizeProduct } from './sanitize'
import type { PublicProduct } from './types'
import type { CatalogFilters } from './filters'

type Paginated<T> = { docs: T[]; totalDocs: number }

/**
 * `limit=0` no Payload significa SEM LIMITE, não zero resultados
 * (`@payloadcms/drizzle/dist/find/findMany.js`). É o que queremos aqui:
 * um limite numérico baixo truncaria o catálogo em silêncio.
 */
const NO_LIMIT = 0

async function variantsOf(productId: number) {
  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/variants?limit=${NO_LIMIT}&depth=0&where[product][equals]=${productId}`,
  )
  return res.docs
}

/** Produtos publicados, com as variantes já anexadas e sanitizadas. */
export async function listProducts(f: CatalogFilters): Promise<PublicProduct[]> {
  const params = new URLSearchParams({
    limit: String(NO_LIMIT),
    depth: '2',
    'where[_status][equals]': 'published',
  })

  for (const m of f.marca ?? []) params.append('where[brand.slug][in]', m)

  const res = await apiGet<Paginated<Record<string, unknown>>>(`/api/products?${params}`)

  const comVariantes = await Promise.all(
    res.docs.map(async (d) => ({ ...d, variants: await variantsOf(Number(d.id)) })),
  )

  let produtos = comVariantes.map(sanitizeProduct).filter((p) => p.variants.length > 0)

  if (f.precoMin !== undefined && f.precoMax !== undefined) {
    produtos = produtos.filter((p) =>
      p.variants.some((v) => v.priceCents >= f.precoMin! && v.priceCents <= f.precoMax!),
    )
  }

  const menorPreco = (p: PublicProduct) => Math.min(...p.variants.map((v) => v.priceCents))

  if (f.ordem === 'preco-asc') produtos.sort((a, b) => menorPreco(a) - menorPreco(b))
  if (f.ordem === 'preco-desc') produtos.sort((a, b) => menorPreco(b) - menorPreco(a))

  return produtos
}

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  const res = await apiGet<Paginated<Record<string, unknown>>>(
    `/api/products?limit=1&depth=2&where[slug][equals]=${encodeURIComponent(slug)}&where[_status][equals]=published`,
  )

  const doc = res.docs[0]
  if (!doc) return null

  const p = sanitizeProduct({ ...doc, variants: await variantsOf(Number(doc.id)) })
  return p.variants.length > 0 ? p : null
}

/** Para `generateStaticParams` da ficha de produto. */
export async function listAllSlugs(): Promise<string[]> {
  const res = await apiGet<Paginated<{ slug: string }>>(
    `/api/products?limit=${NO_LIMIT}&depth=0&where[_status][equals]=published`,
  )
  return res.docs.map((d) => d.slug)
}

export async function listBrands(): Promise<{ name: string; slug: string }[]> {
  const res = await apiGet<Paginated<{ name: string; slug: string }>>(
    `/api/brands?limit=${NO_LIMIT}&depth=0`,
  )
  return res.docs.map((d) => ({ name: d.name, slug: d.slug }))
}
```

- [ ] **Step 2: Criar a superfície pública do módulo**

```ts
// apps/web/src/modules/catalog/index.ts
export { listProducts, getProductBySlug, listAllSlugs, listBrands } from './queries'
export { parseFilters, filtersToQuery } from './filters'
export { sanitizeProduct, INTERNAL_PRODUCT_FIELDS, INTERNAL_VARIANT_FIELDS } from './sanitize'
export type { PublicProduct, PublicVariant } from './types'
export type { CatalogFilters, SortKey } from './filters'
```

- [ ] **Step 3: Confirmar tipos**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r typecheck`
Expected: limpo

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/modules/catalog
git commit -m "feat: consultas ao catálogo com variantes anexadas"
```

---

## Task 5: Ícones SVG e componentes de apresentação

**Files:**
- Create: `apps/web/src/components/icons/sprite.tsx`
- Create: `apps/web/src/components/ui/Price.tsx`
- Create: `apps/web/src/components/ui/ProductCard.tsx`

**Interfaces:**
- Consumes: `formatEuros` de `@animora/core`, `PublicProduct` (Task 2)
- Produces: `<Icon name={...} />`, `<Price cents={...} />`, `<ProductCard product={...} />`

O site antigo usava Material Symbols, que renderiza ligaduras de texto: se a fonte falhar, o utilizador lê "shopping_cart" no ecrã, e **um leitor de ecrã lê sempre isso**. Foi um dos piores defeitos de acessibilidade apontados na crítica. Aqui é SVG desenhado.

- [ ] **Step 1: Criar o sprite de ícones**

```tsx
// apps/web/src/components/icons/sprite.tsx
const PATHS = {
  cart: 'M6 6h15l-1.5 9h-12zM6 6L5 3H2m4 16a1 1 0 100 2 1 1 0 000-2zm12 0a1 1 0 100 2 1 1 0 000-2z',
  heart: 'M12 20s-7-4.5-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.5-7 9-7 9z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  shield: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
  paw: 'M5 11a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM9 7a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm-3 5c-3 0-5 2-5 4s2 3 5 3 5-1 5-3-2-4-5-4z',
} as const

export type IconName = keyof typeof PATHS

/**
 * Ícone em SVG, herdando a cor do texto.
 *
 * Decorativo por omissão (`aria-hidden`). Se for a única coisa dentro de
 * um botão, passar `title` para lhe dar nome acessível.
 */
export function Icon({
  name,
  className = 'h-5 w-5',
  title,
}: {
  name: IconName
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  )
}
```

- [ ] **Step 2: Criar o componente de preço**

```tsx
// apps/web/src/components/ui/Price.tsx
import { formatEuros } from '@animora/core'

/**
 * Formata cêntimos inteiros. É o ÚNICO sítio da loja onde dinheiro vira texto.
 * `formatEuros` rebenta se receber decimais — é de propósito.
 */
export function Price({
  cents,
  old,
  className = '',
}: {
  cents: number
  old?: number | null
  className?: string
}) {
  return (
    <span className={className}>
      <span className="text-lg font-bold text-ink">{formatEuros(cents)}</span>
      {old && old > cents ? (
        <span className="ml-2 text-sm text-ink-muted line-through">{formatEuros(old)}</span>
      ) : null}
    </span>
  )
}
```

- [ ] **Step 3: Criar o card de produto**

```tsx
// apps/web/src/components/ui/ProductCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { PublicProduct } from '../../modules/catalog'
import { Price } from './Price'

export function ProductCard({ product }: { product: PublicProduct }) {
  const barata = product.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
  const img = product.primaryImage ?? product.gallery[0]?.image ?? null
  const stockTotal = product.variants.reduce((s, v) => s + v.stock, 0)

  return (
    <article className="group overflow-hidden rounded-card bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/produto/${product.slug}`} className="block">
        <div className="relative aspect-square bg-cream">
          {img ? (
            <Image
              src={img.url}
              alt={img.alt}
              width={img.width ?? 600}
              height={img.height ?? 600}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-1 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">{product.brand.name}</p>
          <h3 className="font-semibold leading-snug text-ink">{product.title}</h3>
          <Price cents={barata.priceCents} old={barata.oldPriceCents} className="mt-2 block" />
          <p className="text-sm text-ink-muted">
            {stockTotal > 0 ? `${stockTotal} em stock` : 'Indisponível'}
          </p>
        </div>
      </Link>
    </article>
  )
}
```

`width` e `height` são obrigatórios: sem eles a página salta enquanto as imagens carregam, que foi o defeito de layout apontado na crítica ao site antigo.

- [ ] **Step 4: Confirmar tipos**

Run: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r typecheck`
Expected: limpo

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components
git commit -m "feat: ícones SVG e componentes de preço e card de produto"
```

---

## Task 6: Página de catálogo com filtros

**Files:**
- Create: `apps/web/src/app/[categoria]/page.tsx`
- Modify: `apps/web/next.config.mjs`

**Interfaces:**
- Consumes: `listProducts`, `parseFilters`, `listBrands` (Tasks 3 e 4), `ProductCard` (Task 5)
- Produces: rota `/[categoria]` renderizada no servidor, com filtros lidos da query string

- [ ] **Step 1: Permitir imagens do domínio da API**

Em `apps/web/next.config.mjs`:
```js
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Criar a página de catálogo**

```tsx
// apps/web/src/app/[categoria]/page.tsx
import type { Metadata } from 'next'
import { listProducts, parseFilters } from '../../modules/catalog'
import { ProductCard } from '../../components/ui/ProductCard'

type Props = {
  params: Promise<{ categoria: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params
  const nome = categoria.charAt(0).toUpperCase() + categoria.slice(1)
  return {
    title: nome,
    description: `Produtos de ${nome} para o teu animal, na Animora.`,
  }
}

export default async function CatalogoPage({ params, searchParams }: Props) {
  const { categoria } = await params
  const filtros = parseFilters(await searchParams)
  const produtos = await listProducts(filtros)

  return (
    <main id="conteudo" className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold capitalize text-ink">{categoria}</h1>
      <p className="mt-2 text-ink-muted">
        {produtos.length === 1 ? '1 produto' : `${produtos.length} produtos`}
      </p>

      {produtos.length === 0 ? (
        <div className="mt-10 rounded-card bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-ink">Nenhum produto corresponde aos filtros</h2>
          <p className="mt-2 text-ink-muted">Experimenta alargar o intervalo de preço.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {produtos.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Verificar por HTTP que o conteúdo vem do servidor**

Com o `apps/api` a correr na 3000 e produtos publicados, arrancar a loja:
```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --filter @animora/web dev
```

Aquecer a rota e depois confirmar que o **HTML de origem** já contém os produtos — é isto que decide o SEO:
```bash
curl -s http://localhost:3001/coleiras > /dev/null
curl -s http://localhost:3001/coleiras | grep -c "Coleira ajustável"
curl -s http://localhost:3001/coleiras | grep -o "29,90 €"
```
Expected: o título do produto e o preço aparecem no HTML sem JavaScript correr. Se aparecerem só depois de o browser executar scripts, a página não está a renderizar no servidor e o objetivo do plano falhou.

- [ ] **Step 4: Confirmar que os filtros funcionam pela URL**

```bash
curl -s "http://localhost:3001/coleiras?ordem=preco-asc" | grep -c "Coleira"
curl -s "http://localhost:3001/coleiras?preco=0-1" | grep -c "Nenhum produto"
```
Expected: a primeira devolve produtos; a segunda devolve o estado vazio, porque nenhum produto custa menos de 1 €.

- [ ] **Step 5: Confirmar que campos internos NÃO aparecem no HTML**

```bash
curl -s http://localhost:3001/coleiras | grep -ciE "supplier|costCents|warehouseLocation|ean"
```
Expected: **0**. Se aparecer qualquer um, a sanitização da Task 2 tem um buraco e isto é Critical.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app apps/web/next.config.mjs
git commit -m "feat: página de catálogo com filtros na URL"
```

---

## Task 7: Ficha de produto

**Files:**
- Create: `apps/web/src/app/produto/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getProductBySlug`, `listAllSlugs` (Task 4), `Price` (Task 5)
- Produces: rota `/produto/[slug]` com metadados próprios e geração estática

Esta rota é a resposta aos defeitos nº1 e nº2 da crítica ao site antigo: lá, um produto só existia dentro de um modal, sem endereço próprio, logo não se partilhava nem se indexava.

- [ ] **Step 1: Criar a ficha**

```tsx
// apps/web/src/app/produto/[slug]/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductBySlug, listAllSlugs } from '../../../modules/catalog'
import { Price } from '../../../components/ui/Price'
import { Icon } from '../../../components/icons/sprite'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = await getProductBySlug(slug)
  if (!p) return { title: 'Produto não encontrado' }

  const img = p.primaryImage ?? p.gallery[0]?.image ?? null

  return {
    title: p.metaTitle ?? p.title,
    description: p.metaDescription ?? `${p.title} da marca ${p.brand.name}, na Animora.`,
    openGraph: {
      title: p.metaTitle ?? p.title,
      description: p.metaDescription ?? p.title,
      images: img ? [{ url: img.url, alt: img.alt }] : [],
    },
  }
}

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params
  const p = await getProductBySlug(slug)
  if (!p) notFound()

  const barata = p.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
  const img = p.primaryImage ?? p.gallery[0]?.image ?? null

  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-card bg-white shadow-sm">
          {img ? (
            <Image
              src={img.url}
              alt={img.alt}
              width={img.width ?? 800}
              height={img.height ?? 800}
              className="h-full w-full object-cover"
              priority
            />
          ) : null}
        </div>

        <div>
          <p className="text-sm uppercase tracking-wide text-ink-muted">{p.brand.name}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">{p.title}</h1>
          <Price cents={barata.priceCents} old={barata.oldPriceCents} className="mt-4 block" />

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Opções disponíveis
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.variants.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
              >
                {Object.entries(v.combination).map(([k, val]) => `${k}: ${val}`).join(' · ') ||
                  'Padrão'}
                <span className="ml-2 text-ink-muted">
                  {v.stock > 0 ? `${v.stock} em stock` : 'esgotado'}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Icon name="shield" className="h-4 w-4" />
            Envio grátis acima de 50 €
          </p>
        </div>
      </div>
    </main>
  )
}
```

A menção ao envio grátis existe porque a regra está implementada mas nunca era comunicada no site antigo — foi apontado na crítica como a alavanca de conversão mais barata e desperdiçada.

- [ ] **Step 2: Verificar que a ficha responde e traz metadados**

```bash
curl -s http://localhost:3001/produto/coleira-ajustavel-caes > /dev/null
curl -s http://localhost:3001/produto/coleira-ajustavel-caes | grep -o "<title>[^<]*</title>"
curl -s http://localhost:3001/produto/coleira-ajustavel-caes | grep -c 'property="og:'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/produto/nao-existe
```
Expected: título com o nome do produto; pelo menos uma meta `og:`; slug inexistente devolve 404.

- [ ] **Step 3: Confirmar ausência de campos internos**

```bash
curl -s http://localhost:3001/produto/coleira-ajustavel-caes | grep -ciE "supplier|costCents|warehouseLocation|ean"
```
Expected: **0**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/produto
git commit -m "feat: ficha de produto com endereço próprio e metadados"
```

---

## Task 8: Home

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: `listProducts` (Task 4), `ProductCard` (Task 5), `Icon` (Task 5)
- Produces: rota `/`

- [ ] **Step 1: Substituir a home**

```tsx
// apps/web/src/app/page.tsx
import Link from 'next/link'
import { listProducts } from '../modules/catalog'
import { ProductCard } from '../components/ui/ProductCard'
import { Icon } from '../components/icons/sprite'

export default async function Home() {
  const destaques = (await listProducts({ ordem: 'relevancia' })).slice(0, 4)

  return (
    <main id="conteudo">
      <section className="bg-ink px-6 py-20 text-cream">
        <div className="mx-auto max-w-6xl">
          <p className="flex items-center gap-2 text-sm uppercase tracking-wide text-terracota">
            <Icon name="paw" className="h-4 w-4" />
            Cuidados e bem-estar para cada animal
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-5xl font-bold leading-tight">
            Cuide do seu companheiro com produtos pensados para a vida real.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/80">
            Alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos animais.
          </p>
          <Link
            href="/coleiras"
            className="mt-8 inline-block rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark"
          >
            Explorar loja
          </Link>
        </div>
      </section>

      {destaques.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-2xl font-bold text-ink">Em destaque</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
curl -s http://localhost:3001/ > /dev/null
curl -s http://localhost:3001/ | grep -c "Cuide do seu companheiro"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/
```
Expected: 200 e o título presente no HTML de origem.

- [ ] **Step 3: Correr tudo**

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm test
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm typecheck
```
Expected: 36 testes do core + 16 da web a passar; typecheck limpo.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: home da loja com destaques"
```

---

## Estado no fim deste plano

A loja existe e é indexável:

- home com destaques
- catálogo por categoria, com filtros que vivem na URL e sobrevivem ao botão "voltar"
- ficha de produto com endereço próprio, metadados e imagem de partilha
- tudo renderizado no servidor: o HTML de origem já traz os produtos e os preços
- campos internos (fornecedor, custo, EAN, armazém) cortados na fronteira, com teste que falha se algum passar
- ícones em SVG, foco visível, skip link e `prefers-reduced-motion` respeitado

**Não** está feito, e é o plano 3: carrinho, contas de cliente, encomendas e checkout.

## Verificação final do plano

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm test        # core + web
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm typecheck   # sem erros
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/                          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/coleiras                   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/produto/nao-existe         # 404
curl -s http://localhost:3001/coleiras | grep -ciE "supplier|costCents|warehouseLocation|ean" # 0
git log --oneline | head -8
```
