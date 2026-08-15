# Animora — Especificação de Reconstrução

**Data:** 2026-08-15
**Estado:** desenho aprovado, pronto para plano de implementação
**Substitui:** site estático atual em HTML/CSS/JS (`index.html`, `app.js`, `products.js`, `styles.css`)

---

## 1. Contexto

A Animora é uma pet shop. O site atual é uma demonstração estática: 16 produtos fixos no código, sem rotas, sem página de produto, sem backend e sem painel de administração. O checkout mostra um aviso e esvazia o carrinho.

Esta especificação define a reconstrução como **loja real**, com painel de administração, catálogo gerido por quem trabalha na loja, e arquitetura preparada para receber pagamentos numa fase seguinte.

### Objetivos

1. Loja real, a vender, para o mercado português
2. Painel de administração usável por pessoa não técnica
3. SEO a sério — páginas de produto indexáveis
4. Código modular, testável e com estrutura que se aguente

### Fora de âmbito nesta fase

- **Pagamentos.** A arquitetura deixa costura limpa para Stripe/MB Way, mas não se implementa agora.
- Aplicação móvel. Apenas site responsivo.
- Multi-idioma e multi-moeda.
- Importação de produtos por CSV (o modelo comporta, fica para segunda fase).

---

## 2. Stack

| Camada | Escolha |
|---|---|
| Linguagem | TypeScript, modo `strict` |
| Loja | Next.js (App Router, SSR/SSG) |
| Estilos | Tailwind + tokens da paleta atual |
| Animação | GSAP + ScrollTrigger |
| Ícones | SVG próprio, sprite `<symbol>` |
| Admin + API | Payload CMS |
| Base de dados | Postgres |
| Imagens | upload no Payload, `next/image` na loja |
| Testes | Vitest (lógica) + Playwright (fluxo de compra) |

### Porquê esta stack

**TypeScript nas duas pontas.** Uma linguagem cobre loja, API e admin. Tipos partilhados, sem duplicação escrita à mão.

**Next.js pelo SEO.** As páginas são montadas no servidor e chegam ao Google já com conteúdo. Foi o defeito nº1 do site atual, que não tem sequer páginas de produto.

**Payload pelo admin.** Descrevem-se as coleções em TypeScript e o painel de administração é gerado: formulários, tabelas, upload, relações, autenticação e permissões. Construir um admin equivalente à mão são semanas de trabalho invisível.

### Mercado: Portugal

Moeda **€**. Morada com código postal português. IVA **23%**. Portes CTT. Formatos de data e número portugueses.

---

## 3. Estrutura do monorepo

```
animora/
├─ apps/
│  ├─ api/                      Payload — admin, API, base de dados
│  │  ├─ src/collections/       schema → ecrãs do admin
│  │  ├─ src/access/            regras de permissão
│  │  └─ payload.config.ts
│  └─ web/                      loja
│     ├─ src/app/
│     │  ├─ page.tsx                    home
│     │  ├─ [categoria]/page.tsx        catálogo + filtros
│     │  ├─ produto/[slug]/page.tsx     ficha de produto
│     │  ├─ carrinho/page.tsx
│     │  ├─ checkout/page.tsx
│     │  └─ conta/
│     │     ├─ encomendas/
│     │     ├─ moradas/
│     │     └─ favoritos/
│     ├─ src/modules/           domínio
│     │  ├─ catalog/            produtos, variantes, filtros
│     │  ├─ cart/               carrinho, fusão no login
│     │  ├─ orders/             encomendas, snapshot, stock
│     │  └─ customers/          contas, moradas, favoritos
│     ├─ src/components/
│     │  ├─ ui/                 primitivos sem regra de negócio
│     │  ├─ icons/              sprite SVG
│     │  └─ motion/             wrappers GSAP
│     ├─ src/lib/               money, format, api client
│     └─ src/styles/
├─ packages/
│  └─ types/                    tipos gerados pelo Payload
└─ package.json
```

### Regras de estrutura

**Fronteira de módulo.** Cada módulo expõe um `index.ts`. Nada fora do módulo importa ficheiros internos dele. Se o `checkout` precisar de stock, chama `orders` — não vai buscar um ficheiro do `catalog`.

Sem esta regra, o `app.js` de 598 linhas volta em três meses, só que espalhado por 40 ficheiros.

**Domínio separado de apresentação.** `modules/` tem as regras — o que pode ser comprado, quanto custa, se há stock. `components/` desenha. Um componente nunca decide preço nem stock. Foi essa mistura que tornou o código atual impossível de testar.

**Sem `utils/` genérico.** Vira caixote do lixo. Funções vivem no módulo a que pertencem.

**Sem camada de abstração sobre o Payload.** É a base de dados; chama-se direto. Acrescenta-se abstração quando doer, não antes.

---

## 4. Modelo de dados

### Coleções

| Coleção | Papel |
|---|---|
| `products` | ficha: título, slug, descrição, marca, categorias, galeria, SEO |
| `variants` | **SKU, opções, preço, stock, dimensões** — filho de produto |
| `categories` | árvore, gerida no admin |
| `brands` | gerida no admin |
| `attributes` | registo de atributos e respetivo alcance |
| `media` | imagens com tamanhos gerados |
| `customers` | autenticação, moradas, favoritos |
| `orders` | encomenda e linhas |
| `settings` | singleton — inclui a trava do dashboard |

### Decisões estruturais

**1. Stock e preço vivem na variante.**

O produto é a ficha. Quem tem SKU, preço e stock é a variante. Um produto sem variantes reais leva uma variante única implícita, para que carrinho e stock tenham sempre a mesma forma, sem casos especiais.

**2. As linhas da encomenda guardam cópia, não referência.**

Cada linha grava, congelados no momento da compra:

- `titulo`
- `sku`
- `preco_unitario` (cêntimos)
- `custo_unitario` (cêntimos)
- `quantidade`

Se a linha referenciasse o produto vivo, mudar um preço amanhã reescrevia o histórico de encomendas e as faturas deixavam de bater certo. O `custo_unitario` é igualmente congelado — sem isso, uma subida de preço do fornecedor reescreve a margem de todas as vendas passadas e o histórico deixa de fechar com a contabilidade.

**3. Dinheiro em cêntimos inteiros.**

`2990`, nunca `29.90`. Formata-se apenas na apresentação. Elimina a classe de erro de vírgula flutuante do código atual.

**4. Carrinho: convidado em `localStorage`, fundido no login.**

Quem não tem sessão põe no carrinho à mesma. Ao entrar na conta, o carrinho local funde com o do servidor. Sem isto perdem-se vendas de quem enche o carrinho antes de fazer login.

**5. Os dois "tamanhos" são coisas diferentes.**

- **Tamanho como variante** — coleira em S/M/L, cada uma com stock e preço. O cliente escolhe.
- **Tamanho do objeto** — a caixa mede 60 × 40 × 38 cm. É característica, não escolha.

As dimensões vivem **na variante**, senão a cama G declara as medidas da P.

---

## 5. Atributos e alcance

Todo o atributo declara onde aparece:

| Alcance | Significa |
|---|---|
| `filtro` | filtra no catálogo, visível ao cliente |
| `ficha` | aparece nas especificações do produto, não filtra |
| `interno` | só admin e relatórios — **nunca sai para o site** |

### Atributos de pet shop

| Campo | Onde | Alcance |
|---|---|---|
| Animal de destino (cão, gato, pássaro, roedor, peixe, réptil) | produto | filtro |
| Porte do animal (mini, pequeno, médio, grande) | produto | filtro |
| Faixa etária (filhote, adulto, sénior) | produto | filtro |
| Material | produto | ficha |
| Dimensões C × L × A (cm) | variante | ficha |
| Peso do objeto (g) | variante | ficha |
| Peso/volume do conteúdo (ração 2kg, 10kg) | variante | filtro |
| Cor | variante (opção) | filtro |
| Fornecedor, custo de compra, margem | produto | **interno** |
| Código interno / EAN | variante | **interno** |
| Localização em armazém | variante | **interno** |
| Peso para portes | variante | **interno** |

**Animal de destino** e **porte** são os dois filtros mais importantes numa loja de animais. O site atual não tem nenhum dos dois — trata "Cães/Gatos" como categoria, o que obriga a duplicar a árvore inteira. Passam a atributos; a categoria fica para o tipo de produto (Camas, Coleiras, Ração).

**Segurança:** atributos `interno` são filtrados no servidor. Um `?fornecedor=X` colocado à mão no URL não filtra nada, porque os parâmetros são validados contra a lista de atributos públicos antes de chegarem à consulta.

---

## 6. Ecrã de configuração de filtros

Ecrã no admin, lista arrastável:

```
FILTROS DO CATÁLOGO                      [Guardar]

☰  Animal de destino    [caixas ▾]    visível ✓   aberto ✓
☰  Porte do animal      [caixas ▾]    visível ✓   aberto ✓
☰  Preço                [intervalo ▾] visível ✓   aberto ✓
☰  Marca                [caixas ▾]    visível ✓   fechado
☰  Cor                  [amostras ▾]  visível ✓   fechado
☰  Material             [caixas ▾]    visível ✗
☰  Fornecedor            —  interno, não pode ser filtro público
```

- Arrastar define a ordem no catálogo
- Tipo de controlo por atributo: caixas, intervalo, amostras de cor, chips
- "Aberto" decide se a secção começa expandida — importa em mobile
- Atributos `interno` aparecem bloqueados, sem possibilidade de os tornar públicos

**Filtros por categoria.** Conjunto global por omissão, com substituição opcional por categoria: em "Ração" filtra-se por peso e faixa etária; em "Coleiras" por tamanho e cor.

**Regra que fecha o buraco antigo:** um filtro só mostra opções que existem em produtos publicados e com stock. Nunca aparece um filtro que devolve zero resultados.

---

## 7. Cadastro de produtos

Ecrã dividido em separadores, porque quem o usa não é técnico:

- **Geral** — título, slug (gerado do título, editável), descrição, marca, categorias, atributos, estado
- **Preço e stock** — matriz de variantes
- **Imagens** — galeria ordenável
- **SEO** — meta título, descrição, imagem de partilha

### Matriz de variantes

Não se adicionam variantes uma a uma. Definem-se as opções e o sistema gera as combinações:

```
Opções:  Tamanho → S, M, L
         Cor     → Preto, Azul

Gera 6 linhas:
┌────────────┬────────────────┬───────┬───────┬──────────────┐
│ Variante   │ SKU            │ Preço │ Stock │ Dimensões    │
├────────────┼────────────────┼───────┼───────┼──────────────┤
│ S · Preto  │ HP-COL-S-PRT   │ 29,90 │  12   │ 30×2×1 cm    │
│ S · Azul   │ HP-COL-S-AZL   │ 29,90 │   4   │ 30×2×1 cm    │
│ M · Preto  │ HP-COL-M-PRT   │ 32,90 │   8   │ 40×2×1 cm    │
│ …          │                │       │       │              │
└────────────┴────────────────┴───────┴───────┴──────────────┘
```

Requisitos que fazem a matriz funcionar:

- **SKU sugerido automaticamente** (marca-produto-opções), editável, **validado como único** — SKU duplicado só se descobre quando a encomenda sai errada
- **Preencher em coluna** — escrever um preço e aplicar a todas as linhas
- **Desativar linhas** que não existem (há S preto mas não S azul) sem apagar dados
- **Acrescentar uma opção depois** gera só as combinações novas, preservando preços e stock já preenchidos

### Validação ao publicar

Publicar exige, recusando com mensagem clara:

- pelo menos uma variante ativa com preço > 0
- pelo menos uma imagem, **cada uma com texto alternativo** (obrigatório)
- categoria e marca preenchidas
- slug único
- stock nunca negativo

Rascunhos não passam por estas validações — quem está a meio de carregar um produto não é interrompido.

### Preço

O admin escreve `29,90`. O sistema guarda `2990`. O campo mostra sempre formatado. Quem preenche nunca vê cêntimos; quem calcula nunca vê decimais.

### Imagens

- Obrigatória para publicar; a imagem principal marcada é a do catálogo
- Texto alternativo obrigatório
- Ponto focal por imagem — sem ele o corte quadrado do card decapita os animais
- Conversão automática para WebP e geração dos tamanhos que a loja pede
- Variantes de cor podem ter imagem própria; o card troca conforme a cor escolhida

### Poupança de tempo

- **Duplicar produto** — a coleira nova em castanho é a mesma ficha com outra galeria
- **Edição em massa** de preço e stock a partir da listagem

---

## 8. Storefront

### Rotas

```
/                        home
/[categoria]             catálogo + filtros
/produto/[slug]          ficha do produto
/carrinho
/checkout
/conta/encomendas|moradas|favoritos
```

A ficha com URL própria torna o produto partilhável, indexável, com meta tags e imagem de partilha próprias.

### Server ou Client

Por omissão tudo é Server Component: home, catálogo e ficha renderizam no servidor e chegam ao Google com conteúdo.

Passa a Client apenas o que precisa de interação: seletor de variante, controlos de filtro, drawer do carrinho, wrappers do GSAP.

**Regra:** um componente só vira Client quando precisa de estado, efeito ou handler. Não por conveniência.

### Filtros na URL

```
/coleiras?animal=cao&porte=medio&preco=10-50&ordem=preco-asc
```

Torna o link partilhável, faz o botão "voltar" funcionar, permite renderizar a página filtrada no servidor e indexá-la, e tira o estado de dentro do `localStorage`, onde hoje está escondido.

### Mobile

Filtros em bottom sheet atrás de um botão, nunca barra lateral empurrada para cima do catálogo. Em 390px o utilizador vê produtos imediatamente. Alvos de toque a 44px.

### GSAP

Confinado a `components/motion/`. Reveals com ScrollTrigger na home, micro-interações nos cards, transição na abertura da ficha.

Duas regras:

1. `prefers-reduced-motion` respeitado num sítio só
2. A grelha do catálogo **não** anima a cada mudança de filtro

### SVG

Sprite com `<symbol>` e componente `<Icon name="cart" />`, tudo em `currentColor`.

Ilustrações próprias nos estados vazios (carrinho vazio, sem resultados) e ícones de categoria desenhados — cão, gato, pássaro.

### Acessibilidade por construção

- Diálogos com focus trap e devolução de foco ao fechar
- `:focus-visible` na camada de tokens
- Skip link
- Hierarquia de headings correta
- Alvos de toque a 44px

---

## 9. Dashboard de vendas

### Métricas

| | |
|---|---|
| Faturamento | período + comparação com o anterior |
| Lucro e margem | receita − custo das mercadorias vendidas |
| Encomendas | número e ticket médio |
| Mais vendidos | por unidades **e** por receita (listas diferentes) |
| Categorias | receita por categoria |
| Stock | ruturas e stock baixo |
| Clientes | novos vs recorrentes |

### Trava comercial

O dashboard é entregue completo mas bloqueado, para desbloqueio comercial posterior.

**A verificação é no servidor.** Se fosse uma flag no cliente, bastava abrir as devtools. Com verificação no servidor, os números reais não saem da base de dados enquanto estiver bloqueado — o endpoint devolve série de demonstração e `locked: true`.

O código de agregação é o mesmo nos dois estados. Só muda quem responde.

**Desbloqueio:** campo booleano em `settings`, editável apenas pelo papel `owner`. O comprador entra como `admin` — vê o dashboard, não vê o interruptor.

**Alcance real:** quem tiver acesso à base de dados ou ao deploy consegue destravar à força. Isto é um travão comercial, não DRM. Construir mais do que isto custa tempo e não fecha o buraco.

### Rotulagem obrigatória

O estado bloqueado indica que os números são de demonstração. Faixa permanente, não descartável:

```
┌─────────────────────────────────────────────────┐
│  Dados de demonstração — não são as suas vendas │
│  Para ativar os dados reais: (19) 98252-1727    │
│                          [ Falar no WhatsApp ]  │
└─────────────────────────────────────────────────┘
```

O botão liga a `wa.me/5519982521727`.

Se o comprador olhar para faturamento inventado a pensar que é o dele, toma decisões de negócio com números falsos. Rotulado, o bloqueio faz exatamente o mesmo trabalho comercial.

---

## 10. Defeitos do site atual que esta arquitetura resolve

| Defeito atual | Resolução |
|---|---|
| Sem página de produto (só modal) | rota `/produto/[slug]` renderizada no servidor |
| Sem rotas, uma única página | App Router com rotas reais |
| Checkout falso | fluxo real; pagamento numa fase seguinte |
| Nav de categorias decorativa, 36 links mortos | categorias e páginas reais |
| Envio grátis acima de 50€ escondido | comunicado no carrinho |
| Filtros que devolvem sempre zero | opções derivadas de dados reais em stock |
| Slider de preço até 1500€ com produtos até 76€ | limites derivados do catálogo |
| Filtros empurram o catálogo em mobile | bottom sheet |
| Alvos de toque abaixo de 44px | 44px mínimo |
| Sem `:focus-visible` | na camada de tokens |
| Sem focus trap nos modais | diálogos com trap e devolução de foco |
| Ícones são texto (leitor de ecrã lê "shopping_cart") | sprite SVG |
| Hierarquia de headings partida | estrutura correta |
| Sem `prefers-reduced-motion` | respeitado nos wrappers GSAP |
| `app.js` com 598 linhas, tudo global | módulos de domínio com fronteira |
| Re-render total a cada interação | React |
| Estado duplicado DOM ↔ JS | fonte única |
| `innerHTML` com escape manual | React |
| Dinheiro em float | cêntimos inteiros |
| Chaves `reusestore_` colidem entre projetos | chaves próprias, estado no servidor |
| Imagens externas sem dimensões (layout shift) | `next/image` com dimensões |
| Sem testes | Vitest + Playwright |
| README descreve outro projeto | reescrito |
| Trust bar duplicada, `</lis>` malformado | eliminados |

---

## 11. Testes

**Vitest** — lógica de domínio: cálculo de totais em cêntimos, regras de stock, geração da matriz de variantes, fusão de carrinho no login, validação de filtros contra atributos públicos.

**Playwright** — um fluxo de compra ponta a ponta: procurar, filtrar, escolher variante, adicionar ao carrinho, entrar na conta com carrinho de convidado, chegar ao checkout.

Prioridade nos testes: tudo o que toca em **dinheiro** e em **stock**.

---

## 12. Decisões em aberto

- Alojamento (Vercel, VPS próprio, outro)
- Fornecedor de email transacional (confirmações de encomenda)
- Se o catálogo inicial é migrado dos 16 produtos mock ou carregado de novo
- Motor de portes CTT: tabela fixa ou API
