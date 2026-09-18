# Roadmap — Animora

**Última atualização:** 2026-09-18.

## ⚠️ Estado atual: loja em duas identidades visuais

A execução de 2026-09-18 (`docs/superpowers/plans/2026-09-18-identidade-laranja-teal.md`)
substituiu a identidade "A Clareira e o Balcão" por uma nova paleta
laranja/teal (ver `apps/web/DESIGN.md`), mas **só no shell (header,
navegação, rodapé) e na Home**. PLP, PDP, carrinho, checkout e conta
continuam nos tokens antigos, que já não existem em
`tailwind.config.ts` — essas páginas renderizam hoje sem cor de marca.
Antes de qualquer trabalho novo de UI, decidir: (a) abrir um plano de
migração para o resto da loja, ou (b) aceitar a coexistência por agora.
Detalhe completo em `docs/CURRENT_STATE.md`, secção "Identidade
laranja/teal (2026-09-18)".

## Marcos já implementados (histórico, via `git log`)

Ordem cronológica real, cada um com plano/spec próprio em
`docs/superpowers/plans/` ou `docs/superpowers/specs/` quando existir:

1. **Fundação e admin** — monorepo pnpm, dinheiro em cêntimos, Payload sobre
   Postgres, coleções de produtos/variantes/categorias/marcas/imagens,
   matriz de variantes, validação de publicação.
2. **Loja, catálogo e ficha** (`2026-08-15-loja-catalogo-ficha.md`) — home,
   PLP, PDP, cliente da API, filtros na query string, cards de produto.
3. **Carrinho, contas e encomendas** (`2026-08-16-carrinho-contas-encomendas.md`)
   — carrinho persistente com fusão no login, checkout, contas de cliente,
   encomendas com linhas congeladas.
4. **Filtros configuráveis e dashboard** (`2026-08-16-filtros-dashboard.md`)
   — atributos com alcance, ecrã de configuração de filtros, dashboard de
   vendas com trava comercial.
5. **Camada de retalho** (`2026-08-16-camada-de-retalho.md`) — pesquisa,
   avaliações moderadas, seeder realista, camada de motion GSAP, tipografia
   e ilustrações.
6. **Fundação i18n** (`2026-08-22-fundacao-i18n.md`) — pt/de completo via
   `next-intl`.
7. **Catálogo Shopify — espelho** (`2026-08-29-catalogo-shopify-espelho.md`)
   — cliente Admin API GraphQL, consulta e validador contra a loja real,
   sanitizador de descrição.
8. **Linguagem visual premium** (`2026-08-28-linguagem-visual-premium-design.md`,
   commit `8b36c6d`) — desenho da direção "A Clareira e o Balcão" em
   `DESIGN.md`. Implementação posterior em componentes ficou como WIP não
   commitado, hoje preservada no checkpoint `1ac1d5b` (ver
   `docs/CURRENT_STATE.md` §2) — **substituída** pelo marco 9, não retoma.
9. **Identidade laranja/teal** (`2026-09-18-identidade-laranja-teal.md`) —
   spec definitiva entregue pelo utilizador, substitui por completo "A
   Clareira e o Balcão". Tokens Tailwind, tipografia (Fredoka/Montserrat/
   Caveat), shell e Home reconstruídos; scaffold de cliente Shopify
   Storefront GraphQL (sem dado real, sem credenciais). **Âmbito:
   shell + Home só** — ver aviso no topo deste ficheiro.

## Plano estrutural v1 — em execução

Documento completo:
`docs/superpowers/plans/2026-09-11-animora-structural-v1-execucao.md`.
Objetivo: validar a base do e-commerce (navegação → descoberta → produto →
compra) com mídia editorial em `MediaPlaceholder` neutro, sem direção de
arte nova, antes de qualquer trabalho de criativos.

| Fase | Escopo | Status |
|---|---|---|
| 0 | Inventário e baseline | ✅ Concluída (2026-09-11) |
| 1 | Sistema estrutural e `MediaPlaceholder` | ✅ Concluída (2026-09-11) |
| 2 | Shell global (Header, barra de anúncio, navegação mobile) | ✅ Concluída (2026-09-11) |
| 3 | Átomos de comércio (`ProductCard`) | ✅ Concluída (2026-09-11) |
| 4 | Home estrutural | ✅ Concluída (2026-09-11) |
| 5 | PLP | ✅ Concluída (2026-09-11) |
| 6 | PDP | ✅ Concluída (2026-09-11) |
| 7 | Validação integrada | ✅ Concluída (2026-09-11) |
| — | Fase de criativos e motion | 🟡 Em curso (iniciada 2026-09-14) — primeira imagem real na home |

Detalhes de cada fase concluída (arquivos, verificações, limitações) em
`docs/CURRENT_STATE.md`. Decisões arquiteturais não óbvias (a partir da
Fase 7) em `docs/DECISIONS.md`. Cada fase para no seu próprio gate — a
próxima só começa com revisão e aprovação explícitas do usuário.

## Identidade laranja/teal — pendências (a partir de 2026-09-18)

A spec definitiva (`docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md`)
tem 29 secções; esta execução cobriu só "Fundação" e "Home" (fases 1-3 da
sua própria ordem de implementação, §26). Ficam pendentes, bloqueadas por
falta de credenciais reais da Storefront API (não é seguro simular):

- **Fase 4 — Catálogo real:** ligar PLP/PDP/`ProductCard` à Storefront API.
- **Fase 5 — Carrinho e checkout:** Cart API, checkout hospedado (`cart.checkoutUrl`).
- **Fase 6 — Conteúdo Shopify:** metaobjects/metafields, webhooks/revalidação.
- **Fase 7 — Qualidade:** i18n de mercados (a spec pede `/pt-br`, `/en`, `/es`; ficou pt/de, decisão de negócio não estrutural), SEO, a11y, performance, analytics, testes E2E.
- **Fase 8 — Assets:** substituir `MediaPlaceholder` por fotografia real (categorias, banners genéricos — a campanha "Semana Animora" no Hero já usa assets reais, à parte).

Sem relação direta, mas mesma classe de bloqueio: a investigação de
2026-09-18 sobre o plano "catálogo Shopify — espelho" (mais antigo,
2026-08-29, arquitetura diferente: mirror para Postgres em vez de leitura
direta da Storefront API) também está bloqueada por falta de loja Shopify
real — ver `docs/CURRENT_STATE.md`, secção "Investigação: fundação
Shopify". Duas iniciativas Shopify distintas, mesmo obstáculo: sem
credenciais/loja real, nenhuma das duas avança.
