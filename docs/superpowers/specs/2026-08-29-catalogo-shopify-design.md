# Catálogo no Shopify — Especificação de Desenho

**Data:** 2026-08-29
**Estado:** desenho aprovado pelo utilizador, pronto para plano de implementação
**Âmbito:** o catálogo (produtos, variantes, preços, stock, imagens, categorias, marcas) passa a ser propriedade do Shopify e é espelhado no Postgres por sincronização GraphQL. Fica fora: checkout, encomendas, clientes, dashboard de vendas, avaliações e configuração de filtros — todos continuam no Payload, sem alteração de âmbito.

---

## 1. O problema

O catálogo é hoje editado no painel Payload, e é lá que vive toda a lógica que o
mantém coerente: a matriz de variantes (`syncVariants`), as invariantes de
publicação (`validatePublish`), a guarda de combinações fora da matriz
(`blockOffMatrix`), o ajuste incremental de stock (`ajustarStock`), a unicidade
de slug e as guardas de apagar. São ~700 linhas de hooks escritas para defender
um formulário de administração.

A decisão comercial é passar a gerir produtos no Shopify. Isso torna esses hooks
código a defender um formulário que já ninguém usa — e torna o Payload um
segundo dono de números que deixaram de ser dele.

O que **não** muda: a loja continua a ser a loja deste repositório, com o seu
checkout, as suas encomendas, o seu dashboard e os seus filtros. O Shopify não
é a montra; é o back-office do catálogo.

## 2. Decisões

**O Shopify é dono só do catálogo.** Produtos, variantes, preços, stock,
imagens, categorias (Collections) e marcas (`vendor`). O checkout, as encomendas
e os clientes continuam a ser deste projeto. Descartada a alternativa de usar o
checkout hospedado do Shopify: apagaria mais código, mas entregava as encomendas
e o dashboard de vendas — que é o produto que se está a vender — a uma
plataforma de terceiros.

**Espelho local, não leitura direta.** O catálogo continua a viver nas coleções
`products`, `variants`, `categories` e `brands` do Postgres, preenchidas pela
sincronização. A loja lê do Payload REST exatamente como hoje.

A alternativa — a loja falar diretamente com a Storefront API — foi descartada
por custo: obrigava a reescrever `queries.ts`, `filters.ts`, `facets.ts`,
`pesquisa.ts` e `preco.ts` no web, e fazia perder os filtros configuráveis
(`ConfiguracaoFiltros`), a ordenação própria e a relação entre encomendas e
variantes de que o dashboard depende. **O web não muda uma linha** é o critério
que justifica o espelho existir.

**Sincronização por webhooks, com backfill sob comando.** Os webhooks mantêm o
espelho fresco; o comando `pnpm shopify:sync` faz o povoamento inicial e serve
de reconciliação sempre que se desconfiar do espelho. O mesmo código de
mapeamento serve os dois caminhos.

**O checkout avisa o Shopify de cada venda.** Ver secção 3 — é a decisão que
torna o espelho coerente, e sem ela nada disto funciona.

**As coleções de catálogo ficam, em só-leitura.** `create`, `update` e `delete`
negados a toda a gente, campos `readOnly`. Continuam visíveis no painel para
inspeção. Não se escondem: quando o stock da loja não bate certo com o Shopify,
o primeiro sítio onde se olha é o espelho.

**Cliente GraphQL próprio, sem SDK.** A Admin API é um POST com JSON e um header
de token. Uma dependência para isso não se paga.

## 3. A coerência do stock

O espelho tem dois escritores: o webhook de inventário do Shopify e o
`checkout.ts`, que desce stock ao vender. Se o Shopify não souber das vendas
deste projeto, o próximo webhook sobrepõe o decremento local com um número
obsoleto:

```
stock Shopify: 5     espelho local: 5
venda de 3 no checkout local   → espelho: 2      Shopify: 5  (não sabe)
qualquer edição no Shopify     → webhook traz 5
espelho: 5   ← o decremento evaporou; cinco unidades à venda que não existem
```

Não é uma corrida rara: acontece a seguir a **todas** as vendas, no **primeiro**
webhook que chegue.

**Resolução:** depois do `commitTransaction` do checkout, o projeto envia ao
Shopify um `inventoryAdjustQuantities` com o delta negativo das linhas vendidas.
O Shopify passa a ser o dono real do número, o webhook que volta confirma o que
já se sabia, e o espelho converge.

O envio é **depois** do commit, nunca dentro da transação: uma chamada de rede
dentro de uma transação com lock consultivo põe o `pg_advisory_xact_lock` a
segurar a fila da loja durante a latência do Shopify.

Um envio falhado não pode desaparecer. Cada ajuste é registado numa coleção
`ajustes_pendentes` (variante, delta, tentativas, último erro) antes de ser
tentado, e apagado quando o Shopify confirma. O comando `pnpm shopify:sync`
reenvia os pendentes antes de reconciliar.

**Janela assumida:** entre a venda e a confirmação do Shopify há segundos em que
o Shopify anuncia mais stock do que existe. Se houver venda simultânea noutro
canal Shopify nesse intervalo, vende-se a descoberto. É o teto aceite desta
arquitetura — a única forma de o fechar é o checkout do Shopify, que foi
descartado por decisão comercial.

## 4. Arquitetura

```
Shopify Admin (fonte da verdade do catálogo)
    │  GraphQL Admin API 2025-07             ▲
    ▼                                        │ inventoryAdjustQuantities
  sync ──► Postgres (espelho, só-leitura)    │      (após o commit)
                │                             │
                │ REST Payload (inalterado)   │
                ▼                             │
             loja web ──► checkout.ts ────────┘
                             │
                             ▼
                Orders · Customers · dashboard  (inalterados)
```

### 4.1 Módulo novo: `apps/api/src/shopify/`

| Ficheiro | Responsabilidade | Depende de |
|---|---|---|
| `cliente.ts` | POST para `/admin/api/2025-07/graphql.json` com `X-Shopify-Access-Token`; recuo exponencial em `THROTTLED` | env |
| `consultas.ts` | As queries e mutações GraphQL, como constantes | — |
| `espelhar.ts` | Resposta do Shopify → documentos Payload; upsert por `shopifyId` | payload local API |
| `sync.ts` | Backfill paginado e reconciliação; entrada do comando `pnpm shopify:sync` | `cliente`, `consultas`, `espelhar`, `inventario` |
| `webhook.ts` | Endpoint `POST /api/shopify/webhook`: verifica HMAC, despacha por tópico | `espelhar` |
| `inventario.ts` | Ajuste de inventário pós-venda e fila de reenvio | `cliente`, `consultas` |

Cada um responde às três perguntas isoladamente: o `espelhar.ts` não sabe se os
dados vieram de um webhook ou do backfill; o `cliente.ts` não sabe o que é um
produto.

### 4.2 Campo novo

`shopifyId` (`text`, `unique`, `index`, `readOnly`) em `products`, `variants`,
`categories` e `brands`. É a chave do upsert e a única ligação entre os dois
sistemas.

Os ids internos do Payload continuam a ser `number` e continuam a ser os ids que
a loja e as encomendas usam. É por isso que `PublicProduct.id: number` sobrevive
intacto e o web não muda.

### 4.3 Webhooks

`POST /api/shopify/webhook`, tópicos subscritos:

- `products/create`, `products/update` → espelha o produto e as suas variantes
- `products/delete` → despublica no espelho (não apaga: encomendas antigas
  referenciam variantes)
- `inventory_levels/update` → atualiza `stock` da variante
- `collections/create`, `collections/update`, `collections/delete` → categorias

**A verificação de HMAC-SHA256 sobre o corpo cru é obrigatória e vem antes de
qualquer leitura do conteúdo.** É a fronteira de confiança deste sistema: sem
ela, o endpoint é uma forma pública de escrever no catálogo. O corpo tem de ser
lido cru (`await req.text()`), não como JSON já processado — reserializar altera
os bytes e a assinatura deixa de bater.

### 4.4 Mapeamento de campos

| Payload | Shopify |
|---|---|
| `title` / `slug` | `title` / `handle` |
| `description` | `descriptionHtml` (ver 5.1) |
| `brand` | `vendor` |
| `categories` | Collections |
| `options` | `product.options` |
| `gallery` / `primaryImage` | `media` (URLs do CDN) |
| `metaTitle` / `metaDescription` | metafields `global.title_tag` / `global.description_tag` |
| `combination` | `selectedOptions` + metafields de produto (ver 5.2) |
| `sku` / `ean` | `variant.sku` / `variant.barcode` |
| `priceCents` / `oldPriceCents` | `price` / `compareAtPrice` (×100, inteiro) |
| `stock` | `inventoryQuantity` |
| `costCents` | `inventoryItem.unitCost` |
| `weightG` | `inventoryItem.measurement.weight` (normalizado a gramas) |

## 5. Os dois pontos incómodos

### 5.1 A descrição deixa de ser Lexical

Hoje `description` é rich text Lexical e o `descriptionToHtml`
(`apps/web/src/lib/richtext.ts`) garante o HTML seguro por construção: só
percorre nós conhecidos e escapa texto e URLs.

O Shopify entrega `descriptionHtml` — HTML feito, de fora deste sistema. O campo
passa a `textarea` no espelho, e o web sanitiza com `sanitize-html` antes do
`dangerouslySetInnerHTML`.

Esta é uma dependência nova e é deliberada: a fronteira de confiança mudou de
sítio, e confiar em HTML externo porque "vem do meu próprio admin Shopify" é
confiar em toda a cadeia de acessos dessa plataforma. `richtext.ts` e a
dependência `@payloadcms/richtext-lexical` no web saem.

### 5.2 Atributos que não são de variante

Os cinco atributos configurados (`Tamanho`, `Cor`, `Peso do saco`,
`Animal de destino`, `Porte`) não têm todos a mesma natureza no Shopify:

- **Tamanho, Cor, Peso do saco** são `options` de variante — mapeiam direto para
  `selectedOptions` e caem no `combination` sem esforço.
- **Animal de destino, Porte** são propriedades do *produto*. Vão a metafields
  (`namespace: animora`), e o sync copia-os para o `combination` de **todas** as
  variantes do produto.

A cópia é redundante e é assumida: é o que mantém `facets.ts` e `filters.ts` no
web sem uma linha de alteração. A alternativa — um campo de atributos ao nível
do produto e facetas que leem de dois sítios — é mais correta e custa a
reescrita do módulo de filtros do web. Fica registada como caminho de evolução,
não como dívida a pagar já.

Marcar no `espelhar.ts` com `ponytail:` — teto: um produto com muitas variantes
multiplica o mesmo par chave/valor; passa a atributos de produto quando as
facetas justificarem a reescrita.

## 6. O que se apaga

| Alvo | Linhas | Porquê |
|---|---|---|
| `hooks/syncVariants.ts` | 204 | A matriz de variantes é gerada no Shopify |
| `hooks/validatePublish.ts` | 150 | Publicar é no Shopify |
| `hooks/blockOffMatrix.ts` | 101 | Não há edição que possa sair da matriz |
| `hooks/ajustarStock.ts` | 101 | Não há formulário de stock para atropelar |
| `hooks/blockDeleteIfPublished.ts` | 85 | Apagar é no Shopify |
| `hooks/uniqueSlug.ts` | 51 | O `handle` do Shopify já é único |
| `hooks/blockUnsellable.ts` | 146 → ~40 | Fica a guarda que o `checkout.ts` usa e o utilitário `idDaRelacao` |
| `collections/Media.ts` + dep `sharp` | 61 | Imagens passam a URLs do CDN do Shopify |
| `seed.ts`, parte de catálogo | ~800 de 1168 | O backfill substitui-a; fica o seed de clientes e encomendas |
| `integracao.test.ts`, parte | ~1200 de 3406 | Os testes dos hooks apagados vão com eles |
| Campos `supplier`, `warehouseLocation`, `shippingWeightG`, `lengthCm`, `widthCm`, `heightCm` | — | Nada os lê: existem no esquema, na lista de campos internos do `sanitize.ts` e em mais lado nenhum |
| `lib/richtext.ts` + `lib/richtext.test.ts` (web) e a dep `@payloadcms/richtext-lexical` do web | 30 + teste | Ver 5.1. Verificado: o único consumidor é `produto/[slug]/page.tsx`; a dep no web existe só para isto (a de `apps/api` fica, o Payload exige um editor configurado) |

**Não se apaga:** `Products`, `Variants`, `Categories`, `Brands`, `Attributes`,
`ConfiguracaoFiltros`, `Reviews`, `Orders`, `Customers`, `Users`, `Definicoes`,
`checkout.ts`, `dashboard.ts`, `PainelVendas.tsx`, `hooks/serializar.ts`,
`hooks/anonimizarEncomendas.ts` e o módulo `catalog` inteiro do web.

## 7. Imagens

As imagens passam a ser servidas pelo CDN do Shopify. `gallery.image`,
`primaryImage` e `shareImage` deixam de ser `upload` e passam a grupos de texto
(`url`, `alt`, `width`, `height`) — a mesma forma que o `sanitize.ts` do web já
extrai, por isso `PublicProduct` não muda.

`mediaUrl()` (`apps/web/src/lib/api.ts`) já só prefixa URLs relativas; as do CDN
são absolutas e passam intactas. É preciso acrescentar `cdn.shopify.com` a
`images.remotePatterns` em `apps/web/next.config.mjs`, senão o otimizador do
`next/image` recusa-as.

## 8. Configuração

Variáveis novas em `apps/api/.env` (e no `.env.example`):

```
SHOPIFY_LOJA=animora.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=...
```

O token é de um custom app com âmbitos `read_products`,
`read_inventory` e `write_inventory`. Nenhuma destas variáveis é
`NEXT_PUBLIC_`: a Admin API nunca é chamada do browser.

## 9. Testes

Continuam sem mocks, contra o Postgres real, com o prefixo `zteste` e limpeza no
fim — como o resto de `integracao.test.ts`. As respostas do Shopify são fixtures
JSON, porque o alvo do teste é o mapeamento, não a rede.

Cenários que têm de existir:

1. **HMAC recusa corpo adulterado** — assinatura válida para outro corpo devolve
   401 e não escreve nada.
2. **`espelhar` é idempotente** — correr o mesmo payload duas vezes dá o mesmo
   espelho, sem duplicar variantes nem categorias.
3. **Variante removida no Shopify** — desaparece do espelho sem partir uma
   encomenda que a referencia.
4. **Webhook de inventário não ressuscita stock vendido** — chega um
   `inventory_levels/update` com valor anterior à venda; o estado final é
   coerente com o ajuste já enviado.
5. **Ajuste pendente reenvia** — uma falha de rede no `inventoryAdjustQuantities`
   deixa o registo em `ajustes_pendentes` e o `sync` reenvia-o.
6. **Checkout continua a recusar sobrevenda** — o teste de concorrência
   existente passa sem alteração.

## 10. Faseamento

Três planos independentes. Cada um deixa a loja a funcionar e é reversível
sozinho.

**Fase 1 — o espelho enche-se.** Módulo `shopify/`, campo `shopifyId`, backfill
`pnpm shopify:sync`. O admin continua editável; o espelho e a edição coexistem.
Verificável: correr o sync e ver o catálogo do Shopify na loja.

**Fase 2 — a edição fecha e o peso morto sai.** Só-leitura nas quatro coleções,
apagar os hooks, o seed de catálogo, os campos órfãos, o Media e o Lexical do
web. Verificável: `pnpm -r test` e `pnpm -r typecheck` verdes, loja igual.

**Fase 3 — o tempo real.** Webhooks com HMAC, ajuste de inventário pós-checkout,
`ajustes_pendentes`. Verificável: editar um preço no Shopify e vê-lo na loja sem
correr comando nenhum.

## 11. Em aberto

**A loja Shopify e os seus produtos.** Este desenho assume que existe uma loja
Shopify e que os produtos são criados lá. Se o catálogo atual (42 produtos, 69
variantes do seeder) tiver de ser importado, isso é um trabalho de migração de
sentido único (Postgres → Shopify) que **não** faz parte deste desenho e merece
o seu próprio plano. A pergunta ficou por responder na sessão de desenho; a
Fase 1 é implementável sem a resposta, contra uma loja de desenvolvimento com
produtos de teste.
