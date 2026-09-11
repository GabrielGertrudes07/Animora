# Estado atual — Animora

**Última atualização:** 2026-09-11, ao final da Fase 1 do plano estrutural v1.

> Este documento descreve só o que foi verificado. Onde a verificação é
> indireta (histórico de commits, não releitura linha a linha), isso é dito
> explicitamente.

## 1. O que já existe (base pré-fase-estrutural)

Verificado por leitura de código durante a Fase 0 (auditoria) mais o
histórico de commits (`git log`, 130 commits antes do checkpoint desta
fase). Não é uma reverificação linha a linha de todo o histórico — é o que a
auditoria e a estrutura de diretórios confirmam hoje.

- **Monorepo pnpm**: `apps/api` (Payload CMS + Postgres), `apps/web` (loja
  Next.js 15, porta 3001), `packages/core` (dinheiro em cêntimos, variantes,
  SKU), `packages/types`.
- **Catálogo e admin**: coleções `products`/`variants`/`categories`/`brands`/
  `attributes`/`media` no Payload, com papéis `owner`/`admin`, validação de
  publicação, matriz de variantes, atributos com alcance (`filtro`/`ficha`/
  `interno`), configuração de filtros arrastável.
- **Loja**: home, PLP (`/[categoria]`, `/produtos`), PDP (`/produto/[slug]`),
  carrinho, checkout, conta (entrar/registar/sair/moradas/encomendas/
  favoritos) — todas as rotas em `apps/web/src/app/[locale]/`.
- **Comercial**: carrinho com fusão no login, checkout com stock serializado
  no servidor, encomendas com linhas congeladas (preço/custo/quantidade),
  dashboard de vendas com trava comercial (dados de demonstração até
  desbloqueio pelo papel `owner`).
- **Descoberta**: pesquisa, avaliações moderadas (só de quem comprou),
  filtros configuráveis por categoria, seeder com catálogo realista de pet
  shop portuguesa (42 produtos, 69 variantes, 20 encomendas de demonstração).
- **i18n**: pt/de completo via `next-intl`, `defaultLocale: 'pt'`,
  `localePrefix: 'as-needed'`, sem redirecionamento por `Accept-Language`.
- **Shopify**: cliente da Admin API GraphQL, consulta e validador de
  catálogo, campo `shopifyId` nas coleções — mecanismo de espelho, não
  substitui o Payload nesta fase.
- **Motion**: camada GSAP confinada a `components/motion/`, com
  `prefers-reduced-motion` e `ScrollTrigger`.
- **Fronteiras de módulo**: cada módulo expõe `index.ts`; nenhuma violação
  encontrada na auditoria (UI não importa GraphQL, `modules/catalog` e
  `packages/core` limpos). Exceção conhecida: `modules/account` não tem
  `index.ts` central (pendência menor, não bloqueante).

## 2. Direção visual "A Clareira e o Balcão" — pausada

`apps/web/DESIGN.md` documenta um sistema de design completo (paleta
balcão-branco/clareira-de-floresta, tipografia Bricolage Grotesque +
Figtree, botão-assinatura em gradiente) — parcialmente commitado em
`8b36c6d` ("desenho da linguagem visual premium"). Sobre essa base, um
trabalho não commitado implementou a direção em componentes reais
(carrossel de campanhas com animais recortados por IA, cenas de categoria
em duas camadas, testemunhos fotográficos, seeder gerando arte de campanha
dentro da imagem de produto).

Esse trabalho **conflitava** com o plano estrutural v1 (que exige
placeholders neutros nesta fase) e foi **preservado, não descartado**: está
commitado como checkpoint reversível em `1ac1d5b` ("wip: checkpoint da
direção 'Clareira e Balcão' antes da fase estrutural v1"), disponível para
retomar na fase de criativos (ver §4 do plano estrutural). Nenhum asset ou
arquivo foi movido ou apagado.

## 3. Plano estrutural v1 — em execução

Plano: `docs/superpowers/plans/2026-09-11-animora-structural-v1-execucao.md`.
Decisão do usuário: opção (a) — preservar o WIP acima, seguir a fase
estrutural com placeholders neutros agora, retomar "Clareira e Balcão" na
fase de criativos.

### Fase 0 — Inventário e baseline (concluída, 2026-09-11)

Auditoria somente leitura de `apps/web` e `apps/api`. Entregas: mapa de
rotas/componentes/dados, matriz Reaproveitar/Refatorar/Substituir/Congelar/
Bloquear, checks (`typecheck`/`test` de `@animora/web` e `@animora/core`,
141+77 testes, todos verdes — `@animora/api test` e `pnpm -r test`
deliberadamente não executados, para não truncar a tabela `orders` de
demonstração), screenshots em 390/768/1440/1920px de Home/PLP/PDP.

Achado central: o WIP da §2 ia na direção oposta ao que esta fase exige —
resolvido pela decisão do usuário em §3.

**Correção (2026-09-11, antes da Fase 2):** a matriz original da Fase 0
classificou `Header.tsx` e `BarraMobile.tsx` como "Refatorar — paleta
clareira". Isso estava **errado**. Leitura direta do código ao preparar a
Fase 2 mostrou que os dois já usam a paleta neutra do balcão (`bg-papel`,
`text-ink`/`text-ink-muted`, `border-line`), sem nenhum `chao-floresta` — o
próprio `Header.tsx` documenta em comentário que a barra de aviso já tinha
sido convertida de floresta para "uma linha em papel". Nenhuma refatoração
de paleta é necessária nesses dois arquivos; corrigido aqui para a Fase 2
não repetir o engano.

### Fase 1 — Sistema estrutural e `MediaPlaceholder` (concluída, 2026-09-11)

**Arquivos alterados** (não commitados ainda — aguardando este documento
entrar junto na revisão do usuário):
- `apps/web/src/components/ui/MediaPlaceholder.tsx` (novo) — contrato
  `ratio`/`type`/`label`/`fill`, fundo `#F4F1E8`, borda `#E8E5DC`, sem
  request remoto.
- `apps/web/src/components/ui/MediaPlaceholder.test.ts` (novo, 4 testes).
- `CarrosselCampanhas.tsx` — mídia do herói trocada por
  `MediaPlaceholder type="hero"`; camadas de animal removidas da
  renderização (dados preservados); guarda adicionada nas tweens GSAP do
  animal/sombra para não avisar no console com a camada vazia.
- `CategoriasVisuais.tsx` — mídia das categorias trocada por
  `MediaPlaceholder type="category"`; zoom de hover/foco preservado;
  legenda em tinta escura (antes branco sobre véu fotográfico).
- `AprovadoPorQuemManda.tsx` — foto do testemunho trocada por
  `MediaPlaceholder type="testimonial"`; véu de cor removido.
- `Footer.tsx` e a seção de marcas em `page.tsx` (home) — `chao-floresta`
  neutralizado para fundo branco/`border-line`, texto ajustado para
  `text-ink`/`text-ink-muted`.

**Arquivos preservados**: `DESIGN.md`, `apps/api/src/seed.ts`, todos os
assets em `public/banner`, `public/campanha`, `public/categorias`,
`ProductCard`, PLP, PDP, Header/barra de anúncio (fora de escopo — Fase 2).

**Checkpoint anterior**: commit `1ac1d5b` (ver §2) — ponto de reversão caso
seja necessário recuperar a implementação "Clareira e Balcão" tal como
estava antes desta fase.

**Verificações** (todas em `apps/web`, executadas depois das edições):

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 12 arquivos, 145 testes |
| `pnpm --filter @animora/web build` | ✅ build de produção concluído, 125 páginas geradas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/web lint` | **não disponível** — este repositório não tem script `lint` nem configuração de ESLint em nenhum `package.json` |
| `pnpm format:check` | **não disponível** — não há script `format`/`format:check` nem configuração de Prettier no repositório |

**QA visual**: Playwright, full-page, 390/768/1440/1920px, Home + PLP +
PLP/categoria "Cães" + PDP (16 combinações) — sem overflow horizontal, sem
imagem quebrada, sem erro ou aviso de console em nenhuma.

**Limitações/pendências conhecidas** (nenhuma bloqueante para a Fase 2):
- Seção de testemunhos mantém fundo `chao-floresta` (só a foto virou
  placeholder) — fora do escopo explícito desta fase.
- `apps/api/src/seed.ts` continua gerando gradiente de campanha dentro da
  imagem de produto — decisão adiada, precisa de proposta isolada e
  reversível própria.
- `modules/account` sem `index.ts` central (pendência de fronteira, menor).
- PLP em 1440px mostra 3 colunas; o plano pede 4 no desktop e 5 no wide —
  gap para as Fases 3/5.

### Fase 2 — Shell global (escopo aprovado 2026-09-11, execução em andamento)

Escopo aprovado pelo usuário:
1. Refinar a navegação desktop existente, mantendo categorias reais e sem
   dropdown.
2. Tornar a busca desktop mais protagonista, respeitando o equilíbrio do
   header em 1024/1440/1920px.
3. Extrair a função pura de estado ativo da `BarraMobile` e criar testes.
4. Validar teclado, foco, Escape, clique fora, toque, safe areas e
   navegação mobile.
5. Preservar logo, slogan, idioma, conta, carrinho, dialogs nativos e
   tokens neutros já existentes.
6. Não adicionar subcategorias fictícias nem alterar o seeder nesta fase.

"Mega menu com subcategorias" fica registrado como trabalho futuro: o
modelo de dados já suporta hierarquia (`categories.parent`), mas nenhuma
das 10 categorias semeadas tem `parent` preenchido hoje (verificado via
`SELECT count(*) FROM categories WHERE parent_id IS NOT NULL` → 0) —
construir um dropdown agora não teria dado real para mostrar.
