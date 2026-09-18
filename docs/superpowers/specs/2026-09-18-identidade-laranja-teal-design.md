# Identidade laranja/teal e fundação headless Shopify — Especificação de Desenho

**Data:** 2026-09-18
**Estado:** definitivo, entregue pelo utilizador (`~/Downloads/Animora_Ecommerce_Especificacao_Tecnica.{md,docx}`), sem gate de aprovação — executar autonomamente
**Âmbito:** substitui por completo a direção visual "A Clareira e o Balcão" (`apps/web/DESIGN.md`, spec `2026-08-28-linguagem-visual-premium-design.md`) e a decisão de manter o catálogo espelhado no Payload (`2026-08-29-catalogo-shopify-design.md`). Cobre identidade visual, shell, home estrutural e fundação de um cliente Shopify Storefront GraphQL. Não cobre, nesta fase, a migração real de catálogo/carrinho/checkout para o Shopify (ver §4).

## 1. Fonte

O documento completo entregue pelo utilizador está preservado em
`~/Downloads/Animora_Ecommerce_Especificacao_Tecnica.md` (29 secções: stack,
design system, responsividade, header/navegação, home, card de produto,
coleção, produto, integração Shopify, carrinho/checkout, conta, i18n,
placeholders, animação, performance, SEO, acessibilidade, estados,
analytics, segurança, observabilidade, testes, critérios de aceite, ordem
de implementação em 8 fases, proibições explícitas, tokens CSS, referências).
Este ficheiro **não** duplica esse texto — regista só as decisões que um
agente precisa para adaptar a spec a este repositório, que já tem uma app
Next.js funcional (Home, PLP, PDP, carrinho, conta, i18n pt/de) sobre uma
API própria (Payload + Postgres), não um projeto novo.

Regra da spec original que se mantém inalterada e não-negociável nesta
fase: **não gerar, procurar, inventar, rasterizar ou embutir imagens
finais.** Espaço de mídia nova (categorias, banners) é `MediaPlaceholder`
estrutural. Produtos que já têm fotografia real no catálogo continuam a
mostrá-la — isso não é "gerar imagem", é dado real já existente.

**Exceção registada — Hero:** durante a execução (2026-09-18), uma sessão
paralela implementou a campanha real "Semana Animora" em
`components/marketing/Hero.tsx`, a pedido explícito do utilizador e com
assets finais entregues por ele (não gerados por nenhum agente). Uma
campanha comercial real e já pedida tem precedência sobre a regra de
placeholder — essa regra existe para não inventar conteúdo, não para
apagar conteúdo real já fornecido. O plano de execução não recria nem
substitui este Hero. Ver `docs/superpowers/plans/2026-09-18-identidade-laranja-teal.md`,
Task 5 (cancelada) e o ledger em `.superpowers/sdd/.../progress.md`.

## 2. Decisões que substituem specs anteriores

- **Paleta e tipografia:** os tokens da secção 4/28 da spec original
  (branco/creme, laranja `#F57C00`, teal `#085B6B`/`#0F6F78`, aqua
  `#00B4B0`, Fredoka/Montserrat/Caveat) substituem por completo `ink`,
  `terracota`, `sage`, `papel`, `floresta` e Bricolage Grotesque/Figtree em
  `apps/web/DESIGN.md` e `tailwind.config.ts`. Não ficam variações das duas
  paletas lado a lado.
- **Arquitetura de dados:** `2026-08-29-catalogo-shopify-design.md` tinha
  decidido explicitamente **não** ligar o storefront à Storefront API
  (custo de reescrever `queries.ts`/`filters.ts`/`facets.ts`, e manter
  checkout/encomendas fora do Shopify). A spec definitiva inverte isto:
  Storefront GraphQL API como fonte de catálogo, carrinho via Cart API,
  checkout hospedado pela Shopify (`cart.checkoutUrl`). Esta fase **prepara**
  essa direção (cliente Shopify, sem dados falsos) mas **não desliga** o
  Payload — ver §4.
- **Home estrutural:** a ordem e a composição da home
  (`2026-09-11-animora-structural-v1-execucao.md`, Fase 4) são substituídas
  pela ordem da secção 7 da spec original. Testemunhos
  (`AprovadoPorQuemManda`) e "vistos recentemente" não têm slot na nova
  ordem; mantêm-se no fim por serem funcionalidade real já construída, não
  por estarem na spec.

## 3. Adaptações a este repositório

- **Tokens ficam em `tailwind.config.ts` + `globals.css`**, não num
  `styles/tokens.css` novo — é onde este repositório já centraliza tokens
  (ver comentários em `tailwind.config.ts`). Os nomes das variáveis CSS da
  secção 28 da spec (`--color-orange`, `--color-teal-900`, ...) tornam-se os
  nomes das cores Tailwind (`orange`, `teal-900`, ...), não um ficheiro
  paralelo.
- **Estrutura de pastas:** a árvore sugerida na secção 3
  (`components/home`, `components/commerce`, `lib/shopify`) é adotada só
  onde cria um componente novo; componentes existentes que já cumprem o
  contrato (`ProductCard`, `Header`, `Footer`, `modules/catalog/*`) não são
  movidos de pasta sem motivo funcional.
- **i18n:** a app já nasceu multi-idioma (`next-intl`, pt/de, sem
  redirecionamento automático por `Accept-Language`) — cumpre o requisito
  arquitetural da secção 14. Os códigos de rota exatos da spec
  (`/pt-br`, `/en`, `/es`) **não** são adotados nesta fase: trocar `pt`/`de`
  de rota é uma decisão de negócio (mercados-alvo) e um trabalho de tradução
  de conteúdo, não uma correção estrutural. Fica registado como pendência,
  não como desvio silencioso.
- **Rodapé sem links falsos:** `Footer.tsx` documenta uma correção
  deliberada — não apontar para páginas de apoio inexistentes. A secção 7
  da spec pede links institucionais/ajuda/conta; esses só entram quando
  existir a página real por trás. Restilizar sim, inventar destino não.
- **Benefícios sem alegações falsas:** `Beneficios.tsx` documenta,
  também deliberadamente, a omissão de "pagamento seguro" — o checkout
  ainda não liga a um processador real. A secção 6 da spec pede "compra
  segura" e "parcelamento" como 2 dos 4 benefícios; nenhum dos dois é
  verdadeiro hoje. Mantêm-se só os 3 benefícios reais, restilizados.
- **Card de produto / "queridinhos":** a spec pede tabs "Mais vendidos /
  Ofertas / Novidades". Este catálogo não tem agregação real de vendas
  (documentado em `page.tsx`); a tab existente chama-se "Em destaque". A
  tab nova "Novidades" usa `createdAt` real (campo já existe em
  `PublicProduct`). Nenhuma тab mostra número de vendas inventado.

## 4. Fora de âmbito nesta execução (bloqueado, não ignorado)

A migração real para a Storefront API (Fases 4–6 da ordem de implementação
da spec: catálogo real via GraphQL, carrinho via Cart API, checkout via
`cart.checkoutUrl`, Customer Account API, metaobjects/metafields, webhooks)
**não é executada agora** porque:

1. Não existem credenciais reais da Storefront API neste ambiente —
   `apps/api/.env.example` só tem `SHOPIFY_ADMIN_TOKEN=shpat_troca-isto`
   (placeholder, e é um token de Admin API, não de Storefront API).
2. Fabricar essa integração sem uma loja Shopify real e testável violaria a
   própria regra da spec (§27: não hardcodar produto, não simular dado que
   devia vir de integração real).
3. A ordem de implementação da própria spec (§26) coloca "Fundação" (tokens,
   layout, i18n, **cliente Shopify e tipos**) antes de "Catálogo real" — o
   cliente Shopify (scaffold, sem dado ligado) pertence a esta fase; ligar
   componentes reais a ele pertence à próxima.

O que **é** feito agora: `lib/shopify/client.ts` com validação de variáveis
de ambiente no arranque (falha clara se faltarem, por exigência explícita
da secção 22), pronto a receber queries reais assim que existirem
credenciais. O catálogo, carrinho e checkout continuam a funcionar como
hoje, sobre a API Payload — é o que a instrução do utilizador chama de
"usar o site atual para facilitar o trabalho".

## 5. Paleta, tipografia e tokens (fonte: spec original §4 e §28)

```
--color-bg: #FFFDFC          --radius-sm: 10px      --space-1: 4px
--color-surface: #FFFFFF     --radius-md: 16px      --space-2: 8px
--color-cream: #FDF3EC       --radius-lg: 22px      --space-3: 12px
--color-orange: #F57C00      --radius-xl: 28px      --space-4: 16px
--color-orange-hover:#E96F00 --radius-pill: 999px   --space-5: 20px
--color-teal-900: #085B6B                            --space-6: 24px
--color-teal-700: #0F6F78    --motion-fast: 140ms    --space-8: 32px
--color-aqua: #00B4B0        --motion-ui: 200ms      --space-10: 40px
--color-text: #103F46        --motion-medium: 420ms  --space-12: 48px
--color-text-muted: #6D7F82  --motion-slow: 650ms    --space-16: 64px
--color-border: #E8ECEC      --ease-brand: cubic-bezier(.2,.8,.2,1)
--color-success: #1F8A5B     --space-20: 80px
--color-danger: #C84444      --container-max: 1440px
```

Tipografia: Fredoka 700–800 (títulos promocionais/campanha), Montserrat
400–700 (interface/cards/preços/formulários), Caveat 500–700 (manuscrito
decorativo, nunca em informação funcional). Carregadas com `next/font`,
substituindo Bricolage Grotesque + Figtree.

Sombras: card repouso `0 6px 24px rgba(8,91,107,.06)`, card hover
`0 12px 32px rgba(8,91,107,.10)`, drawer/modal `0 20px 60px rgba(0,0,0,.16)`.

O resto da spec original (secções 5–29: responsividade, header, home,
card, coleção, produto, integração, carrinho, conta, i18n, placeholders,
animação, performance, SEO, acessibilidade, estados, analytics,
segurança, observabilidade, testes, critérios de aceite, ordem de
implementação, proibições, referências) aplica-se tal como escrito, exceto
onde este documento regista uma adaptação ou um bloqueio explícito acima.
