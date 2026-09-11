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

### Fase 4 — Home estrutural (concluída, 2026-09-11)

**Ordem final** (a mesma que o usuário definiu; header/rodapé ficam no
`layout.tsx`, fora da página): Hero → Escolhe o teu animal → Compra por
necessidade → Em destaque → Campanha → Ofertas da semana → Destaques por
categoria → segunda campanha/editorial → Aprovado por quem manda → Marcas
→ Benefícios.

**Arquivos alterados** (6 modificados, 6 novos; 221 inserções / 246
remoções — `page.tsx` ficou mais curto porque perdeu os dados dos 4 slides
do carrossel antigo):
- `Hero.tsx` (novo) — `MediaPlaceholder ratio="16/7" type="hero"`, ~38%
  texto / 62% mídia em `md+` (a proporção da própria spec estrutural);
  mobile empilha com a mídia primeiro. Único `<h1>` da página — não havia
  nenhum antes.
- `SecaoCampanha.tsx` (novo) — reaproveitado duas vezes (`type="campaign"`
  e `type="editorial"`), com `inverter` para as duas não ficarem
  espelhadas uma da outra em ecrã largo. Copy propositalmente genérica:
  nenhuma campanha real foi decidida ainda.
- `CategoriasVisuais.tsx` — dividido em `EscolhaSeuAnimal` (a cena com
  `PalcoCategorias`, motion preservado) e `ComprarPorNecessidade` (a fiada
  de pills, agora com o seu próprio heading em vez de ser um apêndice sem
  nome).
- `DestaquesPorCategoria.tsx` (novo) — produtos **reais por categoria**
  (as 3 primeiras de `listCategories`), não um recorte genérico do
  catálogo com um título de categoria emprestado.
- `Beneficios.tsx` (novo) — 3 factos verificáveis hoje (envio grátis a
  partir do valor real de `ENVIO_GRATIS_ACIMA_DE`, conta/dados
  protegidos, filtros por animal/porte) — "pagamento seguro" ficou de fora
  de propósito: o checkout ainda não liga a um processador real. Empilha
  em mobile, 3 colunas a partir de `sm` — composição própria, não o mesmo
  grid encolhido.
- `AprovadoPorQuemManda.tsx` — perde `chao-floresta` (fundo neutro, não
  reativa "Clareira e Balcão") e ganha a média real de avaliações da loja
  (antes uma secção `ProvaSocial` à parte — a spec da home estrutural não
  lista uma secção própria para ela, e separá-la do bloco de confiança da
  marca era o que o partia ao meio).
- `modules/catalog/queries.ts` — `listCategories()` passa a devolver
  também `id` (já vinha da API da Payload e ficava por usar) — necessário
  para `DestaquesPorCategoria` pedir produtos por categoria sem uma
  chamada extra por categoria.
- `app/[locale]/loading.tsx` (novo) — esqueleto com os mesmos tons
  neutros do `MediaPlaceholder`, não uma identidade visual nova.
- `app/[locale]/error.tsx` (novo) — limite de erro com mensagem real e
  botão de tentar novamente, em pt/de.

**Removidos da composição, não apagados**: `CarrosselCampanhas.tsx`
(carrossel de 4 slides com animais compostos — a direção "Clareira e
Balcão"), `ProvaSocial.tsx` (conteúdo absorvido acima) e o bloco antigo
"Escolhas da casa" (a nova spec não lista essa secção; "Em destaque" +
"Ofertas da semana" + "Destaques por categoria" já são três vitrines reais
de produto). Nenhum arquivo foi deletado.

**Ruling registrado e já corrigido — a secção não é (nem se chama) uma
classificação por vendas.** Na primeira entrega desta fase a secção
chamava-se "Mais vendidos" mostrando produtos reais mas sem ordená-los por
vendas de verdade — revisão pedida pelo usuário: renomeada para **"Em
destaque"** (pt) / **"Empfehlungen"** (de) em `messages/{pt,de}.json` (chave
`Home.emDestaque`, antes `Home.maisVendidos`) e na variável/comentário de
`page.tsx`. Nenhum dado foi recalculado no frontend nem o seeder foi
tocado — só o nome mudou, o critério de seleção continua o mesmo (produtos
reais, sem repetir os de "Ofertas").

A pendência de fundo permanece registada para uma fase futura: a loja
regista vendas reais (`orders.linhas[].variante` referencia a variante
vendida), mas essa agregação só existe hoje no lado admin
(`packages/core/relatorios`, dashboard com trava comercial) e a coleção
`orders` não tem leitura pública (`access.read: proprioOuStaff`). Expor um
"mais vendidos" real ao storefront pede um novo endpoint público de
agregação na API — uma mudança de backend, fora do escopo de qualquer fase
que só toque `apps/web`. Só quando esse endpoint existir uma secção
chamada "Mais vendidos" voltaria a ser honesta.

**Verificações** (re-executadas depois do rename "Mais vendidos" → "Em
destaque"/"Empfehlungen", mesmos resultados):

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes (inclui a simetria pt/de) |
| `pnpm --filter @animora/web build` | ✅ 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/web lint` / `pnpm format:check` | não disponíveis (ver Fase 1) |

**QA visual/interação** (Playwright, 390/768/1440/1920, pt e de —
screenshots recapturados depois do rename):
- Nenhum overflow horizontal, imagem quebrada ou erro/aviso de console na
  Home em nenhuma das 4 larguras (o único aviso encontrado — prioridade de
  imagem LCP — é pré-existente na PLP, fora do escopo desta fase).
- Ordem do Hero confirmada por medição de DOM, não só visual: no mobile a
  mídia nasce acima do texto (`top` menor), invertendo em `md+`.
- `/de` renderiza todos os headings da nova ordem traduzidos, sem chave
  em falta e sem erro de console — "Empfehlungen" confirmado na posição
  correta (4ª secção); "Em destaque" confirmado igualmente em `/pt`.
- `prefers-reduced-motion: reduce`: `<h1>`, cartão de categoria e cartão
  de produto todos com `opacity:1` — visíveis de imediato, motion
  existente (`Entrada`, `PalcoCategorias`, `CascataProdutos`) preservado
  sem prejudicar a estrutura.
- Simetria pt/de verificada pelo teste automático (`i18n/messages.test.ts`)
  e visualmente nos headings de `/de`.

**Estados loading/erro/vazio:** `loading.tsx` (esqueleto) e `error.tsx`
(mensagem + tentar novamente) novos para o segmento `[locale]`; as
secções de produto/categoria/marca já tinham guarda de vazio
(`.length > 0 ? secção : null`) — estendida às duas secções novas.

### Fase 5 — PLP estrutural (concluída, 2026-09-11)

Escopo: breadcrumb, título/descrição de categoria, subcategorias reais,
filtros por URL, drawer de filtros mobile, ordenação/contagem, grid
2/3/4/5, estados loading/erro/vazio, paginação progressiva, preservação de
parâmetros, acessibilidade. Tudo em `Catalogo.tsx`, reutilizado por
`/produtos` e `/[categoria]` — nenhuma das duas páginas precisou mudar.

**Arquivos alterados** (6 modificados, 1 novo):
- `Catalogo.tsx` — breadcrumb real (`Início / Todos os produtos /
  <categoria>`, com `aria-current="page"` no item atual); subcategorias
  reais via `listSubcategories(categoriaId)`; descrição genérica com o
  nome real da categoria quando a página não fornece uma; grid corrigido
  (ver achado abaixo); `MostrarMais` no lugar da lista inteira de uma vez.
- `MostrarMais.tsx` (novo) — revelação progressiva client-side (12 em 12),
  sem paginação por URL — evita perder o estado de filtro/ordenação atual
  por causa de um parâmetro de página.
- `modules/catalog/{queries,index}.ts` — `listSubcategories(categoriaId)`,
  mesmo padrão de `getCategoryBySlug` (`where[parent][equals]`). Hoje
  devolve sempre `[]` — nenhuma categoria semeada tem `parent` (mesma
  situação do mega menu na Fase 2) — o caminho fica pronto, não fica
  fingido.
- `AdicionarAoCarrinho.tsx` — ver achado de QA abaixo.

**Achado de QA real (não teórico) e correção na raiz — a lacuna de 3
colunas em desktop.** A barra de filtros (`w-64` + `gap-8`, ~288px) só
existe a partir de `lg` (1024px). Medido com Playwright: forçar 4 colunas
exatamente aí (`lg:grid-cols-4`, o que já estava lá desde a Fase 3) dava
cartões de **152px**, e o bloco de quantidade+"Adicionar" (que quer
~219px) ficava cortado — `scrollWidth` 219 contra `clientWidth` 152.
Em 1440px (4 colunas) e 1920px (5 colunas) o mesmo corte persistia, ainda
menor (216px e 168px respetivamente) — a Home nunca expôs isto porque não
tem barra lateral e por isso nunca tem cartões tão estreitos.

Duas mudanças, não uma, resolveram por completo (confirmado sem nenhum
cartão em overflow em 390/768/1024/1440/1920):
1. O degrau de 4 colunas da PLP moveu de `lg` para `xl` (1280px) — em
   1024px a grelha continua em 3 colunas (~213px cada), que é o que cabe
   de verdade com a barra presente. `2xl:grid-cols-5` mantido.
2. `AdicionarAoCarrinho` em modo `comQuantidade` deixou de alternar entre
   coluna (mobile) e linha (`md:flex-row`, 768px+) por viewport, e passa a
   **empilhar sempre**. Um breakpoint de viewport não resolve isto: a
   mesma largura de ecrã tem cartões largos na home (sem barra lateral) e
   estreitos na PLP (com ela) — não há valor de `md`/`lg`/`xl` que sirva
   para os dois ao mesmo tempo sem consulta de contentor (`@container`),
   que não está configurada neste Tailwind. Empilhar sempre custa um
   pouco de altura extra nos cartões largos da home; não custa nada em
   correção.

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes |
| `pnpm --filter @animora/web build` | ✅ 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/web lint` / `pnpm format:check` | não disponíveis (ver Fase 1) |

**QA visual/interação** (Playwright, 390/768/1024/1440/1920, `/produtos` e
`/caes`, pt e de):
- Colunas confirmadas por `gridTemplateColumns`: 2/3/3/4/5 nas 5 larguras
  — 1024px fica em 3 de propósito (ver achado acima), não é uma lacuna.
- Zero cartão com `scrollWidth > clientWidth` em qualquer combinação,
  depois da correção (antes: 10 de 12 cartões em overflow em 1024/1440/1920).
- Breadcrumb correto nas duas rotas: "Início / Todos os produtos" em
  `/produtos`; "Início / Todos os produtos / Cães" em `/caes`.
  Confirmado também em `/de/caes`: "Start / Alle Produkte / Cães".
- Subcategorias: 0 links renderizados em `/caes` — esperado, sem dado
  real (ver achado registado abaixo).
- "Mostrar mais": 12→24 cartões após um clique real; funciona também por
  teclado (foco + Enter).
- Preservação de parâmetros confirmada nos dois sentidos: ordenar em
  `?marca=vidacao` manteve a marca (`?marca=vidacao&ordem=preco-asc`);
  filtrar em `?ordem=preco-desc` manteve a ordenação
  (`?marca=aquavida&ordem=preco-desc`).
- `loading.tsx` do segmento `[locale]` confirmado em cascata para
  `/produtos`: com a API atrasada artificialmente, o esqueleto aparece
  durante a navegação e o conteúdo real substitui-o depois — não
  precisou de um `loading.tsx` próprio para a PLP.
- Folha de filtros por teclado: focar o botão "Filtros" e pressionar
  Enter abre o `<dialog>` (confirmado num teste isolado — uma primeira
  tentativa combinada com outro fluxo deu falso negativo por
  interferência entre os dois, não por um problema real).
- Nenhum erro de console em nenhuma combinação, em nenhum dos dois
  idiomas.

**Achado registado, não corrigido nesta fase — descrição real de
categoria.** A coleção `categories` (Payload) não tem campo de descrição;
por isso `/[categoria]` nunca teve uma frase própria por categoria. A
frase genérica adicionada ("Produtos reais de X, com stock e preço
sempre atualizados.") usa o nome real da categoria, não inventa dado —
mas não é uma descrição editorial por categoria. Adicionar isso pede um
campo novo na coleção (mudança de `apps/api`, fora do escopo de uma fase
que só toca `apps/web`).

**Exceção adaptativa aprovada e registada no plano** (`docs/superpowers/plans/2026-09-11-animora-structural-v1-execucao.md`,
Fase 5): 1024px mantém 3 colunas de propósito — 1440px: 4; 1920px: 5.

### Fase 6 — PDP estrutural (concluída, 2026-09-11)

**Arquivos alterados** (3 modificados, 3 novos):
- `produto/[slug]/page.tsx` — breadcrumb real (Início / categoria real /
  produto, com `line-clamp-1` para título longo); avaliação real via
  `Estrelas`/`getAvaliacaoProduto` (reaproveitados do `ProductCard`);
  desconto real ao lado do preço (mesmo cálculo do `ProductCard`);
  seletor de quantidade em cada linha de variante
  (`AdicionarAoCarrinho.comQuantidade`, já existia desde a Fase 3);
  recomendações reais (produtos da mesma categoria do produto atual,
  excluindo-o, via `pesquisarProdutos` já existente).
- `GaleriaProduto.tsx` (novo) — pronta para várias fotografias reais por
  produto; deduplicada por `url`. Fallback com ícone de pata quando não
  há nenhuma imagem, simetria com o `ProductCard`.
- `CtaStickyMobile.tsx` (novo) — barra fixa só em mobile, só quando
  `#area-compra` sai da viewport (`IntersectionObserver`, sem animação).
  Produto de variante única repete a ação do CTA principal; com várias
  variantes, rola de volta às opções em vez de adivinhar uma escolha.
- `app/[locale]/not-found.tsx` (novo) — antes caía no 404 genérico do
  Next, sem a paleta nem o idioma da loja.

**Achados registados como limitação de cobertura, não bugs (verificados
com dado real, não assumidos):**
- **Avaliação nunca aparece em nenhum produto testado** — confirmado
  `SELECT count(*) FROM reviews WHERE estado='aprovada'` → 0 em toda a
  base semeada. O código está correto (mesma integração já usada e
  provada no `ProductCard`); simplesmente não há avaliação real para
  mostrar ainda, em produto nenhum da loja.
- **Galeria nunca mostra miniaturas** — confirmado via SQL:
  `primaryImage` e o único item de `gallery` apontam sempre para a
  mesma imagem (`media.id` idêntico) em todos os 42 produtos. O
  componente já dedupllica por `url` e está pronto para várias
  fotografias reais; hoje não há mais de uma por produto.
- **Nenhum produto sem imagem** — mesma situação já registada na Fase 3
  para o `ProductCard`; o fallback (ícone de pata) existe e é o mesmo,
  mas não pôde ser demonstrado com dado real.
- **"Trocas" (devolução) sem dado real** — só o "envio grátis acima de
  X€" (real, `ENVIO_GRATIS_ACIMA_DE`) permanece na ficha. Não existe
  política de devolução em lugar nenhum do código ou da spec — inventar
  um prazo específico seria fabricar dado operacional. Registado, não
  preenchido.
- **`produto inexistente` responde HTTP 200, não 404 — característica
  pré-existente da infraestrutura, não desta fase.** Confirmado que
  isto já acontecia antes de qualquer mudança da Fase 6: até uma rota
  totalmente aleatória e nunca definida (`/isso-e-totalmente-aleatorio-000`)
  responde 200. A causa provável é o middleware do `next-intl`
  reescrevendo toda a árvore de rotas; corrigi-lo tocaria
  `middleware.ts`/configuração de i18n partilhada por todo o site, fora
  do escopo de uma fase de PDP. O conteúdo renderizado está correto (o
  novo `not-found.tsx`, com a marca e o idioma certos) — só o código de
  estado HTTP está errado.

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes |
| `pnpm --filter @animora/web build` | ✅ 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/web lint` / `pnpm format:check` | não disponíveis (ver Fase 1) |

**QA visual/interação** (Playwright, 390/768/1024/1440/1920, pt/de, com
produtos reais — `kit-viagem-patas-pro` variante única,
`coleira-ajustavel-trela-certa-classic` 9 variantes,
`arranhador-miau-torre` com desconto real, `comedouro-elevado-miau-duplo`
esgotado, `petiscos-liofilizados-miau-gato-figado` título de 52 carateres):
- Breadcrumb, número de linhas de variante, distintivo de desconto e
  seletor de quantidade corretos nos 5 casos; nenhum erro de console.
- Recomendações reais renderizadas nos 5 casos (categoria real do
  produto, produto atual excluído) — confirmado por medição de DOM, não
  só pela existência do elemento: cartões abaixo da dobra nascem a
  `opacity:0` (cascata do `CascataProdutos`, `ScrollTrigger`) e só
  revelam com rolagem de verdade — comportamento correto, não vazio;
  com `prefers-reduced-motion: reduce` aparecem em `opacity:1` desde o
  primeiro render, sem depender de rolagem.
- CTA fixo mobile: some no desktop (1440px, confirmado `display`
  computado); em mobile aparece assim que `#area-compra` sai da
  viewport — inclusive já ao carregar, quando a área de compra nasce
  abaixo da dobra num produto com título mais alto (medido via
  `getBoundingClientRect`, não presumido); some ao rolar de volta
  quando a área volta a caber na tela; texto correto por caso ("preço +
  Adicionar" para variante única, "preço + Ver opções" para múltiplas).
- Clique real: aumentar quantidade duas vezes e adicionar incrementou o
  carrinho em 3 unidades (não em 1) — confirma que a quantidade
  escolhida chega mesmo ao `useCarrinho`.
- Teclado: link "Início" do breadcrumb e botão "Diminuir quantidade"
  focáveis e identificados corretamente.
- `/de`: breadcrumb, "Opções disponíveis"/"Verfügbare Optionen" e
  "Também pode interessar"/"Das könnte dir auch gefallen" corretos.
- Nenhum overflow horizontal em nenhuma das 5 larguras.

### Próximo passo

Fase 7 — Validação integrada — aguardando aprovação de escopo antes de
qualquer implementação.
