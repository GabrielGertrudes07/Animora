# Estado atual — Animora

**Última atualização:** 2026-09-11, após a rodada corretiva pós-revisão geral
(ver `docs/reviews/2026-09-11-revisao-geral.md`), que segue o fim da Fase 7
do plano estrutural v1.

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

### Fase 7 — Validação integrada (concluída, 2026-09-11)

**Bug real corrigido — rota inexistente respondia HTTP 200, não 404.**
Causa raiz identificada (não só contornada): qualquer `loading.tsx`
ancestral de uma rota que chama `notFound()` trava o código de estado em
200 (o Next começa a transmitir a resposta assim que a fronteira
`<Suspense>` monta o `fallback`, antes de o `notFound()` resolver —
comportamento documentado do App Router, `vercel/next.js` discussions
#76501/#70170). O `app/[locale]/loading.tsx` da Fase 4 era exatamente
esse ancestral, cobrindo `/[categoria]` e `/produto/[slug]` por herança.
Corrigido: a home passou a viver em `app/[locale]/(home)/` (grupo de
rota, sem mudar a URL), levando o `loading.tsx` junto; `/produtos`
(nunca chama `notFound()`) ganhou o seu próprio `loading.tsx` local.
Confirmado antes da correção que até uma rota aleatória e nunca definida
respondia 200 (prova de que o problema era estrutural); confirmado
depois, em dev **e em produção** (`next build` + `next start`), que
produto inexistente, categoria inexistente e qualquer rota aleatória
respondem 404 de verdade, com o conteúdo do `not-found.tsx` (marca e
idioma corretos) preservado. Ver `docs/DECISIONS.md` D01.

**Achado do audit de fronteiras, corrigido — 12 imports cruzavam
`modules/cart`/`modules/account` direto para arquivo interno.**
`modules/account/index.ts` (novo) e `modules/cart/index.ts` (estendido
com `carregarLinhas`/`comprar`) passam a cobrir a superfície realmente
usada por quem importa de fora do módulo. **Efeito colateral real
encontrado e corrigido no mesmo commit, não só teorizado**: barrilar
`modules/account/sessao.ts` (servidor-só, usa `next/headers`, sem `'use
server'`) junto de `modules/account/acoes.ts` (`'use server'`, seguro
para Client Component) quebrou o `BotaoFavorito` em runtime real (`You're
importing a component that needs "next/headers"`) assim que o barril
ficou completo — confirmado rodando o app, não assumido. Corrigido:
`sessao.ts` e `encomendas.ts` voltam a ser importados diretamente pelas
Server Components que já os liam (não é violação de fronteira — é a
superfície real do módulo, que tem duas audiências). `modules/cart`
não tinha esse problema (`cart/acoes.ts` também tem `'use server'`),
confirmado, não presumido. Ver `docs/DECISIONS.md` D02.

**Navegação real Home → PLP → PDP → Carrinho**: confirmada com cliques
reais (não simulados por URL), usando seletores por `href` para evitar
ambiguidade entre Header/BarraMobile/tiles. Item adicionado na PDP
aparece no `/carrinho` com preço, subtotal, portes e total corretos
(conferido lendo o conteúdo real da página, não só a contagem do ícone).

**Consistência do carrinho** entre quick-add (Home/PLP) e adicionar pela
PDP: contagem idêntica nos dois pontos de entrada, incrementa
corretamente com a quantidade escolhida — mesmo carrinho, mesma fonte
(`useCarrinho`/`localStorage`), sem duplicação nem dessincronia.

**Cleanup de animação**: 9 navegações reais com rolagem completa em
sequência (Home ↔ PLP ↔ categoria ↔ PDP ↔ carrinho) sem nenhum aviso de
GSAP/`ScrollTrigger` acumulado — o `gsap.context().revert()` do
`useMotion` limpa corretamente a cada desmontagem.

**Links mortos**: zero `href="#"` ou `href=""` em Home, PLP, PDP e
carrinho.

**Loading pós-reestruturação**: Home e `/produtos` continuam mostrando o
esqueleto sob API lenta (confirmado com a resposta atrasada
artificialmente); `/[categoria]` e `/produto/[slug]` deixaram de ter
esqueleto de rota (era o preço da correção do 404 — ver acima) e
carregam direto; ainda rápido o bastante na prática (ver Lighthouse
abaixo) para não incomodar.

**Verificação do impacto do teste da API, antes de decidir não o
rodar**: `apps/api/src/integracao.test.ts` tem um `beforeEach` em
`describe('dashboard', …)` que roda
`payload.delete({ collection: 'orders', where: { id: { exists: true } } })`
— apaga **toda** a tabela `orders`, não só encomendas de teste,
confirmado lendo o código-fonte da suite, não pelo README. Rodar
`pnpm --filter @animora/api test` (ou `pnpm -r test` na raiz) apagaria as
20 encomendas de demonstração do seeder. Nenhum item do escopo desta
fase depende da suíte da API (todos são de storefront/frontend) —
**decisão: não rodar**, para preservar os dados de demonstração. Reversível
(`pnpm seed` recria o catálogo e as encomendas), mas sem necessidade que
justifique o custo.

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes |
| `pnpm --filter @animora/web build` | ✅ 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |
| `pnpm --filter @animora/api test` / `pnpm -r test` | **não executados** — ver justificativa acima |
| `pnpm --filter @animora/web lint` / `pnpm format:check` | não disponíveis (ver Fase 1) |

**QA visual/interação** (Playwright, 375/390/430/768/1024/1440/1920, pt/de):
- Home, `/produtos`, `/caes`, PDP e `/carrinho` — 35 combinações
  rota×largura, **zero overflow horizontal, zero erro de console**.
- `prefers-reduced-motion`: PLP confirmado (Home/PDP já confirmados nas
  Fases 4/6) — cartões em `opacity:1` sem depender de rolagem.
- Simetria pt/de reconfirmada nas rotas centrais; teste automático de
  paridade de chaves (`i18n/messages.test.ts`) continua verde.
- Estados já documentados como limitação de cobertura (não bugs, dado
  real ausente) **permanecem intactos, não alterados**: avaliação nunca
  aparece (0 reviews aprovadas na base), galeria sem miniaturas
  (`primaryImage` = único item de `gallery` em todos os produtos),
  "trocas" sem política real, nenhum produto sem imagem.

**Performance básica (Lighthouse, build de produção, `next start`):**

| Página | Performance | LCP | CLS | TBT |
|---|---|---|---|---|
| Home | 94/100 | 3,0 s | 0 | 0 ms |
| PLP (`/produtos`) | 91/100 | 3,5 s | 0 | 0 ms |
| PDP | 95/100 | 3,0 s | 0 | 0 ms |

CLS e TBT em zero nas três — nenhum salto de layout, nenhum JS
bloqueando a thread principal. **Correção (revisão geral, achado R11):** a
frase anterior aqui atribuía o LCP alto ao aviso do Next/Image sobre
`priority` numa imagem acima da dobra, nas três páginas. Isso está errado
para a Home: `Hero.tsx` não tem nenhum `<Image>`, só `MediaPlaceholder`
(uma `div` de fundo neutro) — não há imagem nenhuma para priorizar, o
elemento de LCP ali só pode ser texto (`<h1>` ou o placeholder). Não
identifiquei o elemento de LCP real em nenhuma das três páginas (precisa
do relatório detalhado do Lighthouse, não só do número); o que fica
registado é isto: o número existe, a causa não foi verificada, e a
explicação anterior não se sustenta para a Home. Também vale registar que
TBT=0 é uma métrica de laboratório e não substitui INP (métrica de campo,
de interações reais) — não posso afirmar responsividade a interações a
partir do TBT sozinho. Investigação de performance completa fica para uma
fase dedicada.

### Marco: fim da fase estrutural v1

Fases 0 a 7 do plano estrutural (`docs/superpowers/plans/2026-09-11-animora-structural-v1-execucao.md`)
estão concluídas. O storefront tem Home, PLP e PDP estruturalmente
validados, com `MediaPlaceholder` neutro em todo espaço editorial, sem
nenhuma direção de arte nova. A fase de criativos e motion (retomando "A
Clareira e o Balcão", preservada no checkpoint `1ac1d5b`) só começa com
aprovação explícita do usuário — não iniciada nesta sessão.

## Rodada corretiva pós-revisão geral

A revisão externa (`docs/reviews/2026-09-11-revisao-geral.md`) foi
verificada achado a achado antes de qualquer correção, seguindo a skill
`superpowers:receiving-code-review` — não implementação por concordância
performática. Veredito completo (confirmado / disputado / precisa de mais
informação do usuário) foi entregue na conversa antes desta rodada. Esta
secção documenta só o que foi corrigido, na ordem que o usuário pediu:
P1 (confiança na compra) → P2 (decisão e sincronização de estado) → Home.
R07, R08, R09, R10 e R11 **não** entraram nesta rodada — ficam para uma
decisão de produto/priorização à parte.

**P1 — R01 (CTA fixo mobile da PDP):** os quatro problemas confirmados
foram corrigidos na origem, não sintoma a sintoma:
- Sobreposição com a `BarraMobile`: o CTA agora ancora em
  `bottom: calc(3.5rem + env(safe-area-inset-bottom))` (a altura da nav
  inferior), não em `bottom-0` — os dois ficam visíveis ao mesmo tempo.
- Quantidade duplicada: `CtaStickyMobile` deixou de ter o seu próprio
  `<AdicionarAoCarrinho>` com estado próprio. Novo componente
  `components/produto/AreaCompra.tsx` (Client Component) é o único dono
  do `useState` de quantidade quando há variante única, partilhado entre
  a lista de opções e o CTA fixo — `AdicionarAoCarrinho` ganhou
  `quantidade`/`aoMudarQuantidade` opcionais para aceitar esse controlo
  externo sem mudar o uso não controlado já existente (`ProductCard`).
- Aparecia antes de ter sido visto: o `IntersectionObserver` agora só
  arma `visivel` depois de já ter visto `#area-compra` intersectar pelo
  menos uma vez.
- Faltava "desde": o CTA usa o mesmo prefixo (`Price.desde`) que o preço
  principal, calculado uma vez em `page.tsx`.

**P1 — R02 (falha de rede trava em estado de carregamento):**
`carrinho/page.tsx` e `FormularioCheckout.tsx` ganharam `.catch` na
leitura de preços (`carregarLinhas`) com um estado de erro + botão
"Tentar novamente"; `confirmar()` no checkout ganhou `try/catch` em volta
de `guardarMorada`/`comprar`, mostrando `t('erroDeRede')` em vez de deixar
o botão preso em "A confirmar…" para sempre.

**P2 — R03 (quantidade sem teto):** o `+` do seletor agora satura em
`QTY_MAX` (`Math.min(QTY_MAX, quantidade + 1)`), a mesma constante que
`acrescentar` já usava para saturar a soma — antes só o clique isolado
não tinha teto, o que produzia uma exceção não tratada ao tentar
adicionar.

**P2 — R04 (Limpar não ressincronizava os filtros):**
`FiltrosCatalogo.tsx` agora dá `key={JSON.stringify(filtrosAtuais)}` aos
dois `<form>` (barra lateral e folha mobile) — os campos são não
controlados de propósito (`defaultChecked`/`defaultValue`), e a `key`
força o remount exatamente quando a prop muda, o que uma navegação para
`pathname` sem query não fazia sozinha.

**P2 — R05 ("mostrar mais" perdia produtos ao voltar):**
`MostrarMais.tsx` escreve `?mostrar=N` com `history.replaceState` (não o
router do Next — evita uma nova busca ao servidor a cada clique) e lê
esse valor como estado inicial. Concessão registada: o comentário
original deste componente justificava a ausência de paginação por URL
dizendo que perderia o filtro/ordenação atual — raciocínio errado (um
parâmetro adicional convive com os outros); a causa real era só a
ausência de qualquer persistência.

**P2 — R06 (troca de idioma descartava a query):** `SeletorIdioma.tsx`
lê `window.location.search` no clique (não `useSearchParams`, que
forçaria toda página que usa o cabeçalho a sair da geração estática) e
anexa a query ao `pathname` antes de trocar de locale.

**Correções de documentação (achados sobre o meu próprio processo):**
cabeçalho de data deste ficheiro corrigido; explicação do LCP alto na
Home corrigida (não há `<Image>` na Home, a atribuição a "falta de
`priority`" estava errada); D01 (`docs/DECISIONS.md`) reescrita para
nomear a causa exata (início do streaming, não "existe um
`loading.tsx`") e registar a alternativa de checagem em
middleware/proxy, que não tinha sido considerada.

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 13 arquivos, 149 testes |
| `pnpm --filter @animora/web build` | ✅ 125 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |

**QA real de navegador** (Playwright, servidor de dev, produto real com
página alta o bastante para o CTA sair da viewport): 10/10 verificações
passaram — CTA não aparece antes de rolar, aparece depois de ver e
passar a área de compra, não sobrepõe a `BarraMobile`, soma a quantidade
partilhada (3, não 1) ao clicar no CTA fixo; seletor de quantidade
satura em 99 sem lançar exceção ao adicionar; checkbox de marca
desmarca visualmente depois de "Limpar"; contagem revelada por "mostrar
mais" sobrevive a abrir um produto e voltar; troca de idioma preserva
`?q=`. R01's "desde" (preço com prefixo no CTA) não foi verificado em
navegador — os 42 produtos semeados têm todos variante única, não há
como produzir um produto com preços divergentes sem inventar dados;
verificado só por leitura de código.

**Compactação da Home (item 3):** o ritmo vertical entre as ~9 secções da
Home vem de um token único, `spacing.secao` (`tailwind.config.ts`) —
confirmado que só a Home (e, incidentalmente, `not-found`/`error`/
`loading`) o usa; PLP e PDP têm o próprio ritmo, por isso não são
afetadas. Reduzido de `clamp(4rem, 9vw, 8rem)` (64-128px de topo+fundo
por secção) para `clamp(2.5rem, 6vw, 4rem)` (40-64px) — a mudança de
magnitude de um valor já existente, não uma direção visual nova. Nenhum
componente, cor, proporção ou composição foi alterado.

Verificado visualmente (Playwright, `reducedMotion:'reduce'` para não
confundir a opacidade inicial do `CascataProdutos`/GSAP com conteúdo em
falta — sem isso, a secção "Em destaque" parecia vazia numa captura de
página inteira; com o motion desligado, os 4 cartões aparecem
normalmente) em 390px e 1440px: todas as secções renderizam com o
conteúdo real esperado, sem sobreposição nem corte. `pnpm test` (149/149)
e `pnpm build` (125 páginas) continuam verdes depois da mudança —
esperado, é só CSS gerado pelo Tailwind, nenhuma lógica tocada.

## SEO técnico

Frente escolhida pelo usuário entre as melhorias pendentes (não fazia parte
da revisão nem do plano estrutural). O site não tinha `sitemap.xml`,
`robots.txt`, dados estruturados, `canonical` nem `hreflang` — confirmado
antes de começar, nada disto existia.

- **`lib/seo.ts`** (novo, testado): `SITE_URL` a partir de
  `NEXT_PUBLIC_SITE_URL`, com um placeholder documentado (`https://animora.exemplo.pt`)
  enquanto não há domínio real. `localizedPathname`/`absoluteUrl`/`alternatesFor`
  são puros — não reusam `getPathname` do next-intl de propósito, para
  serem testáveis sem o runtime do Next. `centsToDecimalString` para o
  formato que o `Offer.price` do schema.org exige.
- **`app/sitemap.ts`**: Home, `/produtos`, as 10 categorias e os 42 produtos,
  pt e de — 108 URLs. Sem `lastModified` fabricado: o catálogo não expõe
  data de atualização.
- **`app/robots.ts`**: bloqueia `/checkout`, `/carrinho`, `/conta` (e os
  equivalentes `/de/...`) nos dois idiomas; aponta para o sitemap.
- **`alternates` (canónica + hreflang pt/de/x-default)**: adicionado ao
  `generateMetadata` já existente em `layout.tsx`, `[categoria]`,
  `produto/[slug]` e `produtos` — a canónica de categoria/produtos ignora
  filtros/pesquisa de propósito (mesma página de conteúdo aos olhos de um
  motor de busca).
- **`robots: {index:false}`**: adicionado às 7 páginas privadas/transacionais
  que já tinham `generateMetadata` (checkout, conta e as 5 subpáginas de
  conta) — sem valor de indexação.
- **JSON-LD** (`components/seo/JsonLd.tsx`, escapa `<` antes de injetar):
  `Organization`+`WebSite` (com `SearchAction` real, `/produtos?q=`) na
  Home; `Product` (nome, imagem, marca, preço, disponibilidade real, `sku`
  só quando há variante única) e `BreadcrumbList` na PDP; `BreadcrumbList`
  em `Catalogo.tsx` (PLP e categoria, mesmo componente). Sem
  `aggregateRating`: 0 avaliações aprovadas hoje, e um `aggregateRating`
  sem avaliação por trás seria a mesma nota inventada que o módulo de
  avaliações já proíbe — entra sozinho quando `avaliacao.media` deixar de
  ser `null`.

**Verificado** com o build de produção (`next start`): `robots.txt` e
`sitemap.xml` corretos (108 URLs, contagem batendo com 10 categorias × 42
produtos reais); `<link rel="canonical"/alternate>` corretos em Home, PDP,
categoria e `/produtos`; `<meta name="robots" content="noindex, nofollow">`
confirmado em `/checkout` e `/conta/entrar`; JSON-LD de `Product` e
`BreadcrumbList` inspecionado num produto real (preço, disponibilidade,
sku e migalhas corretos, sem `aggregateRating`).

**Verificações:** `pnpm --filter @animora/web typecheck` (0 erros),
`pnpm --filter @animora/web test` (155/155 — 6 novos em `seo.test.ts`),
`pnpm --filter @animora/web build` (127 páginas, as 2 a mais são
`/robots.txt` e `/sitemap.xml`), `git diff --check` (sem erros).

## Três frentes em paralelo: UX/acessibilidade, performance real, densidade da home

Pedido do usuário: as três frentes que ainda faltavam das sugestões
anteriores (A, C, D — a fase de criativos, E, continua à parte,
aguardando decisão). R07 e R08 (confronto com o plano original e o
padrão "9 linhas" da PDP) foram tratados aqui também; R09/R10 quase por
completo. Nada de proposta comercial nova (pagamento, fotografia real,
políticas) — fora de escopo desde sempre.

**A — UX/acessibilidade:**
- **R09**: `<select>` de ordenação ganhou nome acessível em mobile
  (`sr-only sm:not-sr-only` em vez de `hidden`, que tirava o texto da
  árvore de acessibilidade). Botão de fechar da folha de filtros
  (`FiltrosCatalogo.tsx`) passou de 28×28px para 44×44px. Contraste do
  `.botao-principal`: texto branco sobre `terracota.DEFAULT` dava
  3,51:1 (abaixo do 4,5:1 do WCAG AA para texto normal — cálculo
  confirmado); repouso passou a `terracota.dark` (4,82:1), hover
  passou a usar o tom mais claro.
- **R10**: `ImagemComFallback.tsx` (novo) — mostra a pata em marca
  d'água quando o `<Image>` falha ao *carregar* (URL quebrada), não só
  quando não há registo de imagem nenhum. Aplicado em `ProductCard` e
  na foto principal da `GaleriaProduto`. Precisa de Client Component:
  um Server Component não pode passar `onError` para o `<Image>` do
  `next/image`.
- **R08**: seletor por atributo (`SeletorAtributos.tsx`, novo) em vez
  da lista de uma linha por variante, quando `agruparPorAtributo`
  (`modules/catalog/variantes.ts`) confirma que as variantes formam
  uma matriz regular (mesmas chaves em todas — Tamanho × Cor, por
  exemplo). Com 0/1 variante ou uma combinação irregular, continua a
  lista de linhas de sempre. **Limitação registada, não escondida**:
  os 42 produtos semeados têm todos variante única — este caminho
  nunca pôde ser exercido em navegador contra dado real, só verificado
  por teste unitário da lógica pura (`variantes.test.ts`, 6 casos:
  matriz regular, irregular, sem combination, busca de variante) e
  confirmado que o caminho antigo (lista) continua a renderizar
  corretamente para os produtos reais (QA abaixo).

**C — Performance:**
- `sizes` acrescentado ao `<Image>` do `ProductCard` (fórmula espelha
  os breakpoints reais da grelha, 2 a 5 colunas).
- N+1 de avaliações eliminado: `getAvaliacoesEmLote` (nova, uma
  consulta com `where[produto][in]=`) substitui a leitura por cartão
  em todos os 5 pontos onde `ProductCard` é usado (Home ×2, PDP
  recomendados, favoritos, PLP/categoria, destaques por categoria).
  `ProductCard` deixou de buscar a própria avaliação — recebe-a como
  prop.
- **Diagnóstico real de LCP via Lighthouse** (não mais especulação):
  rodado contra o build de produção (`next start`), com
  `lcp-breakdown-insight` a apontar o elemento exato.
  - **Home**: LCP é o parágrafo do `Hero` (`<p class="mt-3
    max-w-leitura...">`) — confirma que a explicação anterior (falta
    de `priority` numa imagem) estava errada; não há imagem nenhuma
    ali.
  - **PDP**: LCP é a foto principal da galeria, que já usa `priority`
    corretamente. Nada a corrigir.
  - **PLP**: LCP é a foto do primeiro cartão da grelha, e ela carregava
    `loading="lazy"` como qualquer outra — achado real e acionável.
    Corrigido: `ProductCard` ganhou `prioritario` (novo prop); quem
    monta a grelha (`Catalogo.tsx`) marca só o primeiro item.
    **Verificado antes/depois**: "Resource load delay" caiu de 386ms
    para 149ms, pontuação do Lighthouse subiu de 0,87 para 0,94.
  - TBT=0 continua sem provar INP — não medido nesta rodada (precisa
    de dado de campo, não de laboratório).

**D — Densidade/descoberta na Home:**
- Ordenação real por "mais recentes": `PublicProduct` ganhou
  `createdAt` (do Payload, nunca escrito por esta loja — timestamps
  são automáticos em toda coleção); novo valor `'recentes'` em
  `SortKey`, ordena por essa data real.
- "Vistos recentemente": `lib/vistos.ts` (localStorage, lógica de
  dedup/limite pura e testada) + `RegistrarVisualizacao.tsx` (grava ao
  abrir uma ficha) + `VistosRecentemente.tsx` (mostra na Home). Cartão
  próprio, mais simples que `ProductCard` (sem avaliação, sem
  adicionar rápido) — um Client Component não pode instanciar
  `ProductCard`, que é um Server Component assíncrono. Nova ação
  `produtosPorIds` (`'use server'`) busca os produtos reais pelos ids
  guardados, preservando a ordem (mais recente primeiro) e descartando
  em silêncio um id que já não resolve a produto real.
- Links "Ver todos os produtos" nas seções "Em destaque" e "Ofertas
  desta semana" (chave de tradução já existia, nunca tinha sido usada).

**Verificações:**

| Verificação | Resultado |
|---|---|
| `pnpm --filter @animora/web typecheck` | ✅ 0 erros |
| `pnpm --filter @animora/web test` | ✅ 16 arquivos, 165 testes |
| `pnpm --filter @animora/web build` | ✅ 127 páginas |
| `git diff --check` | ✅ sem erros de espaço em branco |

**QA real de navegador** (Playwright, build de produção): 7/7 —
PDP real (variante única) continua a usar a lista de linhas, não o
seletor novo; "Ordenar por recentes" atualiza a URL; botão de fechar
dos filtros mede 44×44px; imagem forçada a falhar mostra o ícone de
pata; ver um produto grava no `localStorage` e "Vistos recentemente"
aparece na Home a seguir; "Ver todos os produtos" presente nas duas
seções.

Nota de infraestrutura (não é do código): a bateria de build/QA desta
rodada esbarrou numa degradação do Docker local (Postgres respondendo
em ~4s por consulta simples, depois parando de responder) — resolvida
reiniciando o Docker Desktop, não investigada mais a fundo por estar
fora do escopo desta sessão.

## Fase de criativos e motion — início (2026-09-14)

Primeira imagem real da loja, na secção mais visível da Home. Usuário
trouxe 7 imagens reais (geradas, não fotografadas) para compor o herói;
antes de tocar em código, confirmei com ele que isto abre a fase de
criativos (até aqui só "estrutural") e o que fazer com cada peça — ver a
conversa para as duas perguntas e respostas.

**Descoberta que mudou o plano**: `CarrosselCampanhas.tsx` — um
componente inteiro para "animal composto sobre fotografia", com
entrada em GSAP (o animal assenta, não flutua; ver `apoio`/`CamadaPet`),
respiração em loop, `IntersectionObserver` para pausar fora do ecrã e
`prefers-reduced-motion` (herdado de `useMotion`) — já existia,
preservado desde o checkpoint `1ac1d5b`, só desligado (`MediaPlaceholder`
no lugar da foto real) pela Fase 1 da estrutural. Reaproveitado em vez de
escrever um sistema novo — é por isto que o pedido do usuário virou uma
tarde, não uma semana.

**O que fiz:**
- **Imagens**: as 7 PNGs (até 2,2 MB cada) convertidas para `.webp`
  (`cwebp`), redimensionadas ao tamanho real de exibição — total ~390 KB
  para as 7, contra ~10 MB nas fontes. Em `public/banner/`: `sala-estar`
  (fundo), `cao-dourado` + `cao-dourado-sombra` (o animal, a única
  camada com peso — assenta no `apoio: '50% 97%'`), `bolinha-tenis`,
  `decoracao-folha`, `decoracao-sparkle` (toques flutuantes, sempre em
  loop, nunca assentam), `decoracao-mancha` (halo suave atrás do animal,
  opacidade 50%).
- **`CarrosselCampanhas.tsx`**: restaurada a renderização real de
  `slide.fotografia`/`slide.pets` (estava só nos tipos, preservada em
  comentário) a partir da versão pré-estrutural do próprio ficheiro
  (`git show 1ac1d5b:...`) — não reinventada. Um ajuste sobre o original:
  `object-bottom` na sombra (`object-contain` sozinho centrava-a a meio
  da caixa do animal, porque a sombra gerada é uma elipse larga e baixa,
  não a mesma proporção do animal — sem isto, "flutuava" acima do chão).
  Novo campo `decoracoes`/`decoracoesFundo` (tipo `Decoracao`) para os
  toques que não são `CamadaPet` — sem assentar, sem sombra própria, só
  um `from(scale/opacity)` na entrada e uma deriva lenta e dessincronizada
  (rotação e `yPercent` com fase própria por elemento) no loop de
  repouso, dentro da mesma timeline `respirar` — herda de graça o
  `prefers-reduced-motion` e a pausa por `IntersectionObserver` que já
  existiam.
- **Home**: `<Hero />` (estrutural, `MediaPlaceholder`) trocado por
  `<CarrosselCampanhas>` com um slide só. Copy: reaproveitada a do
  "slide2" (`CarrosselCampanhas.slide2*`, pt/de) — já escrita na fase de
  design original, nunca usada, e fala de cães, o que a foto real já é.
  `slide2Alt` **corrigido** para descrever a foto real (a versão antiga
  descrevia uma composição diferente que nunca chegou a existir).
  `href`/`hrefSecundario` reais: `/caes` (categoria real) e `/produtos`.
  `Hero.tsx` fica no disco, não referenciado — mesmo padrão de
  preservação já usado no projeto (nunca apagar o que pode voltar).

**Verificado**: `typecheck` 0 erros, `test` 165/165 (sem mudança de
lógica testável — isto é composição visual), `build` 127 páginas,
`git diff --check` limpo. Visual conferido via Playwright em 1440px e
390px, com e sem `prefers-reduced-motion`, e ~2,5s depois da carga
(estado de repouso/loop) — sem erros nem avisos no console nas três
capturas. Não fiz uma segunda rodada de ajuste fino de posição: o
primeiro resultado já ficou bem composto (animal sobre o tapete, sombra
coerente, decorações sem sobrepor o texto) nas duas larguras testadas.

**Registo, não decisão silenciosa**: a mancha de tinta verde (halo atrás
do animal) é a única das 4 peças "soltas" sem uso 1:1 óbvio sobre uma
fotografia real — usada como glow suave em vez de descartada, por pedido
explícito do usuário de aproveitar as 4 como toques flutuantes.

### Próximo passo

Aguardar feedback do usuário sobre o resultado visual (a mesma captura
que ele vai ver ao abrir a home). Se aprovado, considerar: os outros 3
slides do carrossel (`slide1`/`slide3`/`slide4`, com copy já escrita,
sem imagem ainda) para um carrossel de verdade em vez de um herói fixo;
tratar o que restou de R09/R10 (contraste do texto sobre imagem sem
verificar caso a caso, INP de campo); ou seguir para outra frente.

## Investigação: fundação Shopify — confirmado bloqueio na Task 3 (2026-09-18)

O usuário pediu para deixar o catálogo (destaques, ofertas, etc.) 100%
adaptado ao Shopify, preparando a fundação para "só chegar e conectar"
(ainda sem conta Shopify). Antes de desenhar algo novo, esta sessão
verificou o estado real do trabalho já existente e encontrou uma
decisão arquitetural anterior, aprovada e parcialmente implementada,
que já resolve exatamente esse pedido:

- `docs/superpowers/specs/2026-08-29-catalogo-shopify-design.md` (spec)
  e `docs/superpowers/plans/2026-08-29-catalogo-shopify-espelho.md`
  (plano) — o Shopify é dono só do catálogo (produtos/variantes/preços/
  stock/imagens/categorias/marcas), espelhado no Postgres por
  sincronização GraphQL. Checkout, encomendas e clientes ficam neste
  projeto, sem uso do checkout hospedado do Shopify. `modules/catalog`
  do `apps/web` não muda — a loja continua a ler REST do Payload como
  hoje.

**Estado real confirmado nesta sessão** (por leitura de código, não
suposição):

- ✅ **Task 1** (campo `shopifyId` nas 4 coleções de catálogo) e
  **Task 2** (`apps/api/src/shopify/cliente.ts`, cliente GraphQL da
  Admin API) — feitas e commitadas (`83dbbdf`, `86cba69`).
- ⏸️ **Task 3** (validar `CONSULTA_PRODUTOS` contra uma loja Shopify
  real e capturar `apps/api/src/shopify/fixtures/produtos.json`) —
  **bloqueada**: a pasta `fixtures/` existe mas está vazia, confirmando
  que `pnpm --filter @animora/api shopify:validar` nunca correu com
  sucesso. O commit `d2fc02b` (sanitizador de HTML da descrição, CDN do
  Shopify autorizado em `next.config.mjs`) é trabalho preparatório da
  Task 4, feito adiantado e propositalmente "sem consumidor" (texto do
  próprio commit) até a Task 3 destravar.
- ⛔ **Tasks 4 a 7** (esquema de espelho, apagar `Media`/`sharp`/hooks
  de edição, `espelhar.ts`, `sync.ts`) — não avançadas. `Products.ts`
  ainda tem `description: richText` e campos `upload`; `Media.ts` e
  todos os hooks (`syncVariants`, `validatePublish`, `blockOffMatrix`,
  `ajustarStock`, `uniqueSlug`, `blockDeleteIfPublished`) ainda
  existem. O próprio plano proíbe avançar sem a fixture real da Task 3
  ("Não avançar para a Task 4 sem esta fixture").

**Decisão do usuário nesta sessão**: não criar uma loja de
desenvolvimento Shopify (gratuita, via Partners) agora para destravar a
Task 3. Nenhum código foi alterado — não é seguro simular a forma da
resposta da Admin API 2025-07 sem uma consulta real, e o plano já prevê
esse caso ("Se não houver ainda loja Shopify com produtos: parar aqui e
reportar").

**Para retomar**: assim que houver acesso a qualquer loja Shopify (uma
de desenvolvimento serve), rodar
`pnpm --filter @animora/api shopify:validar` e seguir
`docs/superpowers/plans/2026-08-29-catalogo-shopify-espelho.md` a
partir da Task 3. Não é preciso replanear nem redesenhar nada.

## Identidade laranja/teal (2026-09-18)

**Origem:** especificação técnica definitiva entregue pelo utilizador
(`~/Downloads/Animora_Ecommerce_Especificacao_Tecnica.{md,docx}`),
adaptada em `docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md`
e executada via `docs/superpowers/plans/2026-09-18-identidade-laranja-teal.md`
(subagent-driven development, 9 tarefas + revisão final de todo o
branch, sem gate de aprovação intermédio — instrução explícita do
utilizador para esta execução). Branch: `feat/identidade-laranja-teal`.

**O que mudou:**
- Tokens Tailwind: paleta inteira substituída (`ink`/`terracota`/`sage`/
  `papel`/`line`/`floresta` → `bg`/`surface`/`cream`/`orange`/`orange-deep`/
  `teal-900`/`teal-700`/`aqua`/`text`/`text-muted`/`border`), tipografia
  Bricolage Grotesque/Figtree → Fredoka/Montserrat/Caveat. Sem aliases —
  os tokens antigos deixaram de existir em `tailwind.config.ts`. Detalhe
  completo e regras de uso em `apps/web/DESIGN.md`.
- Shell (barra promocional, Header, navegação mobile, `CarrinhoBotao`,
  `SeletorIdioma`, rodapé) e Home inteira (categorias, `ProductCard`,
  `ProductTabs` novo, banners de campanha, marcas, benefícios,
  testemunhos, "vistos recentemente") restilizados componente a
  componente.
- `apps/web/src/lib/shopify/client.ts` novo: scaffold de cliente
  Storefront GraphQL, testado (mock de `fetch`), sem nenhum componente a
  consumi-lo — ver "Fora de âmbito" abaixo.

**Decisões não óbvias (rulings tomados durante a execução, sem parar
para aprovação — instrução explícita do utilizador):**
- **Hero preservado.** Uma sessão paralela implementou em simultâneo,
  neste mesmo diretório de trabalho, a campanha real "Semana Animora" em
  `components/marketing/Hero.tsx`, a pedido direto do utilizador e com
  assets finais entregues por ele. A tarefa que ia substituir o Hero por
  `MediaPlaceholder` genérico foi cancelada — conteúdo comercial real e
  já pedido tem precedência sobre a regra de placeholder da spec (essa
  regra existe para não inventar conteúdo, não para apagar conteúdo real).
- **Token `orange-deep` (#B85800) criado a meio da execução.** A spec
  original pedia texto branco sobre `orange` (#F57C00); cálculo de
  contraste WCAG deu 2,70:1, falha AA a qualquer tamanho. `orange-deep`
  dá 4,73:1. Esta correção teve de ser reaplicada duas vezes (Task 7 e
  a revisão final encontraram o mesmo padrão a escapar) — ver
  `apps/web/DESIGN.md` §2, "The Orange-Deep Rule".
- **Token `text-muted` corrigido de #6D7F82 para #647679** (revisão
  final) — valor original da spec dava 4,13:1 sobre `bg`, abaixo do
  4,5:1 exigido a texto normal.
- **Sem mega-menu nem categoria "Ofertas".** Dados reais não têm
  hierarquia de categorias (`parent` sempre `null`) nem categoria
  "ofertas" — inventar isso teria violado a regra de não hardcodar dado
  comercial.
- **Rodapé sem links institucionais novos.** A spec pedia links para
  Ajuda/Termos/Conta; mantido só o que já existia (nome, descrição, ano)
  — o rodapé já tinha uma correção deliberada documentada contra "fingir"
  páginas de apoio inexistentes, e essa disciplina teve prioridade.
- **Benefícios sem "parcelamento"/"compra segura".** A spec pedia 4
  benefícios; mantidos só os 3 reais (o checkout não liga a processador
  de pagamento real).

**Fora de âmbito, bloqueado (não esquecido):** ligar o cliente Shopify a
dados reais (catálogo/carrinho/checkout via Storefront API, conta via
Customer Account API, i18n de mercados `/pt-br`/`/en`/`/es`, SEO/a11y/
performance/analytics/testes E2E da spec, substituir `MediaPlaceholder`
por fotografia real) — sem credenciais reais da Storefront API neste
ambiente (`apps/web/.env.example` documenta as variáveis esperadas, todas
por preencher). Lista completa em `docs/ROADMAP.md`, secção "Identidade
laranja/teal — pendências".

**⚠️ Limitação mais visível: a loja está em duas identidades.** Este
plano cobriu só shell + Home. A revisão final de todo o branch (modelo
mais capaz, diff completo desde o checkpoint anterior a esta execução)
confirmou por grep amplo: **~400 usos de tokens agora removidos em 34
ficheiros fora da Home** — `FiltrosCatalogo.tsx`, `ilustracoes.tsx`,
`FormularioCheckout.tsx`, `Moradas.tsx`, `carrinho/page.tsx`,
`encomendas/[id]/page.tsx`, `FormularioEntrada.tsx`, `produto/[slug]/page.tsx`,
e o resto do catálogo/conta/checkout. Nenhuma destas páginas rebenta —
o Tailwind simplesmente não emite as classes removidas, e o resultado é
degradação silenciosa (raios que desaparecem, bordas no cinzento por
omissão, texto sem cor de marca). **Antes de qualquer trabalho novo de
UI fora da Home, decidir com o utilizador:** abrir um plano de migração
para PLP/PDP/carrinho/checkout/conta (mecânico — mesmo mapa de 7
substituições de sempre, só em escala — mas ~400 ocorrências não é
trabalho trivial), ou aceitar a coexistência por agora e documentar até
quando.

**Verificação:** `pnpm --filter @animora/web typecheck` e `test`
(169 testes) passam. Revisão final de todo o branch encontrou 2 achados
Critical (contraste WCAG na aba ativa de `ProductTabs`, token `text-muted`
abaixo de AA) + 5 Important (componentes filhos de `ProductCard` com
tokens mortos, `DestaquesPorCategoria.tsx` fora do âmbito das 9 tarefas,
esqueleto de `loading.tsx` invisível, 3 textos abaixo de AA por opacidade,
namespace de tradução órfão) — todos corrigidos num único commit de fix
e verificados (ver ledger em
`.superpowers/sdd/2026-09-18-identidade-laranja-teal/progress.md` para o
histórico completo de decisões e achados, tarefa a tarefa).
