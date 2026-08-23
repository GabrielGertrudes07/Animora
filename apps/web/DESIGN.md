---
name: Animora
description: Loja de animais de estimação para o mercado português — direta, calorosa, sem enfeite a mais.
colors:
  ink: "#18352A"
  ink-muted: "#4F685F"
  terracota: "#F2703A"
  terracota-dark: "#D6531F"
  terracota-strong: "#C76E47"
  sage: "#6F8F72"
  sage-dark: "#58735E"
  sage-soft: "#E1F3E7"
  promo: "#E63946"
  promo-dark: "#C22836"
  promo-soft: "#FCE1E3"
  cream: "#F7F5EF"
  white: "#FFFFFF"
  line: "#6F8F722E"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Bricolage Grotesque, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Bricolage Grotesque, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.16em"
rounded:
  lg: "8px"
  xl: "12px"
  card: "18px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.terracota}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.terracota-dark}"
  card-product:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "20px"
  badge-discount:
    backgroundColor: "{colors.promo}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "6px 8px"
---

# Design System: Animora

## 1. Overview

**Creative North Star: "O Guia de Bolso"**

Animora é uma ferramenta prática para uma tarefa concreta — encontrar o produto certo para o teu animal e comprá-lo sem atrito — não uma vitrine de luxo. O verde-escuro (`ink`) carrega confiança e legibilidade; o terracota é a única cor de ação, usada com disciplina; o creme aparece só em superfícies pontuais (a barra de pesquisa, a folha de filtros em mobile), nunca como fundo da loja — o fundo é branco. O sistema rejeita explicitamente dois géneros: a loja de startup genérica (o par Fraunces + Nunito Sans foi substituído por Bricolage Grotesque + Figtree precisamente por parecer "cara de IA") e o retalho frio e corporativo — cantos generosos e um tom de copy próximo mantêm a loja com cara de bairro, não de armazém.

Direto e caloroso: cantos arredondados generosos, sombras suaves e coloridas (nunca pretas), texto claro. A personalidade de marca — "cuidados a sério, sem ser sério demais" — aparece na copy tanto quanto na cor.

**Key Characteristics:**
- Base neutra: fundo branco, verde-escuro para texto, terracota como único acento de ação
- Cartões e superfícies elevadas nunca ficam rasantes ao fundo — sempre uma sombra suave, tingida de verde
- Duas famílias tipográficas e mais nenhuma
- Creme reservado para superfícies pontuais, nunca para o fundo da loja
- Vermelho de alerta (`promo`) reservado exclusivamente a desconto/urgência

## 2. Colors

A paleta é curta e disciplinada: um verde-escuro de confiança para texto, terracota como único acento de ação, verde-salva como apoio secundário, e vermelho isolado para um único trabalho.

### Primary
- **Terracota Animora** (#F2703A): a única cor de ação da loja — botões, ligações de destaque, distintivo de filtros ativos, acento do checkbox e do anel de foco. Nunca decorativa; se algo é terracota, é clicável ou está ativo.
- **Terracota Profundo** (#D6531F): estado de hover/pressed do terracota.
- **Terracota Forte** (#C76E47): tom mais denso, usado em fundos de slide do carrossel de marketing.

### Secondary
- **Verde-Salva** (#6F8F72): apoio de marca — etiqueta da marca no cartão de produto, ilustrações de estado vazio, moldura de linhas (`line` deriva daqui a 18% de opacidade).
- **Verde-Salva Profundo** (#58735E): texto sobre `sage-soft`.
- **Verde-Salva Suave** (#E1F3E7): fundo do distintivo "Poupas X€".

### Tertiary
- **Vermelho de Alerta** (#E63946): exclusivo para desconto e urgência — o distintivo de percentagem de desconto no cartão de produto. Nunca reutilizada como cor de marca ou de navegação.
- **Vermelho de Alerta Escuro** (#C22836) / **Vermelho de Alerta Suave** (#FCE1E3): variações do mesmo papel, nunca noutro.

### Neutral
- **Verde-Escuro de Confiança** (#18352A): cor de texto primária (`ink`) — títulos, corpo de texto principal, botão "esgotado".
- **Verde-Acinzentado de Apoio** (#4F685F): texto secundário (`ink-muted`) — preços riscados, metadados, legendas.
- **Branco** (#FFFFFF): fundo primário da loja e de todos os cartões.
- **Creme Pontual** (#F7F5EF): reservado a superfícies pequenas e pontuais — fundo da barra de pesquisa, folha de filtros em mobile, fundo do placeholder de imagem. Nunca o fundo da página.
- **Linha Verde-Salva a 18%** (#6F8F722E): toda a divisória e borda da loja (`line`) — uma única cor de borda, derivada do verde-salva, nunca cinza neutro.

### Named Rules
**The Punctual Cream Rule.** Creme é para bocados, não para páginas. Se uma superfície ocupa o viewport inteiro, é branca; creme entra só em elementos pequenos e pontuais.

**The Promo-Only Rule.** Vermelho de alerta faz um trabalho e um só: sinalizar desconto ou urgência. Nunca aparece num botão de navegação, num título de secção ou em qualquer lugar que não seja "isto está mais barato" ou "isto está a acabar".

## 3. Typography

**Display Font:** Bricolage Grotesque (com Georgia, serif como reserva)
**Body Font:** Figtree (com system-ui, sans-serif como reserva)

**Character:** Um grotesco com carácter próprio para títulos, sem cair na serifa editorial que qualquer gerador escolheria por omissão; Figtree mantém o corpo de texto legível e sem pretensão. Duas famílias, carregadas uma vez em `layout.tsx` via `next/font`, e mais nenhuma.

### Hierarquia
- **Display** (700, 1.875rem→2.25rem em `sm`, leading tight): título do herói no carrossel de marketing, sobre fundo de cor cheia.
- **Headline** (700 implícito de `h2`, 1.875rem→2.25rem em `sm`, tracking-tight): títulos de secção na home ("Ofertas desta semana", "Escolhas da casa").
- **Title** (600, 1.125rem, leading snug): título do produto no cartão de catálogo.
- **Body** (400, 0.875rem, leading relaxed, ≤65ch): texto corrido — descrições, metadados, mensagens de estado.
- **Label** (600, 0.6875rem–0.6875rem, tracking 0.16em, uppercase): etiquetas curtas — nome da marca no cartão, kicker acima de secções da home.

### Named Rules
**The Two-Family Rule.** Exactamente duas famílias tipográficas em toda a loja — Bricolage Grotesque para `h1`–`h3` via `font-display` na camada base, Figtree para tudo o resto. Nenhuma terceira família, nem para números, nem para código.

## 4. Elevation

Nada fica rasante ao fundo. Cartões e superfícies levantadas nascem já com uma sombra suave (`shadow-sm`) e ganham profundidade no hover (`shadow-md`) — nunca totalmente planas, nunca uma sombra preta e dura. A cor da sombra é o verde-escuro da marca a baixa opacidade (`rgba(24, 53, 42, …)`), não preto neutro: a profundidade tem a cor da loja.

### Shadow Vocabulary
- **sm** (`box-shadow: 0 10px 20px rgba(24, 53, 42, 0.06)`): estado de repouso de qualquer cartão ou superfície levantada.
- **md** (`box-shadow: 0 18px 45px rgba(24, 53, 42, 0.12)`): estado de hover do cartão de produto; sombra do painel de filtros em mobile.

### Named Rules
**The Never-Flat Rule.** Uma superfície levantada nunca aparece sem sombra nenhuma. Se não tem `shadow-sm` em repouso, não é um cartão — é fundo.

## 5. Components

### Buttons
- **Shape:** cantos generosos — `rounded-xl` (12px) na classe canónica `.botao-principal`.
- **Primary:** fundo terracota, texto branco, `px-6 py-3` (24px/12px), peso semi-negro.
- **Hover / Focus:** fundo passa a terracota profundo (#D6531F); foco visível é um anel terracota de 2px com offset de 2px sobre branco, definido uma única vez na camada base (`:focus-visible`).
- **Ghost / secondary (ad hoc):** borda `line`, fundo branco, texto `ink-muted`, usado nos botões de "Filtros" e de fechar diálogos.
- Vários botões terracota são escritos ad hoc com `rounded-lg` (8px) em vez de reutilizar `.botao-principal` — o raio derrapa entre 8px e 12px conforme o sítio; ver Do's and Don'ts.

### Chips / Badges
- **Desconto:** pílula (`rounded-full`), fundo vermelho de alerta, texto branco, `px-3 py-1`, negrito, canto superior esquerdo da imagem.
- **Esgotado:** pílula, fundo `ink/90`, texto creme, maiúsculas com tracking largo, canto superior direito.
- **Poupança:** pílula, fundo verde-salva suave, texto verde-salva profundo, junto ao preço riscado.
- **Contagem de filtros ativos:** pílula pequena e redonda, fundo terracota, texto branco, sobre o botão "Filtros" em mobile.

### Cards / Containers
- **Corner Style:** `rounded-card` (18px) — o único raio de cartão em toda a loja, incluindo o cartão de produto, o estado vazio e a folha de filtros em mobile.
- **Background:** branco.
- **Shadow Strategy:** ver Elevation — `shadow-sm` em repouso, `shadow-md` no hover (só no cartão de produto).
- **Border:** `border-line` (verde-salva a 18%), sempre 1px.
- **Internal Padding:** `p-5` (20px) no corpo do cartão de produto; `px-6 py-12` no estado vazio.

### Inputs / Fields
- **Style:** `rounded-lg` (8px), `border-line`, fundo branco, texto `ink`.
- **Checkboxes:** cor de acento terracota (nativa do browser via `text-terracota`), anel de foco terracota de 2px.
- **Focus:** o mesmo anel terracota da camada base — sem excepção por componente.

### Navigation
- Cabeçalho branco, borda inferior `line`. Categorias como lista de ligações em texto, sem sublinhado; hover troca para fundo creme. Sem estado "activo" visualmente distinto para a categoria corrente — nota para uma futura passagem de acessibilidade/hierarquia.
- Em mobile, a lista de categorias ganha scroll horizontal próprio (`overflow-x-auto`) em vez de espremer a página.

### Filtros e diálogos (componente de assinatura)
- Secções de filtro usam `<details>`/`<summary>` nativos — sem JavaScript, sem biblioteca de disclosure.
- A folha de filtros em mobile é um `<dialog>` nativo (`showModal`), com fundo creme, canto superior `rounded-t-card`, backdrop `ink/40`. Fecho por clique fora, Esc, ou botão — tudo nativo, sem biblioteca de modais.

### Ícones e ilustrações
- Sprite SVG próprio (`Icon`), traço de 1.8px, `currentColor`, decorativo por omissão (`aria-hidden`).
- Ilustrações de estado vazio em verde-salva, dentro da mesma moldura de cartão (`rounded-card`, `border-line`, `shadow-sm`).
- Textura de patas em marca de água (`data:` SVG embutido, 5% de opacidade) — só em fundos do herói de marketing, nunca em superfícies de conteúdo.

### Avaliações
- Estrelas desenhadas em glifo de texto (★/☆) a terracota, não SVG. Ausência de avaliação não desenha zero estrelas — não desenha nada.

## 6. Do's and Don'ts

### Do:
- **Do** manter o fundo da loja branco; reservar creme (#F7F5EF) só para superfícies pequenas e pontuais (barra de pesquisa, folha de filtros, placeholder de imagem).
- **Do** usar terracota (#F2703A) como a única cor de ação em toda a loja — botão, distintivo ativo, acento de checkbox, anel de foco.
- **Do** dar a qualquer cartão ou superfície levantada uma sombra suave tingida de verde desde o repouso ("The Never-Flat Rule"), aprofundando no hover.
- **Do** reutilizar `.botao-principal` para ações primárias, em vez de repetir `rounded-lg bg-terracota px-4 py-2` ad hoc em cada componente novo.
- **Do** manter os ícones como SVG próprio em `currentColor`, traço fino — nunca um pacote de ícones ou uma fonte de ícones.

### Don't:
- **Don't** reutilizar o vermelho de alerta (#E63946) fora de desconto/urgência — nunca em navegação, título de secção ou qualquer acento de marca ("The Promo-Only Rule").
- **Don't** deixar a loja parecer um armazém frio e corporativo — o anti-referência do PRODUCT.md ("retalho frio e corporativo") significa manter cantos generosos (18px nos cartões, pílula nos distintivos) e tom de copy próximo, mesmo nas páginas mais funcionais (checkout, conta).
- **Don't** introduzir uma terceira família tipográfica, nem para números nem para código — Bricolage Grotesque e Figtree, e mais nenhuma.
- **Don't** repetir o par Fraunces + Nunito Sans (serifa editorial + sans humanista) nem qualquer combinação parecida — foi identificado como "cara de IA" e substituído por esta mesma razão.
- **Don't** generalizar o kicker em maiúsculas com tracking largo ("Esta semana", "Escolhas da casa") como reflexo por omissão para toda secção nova — já aparece duas vezes na home; mais uma repetição transforma um recurso de copy num tique visual. Vale uma passagem de `/impeccable critique` se continuar a espalhar-se.
