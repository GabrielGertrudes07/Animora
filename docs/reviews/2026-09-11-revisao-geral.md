# Animora - Revisao geral do ecommerce e do plano

Data: 2026-09-11. Repositorio: `../Animora`. Base auditada: `6517239`.
Revisao de codigo, produto e comportamento. Nenhum codigo da aplicacao foi alterado.

## Parecer

A base estrutural existe, mas o encerramento das fases 0-7 foi otimista.
Ha falhas reproduzidas em compra, navegacao, recuperacao de erro e acessibilidade.
Recomendo uma rodada corretiva antes de produzir criativos.

O problema nao e a ausencia de banners bonitos: os placeholders editoriais sao
corretos nesta fase. O problema e que a hierarquia comercial e alguns contratos
de interacao ainda nao estao resolvidos.

O proprio plano tecnico de execucao reduziu detalhes do pedido original.
Portanto, nem toda lacuna e descumprimento do Sonnet: algumas foram omitidas
na especificacao intermediaria ou aceitas nos gates sem verificacao suficiente.

## Achados priorizados

P1: corrigir antes de liberar a base para a proxima fase.
P2: corrigir na rodada de consolidacao estrutural.
As referencias apontam para o codigo auditado, anterior a qualquer correcao.

### R01 - P1 - CTA fixo cobre a navegacao e usa estado de compra diferente

Fontes: `apps/web/src/components/produto/CtaStickyMobile.tsx:34,45,50`;
`apps/web/src/components/layout/BarraMobile.tsx:42`.

As duas barras usam `bottom-0 z-40`. Na PDP mobile, depois da area de compra,
o CTA cobre os links de navegacao, inclusive o carrinho. O hit-test do navegador
atingiu o botao Adicionar no ponto onde ficava o link Carrinho.

O CTA monta outra instancia de `AdicionarAoCarrinho`, com quantidade inicial 1.
Escolhi 3 na area principal, rolei e cliquei no CTA: o carrinho recebeu 1.
Em produto com nove variantes, a barra tambem apareceu na abertura em 390x740,
antes de a area principal entrar na viewport. O observer testa apenas
`!isIntersecting`, sem distinguir elemento abaixo de elemento ja ultrapassado.
O preco fixo ainda perde o qualificador "desde" dos produtos com precos variados.

Correcao: compartilhar variante/quantidade/preco; observar o CTA correto; definir
a convivencia com a navegacao inferior e reservar o espaco efetivamente ocupado.
Aceite: selecionar 3 e adicionar 3 pelo CTA; carrinho acessivel; barra ausente antes
de ultrapassar a compra; preco coerente com a variante.

### R02 - P1 - Falha de rede deixa o carrinho preso no carregamento

Fonte: `apps/web/src/app/[locale]/carrinho/page.tsx:45`.
Mesmo padrao em `checkout/FormularioCheckout.tsx:80,111`.

Abortando o POST da Server Action no browser, o carrinho permanece em
"A carregar o carrinho..." e emite `Failed to fetch` sem recuperacao.
O efeito usa `.then` sem tratamento de rejeicao. O `error.tsx` de rota
nao resolve automaticamente erros de promises em efeitos/eventos.
No checkout, leitura e confirmacao tambem nao possuem recuperacao de excecao
de transporte; esse trecho foi revisado em codigo, sem realizar encomenda.

Correcao: estados de erro e tentar novamente, finalizar o loading/pending,
preservar itens e formulario. Tratar sessao expirada durante a compra.
Aceite: abortar e depois restaurar a rede permite repetir a operacao.

### R03 - P2 - Seletor permite quantidade que o dominio recusa

Fontes: `components/ui/AdicionarAoCarrinho.tsx:67,77`;
`modules/cart/carrinho.ts:38,59`, sob `apps/web/src/`.

O controle chega a 100, mas o dominio aceita no maximo 99. Ao adicionar,
reproduzi a excecao nao tratada:
`Quantidade invalida: 100. Tem de ser um inteiro entre 1 e 99.`
O mesmo controle ainda permite ultrapassar o estoque mostrado.

Correcao: aplicar o limite real do dominio na UI e comunicar disponibilidade,
mantendo a verificacao autoritativa do servidor.
Aceite: testar 1, limite, limite+1 e soma com item ja existente.

### R04 - P2 - Limpar filtros deixa controles e URL divergentes

Fonte: `apps/web/src/components/catalog/FiltrosCatalogo.tsx:87,131,294`.

Sequencia reproduzida em desenvolvimento e producao:
marcar Roedix -> Aplicar -> Limpar. A URL volta a `/produtos`, mas Roedix
continua marcada. Aplicar novamente restaura o filtro que acabou de ser limpo.
`defaultChecked` e `defaultValue` nao sincronizam os controles ja editados.
Alem disso, o link de limpeza usa somente `pathname`, descartando busca e ordem.

Correcao: sincronizar controles com filtros efetivos e separar "limpar filtros"
de "limpar pesquisa". Aceite: URL, checkbox, intervalo, contagem e resultados
coerentes apos limpar, voltar, avancar e alternar entre drawer e sidebar.

### R05 - P2 - Voltar da PDP perde os produtos revelados

Fonte: `apps/web/src/components/catalog/MostrarMais.tsx:22`.

Mostrar mais: 12 -> 24. Abri o 19o produto e voltei pelo historico.
A listagem voltou com 12, embora a rolagem anterior fosse 1477px.
O produto de origem deixa de estar montado. Confirmado tambem em producao.

Correcao: persistir profundidade/pagina junto dos filtros e restaurar a lista
antes da posicao. Uma query de paginacao pode preservar os demais parametros;
ela nao implica perder filtros, ao contrario da justificativa no comentario.

### R06 - P2 - Troca de idioma apaga o contexto de descoberta

Fonte: `apps/web/src/components/layout/SeletorIdioma.tsx:29`.

De `/produtos?q=corda&ordem=preco-asc`, clicar DE levou a `/de/produtos`.
A busca e a ordenacao desapareceram. A implementacao repassa apenas o pathname.

Correcao: preservar parametros publicos e fragmento aplicavel ao mudar idioma.
Aceite: mudar pt/de mantendo busca, filtros, ordem e profundidade da listagem.

### R07 - P2 - Home perde densidade comercial e diverge do mobile pedido

Fontes: `components/marketing/CategoriasVisuais.tsx:41,81`;
`components/marketing/DestaquesPorCategoria.tsx:19,47`;
`app/[locale]/(home)/page.tsx:38,52,74`;
`tailwind.config.ts:58`, em `apps/web/`.

Medicao com fontes carregadas e reduced motion, em 390x844:
primeiro ProductCard em y=1926,5px; Home com 10006px de altura.
Em 1440px: primeiro card em y=1802,2px; Home com aproximadamente 8968px.
Nao ha overflow horizontal, mas isso nao torna a composicao eficiente.

Causas observadas:
- Animais em grade de tres linhas no mobile, no lugar do scroll horizontal pedido.
- Necessidades quebram em linhas, tambem no lugar do scroll horizontal.
- `py-secao` chega a 128px de cada lado; secoes consecutivas somam 256px de respiro.
- Destaques por categoria viraram tres vitrines com dez produtos, em vez dos
  dois/tres pequenos acessos comerciais do texto original.
- Em destaque/ofertas sempre cortam em quatro produtos, mesmo com grid de cinco
  no wide. Falta tambem "Ver todos" nessas vitrines.

Correcao: compactar navegacao de descoberta, restaurar a funcao de cada secao,
alinhar quantidade de itens com colunas e aproximar o primeiro produto do topo.
A altura exata do hero precisa de decisao visual: o original previa 520-650px
desktop; o atual ficou por volta de 357px incluindo espacamento.

### R08 - P2 - PDP ainda apresenta uma tabela de compras por variante

Fonte: `apps/web/src/app/[locale]/produto/[slug]/page.tsx:141,152`.

A coleira com nove variantes gera nove linhas de quantidade/adicionar.
So a area de opcoes mede 1272px em 390px. O usuario precisa comparar combinacoes
e achar a linha correta, em vez de escolher tamanho/cor e usar um CTA consistente.

Recomendacao: seletores de atributos com disponibilidade real, uma variante
selecionada, preco atualizado, uma quantidade e uma acao principal.
Manter uma escolha explicita quando necessaria; nao selecionar uma combinacao
indisponivel. Essa mudanca tambem resolve a origem do estado divergente do sticky.

Detalhes tecnicos publicos (dimensoes/peso) existem no modelo, mas nao sao
renderizados na PDP. Na base atual, 0 de 69 variantes possuem esses valores:
isso e ausencia de dados e lacuna de apresentacao futura, nao dado a inventar.

### R09 - P2 - Acessibilidade ainda tem falhas verificaveis

Fontes: `components/catalog/OrdenarPor.tsx:27`;
`components/layout/BarraMobile.tsx:198`;
`components/catalog/FiltrosCatalogo.tsx:330`;
`tailwind.config.ts:28` e `src/styles/globals.css`, em `apps/web/`.

A arvore acessivel mostra combobox de ordenacao sem nome no mobile:
seu unico rotulo esta em `display:none`. Os dialogs de categorias/pesquisa
tambem nao associam o titulo ao nome acessivel.
O fechar do drawer de filtros mede 28x28px, abaixo dos 44px pedidos.

O CTA usa branco sobre `#E0623A`: contraste calculado 3,513:1, com texto
de 16px/peso 600. Fica abaixo de 4,5:1 para texto normal. O criterio de contraste
e explicado pelo [W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
O estado hover escurecido nao corrige o estado de repouso.

Correcao: labels persistentes, `aria-labelledby`, alvos de toque e tokens com
contraste adequado. Testar arvore acessivel, nao apenas ordem de Tab.

### R10 - P2 - Falha de imagem e ausencia de JS nao estao resolvidas

Fontes: `components/produto/GaleriaProduto.tsx:34`;
`components/ui/ProductCard.tsx:53`; `app/[locale]/produtos/loading.tsx`,
em `apps/web/src/`.

Abortar imagens do otimizador resulta em imagens quebradas. Existe fallback
para ausencia de registro de imagem, mas nao para falha de download.
A galeria tambem nao fixa uma proporcao para imagens com formatos diferentes.

Com JavaScript desativado, em desenvolvimento e producao, `/produtos` e a busca
permanecem no fallback: o catalogo enviado no streaming fica em um bloco oculto.
Nao atribuir isso ao GSAP: o problema observado esta na entrega via Suspense.
Mesmo expondo esse HTML, Mostrar mais ainda precisa de caminho navegavel alternativo.

Correcao: imagem de fallback estavel, recuperacao de erro e um contrato explicito
de degradacao para leitura/navegacao do catalogo. Preservar os 404 ja corrigidos.
Este teste nao demonstra falha de indexacao do Google; demonstra falha sem JS.

### R11 - P2 - Performance foi diagnosticada de forma incompleta

Fontes: `modules/catalog/queries.ts:76,88`;
`modules/catalog/avaliacoes.ts:24`; `components/ui/BotaoFavorito.tsx:35`;
`components/ui/ProductCard.tsx:53`, em `apps/web/src/`.

Mostrar mais limita a renderizacao no cliente, mas o servidor consulta o
catalogo inteiro, busca variantes por produto e avaliacoes por card.
A primeira PLP em producao disparou 13 POSTs no browser: sessao e favoritos
dos 12 cards. Em desenvolvimento foram 25, logo nao usar o numero de dev
como custo de producao.

As imagens responsivas nao informam `sizes`; observei URLs de 1920px para cards
muito menores. Otimizar entrega por largura real e identificar o LCP por pagina,
conforme a [documentacao do Image no Next 15](https://nextjs.org/docs/15/app/api-reference/components/image).

Revi os JSONs de Lighthouse ja capturados pelo Sonnet, sem refazer a medicao:
Home 94 / LCP 3,020s; PLP 91 / 3,503s; PDP 95 / 2,973s; CLS 0.
Na Home, o elemento LCP e um paragrafo. Na PDP, a imagem ja usa `priority`.
Portanto, "falta priority" nao explica as tres paginas.
O LCP precisa ser decomposto em espera, download e renderizacao:
[guia de diagnostico](https://web.dev/articles/optimize-lcp).
TBT 0 nao comprova INP abaixo de 200ms:
[relacao entre TBT e INP](https://web.dev/articles/tbt).

Correcao: consultas em lote, paginacao real quando aplicavel, uma leitura de
favoritos por sessao, `sizes`, prioridades seletivas e nova medicao comparavel.

## Confronto com o plano original e suas decisoes posteriores

| Area | Situacao |
| --- | --- |
| Home / PLP / PDP e fluxo ate carrinho | Implementados; falhas acima impedem aceite irrestrito |
| Midia editorial neutra e textos HTML | Atendido nesta fase; manter |
| Pets PNG / fundos WebP / SVG / motion separado | Adiado corretamente; ainda nao e entrega realizada |
| Payload como fonte nesta fase | Decisao aceita; nao migrar para Shopify por efeito desta revisao |
| Categorias reais sem mega menu ficticio | Decisao aceita; hierarquia segue vazia |
| Grid PLP com 3 em 1024px | Excecao aceita; preservar largura funcional dos cards |
| Animais / necessidades com scroll mobile | Nao atendido |
| Testimonials / marcas em carrossel mobile | Nao atendido: grade e lista de texto |
| Home com entradas compactas por categoria | Alterado para vitrines extensas sem justificativa comercial |
| Header sticky apos rolagem | Ausente; pedido original omitido no roteiro tecnico |
| Footer com ajuda, sobre, legal e contatos | Ausente; footer minimo foi aceito, mas nao equivale ao original |
| Variantes com selecao e CTA unico | Parcial: lista de uma compra por variante |
| Avaliacoes reais / galeria multipla / trocas | Dependem de dados; nao fabricar |
| Vistos recentemente / zoom de galeria | Nao implementados; recente estava no original, zoom e melhoria proposta |
| Ordem por vendas e recentes | So relevancia e preco; vendas foi adiado, recentes continua ausente |
| Retorno a filtros, lista e posicao | Falha reproduzida |
| Falha de assets/JS e recuperacao de erro | Parcial, com falhas reproduzidas |
| Metas de LCP/INP | LCP acima da meta; INP nao demonstrado |
| Testes de novos fluxos | Sem cobertura automatizada persistente suficiente |

"Aprovado por quem manda" continua com frases ficticias de voz da marca,
inclusive "5 estrelas", ao lado do local destinado a avaliacoes reais.
Nao trate esse bloco como testemunho verificado. Preserve a assinatura,
mas escolha explicitamente entre humor editorial e depoimentos autorizados.

As midias de produto atuais sao cartazes gerados pelo seeder. Virem do banco
nao as torna fotografias reais de mercadoria. Servem para demonstracao,
nao para validar recorte, cor, legibilidade de embalagem ou decisao de compra.

## O ecommerce como operacao

O checkout cria encomenda a aguardar pagamento; nao ha processador integrado.
Isso esta explicitamente fora de escopo no `docs/spec-animora.md`, portanto
nao e regressao destas fases. Tambem impede chamar a loja de pronta para vender.

Antes de publicar, faltam definicoes reais para atendimento, entrega, trocas,
dados do vendedor e conteudo institucional. O footer deve dar acesso a elas.
Nao preencher politicas ou meios de pagamento por suposicao.

A descoberta organica tambem merece uma entrega: `/sitemap.xml` e
`/robots.txt` retornam 404; nao localizei JSON-LD de produto.
Metatags basicas e Open Graph de PDP existem. Decidir canonicals e indexacao
de filtros com o dominio de producao, sem bloquear o catalogo por acidente.

Conta obrigatoria no checkout e ausencia de recuperacao de senha na UI
aumentam atrito. Considerar compra como convidado e recuperacao de acesso
numa fase comercial propria, junto de pagamento, confirmacoes e suporte.

## Melhorias recomendadas, em ordem

1. **Confiabilidade da compra e navegacao.** Resolver R01-R06, falhas de rede,
   sincronizacao do carrinho e mensagens. Adicionar testes dos cenarios reproduzidos.
2. **Hierarquia e decisao de compra.** Compactar Home mobile, alinhar vitrines,
   usar seletores de variante, concluir acessibilidade e estados de midia.
   Revisar screenshots com catalogo representativo e dados de teste isolados.
3. **Desempenho e fechamento do escopo.** Reduzir consultas/requisicoes,
   corrigir imagens responsivas, medir LCP/INP corretamente e registrar o que
   fica entregue, adiado com aceite ou pendente. Concluir SEO tecnico aplicavel.
4. **Operacao comercial.** Conteudo real, fotos de produto, entrega/trocas,
   acesso a conta e pagamento. Validar compra em ambiente de teste isolado.
5. **Criativos e motion.** Retomar a especificacao de camadas somente com a
   estrutura aprovada visualmente. Comecar por um banner piloto desktop/mobile,
   aprovar composicao e movimento, depois ampliar para os demais.

Nao reconstruir a loja. Reaproveitar o catalogo, rotas, contratos de dinheiro,
sanitizacao, controles nativos e componentes que ja funcionam.

## Revisao do processo e dos documentos

- As fases 3-7 mantiveram 149 testes web, apesar dos novos controles, galeria,
  sticky e paginacao. Passar a suite existente nao comprova esses novos contratos.
- Os roteiros de navegador estavam em `/tmp`, fora do repositorio. Persistir
  cenarios de regressao e resultados representativos.
- O roteiro anterior de loading intercepta `**/api/products**` no browser,
  mas essas consultas sao feitas no servidor. Isso nao simula lentidao da API
  que alimenta o Server Component.
- `CURRENT_STATE.md` ainda abre com "ao final da Fase 1" e "em execucao",
  embora ao fim declare Fase 7 concluida. O plano ainda se diz pronto para
  execucao e lista "mais vendidos" apos a decisao de renomear.
- A D01 deve descrever status apos inicio de streaming, nao proibir de forma
  universal qualquer `loading.tsx` acima de `notFound()`. A condicao relevante
  e se os headers ja foram enviados:
  [Next.js: loading e status HTTP](https://nextjs.org/docs/app/api-reference/file-conventions/loading#status-codes).
- A D02 resolve o problema observado. Um entrypoint explicito de servidor
  pode melhorar a fronteira no futuro; nao e necessario refatorar tudo agora.

## Verificacao desta revisao

- Worktree original limpo no inicio, HEAD `6517239`.
- Typecheck web: passou. Vitest web: 13 arquivos / 149 testes. Core: 6 / 77.
- Build independente do mesmo HEAD: passou, 125 paginas; avisos de cache
  do webpack/next-intl, sem falha. Executado em worktree temporario separado.
- Navegador: Chromium/Playwright, Home em 390/768/1440/1920;
  compra e interacoes em 390x844, 390x740 e 1440x1000; idioma pt/de;
  repeticao de filtros, historico, quantidade, falha de rede e sem JS em producao.
- 404 real confirmado para produto, categoria e caminho inexistentes em
  desenvolvimento e producao. A correcao de status funciona.
- Nao repeti toda a matriz de sete larguras, Safari/iOS real ou checkout autenticado.
  Nao criei contas, encomendas ou alterei estoque.
- API test e seeder nao executados: a suite conhecida apaga encomendas.
  A revisao nao substitui validacao de backend num banco isolado.
- Lighthouse: inspecao dos artefatos existentes; nenhum novo score foi alegado.
- Codigo da loja, assets criativos, roadmap e gates nao foram modificados.

## Evidencias

- [Medicoes da Home, sticky e falha de imagem](2026-09-11/evidence/browser-initial.json).
  As medicoes preliminares de retorno nesse arquivo foram substituidas pelo
  teste de producao abaixo, que aguarda a navegacao terminar.
- [Reproducoes no build de producao](2026-09-11/evidence/browser-production.json).
- [Arvore acessivel e controles](2026-09-11/evidence/accessibility.json).
- [CTA cobrindo a navegacao](2026-09-11/evidence/sticky-covers-navigation.png).
- [Opcoes de nove variantes no mobile](2026-09-11/evidence/pdp-nine-variants.png).
- [Catalogo sem JavaScript](2026-09-11/evidence/plp-without-js.png).
- [Erro de quantidade](2026-09-11/evidence/quantity-error.png).
- [Lighthouse anterior: Home](2026-09-11/evidence/lighthouse-home-previous.json),
  [PLP](2026-09-11/evidence/lighthouse-plp-previous.json),
  [PDP](2026-09-11/evidence/lighthouse-pdp-previous.json).
