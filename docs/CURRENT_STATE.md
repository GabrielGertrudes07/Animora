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

### Fase 2 — Shell global (concluída, 2026-09-11)

Escopo aprovado pelo usuário (6 itens):

1. **Navegação desktop existente** — mantida como estava: já é uma linha
   real de categorias (`Header.tsx`), sem dropdown, sem dado inventado.
   Nenhuma mudança necessária além de conviver com o novo layout da busca.
2. **Busca desktop mais protagonista** — `Header.tsx`: o campo passou de
   `sm:max-w-sm` ancorado à direita (384px, encostado nos ícones) para
   `sm:max-w-lg sm:mx-auto sm:flex-1` (centrado no espaço entre logo e
   ícones). Medido via Playwright: 389px em 1024px (38% do viewport),
   454px em 1440px (32%) e 454px em 1920px (24%) — a largura estabiliza no
   teto em vez de crescer sem limite. Altura do header estável em 173px
   nos três larguras — sem desequilíbrio.
3. **Estado ativo da `BarraMobile` extraído** —
   `naHome`/`naConta`/`noCarrinho` (antes inline, derivados de
   `usePathname()`) viraram a função pura
   `estadoNavegacaoMobile(caminho)` em
   `apps/web/src/components/layout/estadoNavegacaoMobile.ts`, com 4 testes.
4. **Teclado/foco/Escape/clique fora/toque/safe areas** — validado via
   Playwright, nenhum código precisou mudar:
   - Tab order desktop (1024/1440/1920): skip-link → logo → busca →
     idioma → conta → carrinho — idêntico nos três larguras.
   - Alvos de toque da `BarraMobile`: 56px de altura (mínimo do plano é
     44px) nos 5 itens.
   - `safe-area-inset-bottom` confirmado aplicado na barra.
   - As duas folhas (`<dialog>` nativo, categorias e pesquisa): abrir move
     o foco para dentro do diálogo, Tab não escapa dele, Escape fecha e
     devolve o foco ao botão que abriu, clique no backdrop real (fora da
     caixa do próprio `<dialog>`) fecha — tudo nativo, sem uma linha de
     JavaScript de foco escrita à mão.
5. **Preservação** — logo, slogan, idioma, conta, carrinho, os dois
   `<dialog>` nativos e a paleta neutra já existente: intocados.
6. **Sem subcategoria fictícia, sem mudança no seeder** — cumprido; `git
   diff --stat` desta fase toca só 4 arquivos.

**Arquivos alterados**: `Header.tsx` (1 linha — classe do form de busca),
`BarraMobile.tsx` (troca de 3 linhas por 1 chamada), mais os dois arquivos
novos de `estadoNavegacaoMobile`. Diff total: 2 arquivos modificados
(3 inserções, 4 remoções) + 2 novos.

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes |
| `pnpm --filter @animora/web build` | ✅ build de produção concluído, 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/web lint` / `pnpm format:check` | não disponíveis neste repositório (ver Fase 1) |

**QA visual/interação**: Playwright — screenshots do header em
390/768/1440/1920 (Home/PLP/PDP, herdados da Fase 1) mais capturas
dedicadas do header em 1024/1440/1920 e da `BarraMobile` em 390; script de
teclado/foco cobrindo os 6 pontos do item 4 acima.

**Limitação de metodologia notada e corrigida durante a QA**: a primeira
tentativa de testar "clique fora fecha a folha" clicou 2px dentro da
própria caixa do `<dialog>` (ainda sobre o conteúdo do cabeçalho da folha),
não sobre o backdrop real — deu falso negativo. Corrigido clicando acima
do topo da caixa do diálogo; o fecho por clique fora funciona corretamente.

**Mega menu com subcategorias** continua registrado como trabalho futuro:
o modelo de dados já suporta hierarquia (`categories.parent`), mas nenhuma
das 10 categorias semeadas tem `parent` preenchido hoje (verificado via
`SELECT count(*) FROM categories WHERE parent_id IS NOT NULL` → 0).

### Fase 3 — Átomos de comércio (concluída, 2026-09-11)

**Auditoria prévia** (ProductCard e componentes relacionados): preço,
desconto, marca/nome/avaliação e estado de estoque já estavam corretos e
reutilizáveis. Faltavam wishlist e adicionar-ao-carrinho no cartão (só
existiam na ficha de produto), e a grade de PLP/Home parava em 3 colunas.

**Arquivos alterados** (7 arquivos, 138 inserções / 31 remoções):
- `ProductCard.tsx` — `BotaoFavorito` (compacto) e `AdicionarAoCarrinho`
  (com quantidade) movidos para **fora** do `<Link>` do cartão: um botão
  dentro de uma âncora quebra o foco por teclado e a leitura por leitor de
  ecrã — violação real que a auditoria não tinha ainda encontrado porque
  os dois componentes simplesmente não existiam no cartão antes. Distintivo
  de esgotado passou de `right-3` para `left-3` (o canto direito agora é do
  favorito). Título ganhou `line-clamp-2`.
- `BotaoFavorito.tsx` — novo modo `compacto` (botão redondo só com ícone,
  44×44px); modo de texto original preservado e inalterado na ficha de
  produto.
- `AdicionarAoCarrinho.tsx` — novo modo `comQuantidade` (seletor −/+ antes
  do botão); no cartão só aparece quando `product.variants.length === 1`
  (variante única implícita, spec-animora.md §4.1) — com mais de uma
  variante, a escolha continua exigindo a ficha de produto. Empilha
  verticalmente abaixo de `md` (o mesmo ponto em que a grelha passa a 3
  colunas): lado a lado, os dois controlos não cabem nos ~170px de um
  cartão de 2 colunas em mobile — achado real de um teste de QA, corrigido.
- `Catalogo.tsx` (PLP) e a seção de ofertas em `page.tsx` (home) —
  `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5`, substituindo
  grades que paravam em 3 colunas. A seção "escolhas da casa" da home
  (2 colunas, contentor estreito de propósito) foi preservada — é uma
  pausa editorial deliberada, não a grade de catálogo.
- `messages/{pt,de}.json` — chaves `diminuir`/`aumentar` no namespace
  `AdicionarAoCarrinho`.

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes (sem mudança — nenhuma lógica nova pura o bastante para justificar teste próprio; a extração/dedução do "produto com variante única" é uma linha) |
| `pnpm --filter @animora/web build` | ✅ 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/web lint` / `pnpm format:check` | não disponíveis (ver Fase 1) |

**QA visual/interação** (Playwright, contra os 42 produtos reais do
seeder — nenhum dado fictício criado):
- Grade de colunas medida via `getComputedStyle().gridTemplateColumns`:
  390px→2, 768px→3, 1440px→4, 1920px→5, idêntico em Home (ofertas) e PLP.
- **Desconto real + adicionar juntos**: `arranhador-miau-torre` (variante
  única, 34,90€/39,90€, badge "-13%" e botão "Adicionar" no mesmo cartão).
- **Esgotado**: `comedouro-elevado-miau-duplo` — distintivo "ESGOTADO",
  texto "Sem stock de momento" uma vez só (a duplicação com o texto interno
  do `AdicionarAoCarrinho` foi encontrada e corrigida: o bloco de
  adicionar deixa de renderizar quando a variante única está sem stock).
- **Título longo**: `petiscos-liofilizados-miau-gato-figado` (52
  carateres) — `scrollHeight` (112px) maior que `clientHeight` (56px)
  confirma o clamp de 2 linhas ativo, sem esticar o cartão.
- **Variante única vs. múltipla**: `kit-viagem-patas-pro` (1 variante)
  mostra o controlo de adicionar; `coleira-ajustavel-trela-certa-classic`
  (9 variantes) não mostra — só liga para a ficha, como a spec pede.
- **Teclado**: a partir do link do cartão, Tab percorre favorito → diminuir
  → aumentar → adicionar, nesta ordem, em todos os casos testados.
- **Toque (390px real)**: favorito 44×44, diminuir/aumentar 44×44 (após
  correção — nasceram 44×36, um achado de QA), adicionar 44×131.
- **Clique real**: "Adicionar" em `kit-viagem-patas-pro` incrementou o
  contador do carrinho de 0 para 1 (`useCarrinho` real, sem mock).
- **Regressão na ficha de produto**: `AdicionarAoCarrinho`/`BotaoFavorito`
  sem `compacto`/`comQuantidade` continuam iguais — confirmado visualmente
  em `racao-frangoso-cao-adulto-frango-arroz`.
- Nenhum overflow horizontal, imagem quebrada ou erro de console em 16
  combinações de página × largura (Home/PLP/PLP-categoria/PDP ×
  390/768/1440/1920).

**Limitação de cobertura (não um bloqueio):** nenhum dos 42 produtos
semeados está sem imagem (`SELECT count(*) FROM products WHERE
primary_image_id IS NULL AND NOT EXISTS (galeria)` → 0), então o estado
"imagem ausente" não pôde ser demonstrado com dado real — verificado só
por leitura de código (o `img ? <Image/> : <ícone de pata>` já existia
antes desta fase e não foi alterado).

**Sobre "recomendações":** não existe hoje nenhuma seção de recomendações
no código (`grep` por "recomenda"/"relacionad" não encontra nada) — é
trabalho da Fase 6 (PDP) no próprio plano. `ProductCard` recebe só
`product: PublicProduct`, sem acoplamento a Home ou PLP, então já está
pronto para ser reutilizado ali sem alteração quando essa fase chegar.

**Nenhum bloqueio novo sobre o gradiente do seeder**: o cartão trata a
imagem do produto (real ou gerada pelo seeder) da mesma forma em ambos os
casos — nada nesta fase precisou decidir sobre isso. O bloqueio já
registado no seeder (Fase 0/1) permanece, sem mudança.

### Próximo passo

Fase 4 — Home estrutural — aguardando aprovação de escopo antes de
qualquer implementação.
