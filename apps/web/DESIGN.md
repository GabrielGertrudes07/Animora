---
name: Animora
description: Loja de animais de estimação para o mercado português — balcão branco onde se compra, clareira de floresta ao amanhecer onde se persuade.
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
  floresta: "#0D2305"
  floresta-fundo: "#061003"
  dourado: "#FDD58B"
  dourado-forte: "#FDB329"
  creme-luz: "#FDF1D4"
  sol: "#E2910C"
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
    backgroundImage: "linear-gradient(180deg, #FC9301 0%, #F0640A 52%, #E03602 100%)"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    boxShadow: "inset 0 1px 0 rgba(255,236,200,0.55), 0 8px 18px -6px rgba(224,54,2,0.5)"
  button-primary-hover:
    filter: "brightness(1.07) saturate(1.04)"
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

**Creative North Star: "A Clareira e o Balcão"**

Animora é uma ferramenta prática para uma tarefa concreta — encontrar o produto certo para o teu animal e comprá-lo sem atrito — e por isso o sistema tem dois chãos, não um.

**O balcão** é onde se compra: catálogo, ficha de produto, carrinho, checkout, conta. Fundo branco, verde-escuro para texto, cantos generosos, sombras suaves tingidas de verde. É calmo de propósito — quem está a comparar rações não precisa de espetáculo.

**A clareira** é onde se persuade: a barra de aviso no topo, o cartaz da campanha, os testemunhos, as marcas e o rodapé. É a floresta ao amanhecer do cartaz da campanha (`public/banner/`) — verde quase preto com um nascer do sol a entrar pelo canto direito — e cada aparição abre com um fio de sol dourado na aresta de cima. A paleta desta metade (`floresta`, `dourado`, `creme-luz`, `sol`) não foi escolhida: foi amostrada do próprio pacote de arte, pixel a pixel, e é isso que faz o cartaz e a loja serem a mesma luz em vez de dois desenhos que se toleram.

A ponte entre os dois é o **botão**: o comprimido laranja lustroso do cartaz (`.botao-principal`), com o degradê, o fio de luz no bordo e a sombra na cor do próprio laranja. Aparece nas duas metades e é a mesma peça em ambas — é o que impede o balcão de parecer uma loja diferente da clareira.

O sistema rejeita explicitamente dois géneros: a loja de startup genérica (o par Fraunces + Nunito Sans foi substituído por Bricolage Grotesque + Figtree precisamente por parecer "cara de IA") e o retalho frio e corporativo — cantos generosos e um tom de copy próximo mantêm a loja com cara de bairro, não de armazém.

**Key Characteristics:**
- Dois chãos com fronteira declarada: branco onde se compra, floresta onde se persuade
- O terracota do sistema e o laranja do cartaz são o mesmo papel — ação — e o botão é a peça que os une
- Cartões e superfícies elevadas nunca ficam rasantes ao fundo: sombra verde sobre branco, sombra preta quente com fio dourado sobre floresta
- Duas famílias tipográficas e mais nenhuma
- Creme reservado para superfícies pontuais, nunca para o fundo do balcão
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

### Campanha (a clareira)
Amostrada do pacote de arte em `public/banner/`, nunca escolhida à mão. Só entra em superfícies de campanha: barra de aviso do topo, cartaz, testemunhos, marcas, rodapé.
- **Floresta** (#0D2305) / **Floresta de Fundo** (#061003): o chão escuro da clareira. `.chao-floresta` faz o degradê de um para o outro e acrescenta o nascer do sol; `.chao-floresta-continua` fica na cor de fundo lisa, para uma segunda faixa encostada não deixar costura.
- **Dourado** (#FDD58B) / **Dourado Forte** (#FDB329): os filetes e o aro do selo de portes do cartaz. O fio de sol na aresta de cada faixa de floresta, o filete divisório dentro do escuro, e a assinatura dos testemunhos. Não tem força nenhuma sobre branco — é uma cor para dentro do escuro, e só.
- **Creme de Luz** (#FDF1D4): a cor dos algarismos do «30%». É o texto de leitura sobre floresta — não branco puro, que sobre este verde lê como fluorescente.
- **Sol** (#E2910C): o nascer do sol do canto direito. Usado como luz (gradiente radial, `mix-blend`), nunca como cor de preenchimento de um elemento.

### Neutral
- **Verde-Escuro de Confiança** (#18352A): cor de texto primária (`ink`) — títulos, corpo de texto principal, botão "esgotado".
- **Verde-Acinzentado de Apoio** (#4F685F): texto secundário (`ink-muted`) — preços riscados, metadados, legendas.
- **Branco** (#FFFFFF): fundo primário da loja e de todos os cartões.
- **Creme Pontual** (#F7F5EF): reservado a superfícies pequenas e pontuais — fundo da barra de pesquisa, folha de filtros em mobile, fundo do placeholder de imagem. Nunca o fundo da página.
- **Linha Verde-Salva a 18%** (#6F8F722E): toda a divisória e borda da loja (`line`) — uma única cor de borda, derivada do verde-salva, nunca cinza neutro.

### Named Rules
**The Punctual Cream Rule.** Creme é para bocados, não para páginas. Se uma superfície ocupa o viewport inteiro, é branca; creme entra só em elementos pequenos e pontuais.

**The Promo-Only Rule.** Vermelho de alerta faz um trabalho e um só: sinalizar desconto ou urgência. Nunca aparece num botão de navegação, num título de secção ou em qualquer lugar que não seja "isto está mais barato" ou "isto está a acabar".

**The Two-Floors Rule.** Uma superfície é balcão ou é clareira, nunca meia. Branco onde se compra (catálogo, ficha, carrinho, checkout, conta), floresta onde se persuade (aviso do topo, cartaz, testemunhos, marcas, rodapé). Uma página de tarefa não ganha uma faixa de floresta para "dar impacto", e uma superfície de campanha não fica branca para "aliviar" — a decisão é do papel da superfície, não do gosto de quem a escreve.

**The Sampled-Palette Rule.** As cores da clareira (`floresta`, `dourado`, `creme-luz`, `sol`) saíram do pacote de arte em `public/banner/`, medidas do ficheiro. Se a campanha mudar de arte, estes tokens re-amostram-se da arte nova; não se afinam à mão nem se acrescentam variações por conveniência.

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
- **sm** (`box-shadow: 0 10px 20px rgba(24, 53, 42, 0.06)`): estado de repouso de qualquer cartão ou superfície levantada, sobre branco.
- **md** (`box-shadow: 0 18px 45px rgba(24, 53, 42, 0.12)`): estado de hover do cartão de produto; sombra do painel de filtros em mobile.
- **floresta** (`box-shadow: 0 22px 50px -18px rgba(0, 0, 0, 0.75)`): o repouso de um cartão sobre o chão de floresta. Ali a sombra verde desaparece (verde sobre verde-quase-preto não se vê) e a profundidade vem de duas coisas ao mesmo tempo: o preto quente por baixo e um `ring-1 ring-inset ring-dourado/15` a lamber a aresta de cima, como se o sol lhe pegasse na borda.

### Named Rules
**The Never-Flat Rule.** Uma superfície levantada nunca aparece sem sombra nenhuma. Se não tem `shadow-sm` em repouso, não é um cartão — é fundo.

## 5. Components

### Buttons (componente de assinatura)
O botão é a ponte entre o balcão e a clareira, e por isso é a peça do cartaz da campanha, não uma cor achatada: o comprimido laranja lustroso do `botao.png`, com os três valores do degradê amostrados do próprio ficheiro.

- **Shape:** pílula (`rounded-full`). Era `rounded-xl` (12px), e derrapava para 8px em oito sítios escritos à mão; agora não há segunda versão para derrapar.
- **Primary:** `linear-gradient(180deg, #FC9301, #F0640A 52%, #E03602)`, texto branco, `px-6 py-3`, peso semi-negro. Fio de luz no bordo superior (`inset 0 1px 0 rgba(255,236,200,0.55)`) e sombra na cor do próprio laranja (`0 8px 18px -6px rgba(224,54,2,0.5)`) — nunca cinza.
- **Hover:** não muda de cor, ganha luz — `filter: brightness(1.07) saturate(1.04)` e a sombra abre. **Pressed:** afunda — o fio de luz apaga-se e a sombra passa para dentro. **Disabled:** dessatura, e perde a sombra por inteiro.
- **Escala de controlo:** `.botao-principal-pequeno` só muda a caixa (`px-4 py-2 text-sm`) — filtros, "adicionar ao carrinho" numa grelha. A matéria é sempre a mesma.
- **Focus:** anel terracota de 2px com offset, definido uma vez na camada base. O offset lê a variável `--foco-fundo`, que `.chao-floresta` troca para floresta — sem isso o anel ganhava uma auréola branca dentro da clareira.
- **Ghost / secondary (ad hoc):** borda `line`, fundo branco, texto `ink-muted`, usado nos botões de "Filtros" e de fechar diálogos.

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
- **Sobre floresta:** fundo `white/[0.055]`, `shadow-floresta`, e um `ring-1 ring-inset ring-dourado/15` no lugar da borda. Fotografia dentro de um cartão da clareira leva um véu quente (`rgba(226,145,12,0.16)` a `rgba(6,16,3,0.42)`, `mix-blend-multiply`): fotografia de estúdio de fundo ciano ou azul-bebé não pertence a uma clareira ao amanhecer, e o véu puxa-a para a mesma luz sem lhe tirar a cor do animal.

### Inputs / Fields
- **Style:** `rounded-lg` (8px), `border-line`, fundo branco, texto `ink`.
- **Checkboxes:** cor de acento terracota (nativa do browser via `text-terracota`), anel de foco terracota de 2px.
- **Focus:** o mesmo anel terracota da camada base — sem excepção por componente.

### Navigation
- A barra de aviso do topo é a primeira aparição da clareira: `bg-floresta` com o nascer do sol a entrar pela direita e um fio dourado a fechar em baixo. O site abre na luz em que o cartaz vai continuar.
- Cabeçalho branco, borda inferior `line`. Categorias como lista de ligações em texto, sem sublinhado; hover troca para fundo creme. Sem estado "activo" visualmente distinto para a categoria corrente — nota para uma futura passagem de acessibilidade/hierarquia.
- Em mobile, a lista de categorias ganha scroll horizontal próprio (`overflow-x-auto`) em vez de espremer a página.

### Filtros e diálogos (componente de assinatura)
- Secções de filtro usam `<details>`/`<summary>` nativos — sem JavaScript, sem biblioteca de disclosure.
- A folha de filtros em mobile é um `<dialog>` nativo (`showModal`), com fundo creme, canto superior `rounded-t-card`, backdrop `ink/40`. Fecho por clique fora, Esc, ou botão — tudo nativo, sem biblioteca de modais.

### Ícones e ilustrações
- Sprite SVG próprio (`Icon`), traço de 1.8px, `currentColor`, decorativo por omissão (`aria-hidden`).
- Ilustrações de estado vazio em verde-salva, dentro da mesma moldura de cartão (`rounded-card`, `border-line`, `shadow-sm`).
- Textura de patas em marca de água (`data:` SVG embutido, 5% de opacidade) — só em fundos do herói de marketing, nunca em superfícies de conteúdo.

### Superfícies do browser
As partes que ninguém desenhou e que vêm com o tema do sistema operativo. Estão todas na camada base, num sítio só:
- **Seleção de texto:** `sage-soft` no balcão; dourado a 32% dentro da clareira, com o texto em `creme-luz`.
- **Cursor e acento nativo** (`caret-color`, `accent-color`): terracota.
- **Barra de scroll** (`scrollbar-color`): verde-salva sobre creme.
- **Sublinhado:** `text-underline-offset: 4px` e `text-decoration-thickness: from-font` em todos os `a`. Por omissão o sublinhado do browser encosta ao texto e corta os descendentes.
- **Anel de foco:** o offset lê `--foco-fundo`, que cada superfície define — branco no balcão, floresta na clareira.

### Avaliações
- Estrelas desenhadas em glifo de texto (★/☆) a terracota, não SVG. Ausência de avaliação não desenha zero estrelas — não desenha nada.

## 6. Do's and Don'ts

### Do:
- **Do** manter o fundo do balcão branco; reservar creme (#F7F5EF) só para superfícies pequenas e pontuais (barra de pesquisa, folha de filtros, placeholder de imagem).
- **Do** decidir o chão pelo papel da superfície ("The Two-Floors Rule"): branco onde se compra, floresta onde se persuade.
- **Do** usar terracota (#F2703A) como a única cor de ação do balcão, e o laranja lustroso do cartaz para o botão em ambas as metades — são o mesmo papel, não duas cores.
- **Do** dar a qualquer cartão ou superfície levantada uma sombra desde o repouso ("The Never-Flat Rule"): verde suave sobre branco, `shadow-floresta` mais fio dourado sobre floresta.
- **Do** reutilizar `.botao-principal` (e `.botao-principal-pequeno` quando a caixa tem de ser menor) para ações primárias, em vez de reescrever o degradê, o fio de luz e a sombra à mão.
- **Do** dar a cada faixa de floresta a sua própria luz — o nascer do sol e o fio dourado na aresta. Um rodapé sem eles é um retângulo chapado em qualquer página que não tenha um bloco escuro logo acima.
- **Do** manter os ícones como SVG próprio em `currentColor`, traço fino — nunca um pacote de ícones ou uma fonte de ícones.

### Don't:
- **Don't** reutilizar o vermelho de alerta (#E63946) fora de desconto/urgência — nunca em navegação, título de secção ou qualquer acento de marca ("The Promo-Only Rule").
- **Don't** deixar a loja parecer um armazém frio e corporativo — o anti-referência do PRODUCT.md ("retalho frio e corporativo") significa manter cantos generosos (18px nos cartões, pílula nos distintivos) e tom de copy próximo, mesmo nas páginas mais funcionais (checkout, conta).
- **Don't** introduzir uma terceira família tipográfica, nem para números nem para código — Bricolage Grotesque e Figtree, e mais nenhuma.
- **Don't** repetir o par Fraunces + Nunito Sans (serifa editorial + sans humanista) nem qualquer combinação parecida — foi identificado como "cara de IA" e substituído por esta mesma razão.
- **Don't** pôr um kicker ou sobretítulo em maiúsculas acima de um `h2`. O de "Ofertas desta semana" foi removido e a chave de tradução apagada: o título carrega-se a si próprio, e o rótulo por cima é mobília a fingir hierarquia.
- **Don't** usar o dourado sobre branco. À opacidade a que funciona dentro da clareira, sobre branco desaparece — foi assim que um filete divisório dourado acabou invisível numa faixa branca. Dourado é cor para dentro do escuro.
- **Don't** encostar duas faixas de floresta tentando fazê-las passar por uma só. Ou é uma superfície com a sua luz, ou é a outra; blocos escuros consecutivos com gradientes próprios deixam um degrau visível em cada junção, e apagar o gradiente de um deles tira-lhe a luz nas páginas onde ele está sozinho.
- **Don't** deixar as imagens geradas do seed voltarem a matizes escolhidos ao acaso. Numa grelha de catálogo inteira, dez matizes arbitrários (roxo, azul, vinho) são uma parede de amostras de cor que anula a paleta da loja; distinguem-se por valor dentro da família da clareira, e saem todas no dia em que houver fotografia.
