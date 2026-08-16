# Camada de Retalho — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a loja parecer uma loja. Densidade, preço em destaque, pesquisa, avaliações e ação direta — sem inventar prova social nem urgência.

**Architecture:** A arquitetura, as coleções e a paleta ficam como estão. Muda a camada de apresentação em `apps/web`, e acrescentam-se duas peças de dados em `apps/api`: pesquisa por texto e uma coleção de avaliações. O herói da home passa a ser conteúdo gerido, não código.

**Tech Stack:** Payload CMS 3.88, Next.js 15 App Router, React 19, TypeScript strict, Tailwind, GSAP, `@animora/core`.

**Spec:** `docs/superpowers/specs/2026-08-16-camada-de-retalho-design.md`

## Global Constraints

- TypeScript `"strict": true`
- **Dinheiro em cêntimos inteiros**, formatado só com `formatEuros`
- Mercado **Portugal**: EUR, `pt-PT`
- Paleta existente: `ink #18352A`, `terracota #D9825B`, `cream #F7F5EF` — **não inventar cores novas**
- Toda a imagem com `alt` real, `width` e `height` explícitos
- **Campos internos nunca chegam ao cliente** — a barreira é `sanitize.ts`, e cresce com os campos novos
- Nenhum componente decide preço, stock ou disponibilidade — isso é dos módulos
- Commits em português, `tipo: descrição`

## As três regras de honestidade (§3 da spec)

Estas não são preferências. O utilizador vai vender este site a outra pessoa.

1. **Avaliações não se inventam.** Sem avaliações reais, não se mostra nada — nem "0 estrelas", nem "sem avaliações" em cinzento. Ausência silenciosa. O seeder semeia-as só para a demonstração.
2. **Urgência só quando é verdade.** "Restam N" apenas com stock ≤ 5 a sério. Sem contadores regressivos, sem "17 pessoas a ver".
3. **"Mais vendidos" vem das encomendas.** Sem vendas suficientes, mostra os recentes **e diz que são recentes**.

**Se implementares algo que viole uma destas, o trabalho não passa** — mesmo que fique bonito.

## O que as fases anteriores ensinaram

1. **Abrir `access.read` numa coleção abre todos os campos dela.** As avaliações têm texto de clientes e ligação a contas.
2. **`req.user` não significa "staff"** — usa `apps/api/src/access/staff.ts`.
3. **Guardas que contam irmãos e decidem são atravessadas** — existe `hooks/serializar.ts`.
4. **Props de Server para Client Component são serializadas no HTML.** Já houve duas fugas por isto. Passa só o que a interface precisa.
5. **Um comentário que afirma segurança sem a verificar é pior que nenhum.**
6. `limit: 0` é "sem limite"; `depth=0` devolve ids; **`grep -c` conta linhas, não ocorrências** — usa `grep -o | wc -l`.
7. **Não corras dois agentes contra a mesma base de dados** — 52 testes falharam por isso.

---

## File Structure

| Ficheiro | Responsabilidade |
|---|---|
| `apps/api/src/collections/Reviews.ts` | avaliações com moderação |
| `apps/api/src/globals/Heroi.ts` | herói da home, gerido no painel |
| `apps/api/src/endpoints/pesquisa.ts` | pesquisa por título, marca, categoria |
| `apps/web/src/modules/catalog/pesquisa.ts` | consulta e tipos da pesquisa |
| `apps/web/src/modules/catalog/avaliacoes.ts` | média e contagem por produto |
| `apps/web/src/components/ui/CartaoProduto.tsx` | o cartão, reescrito |
| `apps/web/src/components/ui/Estrelas.tsx` | avaliação visual |
| `apps/web/src/components/ui/SeloDesconto.tsx` | percentagem calculada |
| `apps/web/src/components/layout/Cabecalho.tsx` | três faixas com pesquisa |
| `apps/web/src/components/layout/BarraConfianca.tsx` | promessas |
| `apps/web/src/app/page.tsx` | home de retalho |

---

## Task 1: Avaliações — a coleção e a regra do silêncio

**Files:**
- Create: `apps/api/src/collections/Reviews.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Produces: coleção `reviews` com `produto`, `cliente`, `estrelas` (1–5), `texto`, `estado` (`pendente`/`aprovada`/`recusada`)

- [ ] **Step 1: Criar a coleção**

Campos: `produto` (relação, obrigatório), `cliente` (relação, obrigatório), `estrelas` (número 1–5, inteiro), `texto` (textarea), `estado` (select, omissão `pendente`).

**Acesso — os dados são de pessoas reais:**
- Leitura pública: **só as aprovadas**, e **sem o email do cliente** (mostra-se o nome próprio)
- Um cliente lê as suas, em qualquer estado
- Só staff aprova ou recusa
- Um cliente só pode avaliar um produto **que comprou** — verifica contra as encomendas dele

- [ ] **Step 2: Verificação**

1. Sem sessão: só aparecem as aprovadas; nenhum email de cliente na resposta, em `depth` 0, 1 e 2
2. Cliente A não lê as avaliações pendentes de B
3. Cliente que não comprou o produto → criação recusada
4. Cliente que comprou → aceite, nasce `pendente`
5. `estrelas: 0`, `6`, `3.5` → recusadas
6. Só staff muda o `estado`

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: avaliações com moderação e só de quem comprou"
```

---

## Task 2: Média e contagem, com silêncio quando não há

**Files:**
- Create: `packages/core/src/avaliacoes.ts`
- Test: `packages/core/src/avaliacoes.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- `agregarAvaliacoes(estrelas: number[]): { media: number | null; total: number }`

A média é `null` quando não há avaliações — **nunca zero**. É a mesma doutrina do `margemPercent` na fase 4: uma coisa que não se sabe aparece como não se sabendo.

- [ ] **Step 1: Testes primeiro**

Cobre: lista vazia → `{ media: null, total: 0 }`; uma avaliação; várias com arredondamento (3 avaliações de 4,4,5 → média 4,3 e não 4,33333); todas iguais; recusa de valores fora de 1–5 e de não inteiros.

A média sai como **inteiro em décimos** (4,3 → `43`), pela mesma convenção "inteiro × 10" que o resto do projeto usa para evitar decimais.

- [ ] **Step 2: Implementar, exportar, commitar**

```bash
git commit -m "feat: agregação de avaliações com média desconhecida quando não há"
```

---

## Task 3: Pesquisa

**Files:**
- Create: `apps/web/src/modules/catalog/pesquisa.ts`
- Modify: `apps/web/src/modules/catalog/index.ts`
- Modify: `apps/web/src/app/produtos/page.tsx`

**Interfaces:**
- `pesquisarProdutos(q: string, f: CatalogFilters): Promise<PublicProduct[]>`

Procura em **título, marca e categoria**, sobre produtos publicados. Vive na URL: `/produtos?q=coleira`.

- [ ] **Step 1: Implementar e verificar**

1. `?q=coleira` devolve as coleiras; `?q=COLEIRA` também (sem distinguir maiúsculas)
2. `?q=happypaws` encontra por marca
3. `?q=racao` encontra por categoria
4. `?q=` vazio devolve tudo, não zero
5. `?q=xpto` devolve o estado vazio, com sugestão de limpar
6. Acentos: `?q=ração` e `?q=racao` encontram os mesmos — **decide e justifica** como (normalização na consulta ou coluna auxiliar)
7. A pesquisa combina com os filtros: `?q=racao&marca=petnest`
8. Sobrevive ao botão "voltar" e é partilhável

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: pesquisa por título, marca e categoria"
```

---

## Task 4: O cartão de produto

**Files:**
- Create: `apps/web/src/components/ui/CartaoProduto.tsx`, `Estrelas.tsx`, `SeloDesconto.tsx`
- Modify: os sítios que usam o cartão antigo

De 4 informações para 9. É o átomo de tudo.

```
┌─────────────────────┐
│ -25%          ♥     │
│      [foto]         │
├─────────────────────┤
│ HAPPYPAWS           │
│ Coleira ajustável   │
│ ★★★★☆ (218)         │
│ 29,90 €  39,90 €    │
│ Restam 3            │
│ [ Adicionar ]       │
└─────────────────────┘
```

- [ ] **Step 1: Construir**

- **Preço maior que o título** — quem varre uma grelha compara preços
- **Selo de desconto calculado**: `round((anterior − atual) / anterior × 100)`, só quando anterior > atual
- **Estrelas só quando há avaliações.** Sem elas, o espaço não fica vazio nem cinzento — colapsa
- **"Restam N" só com stock ≤ 5.** Acima disso, nada
- **Botão:** produto sem variantes → "Adicionar", adiciona mesmo. Produto com variantes → **"Escolher opções"**, abre a ficha. Um botão que às vezes compra e às vezes navega tem de dizer qual faz
- **Favorito** no canto da imagem

- [ ] **Step 2: Verificação**

1. Produto com desconto mostra a percentagem certa; sem desconto não mostra selo
2. Produto sem avaliações **não mostra estrelas nem "0"**
3. Produto com stock 3 mostra "Restam 3"; com stock 20 não mostra nada
4. Produto sem variantes: "Adicionar" põe no carrinho sem sair da página
5. Produto com variantes: "Escolher opções" abre a ficha
6. Produto esgotado: botão desativado e assinalado
7. Zero campos internos no HTML e no estado do React

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: cartão de produto com linguagem de retalho"
```

---

## Task 5: Grelha densa

**Files:**
- Modify: `apps/web/src/app/produtos/page.tsx`, `[categoria]/page.tsx`

- [ ] **Step 1: Densidade**

5 cartões por linha em ecrã grande (hoje 3), 4 em portátil, 3 em tablet, **2 em telemóvel**. Espaçamento apertado. É o que faz a página parecer catálogo em vez de galeria.

- [ ] **Step 2: Verificação**

1. 1440 px → 5 por linha; 390 px → 2 por linha; **sem scroll horizontal**
2. A grelha **não reanima** ao mudar filtro (a fase anterior já garante isto — confirma que continua)
3. 42 produtos cabem em menos rolagem que antes — mede a altura da página

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: grelha de catálogo com densidade de retalho"
```

---

## Task 6: Cabeçalho de três faixas

**Files:**
- Modify: `apps/web/src/components/layout/Cabecalho.tsx`
- Create: `apps/web/src/components/layout/BarraConfianca.tsx`

```
Entrega 24h · Garantia 24 meses · Troca fácil          Suporte
[logo]   [ Procura ração, coleiras, brinquedos…  🔍 ]
                        ♥ Favoritos   Conta   🛒 Carrinho
Cães  Gatos  Pássaros  Roedores  Aquário  …    ⚡ Promoções
```

- [ ] **Step 1: Construir**

A pesquisa é o elemento central. O envio grátis sobe para a faixa de topo — a regra existe desde a fase 1 e só aparecia no carrinho, quando a pessoa já tinha decidido.

- [ ] **Step 2: Verificação**

1. Pesquisar do cabeçalho leva a `/produtos?q=…` e funciona de qualquer página
2. Em 390 px as três faixas cabem sem scroll horizontal; as categorias rolam dentro da sua barra
3. O carrinho mostra o número de artigos
4. O conteúdo do cabeçalho está no HTML servido, sem JavaScript

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: cabeçalho de três faixas com pesquisa e promessas"
```

---

## Task 7: A home de retalho

**Files:**
- Create: `apps/api/src/globals/Heroi.ts`
- Modify: `apps/api/payload.config.ts`, `apps/web/src/app/page.tsx`

- [ ] **Step 1: Herói gerido no painel**

Global com imagem, título, subtítulo, texto do botão e destino. Uma loja muda campanha todas as semanas; mudar campanha não pode implicar mudar código.

- [ ] **Step 2: A home**

Ordem: herói com oferta → categorias **com imagem** → mais vendidos → em promoção → barra de confiança.

**"Mais vendidos" vem das encomendas reais.** Sem vendas suficientes (define o limiar e justifica-o), mostra os mais recentes **com o título a dizer "Novidades"** — não finge que são mais vendidos.

- [ ] **Step 3: Verificação**

1. Mudar o herói no painel muda a home, sem tocar em código
2. Com encomendas, "Mais vendidos" corresponde às vendas reais — confirma contra a base
3. Sem encomendas, o título muda para "Novidades" e mostra os recentes
4. As categorias mostram imagem; sem imagem, cai para um marcador digno
5. "Em promoção" só mostra produtos com preço anterior maior que o atual
6. Mobile 390 px sem scroll horizontal
7. Conteúdo íntegro sem JavaScript

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: home de retalho com herói gerido e mais vendidos reais"
```

---

## Task 8: Semear avaliações e o herói

**Files:**
- Modify: `apps/api/src/seed.ts`

- [ ] **Step 1: Acrescentar ao seeder**

Avaliações aprovadas para parte dos produtos — **não para todos**, porque o cartão tem de ser testado nos dois estados. Herói com uma campanha credível. Imagens de categoria.

- [ ] **Step 2: Verificação**

1. `pnpm seed` duas vezes → mesmo resultado
2. Há produtos com e sem avaliações na loja
3. A home mostra o herói semeado

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: seeder com avaliações, herói e imagens de categoria"
```

---

## Verificação final

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r test
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r typecheck
```

**As três regras de honestidade, medidas:**
- Um produto sem avaliações não mostra estrelas nem contagem, em lado nenhum
- "Restam N" não aparece com stock acima de 5
- Com a tabela de encomendas vazia, a home diz "Novidades" e não "Mais vendidos"

**O teste de olhar:** abrir a home e perceber em três segundos que aquilo vende coisas, e conseguir procurar um produto sem carregar em mais de um sítio.

**Capturas obrigatórias:** home, catálogo, ficha e telemóvel — em 1440 px e 390 px. Olhar para elas, não só medir.
