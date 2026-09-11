# Animora - Especificacao Estrutural v1

**Data:** 2026-09-11  
**Projeto-alvo:** `../animora`  
**Estado:** pronto para execucao controlada

## Instrucao para o Claude Sonnet

Voce esta trabalhando no repositorio `../animora`. Execute este documento em uma fase por vez.

Nesta fase, construa e valide a estrutura do e-commerce. Nao defina direcao de arte. Nao gere imagens, nao escolha fotografias, nao crie banners, nao invente animais, produtos, logos ou decoracao. Todo espaco editorial deve usar `MediaPlaceholder` neutro, sem texto dentro da midia.

Antes de editar, leia este arquivo, `apps/web/DESIGN.md`, `docs/spec-animora.md` e os planos existentes em `docs/superpowers/plans/`. O repositorio possui alteracoes locais do usuario: preserve-as. Nao use reset, checkout destrutivo, limpeza ampla ou reescrita por preferencia.

O projeto ja possui Home, PLP, PDP, carrinho, conta, internacionalizacao, Payload, catalogo, ProductCard, sprite SVG e componentes de marketing. Reaproveite o que atende ao contrato. Refatore apenas com justificativa baseada nos criterios desta especificacao.

Ao terminar cada fase, pare, apresente evidencias e aguarde revisao explicita. Nao avance automaticamente.

## Objetivo

Validar a base completa do e-commerce na ordem:

```text
navegacao -> descoberta -> produto -> compra
```

A fase estrutural deve provar largura, ritmo, hierarquia, responsividade, estados e fluxo de compra. Ela nao deve deixar um criativo bonito mascarar uma estrutura ruim.

## Regra central de midia

Nesta fase, todo lugar que futuramente receber banner, fotografia, pet, produto editorial ou logo visual usa um placeholder neutro:

```text
background: #F4F1E8
border: 1px solid #E8E5DC
```

Sem imagem fake, gradiente inventado, texto dentro da imagem, animal gerado ou decoracao. A copy fica em HTML.

O placeholder deve aceitar:

```tsx
<MediaPlaceholder ratio="16/7" type="hero" label="Espaco de midia" />
```

Tipos: `hero`, `campaign`, `editorial`, `category`, `product`, `testimonial`, `brand`.

Requisitos: `aspect-ratio` estavel, nenhum request remoto, label acessivel opcional e contrato simples o bastante para ser substituido depois por `LayeredCampaignMedia` sem mudar a estrutura da pagina.

Imagens reais de produtos do catalogo continuam sendo usadas no `ProductCard` quando existirem. O placeholder editorial nao substitui uma imagem real de produto.

## Estado atual e matriz obrigatoria

O `../animora` ja possui Home, PLP, PDP, shell, catalogo, componentes de comercio, marketing, modulos de catalogo e Payload.

Antes de editar, classifique cada area:

| Classe | Acao |
| --- | --- |
| Reaproveitar | manter contrato e comportamento |
| Refatorar | corrigir problema comprovado sem quebrar contrato |
| Substituir | trocar quando nao cumpre o papel estrutural |
| Congelar | nao tocar nesta fase |
| Bloquear | parar e relatar dependencia |

Registrar a matriz no relatorio da Fase 0. O working tree deve ser preservado:

```bash
git status --short --branch
git diff --stat
git log -5 --oneline --decorate
```

## Regras nao negociaveis

### Estrutura e dados

- Produtos, categorias, variantes, preco, estoque, imagens e marcas vem dos modulos existentes.
- Nenhum produto hardcoded em componente de UI.
- Componentes nao calculam regra comercial de preco, estoque ou disponibilidade.
- Dinheiro permanece em centimos inteiros.
- Nao inventar avaliacao, vendas, urgencia, badge ou beneficio.
- Nao refatorar o backend Payload para Shopify durante esta fase.
- Modulos expõem sua superficie publica pelo `index.ts`.

### Fronteiras

- UI nao importa GraphQL nem tipos do SDK.
- Componentes nao importam arquivos internos de modulos nao relacionados.
- Server Component e o padrao; Client Component so entra por interacao real.
- Mensagens continuam em `apps/web/messages/`, em pt e de quando aplicavel.

### Acessibilidade e motion

- Foco visivel, labels e semantica correta.
- Menus e dialogos funcionam com teclado, `Escape` e retorno de foco.
- Imagens tem `alt`, largura e altura explicitos.
- Reduced motion remove ou reduz motion nao essencial.
- Motion usa `transform` e `opacity`, com cleanup.
- Placeholders estruturais nao precisam de motion.

## Fases

### Fase 0 - Inventario e baseline

1. Ler esta especificacao, `DESIGN.md`, `spec-animora.md` e planos anteriores.
2. Mapear rotas, componentes, dados e estados atuais.
3. Capturar Home, PLP e PDP em 390, 768, 1440 e 1920 px.
4. Registrar problemas por impacto na compra.
5. Registrar a matriz Reaproveitar/Refatorar/Substituir/Congelar/Bloquear.

Saida: relatorio curto, lista de arquivos a tocar e nenhuma alteracao de criativo.

**Gate:** parar e aguardar revisao.

### Fase 1 - Sistema estrutural e MediaPlaceholder

1. Confirmar tokens atuais de `DESIGN.md`.
2. Criar `MediaPlaceholder` reutilizavel.
3. Consolidar container, espacamento, proporcoes e grids necessarios.
4. Manter paleta e tipografia existentes.
5. Adicionar testes relevantes e uma pagina de inspecao se necessario.

Nao gerar imagem, nao alterar copy para compensar placeholder e nao criar biblioteca generica.

Saida: componente, testes e screenshots das proporcoes.

**Gate:** parar e aguardar revisao.

### Fase 2 - Shell global

Desktop:

```text
announcement bar
logo + busca dominante + idioma + conta + carrinho
segunda linha de categorias
```

Mobile:

```text
menu + logo + busca + carrinho
categorias em drawer ou navegacao propria
```

1. Reutilizar logo real e sprite SVG; nao usar emoji.
2. Remover links `#` ou definir destinos reais antes de usa-los.
3. Garantir busca dominante no desktop.
4. Testar teclado, foco, `Escape`, toque, safe area e retorno de foco.
5. Preservar pt/de e mercado Portugal.
6. Manter footer com links reais, sem simular newsletter.

Saida: shell desktop/mobile, testes e screenshots.

**Gate:** parar e aguardar revisao.

### Fase 3 - Atomos de comercio

1. Auditar `ProductCard` contra `PublicProduct` e variantes reais.
2. Mostrar marca, nome, preco, desconto valido, disponibilidade e acao correta.
3. Avaliacoes so aparecem quando aprovadas e existentes.
4. Urgencia so aparece com estoque real baixo.
5. Produto com variante exige escolha; produto sem variante pode adicionar.
6. Preservar favorito e adicionar ao carrinho sem serializar objeto inteiro.
7. Grid: 2 colunas mobile, 3 tablet, 4 desktop e 5 wide quando couber.
8. Manter imagem de catalogo real; ausencia deve ter estado honesto.

Saida: ProductCard reutilizado em Home, PLP e favoritos, estados cobertos e screenshots.

**Gate:** parar e aguardar revisao.

### Fase 4 - Home estrutural

Implementar a ordem:

```text
shell
hero placeholder
escolha seu animal
comprar por necessidade
mais vendidos
campaign placeholder 01
ofertas da semana
destaques por categoria
campaign placeholder 02
aprovado por quem manda
marcas
beneficios
footer
```

1. Categorias e produtos continuam reais.
2. Areas de campanha usam placeholders neutros.
3. Copy e CTA ficam em HTML.
4. Hero reserva aproximadamente 35-40% para texto e 60-65% para midia.
5. Produtos aparecem cedo o bastante para a pagina parecer loja.
6. Mobile possui ordem propria.
7. Cada secao tem heading semantico e CTA real.

**Gate:** revisar Home estrutural antes de PLP.

### Fase 5 - PLP

1. Breadcrumb, titulo, descricao e subcategorias reais.
2. Media editorial pequena e neutra, sem ocupar metade da pagina.
3. Filtros na URL, sidebar desktop e drawer mobile.
4. Ordenacao, contagem, loading, vazio e erro.
5. Grid responsivo e paginacao ou “mostrar mais”.
6. Preservar busca, filtros, voltar e posicao.

Aceite: 2/3/4/5 colunas por faixa, sem overflow, sem reanimar toda a grid a cada filtro.

**Gate:** revisar PLP antes de PDP.

### Fase 6 - PDP

1. Breadcrumb e galeria.
2. Marca, nome, avaliacao existente, preco e disponibilidade.
3. Variantes, quantidade e adicionar ao carrinho reais.
4. Descricao sanitizada, detalhes, entrega e trocas.
5. Avaliacoes e recomendacoes sem dados inventados.
6. CTA sticky mobile somente depois de validar o CTA principal.

**Gate:** revisar PDP e fluxo de compra.

### Fase 7 - Validacao integrada

Executar:

```bash
pnpm --filter @animora/web typecheck
pnpm --filter @animora/web test
pnpm --filter @animora/web build
```

Validar 375, 390, 430, 768, 1024, 1440 e 1920 px; landscape; toque; teclado; safe areas; texto longo pt/de; reduced motion; falha de imagem; loading/erro/vazio; JS desabilitado quando aplicavel; overflow; LCP; CLS; requests e bundle.

Registrar screenshots, resultados aprovados/falhos/nao verificados, limitacoes, diff revisado e atualizacoes em `CURRENT_STATE.md`. Alterar `DECISIONS.md` somente se uma decisao realmente mudar.

**Gate final:** nao iniciar criativos ou M3 sem aprovacao explicita do usuario.

## Fase posterior: criativos e motion

Somente depois da estrutura aprovada entram:

```text
background.webp
pet.png com alpha
product.png ou imagem real
shadow.svg
decoration.svg
copy HTML
CTA HTML
```

Cada asset tera funcao propria, dimensao, alt quando necessario, peso registrado e animacao individual. A ferramenta de geracao de imagem sera usada nessa fase, nunca para preencher uma lacuna estrutural.

## Relatorio obrigatorio por fase

```text
Fase concluida:
Arquivos alterados:
Arquivos preservados:
Decisoes:
Verificacoes:
QA visual:
Limitacoes ou bloqueios:
Proxima fase proposta:
AGUARDANDO REVISAO DO USUARIO.
```

