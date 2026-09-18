# Identidade laranja/teal + fundação Shopify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Não parar em gates de aprovação** — instrução explícita do utilizador nesta execução (ver spec §0). Cada tarefa termina com `git commit` próprio.

**Goal:** Repintar a loja Animora (Next.js `apps/web`) com a identidade
laranja/teal/branco da spec definitiva, reestruturar o shell e a home
segundo a nova ordem, e preparar (sem ligar dados reais) um cliente
Shopify Storefront GraphQL.

**Architecture:** Reescreve os tokens Tailwind e a tipografia (fundação),
depois restiliza/reestrutura shell e home componente a componente,
mantendo `modules/catalog` (Payload) como fonte de dados real — nenhuma
tarefa desliga o catálogo que já funciona. Um cliente Shopify novo entra
como código morto e testável, sem substituir a fonte de dados atual.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript
strict, Tailwind CSS, next-intl, Vitest + Testing Library, Playwright
(verificação visual manual, não suite nova).

**Spec:** `docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md`
(e o original completo em `~/Downloads/Animora_Ecommerce_Especificacao_Tecnica.md`)

## Global Constraints

- Não gerar, procurar nem embutir imagens finais — novo espaço editorial
  usa `MediaPlaceholder`; fotografia real de produto já existente continua.
- Não hardcodar produto, preço, avaliação, venda ou benefício que não
  exista nos dados reais (`modules/catalog`).
- Server Component por padrão; Client Component só por interação real.
- `pnpm --filter @animora/web typecheck` e `pnpm --filter @animora/web test`
  têm de passar no fim de cada tarefa.
- Mensagens de UI em `apps/web/messages/pt.json` e `de.json` — nunca texto
  hardcoded fora do sistema de tradução.
- Cor, raio, sombra, espaçamento e duração de animação saem dos tokens da
  Tarefa A — nenhuma tarefa seguinte escreve um hex ou `px` novo à mão.
- `git commit` no fim de cada tarefa, mensagem descritiva, sem `--no-verify`.

---

## Tabela de tokens (fonte única — copiar exatamente, todas as tarefas)

| Papel | Antes (`ink`/`terracota`/...) | Depois (token novo) | Valor |
|---|---|---|---|
| Fundo da loja | `papel` `#F7F5EF` | `bg` | `#FFFDFC` |
| Fundo de cartão/superfície | `white` | `surface` | `#FFFFFF` |
| Creme pontual | — | `cream` | `#FDF3EC` |
| Ação primária | `terracota` `#E0623A` | `orange` | `#F57C00` |
| Ação primária hover | `terracota.dark` `#C44A24` | `orange-hover` | `#E96F00` |
| Estrutura/títulos escuro | `ink` `#18352A` | `teal-900` | `#085B6B` |
| Estrutura/apoio | `sage` `#6F8F72` | `teal-700` | `#0F6F78` |
| Acento/contraste | — | `aqua` | `#00B4B0` |
| Texto de leitura | `ink` `#18352A` | `text` | `#103F46` |
| Texto secundário | `ink-muted` `#4F685F` | `text-muted` | `#6D7F82` |
| Borda/divisória | `line` `rgba(111,143,114,.18)` | `border` | `#E8ECEC` |
| Sucesso | — | `success` | `#1F8A5B` |
| Erro/perigo | — | `danger` | `#C84444` |
| `floresta`/`floresta-fundo` | `#0D2305`/`#0A1A06` | **removido** — sem substituto 1:1; ver Tarefa A |

Raios: `radius-sm` 10px, `radius-md` 16px, `radius-lg` 22px, `radius-xl` 28px, `radius-pill` 999px (substitui `campo` 10px e `card` 14px).
Sombras: `shadow-card` `0 6px 24px rgba(8,91,107,.06)`, `shadow-card-hover` `0 12px 32px rgba(8,91,107,.10)`, `shadow-drawer` `0 20px 60px rgba(0,0,0,.16)`.
Motion: `fast` 140ms, `ui` 200ms, `medium` 420ms, `slow` 650ms, curva `cubic-bezier(.2,.8,.2,1)` (substitui `--curva`).
Tipografia: `font-display` = Fredoka (700/800), `font-sans` = Montserrat (400–700), `font-script` = Caveat (500–700, só decorativo).

---

## Task 1: Fundação — tokens, tipografia, base CSS

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Test: `apps/web/src/app/[locale]/layout.test.tsx` (criar se não existir; senão, checar snapshot/typecheck existente)

**Interfaces:**
- Produces: classes Tailwind `bg-bg`, `bg-surface`, `bg-cream`, `bg-orange`, `bg-orange-hover`, `text-teal-900`, `bg-teal-900`, `text-teal-700`, `bg-teal-700`, `bg-aqua`, `text-text`, `text-text-muted`, `border-border`, `rounded-sm|md|lg|xl|pill`, `shadow-card|card-hover|drawer`, `ease-brand`, `font-display`, `font-sans`, `font-script`. Todas as tarefas seguintes consomem estas classes — nenhuma inventa cor nova.

- [ ] **Passo 1:** Em `tailwind.config.ts`, substituir todo o bloco `colors` (linhas ~22–40) pela tabela de tokens acima (nomes à esquerda da coluna "Depois"). Remover `ink`, `ink-muted`, `terracota`, `sage`, `papel`, `line`, `floresta` por inteiro — sem aliases de compatibilidade.
- [ ] **Passo 2:** Substituir `borderRadius` (`campo`, `card`) por `sm/md/lg/xl/pill` com os valores acima. Substituir `boxShadow` (`sm`, `md`) por `card`, `card-hover`, `drawer`. Adicionar `transitionTimingFunction.brand` com a curva nova; manter ou remover `loja` conforme uso (grep por `ease-loja` antes de decidir).
- [ ] **Passo 3:** Em `fontFamily`, trocar `display: ['var(--fonte-titulo)', ...]` para apontar à variável CSS do Fredoka e `sans` para Montserrat; adicionar `script: ['var(--fonte-manuscrita)', 'cursive']` para o Caveat.
- [ ] **Passo 4:** Em `layout.tsx`, trocar os imports `Bricolage_Grotesque, Figtree` de `next/font/google` por `Fredoka, Montserrat, Caveat`; ajustar os pesos carregados (Fredoka 700/800; Montserrat 400/500/600/700; Caveat 500/600/700) e as variáveis CSS (`--fonte-titulo`, `--fonte-texto`, `--fonte-manuscrita`) passadas ao `<html>`/`<body>`.
- [ ] **Passo 5:** Em `globals.css`:
  - `body { @apply bg-bg font-sans text-text antialiased; }` (era `bg-white ... text-ink`).
  - `caret-color`/`accent-color` → `theme('colors.orange')`. `scrollbar-color` → `theme('colors.teal-700') theme('colors.cream')`.
  - `::selection` → `background-color: rgba(0, 180, 176, 0.28); color: theme('colors.text');` (aqua a 28%, mantendo a lógica de contraste documentada, só com a cor nova).
  - `.botao-principal`: `background-color: theme('colors.orange')`, hover `theme('colors.orange-hover')` — inverte a lógica antiga (antes repousava no tom escuro por contraste; `#F57C00` com texto branco já dá >4.5:1, confirmar com `npx -y wcag-contrast "#FFFFFF" "#F57C00"` ou cálculo manual antes de fechar o passo).
  - `.botao-contorno`: borda `border-border`, texto `text-text`, hover `border-orange`.
  - Remover a classe `.chao-floresta` e o seletor `.chao-floresta ::selection` por inteiro — não há "chão escuro" na nova identidade (grep `chao-floresta` depois deste passo tem de dar zero resultados fora deste ficheiro; ficheiros que ainda a referenciam ficam para as tarefas C–I, que a removem ao restilizar o seu próprio componente).
  - `:focus-visible` mantém-se (`ring-2 ring-orange ring-offset-2`), `--foco-fundo` passa a `theme('colors.surface')` sempre — sem variante escura, já que não há mais chão escuro.
- [ ] **Passo 6:** `pnpm --filter @animora/web typecheck` — tem de passar (confirma que nenhum ficheiro ainda compila contra classes/tokens removidos de forma que quebre tipos; erros de classe Tailwind não aparecem aqui, só em runtime/visual — não bloqueiam este passo).
- [ ] **Passo 7:** Arrancar o dev server (`NEXT_PUBLIC_API_URL=... npx next dev -p 3099` numa porta livre, per convenção do projeto) e confirmar por `curl`/Playwright que a Home ainda devolve 200 (vai estar visualmente quebrada até as tarefas C–I restilizarem cada componente — isso é esperado e não é regressão a corrigir aqui).
- [ ] **Passo 8:** Commit.

```bash
git add apps/web/tailwind.config.ts apps/web/src/styles/globals.css apps/web/src/app/\[locale\]/layout.tsx
git commit -m "feat(design): tokens laranja/teal, Fredoka/Montserrat/Caveat"
```

---

## Task 2: Cliente Shopify Storefront (scaffold, sem dado real)

**Files:**
- Create: `apps/web/src/lib/shopify/client.ts`
- Create: `apps/web/src/lib/shopify/client.test.ts`

**Interfaces:**
- Produces: `shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T>` — lança `ShopifyConfigError` se `SHOPIFY_STORE_DOMAIN` ou `SHOPIFY_STOREFRONT_ACCESS_TOKEN` estiverem em falta, e `ShopifyApiError` se a resposta tiver `errors[]` ou status não-2xx. Nenhuma outra tarefa consome isto ainda (fica pronto para a Fase "Catálogo real", fora deste plano).

- [ ] **Passo 1: variáveis de ambiente esperadas.** Adicionar a `apps/api/.env.example` (documentação, não segredo real) as chaves da spec §22: `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, `SHOPIFY_STOREFRONT_API_VERSION=2026-07`, `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` — comentário a dizer que pertencem à app `web`, não `api`, e mover para `apps/web/.env.example` (criar o ficheiro; hoje não existe nenhum `.env.example` em `apps/web`) junto com `SHOPIFY_STORE_DOMAIN`.
- [ ] **Passo 2: escrever o teste primeiro.**

```ts
// apps/web/src/lib/shopify/client.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('shopifyFetch', () => {
  const env = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...env }
  })
  afterEach(() => {
    process.env = env
    vi.unstubAllGlobals()
  })

  it('lança ShopifyConfigError se faltar SHOPIFY_STORE_DOMAIN', async () => {
    delete process.env.SHOPIFY_STORE_DOMAIN
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token-teste'
    const { shopifyFetch, ShopifyConfigError } = await import('./client')
    await expect(shopifyFetch('query { shop { name } }')).rejects.toBeInstanceOf(ShopifyConfigError)
  })

  it('envia a query, as variáveis e o token de acesso corretos', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'animora-teste.myshopify.com'
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token-teste'
    process.env.SHOPIFY_STOREFRONT_API_VERSION = '2026-07'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { shop: { name: 'Animora' } } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { shopifyFetch } = await import('./client')
    const resultado = await shopifyFetch<{ shop: { name: string } }>(
      'query { shop { name } }',
      { primeiro: 10 },
    )

    expect(resultado).toEqual({ shop: { name: 'Animora' } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://animora-teste.myshopify.com/api/2026-07/graphql.json')
    expect(init.headers['X-Shopify-Storefront-Access-Token']).toBe('token-teste')
    expect(JSON.parse(init.body)).toEqual({ query: 'query { shop { name } }', variables: { primeiro: 10 } })
  })

  it('lança ShopifyApiError se a resposta trouxer errors[]', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'animora-teste.myshopify.com'
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'token-teste'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ errors: [{ message: 'campo inválido' }] }) }),
    )
    const { shopifyFetch, ShopifyApiError } = await import('./client')
    await expect(shopifyFetch('query { invalido }')).rejects.toBeInstanceOf(ShopifyApiError)
  })
})
```

- [ ] **Passo 3: correr o teste, confirmar falha** (`pnpm --filter @animora/web test client.test.ts` → falha, `client.ts` não existe).
- [ ] **Passo 4: implementação mínima.**

```ts
// apps/web/src/lib/shopify/client.ts
/**
 * Scaffold do cliente Storefront GraphQL — spec
 * `docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md` §4.
 * Sem loja Shopify real ligada ainda: nenhum componente consome isto até
 * existirem credenciais reais e um plano de "catálogo real" à parte.
 */
export class ShopifyConfigError extends Error {}
export class ShopifyApiError extends Error {
  constructor(message: string, public readonly erros: unknown) {
    super(message)
  }
}

function variavelObrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new ShopifyConfigError(`Variável de ambiente obrigatória em falta: ${nome}`)
  }
  return valor
}

export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const dominio = variavelObrigatoria('SHOPIFY_STORE_DOMAIN')
  const token = variavelObrigatoria('SHOPIFY_STOREFRONT_ACCESS_TOKEN')
  const versao = process.env.SHOPIFY_STOREFRONT_API_VERSION ?? '2026-07'

  const resposta = await fetch(`https://${dominio}/api/${versao}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!resposta.ok) {
    throw new ShopifyApiError(`Storefront API devolveu ${resposta.status}`, null)
  }

  const corpo = (await resposta.json()) as { data?: T; errors?: unknown[] }
  if (corpo.errors) {
    throw new ShopifyApiError('Storefront API devolveu errors[]', corpo.errors)
  }
  return corpo.data as T
}
```

- [ ] **Passo 5:** `pnpm --filter @animora/web test client.test.ts` → passar.
- [ ] **Passo 6:** `pnpm --filter @animora/web typecheck`.
- [ ] **Passo 7:** Commit.

```bash
git add apps/web/src/lib/shopify apps/web/.env.example apps/api/.env.example
git commit -m "feat(shopify): scaffold do cliente Storefront GraphQL, sem dado ligado"
```

---

## Task 3: Announcement bar + Header + navegação

**Depends on:** Task A.

**Files:**
- Modify: `apps/web/src/components/layout/Header.tsx`
- Modify: `apps/web/src/components/icons/sprite.tsx` (ícones novos só se necessários — ver passo 2)
- Modify: `apps/web/messages/pt.json`, `apps/web/messages/de.json` (namespace `Header`, ajustar textos se a barra promo mudar de conteúdo)

**Interfaces:**
- Produces/mantém: `Header()` continua export default do módulo, sem mudar assinatura — `layout.tsx` que o importa não muda.

- [ ] **Passo 1:** Barra promocional (spec §6): `bg-orange`, texto branco Montserrat 13–14px peso 500, altura 34–38px desktop, conteúdo centralizado. Reduzir os 3 itens atuais (envio/slogan/dados) a uma mensagem principal em mobile (`hidden sm:flex` nos itens secundários) — a spec pede "remover conteúdo secundário" em mobile.
- [ ] **Passo 2:** Header principal: `bg-surface`, altura 76–84px desktop / 64px mobile (ajustar `py-4` atual), logo à esquerda (mantém `logo-cabecalho.png`), busca central em desktop (mantém o `<form>` existente, restilizar borda para `border-border`, foco `focus-within:border-orange`), conta/carrinho à direita, `border-b border-border` sem sombra. Ícones com área clicável mínima 44×44 — confirmar `min-h-11 min-w-11` nos `<Link>` de conta/carrinho (hoje só tem `min-h-11` no logo).
- [ ] **Passo 3:** Navegação por categorias: segunda linha 42–48px, Montserrat 14px peso 500, item correspondente a "Ofertas" (se existir categoria/rota de ofertas — hoje não há categoria "ofertas" nos dados; se não existir, não inventar uma — documentar no relatório da tarefa). Manter lista simples (sem mega menu de grupos): os dados reais (`listCategories`) não têm hierarquia (`parent` sempre `null` na base atual) — mega menu com agrupamentos falsos violaria "não hardcodar"; documentar como pendência de dados, não implementar agrupamento inventado.
- [ ] **Passo 4:** Rodar `grep -rn "chao-floresta\|terracota\|text-ink\|bg-papel" apps/web/src/components/layout/Header.tsx` — tem de dar zero depois deste passo.
- [ ] **Passo 5:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 6:** Verificação visual: dev server próprio + Playwright, capturar Header em 1440 e 390px, sem erros de consola.
- [ ] **Passo 7:** Commit.

---

## Task 4: Navegação mobile + Footer

**Depends on:** Task A.

**Files:**
- Modify: `apps/web/src/components/layout/BarraMobile.tsx`
- Modify: `apps/web/src/components/layout/Footer.tsx`

- [ ] **Passo 1:** Ler `BarraMobile.tsx` (drawer full-height, teclado, `Escape`, `focus trap` — spec §6 e regras de acessibilidade §19) e trocar só as classes de cor/tipografia pelos tokens novos, preservando toda a lógica de foco/teclado já implementada.
- [ ] **Passo 2:** `Footer.tsx`: restilizar para `bg-teal-900 text-white` (ou manter `bg-surface` com `border-t border-border` se o teal maciço no rodapé ficar pesado visualmente — decidir por captura, registar a escolha no relatório) e tipografia Montserrat. **Não adicionar** links para Institucional/Ajuda/Termos que não existem como página real — manter só o que já lá está (nome, descrição, ano), restilizado. Isto é uma divergência deliberada da spec §7, registada em §3 da spec deste repositório.
- [ ] **Passo 3:** `grep -rn "chao-floresta\|terracota\|text-ink\|bg-papel" apps/web/src/components/layout/BarraMobile.tsx apps/web/src/components/layout/Footer.tsx` → zero.
- [ ] **Passo 4:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 5:** Verificação visual (drawer aberto em 390px, footer em 1440px).
- [ ] **Passo 6:** Commit.

---

## Task 5: Hero em camadas

**Depends on:** Task A.

**Files:**
- Create: `apps/web/src/components/home/Hero.tsx`
- Create: `apps/web/src/components/home/Hero.test.tsx`
- Modify: `apps/web/messages/pt.json`, `apps/web/messages/de.json` (namespace `Hero` novo — data, título, subtítulo, oferta, CTA, benefícios)
- **Não modificar** `apps/web/src/app/[locale]/(home)/page.tsx` — a troca de `CarrosselCampanhas` por `Hero` acontece na Task J (integração), para não haver dois agentes a editar o mesmo ficheiro.

**Interfaces:**
- Produces: `Hero({ href, hrefSecundario }: { href: string; hrefSecundario: string })` — Server Component, sem props de imagem (a spec proíbe imagem final nesta fase). Task J passa as rotas reais (`/caes`, `/produtos`) ao integrar.

- [ ] **Passo 1:** Estrutura em camadas exigida pela spec §7 (nenhuma depende de uma imagem única):

```tsx
// apps/web/src/components/home/Hero.tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { MediaPlaceholder } from '../ui/MediaPlaceholder'

export async function Hero({ href, hrefSecundario }: { href: string; hrefSecundario: string }) {
  const t = await getTranslations('Hero')

  return (
    <section className="relative overflow-hidden rounded-xl bg-cream">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:min-h-[360px] sm:grid-cols-[1fr_1fr] sm:items-center sm:py-0 lg:min-h-[430px]">
        <div className="relative z-10 flex flex-col gap-4">
          <p className="text-sm font-medium text-teal-700">{t('data')}</p>
          <h1 className="font-display text-4xl font-bold text-teal-900 sm:text-5xl">{t('titulo')}</h1>
          <p className="max-w-md text-text-muted">{t('subtitulo')}</p>
          <p className="font-display text-2xl font-bold text-orange">{t('oferta')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={href} className="botao-principal">
              {t('cta')}
            </Link>
            <Link
              href={hrefSecundario}
              className="inline-flex items-center font-medium text-teal-900 underline underline-offset-4"
            >
              {t('ctaSecundario')}
            </Link>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
            <li>{t('beneficio1')}</li>
            <li>{t('beneficio2')}</li>
          </ul>
        </div>

        <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full">
          <MediaPlaceholder ratio="4/3" type="hero" label={t('petAlt')} fill />
          <span aria-hidden className="absolute right-[8%] top-[10%] h-16 w-16 rounded-full bg-aqua/20" />
          <span aria-hidden className="absolute bottom-[12%] left-[6%] h-10 w-10 rounded-full bg-orange/15" />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Passo 2:** Adicionar ao `messages/pt.json` e `messages/de.json` o namespace `Hero` com `data`, `titulo`, `subtitulo`, `oferta`, `cta`, `ctaSecundario`, `beneficio1`, `beneficio2`, `petAlt` — copy real da loja (reaproveitar o texto de `CarrosselCampanhas.slide2*` já existente como ponto de partida, adaptado ao novo layout, não inventar promessa comercial nova como desconto percentual que não existe numa campanha real).
- [ ] **Passo 3:** Teste de componente (`Hero.test.tsx`) confirmando que renderiza título, CTA com `href` correto e o `MediaPlaceholder` com `type="hero"` — seguir o padrão de teste já usado para outros componentes de `marketing/` (`vi`/Testing Library).
- [ ] **Passo 4:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 5:** Commit.

---

## Task 6: Categorias visuais

**Depends on:** Task A.

**Files:**
- Modify: `apps/web/src/components/marketing/CategoriasVisuais.tsx`

- [ ] **Passo 1:** `EscolhaSeuAnimal`: trocar o cartão retangular `aspect-[4/5]` por círculo 104–116px (`h-28 w-28 rounded-pill overflow-hidden`, `MediaPlaceholder` dentro), label Montserrat 14px semibold por baixo (fora do círculo, não sobreposto — a spec pede isto explicitamente, diferente do layout atual com texto sobre o placeholder). Hover: `translateY(-4px)` no item, `scale-[1.03]` só no círculo interno, sombra `shadow-card` a aparecer no hover.
- [ ] **Passo 2:** Mobile: `overflow-x-auto` com `scroll-snap-type: x mandatory` por item (a spec pede scroll horizontal com snap, não grid a espremer). `PalcoCategorias` já existe como wrapper — confirmar se aceita uma prop de layout diferente ou se precisa de uma variante; não duplicar o componente sem necessidade.
- [ ] **Passo 3:** `ComprarPorNecessidade`: restilizar os pills (`border-border`, hover `border-orange text-teal-900`) — estrutura já corresponde ao pedido da spec, só cor/tipografia mudam.
- [ ] **Passo 4:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test` (o teste existente de `facets`/`filters` não cobre este componente; se não houver teste de componente hoje, não é obrigatório criar um novo só por esta restilização — confirmar visualmente).
- [ ] **Passo 5:** Verificação visual em 1440/768/390px (scroll horizontal com snap no mobile).
- [ ] **Passo 6:** Commit.

---

## Task 7: ProductCard + tabs de produtos

**Depends on:** Task A.

**Files:**
- Modify: `apps/web/src/components/ui/ProductCard.tsx`
- Create: `apps/web/src/components/home/ProductTabs.tsx`
- Create: `apps/web/src/components/home/ProductTabs.test.tsx`
- Modify: `apps/web/messages/pt.json`, `apps/web/messages/de.json` (namespace `ProductTabs`: `emDestaque`, `ofertas`, `novidades`, `verTodosOsProdutos`)
- **Não modificar** `page.tsx` — `ProductTabs` recebe os três grupos já calculados via props; a troca de duas `<section>` separadas por `<ProductTabs>` acontece na Task J.

**Interfaces:**
- Produces: `ProductTabs({ grupos }: { grupos: { chave: 'destaque' | 'ofertas' | 'novidades'; titulo: string; produtos: ReactNode }[] })` — Client Component (só aqui há interação real: trocar de aba). Cada `produtos` é o grid de `<ProductCard>` já montado pelo Server Component pai (Task J), passado como `children`/`ReactNode` — `ProductTabs` não busca dados, só alterna visibilidade.

- [ ] **Passo 1:** `ProductCard.tsx` — trocar classes: `border-line`→`border-border`, `bg-papel`→`bg-cream` (fundo da área de mídia), `text-ink`→`text-text`, `text-ink-muted`→`text-text-muted`, `bg-floresta text-papel` (badges esgotado/desconto) → `bg-teal-900 text-white`, `hover:shadow-md`→`hover:shadow-card-hover`, `shadow-sm` implícito do cartão→`shadow-card`. `text-sage/40` (pata de fallback) → `text-teal-700/40`. Manter toda a lógica de dados (preço, stock, avaliação, favorito, adicionar ao carrinho) sem alteração.
- [ ] **Passo 2:** Teste primeiro para `ProductTabs`:

```tsx
// apps/web/src/components/home/ProductTabs.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProductTabs } from './ProductTabs'

describe('ProductTabs', () => {
  it('mostra o primeiro grupo por omissão e troca ao clicar noutra aba', async () => {
    render(
      <ProductTabs
        grupos={[
          { chave: 'destaque', titulo: 'Em destaque', produtos: <p>Produto A</p> },
          { chave: 'ofertas', titulo: 'Ofertas', produtos: <p>Produto B</p> },
        ]}
      />,
    )
    expect(screen.getByText('Produto A')).toBeVisible()
    expect(screen.queryByText('Produto B')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Ofertas' }))
    expect(screen.getByText('Produto B')).toBeVisible()
    expect(screen.queryByText('Produto A')).not.toBeInTheDocument()
  })
})
```

- [ ] **Passo 3:** Rodar o teste, confirmar falha (componente não existe).
- [ ] **Passo 4:** Implementação mínima — `role="tablist"`/`role="tab"`/`aria-selected`, `useState` para a aba ativa, `botao-principal-pequeno`-like para a aba ativa (`bg-orange text-white`) vs. inativa (`text-text-muted`), foco visível herdado da camada base:

```tsx
// apps/web/src/components/home/ProductTabs.tsx
'use client'

import { useState, type ReactNode } from 'react'

type Grupo = { chave: string; titulo: string; produtos: ReactNode }

export function ProductTabs({ grupos }: { grupos: Grupo[] }) {
  const [ativa, setAtiva] = useState(grupos[0]?.chave)

  return (
    <div>
      <div role="tablist" className="flex gap-2 border-b border-border">
        {grupos.map((g) => (
          <button
            key={g.chave}
            role="tab"
            aria-selected={g.chave === ativa}
            onClick={() => setAtiva(g.chave)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition-colors ${
              g.chave === ativa ? 'bg-orange text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {g.titulo}
          </button>
        ))}
      </div>
      {grupos.map((g) => (g.chave === ativa ? <div key={g.chave}>{g.produtos}</div> : null))}
    </div>
  )
}
```

- [ ] **Passo 5:** Rodar o teste, confirmar sucesso.
- [ ] **Passo 6:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 7:** Commit.

---

## Task 8: Banners secundários, marcas e benefícios

**Depends on:** Task A.

**Files:**
- Modify: `apps/web/src/components/marketing/SecaoCampanha.tsx`
- Create: `apps/web/src/components/marketing/Marcas.tsx` (extrai o bloco hoje inline em `page.tsx`)
- Modify: `apps/web/src/components/marketing/Beneficios.tsx`

**Interfaces:**
- Produces: `Marcas({ marcas }: { marcas: { slug: string; nome: string }[] })` — Server Component; Task J importa-o e remove o bloco `<section>` inline de `page.tsx`.

- [ ] **Passo 1:** `SecaoCampanha.tsx`: restilizar para os dois fundos da spec §7 (um `bg-teal-700 text-white`, outro `bg-cream text-teal-900`), `rounded-xl`, altura 250–320px desktop (`min-h-[250px] lg:min-h-[320px]`), `MediaPlaceholder` reservado para pet/produto. Confirmar como o componente escolhe a cor de fundo hoje (prop `tipo`/`inverter`?) e mapear `tipo="campaign"` → teal, `tipo="editorial"` → creme (ou o inverso — decidir pela ordem em que já são chamados em `page.tsx` e manter consistência visual, registar a escolha no relatório).
- [ ] **Passo 2:** `Marcas.tsx` novo — mover o `<section>` de marcas (hoje linhas ~200–218 de `page.tsx`) para este componente, mesma lógica (`marcas.map`), classes atualizadas (`border-t border-border`, `text-text-muted`, hover `text-teal-900`).
- [ ] **Passo 3:** `Beneficios.tsx` — restilizar ícones (`text-orange` em vez de `text-terracota`, círculo `border-border`), manter exatamente os 3 itens reais (`envio`, `dados`, `filtros`) — **não adicionar** "parcelamento" nem "compra segura" (não são verdade hoje; ver spec deste repositório §3).
- [ ] **Passo 4:** `grep -rn "chao-floresta\|terracota\|text-ink\|bg-papel\|bg-floresta" apps/web/src/components/marketing/SecaoCampanha.tsx apps/web/src/components/marketing/Beneficios.tsx` → zero.
- [ ] **Passo 5:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 6:** Commit (não inclui `page.tsx` — a remoção do bloco inline de marcas acontece na Task J junto com a criação do import).

---

## Task 9: Testemunhos e vistos recentemente (polimento)

**Depends on:** Task A.

**Files:**
- Modify: `apps/web/src/components/marketing/AprovadoPorQuemManda.tsx`
- Modify: `apps/web/src/components/marketing/VistosRecentemente.tsx`

- [ ] **Passo 1:** Restilizar ambos para os tokens novos (mesma lista de substituições das tarefas anteriores). Sem mudança estrutural — só cor/tipografia/sombra.
- [ ] **Passo 2:** `grep` de confirmação (tokens antigos → zero).
- [ ] **Passo 3:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 4:** Commit.

---

## Task 10: Integração da Home (só depois de E, F, G, H concluídas)

**Depends on:** Tasks A, E, F, G, H (e idealmente C, D, I para a página inteira bater a compasso, mas não é bloqueante tecnicamente).

**Files:**
- Modify: `apps/web/src/app/[locale]/(home)/page.tsx`
- Delete: `apps/web/src/components/marketing/CarrosselCampanhas.tsx` (confirmar com `grep -rln "CarrosselCampanhas"` que só `page.tsx` o importa antes de apagar)

**Interfaces:**
- Consumes: `Hero` (Task E), `ProductTabs` (Task G), `Marcas` (Task H) — assinaturas exatamente como definidas nessas tarefas.

- [ ] **Passo 1:** Trocar `<CarrosselCampanhas slides={[...]} />` por `<Hero href="/caes" hrefSecundario="/produtos" />`.
- [ ] **Passo 2:** Calcular `novidades` (novo grupo, `[...todos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)`), buscar avaliações em lote incluindo este terceiro grupo (`getAvaliacoesEmLote([...emDestaque, ...ofertas, ...novidades].map(...))`).
- [ ] **Passo 3:** Substituir as duas `<section>` de "Em destaque"/"Ofertas desta semana" por um único bloco `<ProductTabs grupos={[...]} />`, cada grupo com `titulo` vindo de `t('emDestaque')`/`t('ofertasDaSemana')`/uma nova chave `t('novidades')` (adicionar a `messages/*.json`) e `produtos` sendo o grid `<CascataProdutos>` de `<ProductCard>` já existente, um por grupo.
- [ ] **Passo 4:** Substituir o `<section>` inline de marcas por `<Marcas marcas={marcas} />`.
- [ ] **Passo 5:** Confirmar `grep -rln "CarrosselCampanhas" apps/web/src` só devolve o próprio ficheiro do componente e apagá-lo.
- [ ] **Passo 6:** `pnpm --filter @animora/web typecheck && pnpm --filter @animora/web test`.
- [ ] **Passo 7:** Verificação visual completa: dev server próprio + Playwright, capturar a Home inteira em 1440/768/390px, `page.on('console')`/`pageerror` sem erros, scroll completo para disparar animações antes de capturar `fullPage`.
- [ ] **Passo 8:** Commit.

---

## Encerramento (depois de J)

- [ ] Atualizar `apps/web/DESIGN.md` com a paleta/tipografia novas (substituir o documento "A Clareira e o Balcão" pelo conteúdo da spec §5 deste plano, no mesmo formato frontmatter+prosa já usado).
- [ ] Atualizar `docs/ROADMAP.md`: fechar a entrada "Linguagem visual premium" e a "Fase de criativos e motion" como substituídas por esta execução; registar Fases 4–8 da spec original (catálogo real Shopify, carrinho/checkout Shopify, conta, i18n de mercados, SEO/a11y/performance/analytics/testes) como pendência explícita, bloqueada por falta de credenciais reais da Storefront API.
- [ ] Atualizar `docs/CURRENT_STATE.md` com o resultado desta execução (arquivos alterados, decisões, limitações — mesmo formato dos registos de fase anteriores).
- [ ] `pnpm --filter @animora/web build` — build de produção tem de passar.
- [ ] Commit final da documentação.
