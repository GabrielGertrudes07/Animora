# Roadmap — Animora

**Última atualização:** 2026-09-11.

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
   `docs/CURRENT_STATE.md` §2) — **pausada**, volta na fase de criativos do
   plano abaixo.

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
| 4 | Home estrutural | 🔜 Escopo em preparação para revisão — implementação não iniciada |
| 5 | PLP | ⏳ Pendente |
| 6 | PDP | ⏳ Pendente |
| 7 | Validação integrada | ⏳ Pendente |
| — | Fase posterior: criativos e motion (retoma "Clareira e Balcão") | ⏳ Bloqueada até aprovação explícita após a Fase 7 |

Detalhes de cada fase concluída (arquivos, verificações, limitações) em
`docs/CURRENT_STATE.md`. Cada fase para no seu próprio gate — a próxima só
começa com revisão e aprovação explícitas do usuário.
