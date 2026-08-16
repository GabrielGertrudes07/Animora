# Filtros Configuráveis e Dashboard de Vendas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao lojista controlo sobre que atributos filtram o catálogo, e um dashboard de vendas com lucro real — entregue completo mas com trava comercial, para venda posterior.

**Architecture:** Os atributos passam a ter alcance declarado (`filtro`, `ficha`, `interno`) numa coleção própria, e um ecrã de configuração decide quais aparecem ao cliente e por que ordem. O dashboard agrega as encomendas; os números reais nunca saem da base de dados enquanto a trava estiver ligada — a verificação é no servidor, não no browser.

**Tech Stack:** Payload CMS 3.88, Postgres, Next.js 15, TypeScript strict, `@animora/core`.

**Spec:** `docs/spec-animora.md` (§5, §6, §9)
**Planos anteriores:** fases 1, 2 e 3 em `docs/superpowers/plans/`

## Global Constraints

- TypeScript `"strict": true`
- **Dinheiro em cêntimos inteiros.** O lucro é `Σ(preço − custo) × quantidade`, tudo inteiro
- Mercado Portugal: EUR, `pt-PT`
- **Campos internos nunca chegam ao cliente** — inclui tudo o que este plano acrescenta
- Commits em português, `tipo: descrição`

---

## O que as três fases anteriores ensinaram

Cada um custou pelo menos uma ronda. Não os redescubram.

1. **Abrir `access.read` numa coleção abre todos os campos dela.** Foi assim que o custo de compra ficou público na fase 2.
2. **Guardas que "contam irmãos e depois decidem" são atravessadas.** Existe `apps/api/src/hooks/serializar.ts`; usa-o.
3. **`req.user` não significa "staff"** desde que existem `customers`. Existe `apps/api/src/access/staff.ts`; usa-o.
4. **Um comentário que afirma segurança sem a verificar é pior que nenhum.** Aconteceu duas vezes; se escreveres "está protegido porque X", tem de haver teste a provar X.
5. **"O stock não fica negativo" não é critério** — cinco encomendas para uma unidade deixam o stock a zero na mesma. Conta os factos, não os estados.
6. **Verificar "responde?" e "não vaza?" não é verificar "está certo?"** Foi assim que uma página de categoria mostrou o catálogo inteiro durante dois lotes.
7. `limit: 0` é "sem limite"; `depth=0` devolve ids; o Next em dev compila ao primeiro acesso; o `zsh` come `?where[...]`; Postgres em `localhost:5442`.

---

## Task 1: Coleção de atributos com alcance

**Files:**
- Create: `apps/api/src/collections/Attributes.ts`
- Modify: `apps/api/payload.config.ts`

**Interfaces:**
- Produces: coleção `attributes` com `nome`, `chave`, `tipo`, `alcance`, `controlo`, `ordem`, `abertoPorOmissao`

O alcance é a peça central da §5 da spec:

| Alcance | Significa |
|---|---|
| `filtro` | filtra no catálogo, visível ao cliente |
| `ficha` | aparece nas especificações, não filtra |
| `interno` | só admin e relatórios — **nunca sai para o site** |

- [ ] **Step 1: Criar a coleção**

Campos: `nome` (texto), `chave` (texto, único, minúsculas sem espaços), `tipo` (`select`/`multiselect`/`intervalo`/`booleano`), `alcance` (os três acima), `controlo` (`caixas`/`intervalo`/`amostras`/`chips`), `ordem` (número), `abertoPorOmissao` (checkbox), `categorias` (relação, vazio = todas).

Acesso: leitura pública **apenas** dos que têm alcance `filtro` ou `ficha`; escrita só staff. Um atributo `interno` não pode ser legível sem sessão — é o mesmo erro da fase 2 noutra roupagem.

- [ ] **Step 2: Verificação**

1. Sem sessão, `GET /api/attributes` → devolve só `filtro` e `ficha`, **nunca** `interno`
2. Com sessão de staff → devolve todos
3. Com sessão de **cliente** → devolve só os públicos (não é staff)
4. `chave` duplicada → recusada
5. `chave` com espaços ou maiúsculas → recusada ou normalizada

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: coleção de atributos com alcance filtro, ficha e interno"
```

---

## Task 2: Ecrã de configuração de filtros

**Files:**
- Create: `apps/api/src/globals/ConfiguracaoFiltros.ts` (ou coleção, decide e justifica)
- Modify: `apps/api/payload.config.ts`

O que a §6 da spec pede: uma lista arrastável onde o lojista escolhe quais atributos filtram, por que ordem, com que controlo, e se a secção começa aberta.

- [ ] **Step 1: Implementar**

Ordem, visibilidade e tipo de controlo por atributo. Atributos com alcance `interno` aparecem **bloqueados**, com explicação — não escondidos: o lojista tem de perceber porque não os pode publicar.

Conjunto global por omissão, com substituição opcional por categoria.

- [ ] **Step 2: Verificação**

1. Reordenar altera a ordem que a loja recebe
2. Desligar a visibilidade remove o filtro da loja
3. Um atributo `interno` **não pode** ser tornado público, nem por manipulação direta do pedido
4. Substituição por categoria: em "Ração" filtra-se por peso, em "Coleiras" por tamanho

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: ecrã de configuração dos filtros do catálogo"
```

---

## Task 3: Filtros derivados dos dados reais, na loja

**Files:**
- Modify: `apps/web/src/modules/catalog/`
- Modify: `apps/web/src/app/[categoria]/page.tsx`

**A regra que fecha o defeito nº6 a nº10 da crítica original:** um filtro só mostra opções que **existem em produtos publicados e com stock**. Nunca aparece um filtro que devolve zero resultados.

O site antigo tinha listas fixas no código: oferecia "Premium", "Popular" e "Essencial" quando todos os 16 produtos eram "Novo", e um slider de preço até 1500 € quando o produto mais caro custava 76 €.

- [ ] **Step 1: Interface de filtros**

Barra lateral em desktop; **bottom sheet atrás de um botão em mobile** — no site antigo os filtros empurravam o catálogo para fora do ecrã em 390px, e foi apontado na crítica.

As opções e os limites de preço vêm do catálogo real, não de constantes.

- [ ] **Step 2: Verificação**

1. As opções de cada filtro existem mesmo em produtos publicados
2. O intervalo de preço tem os limites reais do catálogo
3. Um atributo `interno` **não aparece** na loja, nem que se force o parâmetro no URL
4. Mobile 390px: produtos visíveis imediatamente, filtros atrás de um botão, **sem scroll horizontal**
5. Os filtros continuam a viver na query string e sobrevivem ao botão "voltar"
6. Zero campos internos no HTML e no estado do React

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: filtros do catálogo derivados dos dados reais"
```

---

## Task 4: Agregação de vendas

**Files:**
- Create: `packages/core/src/relatorios.ts`
- Test: `packages/core/src/relatorios.test.ts`

A aritmética primeiro, pura e testável sem base de dados — como o carrinho na fase 3.

**Interfaces:**
- `type LinhaVendida = { quantidade: number; precoUnitarioCents: number; custoUnitarioCents: number | null }`
- `agregarVendas(linhas: LinhaVendida[]): { faturacaoCents, custoCents, lucroCents, margemPercent, unidades }`

- [ ] **Step 1: Testes primeiro**

Cobre: sem linhas; uma linha; várias; **custo nulo** (produtos antigos sem custo registado — a margem tem de dizer que é desconhecida, não fingir 100%); margem com arredondamento; valores sempre inteiros; recusa de decimais e negativos.

O caso do custo nulo é o que interessa: uma encomenda antiga sem custo congelado não pode inflacionar o lucro.

- [ ] **Step 2: Implementar e commitar**

```bash
git commit -m "feat: agregação de vendas com lucro e margem"
```

---

## Task 5: Dashboard com trava comercial

**Files:**
- Create: `apps/api/src/globals/Definicoes.ts`
- Create: `apps/api/src/endpoints/dashboard.ts`
- Create: ecrã do dashboard no painel

**O que a §9 da spec pede**, e é o que vai ser vendido: faturação, lucro e margem, encomendas e ticket médio, mais vendidos por unidades **e** por receita (são listas diferentes), receita por categoria, ruturas e stock baixo, clientes novos vs recorrentes.

### A trava

**A verificação é no servidor.** Se fosse uma flag no cliente, bastava abrir as ferramentas do browser. Com verificação no servidor, os números reais **não saem da base de dados** enquanto estiver bloqueado — o endpoint devolve série de demonstração e `locked: true`.

O código de agregação é o mesmo nos dois estados. Só muda quem responde.

**Desbloqueio:** campo booleano em `Definicoes`, editável **apenas pelo papel `owner`**. Quem compra o site entra como `admin` — vê o dashboard, não vê o interruptor.

Alcance honesto: quem tiver acesso à base de dados ou ao deploy destrava à força. É um travão comercial, não DRM. Construir mais custa tempo e não fecha o buraco.

### A rotulagem é obrigatória

O estado bloqueado **tem de dizer** que os números são de demonstração. Faixa permanente, não descartável:

```
┌─────────────────────────────────────────────────┐
│  Dados de demonstração — não são as suas vendas │
│  Para ativar os dados reais: (19) 98252-1727    │
│                          [ Falar no WhatsApp ]  │
└─────────────────────────────────────────────────┘
```

O botão liga a `wa.me/5519982521727`.

Não é escrúpulo a mais: se alguém olhar para faturação inventada a pensar que é a sua, toma decisões de negócio com números falsos. Rotulado, o bloqueio faz exatamente o mesmo trabalho comercial.

- [ ] **Step 1: Implementar**

- [ ] **Step 2: Verificação — a trava é o que importa**

1. **Bloqueado, com sessão de `admin`:** o endpoint devolve demonstração e `locked: true`, e **nenhum número real da base aparece na resposta** — compara com os totais reais e confirma que não coincidem
2. **Bloqueado:** um `admin` **não vê** o interruptor e **não o consegue ligar** por pedido direto à API
3. **Desbloqueado pelo `owner`:** os números passam a bater certo com as encomendas reais
4. A faixa de demonstração aparece sempre que `locked: true`, e não se consegue fechar
5. O `owner` liga e desliga; o estado persiste
6. Sem sessão → o dashboard não responde de todo
7. **Os números reais estão certos:** cria encomendas conhecidas e confirma faturação, lucro e margem à mão
8. Mais vendidos por unidades ≠ mais vendidos por receita, quando os preços diferem
9. Encomendas canceladas **não** contam para a faturação

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: dashboard de vendas com trava comercial e dados de demonstração"
```

---

## Verificação final da fase

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r test
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -r typecheck
```

E, sem sessão nenhuma:
```bash
curl -s "http://localhost:3000/api/attributes?limit=0"   # só filtro e ficha, nunca interno
curl -s "http://localhost:3000/api/globals/definicoes"   # nada de sensível
```

**O critério de aceitação:** um `admin` com a trava ligada vê um dashboard completo, rotulado como demonstração, e **nenhum número real da loja** — verificado por comparação com os totais que estão mesmo na base.
