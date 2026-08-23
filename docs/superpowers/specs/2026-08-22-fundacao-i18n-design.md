# Fundação de i18n — Especificação de Desenho

**Data:** 2026-08-22
**Estado:** desenho aprovado pelo utilizador, pronto para plano de implementação
**Âmbito:** rotas e casca de interface do site de cliente em pt/de. Fica fora: conteúdo do catálogo localizado no Payload (sub-projeto 2) e checkout internacional — país, validação de morada por país, portes para a Alemanha (sub-projeto 3).

---

## 1. O problema

A loja é hoje só em português europeu, escrita para o mercado de Portugal (ver `PRODUCT.md`). O pedido: o site de **cliente** passa a servir português e alemão lado a lado; o **admin** (Payload) fica exatamente como está, em pt.

Não existe nenhuma infraestrutura de i18n no projeto — nem biblioteca, nem rotas por idioma, nem separação entre texto de interface e conteúdo. Toda a copy está escrita diretamente nos componentes.

Este documento cobre só a fundação: como o site passa a ter duas versões de idioma navegáveis e indexáveis, com a interface (menus, botões, checkout, conta) já bilingue. O conteúdo do catálogo (título/descrição de produto) continua em português nas duas versões nesta fase — é uma lacuna temporária, assumida, coberta pelo sub-projeto 2.

## 2. Decisões

**Biblioteca: `next-intl`.** É o padrão para App Router — trata routing por locale, ficheiros de mensagens, e sobretudo as regras de plural (que divergem entre pt e de) e formatação sem reinventar nada à mão. A alternativa (middleware e dicionário próprios) foi considerada e descartada: para uma loja a sério, com dezenas de strings e regras de plural corretas, reinventar isto é mais código para manter do que a dependência.

**`pt` sem prefixo, `de` com `/de/...`.** `localePrefix: 'as-needed'`, `defaultLocale: 'pt'`. `/produtos`, `/produto/racao-caes` continuam a funcionar tal como hoje — preserva qualquer link ou indexação já existente. Só o alemão ganha prefixo: `/de/produtos`, `/de/produto/racao-caes`.

**Segmentos de rota não traduzidos nesta fase.** `/de/produto/[slug]`, não `/de/produkt/[slug]`. next-intl suporta nomes de rota traduzidos via `pathnames`, mas é complexidade extra sem pedido explícito — YAGNI por agora.

**Sem redirecionamento automático por `Accept-Language` na raiz.** A raiz `/` fica sempre em português por omissão; nunca redireciona sozinha com base no idioma do browser, para não desviar tráfego e bots que já indexam `/` como pt. A troca de idioma é sempre uma ação explícita do cliente.

**Admin intocado.** `apps/api/payload.config.ts` já tem `i18n: { supportedLanguages: { pt } }`. Este sub-projeto não mexe em `apps/api`.

## 3. Arquitetura de rotas

Toda a árvore de páginas de cliente move para dentro de `app/[locale]/`:

```
apps/web/src/app/
├── [locale]/
│   ├── layout.tsx          (novo: NextIntlClientProvider, valida locale)
│   ├── page.tsx            (era app/page.tsx)
│   ├── produtos/page.tsx
│   ├── [categoria]/page.tsx
│   ├── produto/[slug]/page.tsx
│   ├── carrinho/page.tsx
│   ├── checkout/page.tsx
│   └── conta/**
├── layout.tsx              (raiz mínima: fontes, <html>, nada de i18n)
└── middleware.ts            (fica em apps/web/src/, não dentro de app/)
```

`generateStaticParams` no `[locale]/layout.tsx` devolve `['pt', 'de']` para as páginas estáticas gerarem as duas versões em build.

`middleware.ts` usa `createMiddleware(routing)` do next-intl com o `matcher` a excluir `/api`, `/_next` e ficheiros estáticos.

## 4. Mensagens e extração de copy

`apps/web/messages/pt.json` e `apps/web/messages/de.json`, com a mesma árvore de chaves, namespaced por componente/página (`Header.pesquisarPlaceholder`, `Checkout.confirmarBotao`, etc.).

Cerca de 20 ficheiros trocam string literal por `useTranslations()` (Client Components) ou `getTranslations()` (Server Components — a maioria dos componentes de loja já são Server Components, como o `Header` é hoje):

- `components/layout/Header.tsx`, `Footer.tsx`
- `components/catalog/Catalogo.tsx`, `FiltrosCatalogo.tsx`
- `components/ui/ProductCard.tsx`, `Price.tsx`, `Estrelas.tsx`, `Totais`
- `components/marketing/**`
- `app/[locale]/checkout/FormularioCheckout.tsx`
- `app/[locale]/carrinho/page.tsx`
- `app/[locale]/conta/**`

Todos os `next/link`, `useRouter`, `usePathname`, `redirect` nesses ficheiros trocam pelas versões locale-aware exportadas da config de routing do next-intl (`Link`, `useRouter`, `usePathname`, `redirect` gerados por `createNavigation(routing)`) — mesma API, path prefixado automaticamente conforme o locale ativo.

## 5. Seletor de idioma

Novo componente `SeletorIdioma` no `Header`, ao lado do link "Conta". Alterna entre pt e de preservando o caminho atual (usa o `pathname` locale-aware do next-intl e troca só o locale). Ao ser escolhido explicitamente, grava um cookie `NEXT_LOCALE` que o middleware do next-intl já lê nativamente em visitas seguintes a `/` — sem código de deteção próprio.

## 6. Testes e fallback

- Teste (vitest) que compara as árvores de chaves de `pt.json` e `de.json` e falha se alguma existir só de um lado — apanha o erro mais comum de i18n (chave nova esquecida num idioma).
- Chave em falta em runtime cai para a própria chave (comportamento nativo do next-intl em produção); não deve acontecer graças ao teste anterior.
- Sem testes de snapshot de tradução — verificar que a tradução alemã está correta é trabalho editorial, não de engenharia.

## 7. Fora de âmbito (sub-projetos seguintes)

- **Sub-projeto 2 — catálogo localizado:** campos `localized: true` em `Products`, `Categories`, `Brands` no Payload; admin mostra pt+de no mesmo formulário; frontend passa `?locale=` ao pedir dados.
- **Sub-projeto 3 — checkout internacional:** campo país na morada (`Customers`, `Orders.moradaEnvio`), validação de código postal por país (pt: `1234-567`; de: 5 dígitos), e decisão de portes/regra de envio para a Alemanha.

## 8. Ficheiros afetados (resumo)

**Novo:**
- `apps/web/src/middleware.ts`
- `apps/web/src/i18n/routing.ts`, `apps/web/src/i18n/request.ts`, `apps/web/src/i18n/navigation.ts`
- `apps/web/messages/pt.json`, `apps/web/messages/de.json`
- `apps/web/src/components/layout/SeletorIdioma.tsx`
- `apps/web/src/app/[locale]/layout.tsx`

**Movido:** toda a árvore `apps/web/src/app/{page.tsx,produtos,[categoria],produto,carrinho,checkout,conta}` para dentro de `app/[locale]/`.

**Editado:** ~20 componentes listados na secção 4 (strings → chaves de tradução, imports de navegação locale-aware).

**Dependência nova:** `next-intl`.

**Intocado:** `apps/api/**` inteiro, `packages/core/**`, `apps/web/next.config.mjs` (só precisa do wrapper `withNextIntl`, uma linha).
