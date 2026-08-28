# Linguagem visual premium — desenho

**Data:** 2026-08-28
**Estado:** aprovado (sete secções), pronto para plano de implementação

## Objetivo

A loja tem de ler como premium e sofisticada, mas continuar chamativa. O
diagnóstico é que o problema não é falta de trabalho — a camada de movimento e
os detalhes de acessibilidade estão acima da média — é **excesso de
vocabulário**: cinco dialetos estéticos ao mesmo tempo, com o mais barato (o
cartaz promocional em dez camadas) no topo da página a ditar o tom.

A direção escolhida é **Clareira**: verde-floresta profundo como cor de marca,
papel creme, um único acento quente. Sem dourado metálico, sem brilho, sem
gradientes lustrosos. O «chamativo» passa a vir de escala tipográfica, blocos
de cor grandes e fotografia coerente — nunca de efeitos.

## Regra que atravessa tudo

**Uma cor, uma função. Um gesto, uma página. Nenhuma letra dentro de imagem.**

---

## 1. Sistema de cor: 19 tokens → 9

`apps/web/tailwind.config.ts`

| Token | Valor | Função única |
|---|---|---|
| `floresta.900` | `#0A1A06` | chão de marketing (o mais fundo) |
| `floresta.800` | `#0D2305` | blocos de campanha |
| `ink` | `#18352A` | texto |
| `ink-muted` | `#4F685F` | texto secundário |
| `papel` | `#F7F5EF` | superfície tingida, fundo de imagem, texto sobre floresta |
| `terracota` | `#E0623A` | **só ação**: CTA, foco, estado ativo |
| `terracota.dark` | `#C44A24` | a mesma ação, pressionada |
| `sage` | `#6F8F72` | detalhe botânico, divisórias |
| `line` | `rgba(111,143,114,0.18)` | bordas hairline |

Três destes **mudam de valor**, não só de nome:

- `terracota` passa de `#F2703A` para `#E0623A` — o laranja atual é o do
  `botao.png`, saturado para chamar a atenção num banner. Contido, continua a
  ser o acento mais forte da página sem ser o mais barulhento.
- `floresta` passa de `#0D2305`/`#061003` para `#0D2305`/`#0A1A06` — o fundo
  mais escuro reabre ligeiramente, porque `#061003` é quase preto e mata a
  leitura de que é uma clareira.
- `papel` colapsa duas cores hoje distintas: `cream` (`#F7F5EF`) e `creme-luz`
  (`#FDF1D4`). Estão a menos de 3% de distância percetual e serviam a mesma
  função em superfícies diferentes; duas fichas só para as distinguir é
  vocabulário a mais.

### Tokens que morrem, e o que fica no lugar

| Morre | Onde está hoje | Substituto |
|---|---|---|
| `dourado`, `dourado-forte` | `page.tsx` (marcas), `AprovadoPorQuemManda.tsx` (ring + assinatura) | `papel/60` no texto; `line` no ring |
| `sol` | só nos gradientes de `globals.css` e `Header.tsx` | removido com os gradientes |
| `creme-luz` | `globals.css`, `Footer`, `Header`, `AprovadoPorQuemManda`, `page.tsx` | renomeado para `papel` |
| `promo`, `promo.dark`, `promo.soft` | `ProductCard.tsx` (badge), `Carrossel.tsx` (selo) | badge de desconto passa a `floresta.800` com texto `papel` |
| `sage.soft` | `Price.tsx` (pill «Poupas») | a pill é removida (ver §4) |
| `terracota.strong` | sem uso | removido |
| `cream` | vários | renomeado para `papel` (um nome só para a mesma cor) |
| `.filete-dourado` | `page.tsx`, `globals.css` | `hr` em `line` sobre claro; nada sobre floresta |

O desconto deixar de ser vermelho é deliberado: o vermelho puro é a cor do
saldo de fim de estação, e destaca-se pior sobre fotografia clara do que um
floresta sólido. O dourado metálico é o que mais atraiçoa a gama — é a cor dos
banners de casino.

### Raio: 5 vocabulários → 3

Hoje: `rounded-lg` (33×), `rounded-card` (23×), `rounded-full` (14×),
`rounded-xl` (6×), `rounded-2xl` (1×).

| Token | Valor | Uso |
|---|---|---|
| `campo` | `10px` | inputs, botões de ícone, chips de navegação |
| `card` | `14px` | cartões, folhas, diálogos |
| `full` | — | pills e botões de ação |

`rounded-lg` → `rounded-campo`. `rounded-xl` e `rounded-2xl` → `rounded-card`.

### Sombra: 3 → 2

`sm` (repouso, quase invisível) e `md` (elevação em hover). `shadow-floresta`
desaparece com os cartões sobre floresta, que passam a distinguir-se por
superfície (`white/[0.055]`) e hairline, não por sombra preta.

---

## 2. Botão: matar o comprimido lustroso

`apps/web/src/styles/globals.css`

O `.botao-principal` atual é um gradiente de três paradas + `inset` highlight +
sombra laranja + `brightness/saturate` no hover. É a peça que mais denuncia a
gama — linguagem de widget de 2011, amostrada do `botao.png` do pacote de arte.

```css
.botao-principal {
  @apply inline-block rounded-full px-6 py-3 text-center font-semibold text-white;
  background-color: theme('colors.terracota.DEFAULT');
  transition: background-color 180ms var(--curva);
}
.botao-principal:hover  { background-color: theme('colors.terracota.dark'); }
.botao-principal:active { transform: translateY(1px); }
.botao-principal:disabled { @apply cursor-not-allowed opacity-45; }
```

Três variantes e mais nenhuma:

- **principal** — terracota chapado (acima)
- **secundário** — `.botao-contorno`: fundo transparente, borda `line`, texto `ink`
- **terciário** — link com `underline underline-offset-4`

Os 13 usos de `.botao-principal` (carrinho, checkout, conta, favoritos,
encomendas, catálogo, filtros, barra mobile, adicionar ao carrinho) não mudam
de nome — só a matéria por baixo.

---

## 3. Tipografia: as fontes ficam, a escala nasce

`Bricolage Grotesque` + `Figtree` mantêm-se — já auto-alojadas por
`next/font`, e a Bricolage tem carácter próprio. O que falta é disciplina.

```
display  clamp(2.75rem, 6vw, 5.5rem)   tracking -0.03em   herói
titulo   clamp(1.75rem, 3vw, 2.75rem)  tracking -0.02em   h2 de secção
secao    1.5rem                        tracking -0.01em   h3
corpo    1rem / 1.6                    tracking 0         max-w-[62ch]
eyebrow  0.6875rem                     tracking 0.14em    uppercase
```

Regras:

- **Bricolage nunca abaixo de 24px.** Em corpo pequeno não lê como display,
  lê como irregular.
- `text-3xl sm:text-4xl` escrito à mão em cada secção desaparece: passa a
  `text-titulo`.
- **Um token de espaço de secção**: `py-secao` = `clamp(4rem, 9vw, 8rem)`,
  em vez de `py-16 sm:py-20` repetido.
- `tabular-nums` em todo o dinheiro e contagem (`Price`, `Totais`, `Estrelas`,
  contagem de produtos).

---

## 4. Cartão de produto: um sinal por cartão

`apps/web/src/components/ui/ProductCard.tsx`, `Price.tsx`, `Estrelas.tsx`

- **Imagem 4:5** em vez de `aspect-square`. Quadrado lê como marketplace;
  4:5 lê como editorial.
- **Borda hairline sem sombra em repouso.** No hover só a imagem escala
  `1.03` (era `1.06`) e entra `shadow-md`. **O cartão não translada** — o
  `y: -6` atual lê como salto, não como elevação.
- **Um só badge**: desconto em `floresta.800` com texto `papel`, canto
  superior esquerdo. O badge «Esgotado» mantém-se (é informação, não
  promoção), mas nunca aparecem os dois — um produto esgotado não anuncia
  desconto.
- **Sai a pill «Poupas X»** de `Price.tsx`: repete o que o preço riscado já
  diz, e era a única aparição de `sage.soft` no site. Três pills de três
  cores num cartão de 300 px é ruído.
- **Estrelas em SVG** (sprite existente), não `★☆` em Unicode — que renderiza
  diferente em cada sistema operativo e parece rascunho.
- Marca no eyebrow em `ink-muted`, não `sage`.

---

## 5. Movimento: um gesto por página, zero loops

A execução técnica de `components/motion` mantém-se intacta — `useMotion` como
único sítio onde `prefers-reduced-motion` é lido, `gsap.from` a partir do
estado final, ouvintes delegados no contentor, `IntersectionObserver` a parar
loops fora do ecrã. É a **tese** que inverte.

### Vocabulário fechado

```
--curva: cubic-bezier(0.16, 1, 0.3, 1)   /* uma só, promovida do Carrossel */
180ms  interação de UI
420ms  entrada de conteúdo
700ms  o gesto do herói
```

### Cortar

- **Os três loops do cartaz** saem com o próprio cartaz, na fase 3
  (`BannerCampanha.tsx` inteiro): aves a respirar, rasgo de luz a cada 5 s, e o
  botão a pulsar `scale 1.06` com `elastic.out`. Um CTA que pulsa sozinho é a
  assinatura visual de anúncio, e o herói novo (bloco + foto) não tem camadas
  para animar em loop.
- **`AberturaDaLoja`** e o módulo `chegada.ts`: a «porta a abrir» atrasa o
  herói 520 ms a cada carregamento e vê-se uma vez com graça, dez com
  irritação. Sai o componente, sai `atrasoDeEntrada()` de `BannerCampanha`,
  e `layout.tsx` deixa de o envolver.
- **`Reveal` como decoração universal** (`page.tsx`, ficha de produto): o
  fade-up em cinco secções por página é o movimento de qualquer template.
  Sai o componente e o ficheiro — sem uso, é código a manter por nada. Se
  voltar a ser preciso, são doze linhas.
- **`Carrossel`**: hoje recebe um slide só, e um carrossel de um item não é um
  carrossel. Todo o ramo `SlideEditorial` (setas, pontos, avanço automático,
  gradiente de borda, `GRADIENTES_BORDA`, `CORES`) é código morto — o herói
  novo entra direto em `page.tsx`.

### Manter e apertar

- **Cascata da grelha** (`CascataProdutos`): `y: 12` (era 24), `stagger`
  `amount: 0.35`, e a proteção por caminho já existente mantém-se.
- **Hover das categorias** (`PalcoCategorias`): é o gesto assinado do site.
  Com a cena passar a uma só camada (§7), o animal já não sai da moldura —
  passa a zoom contido de `1.04` com a legenda a subir.

### Acrescentar — um só

No herói, a fotografia é descoberta por máscara da direita (`clip-path`)
enquanto o número grande se revela. 700 ms, uma vez, nunca repete.

---

## 6. Header e ritmo da página

### Header: três andares → dois

`apps/web/src/components/layout/Header.tsx`

A faixa de aviso escura com radial de sol e fio dourado passa a **uma linha
discreta**: fundo `papel`, texto `ink-muted`, sem gradiente, sem `after`
dourado. Hoje são ~160 px de cromo antes do primeiro conteúdo.

### Ritmo: alternar larguras

Hoje toda a home é `max-w-7xl px-6 py-16`. Quatro secções idênticas seguidas
não têm ritmo, e ritmo é metade do efeito premium. A home passa a:

```
herói               full-bleed
categorias          max-w-7xl
ofertas             max-w-7xl
escolhas da casa    max-w-3xl   ← a secção que respira
testemunhos         full-bleed, floresta
marcas + rodapé     full-bleed, floresta contínua (já feito)
```

---

## 7. Pacote de arte: o que sai e o que se gera

### Aposentar — ≈5 MB, e todos são texto ou UI

`promocao.png` · `desconto.png` (1 MB só de algarismos) ·
`em-toda-a-loja.png` (973 KB) · `botao.png` · `frete.png` ·
`banner/logo.png` · as três `ave-*.webp`

Passam a HTML: ficam traduzíveis (hoje `/de` vê «Promoção» e «FRETE GRÁTIS
acima de 50€» em português — é um defeito funcional, não estético), nítidas em
qualquer ecrã, e custam zero bytes.

### Aproveitar

`banner/fundo.webp` — a melhor peça do pacote (luz lateral, chave baixa,
verdes contidos). Serve de **referência de estilo** para tudo o que for gerado.

### Briefing de geração

**Regra 0: nenhuma imagem contém texto, logo, botão, selo ou preço.**

| Parâmetro | Especificação |
|---|---|
| Luz | **uma só direção**, lateral ou lateral-traseira, hora dourada suave. Nunca flash frontal |
| Exposição | chave média-baixa; sombras com detalhe; **HDR/clarity desligados** |
| Saturação | baixa a média; verdes dessaturados; nada de laranja fluorescente |
| Profundidade | equivalente a f/2.8–4 — o fundo lê-se. **Não** bokeh de f/1.2 |
| Coerência | as 5 categorias saem no mesmo lote, mesma seed de estilo, mesma hora do dia |
| Ficheiro | WebP q80, largura máx 2400 px, < 300 KB cada |

### Inventário

1. **Herói de campanha** — 16:9 (2400×1350) + 4:5 (1200×1500). Cena com
   animal, sem texto. A metade esquerda pode ser qualquer coisa: o bloco de
   cor cobre-a.
2. **5 cenas de categoria** — 4:5 (1200×1500), **numa só camada**: o animal já
   dentro da cena, com sombra de contacto real. Substitui os pares
   `fundo.webp` + `animal.webp` e elimina de uma vez os três defeitos dos
   cutouts (halo, ausência de sombra de apoio, luz que não casa).
3. **4 retratos** para «Aprovado por quem manda» — 1:1, mesma luz. Substituem
   as fotografias Unsplash de `lib/fotosMarketing.ts`, que ficam sem uso e o
   ficheiro é removido.

### Checklist de rejeição

Rejeitar e regerar se: houver halo no contorno · o animal não tiver sombra de
apoio · os olhos tiverem brilho artificial · o pelo tiver textura plástica ·
houver duas fontes de luz · a vinheta for visível · aparecer qualquer letra.

---

## Herói novo: bloco + foto

`apps/web/src/components/marketing/` — substitui `BannerCampanha.tsx`

```
DESKTOP                              MOBILE
┌──────────────┬───────────────┐     ┌──────────────┐
│██ floresta ██│               │     │  fotografia  │
│██            │  fotografia   │     ├──────────────┤
│██ 30%        │  a sangrar    │     │██ 30%        │
│██ EM TODA    │               │     │██ EM TODA    │
│██ A LOJA     │               │     │██ A LOJA     │
│██ [CTA]      │               │     │██ [CTA]      │
└──────────────┴───────────────┘     └──────────────┘
```

- Todo o texto em HTML, traduzido. O tipo **nunca** assenta sobre fotografia.
- Duas imagens (`16:9` e `4:5`) via `<picture>` ou `sizes`, ambas `priority`.
- Movimento: a fotografia descobre-se por máscara da direita e o número
  revela-se — 700 ms, uma vez. Parallax opcional de 8 px na foto; o bloco de
  cor não se move.

---

---

## 8. O design system declarado tem de ser reescrito

`apps/web/DESIGN.md` e `apps/web/.impeccable/design.json` são a fonte de
verdade escrita do sistema. Não são documentação passiva: têm regras nomeadas,
e uma delas é a **causa** do problema que este desenho corrige.

### A regra que se inverte

> **The Sampled-Palette Rule.** As cores da clareira (`floresta`, `dourado`,
> `creme-luz`, `sol`) saíram do pacote de arte em `public/banner/`, medidas do
> ficheiro. Se a campanha mudar de arte, estes tokens re-amostram-se da arte
> nova.

É esta regra que trouxe o dourado metálico, o `sol` e o botão lustroso para
dentro do sistema — o `.botao-principal` é literalmente uma amostra do
`botao.png`. Um sistema que herda a paleta de um cartaz promocional herda
também a gama desse cartaz.

**Passa a:** a marca dita a arte, não o contrário. A paleta é fixa (§1) e a
arte gerada obedece-lhe (§7). Uma campanha nova encaixa na paleta; não a
substitui.

### Regras que caem

| Regra do DESIGN.md | Estado |
|---|---|
| **The Sampled-Palette Rule** | invertida (acima) |
| «O botão é a ponte» — o comprimido laranja lustroso do cartaz nas duas metades | revogada: botão chapado (§2) |
| **The Promo-Only Rule** — vermelho exclusivo para desconto | revogada: o vermelho sai do sistema; desconto passa a floresta (§1, §4) |
| **The Never-Flat Rule** — nada rasante ao fundo, `shadow-sm` sempre | revogada: cartão em repouso é hairline sem sombra (§4) |
| **The Punctual Cream Rule** — creme só em bocados | relaxada: `papel` passa a poder tingir uma secção inteira (§6) |
| Estrelas em glifo `★`/`☆` a terracota | revogada: SVG do sprite (§4) |

### Regras que ficam, reforçadas

- **The Two-Floors Rule** — branco onde se compra, floresta onde se persuade.
  É a melhor decisão do sistema atual e o desenho novo assenta nela.
- **The Two-Family Rule** — Bricolage Grotesque + Figtree, e mais nenhuma.

### Dessincronizações já existentes, a corrigir na reescrita

O documento e o código já divergem, o que confirma que precisa de passagem:

- `button-primary` documentado como `rounded: xl` (12 px) e «fundo terracota»;
  o código real é `rounded-full` com gradiente laranja de três paradas.
- `rounded.lg` documentado como 8 px; o Tailwind não o redefine, logo o real
  é 8 px por omissão do Tailwind — coincidência, não decisão.
- A textura de patas em marca de água (`data:` SVG a 5%) está documentada como
  componente de assinatura e não existe em nenhum ficheiro do `src`.

A reescrita do `DESIGN.md` e do `design.json` é **a última tarefa do plano**,
não a primeira: escrito antes, documenta intenção; escrito depois, documenta o
que existe.

## Fronteiras e testes

O trabalho é quase todo de apresentação, e a camada de dados não é tocada:
`modules/catalog`, `modules/cart`, `modules/account` e os testes que já têm
(`facets`, `filters`, `preco`, `avaliacoes`, `pesquisa`, `carrinho`,
`richtext`, `sanitize`) ficam intactos.

O que precisa de verificação:

- `i18n/messages.test.ts` — as chaves novas do herói (manchete, subtítulo,
  CTA, aviso de envio) têm de existir em `pt.json` **e** `de.json`. É este
  teste que garante que a campanha deixa de ser português dentro de imagem.
- Um teste de tokens seria teatro; a verificação certa é `grep` a zero para os
  tokens mortos: `dourado`, `promo`, `creme-luz`, `sage-soft`,
  `filete-dourado`, `cream`, `shadow-floresta`, `rounded-xl`, `rounded-2xl`.
- `prefers-reduced-motion` continua a ser lido só em `useMotion`. Com os loops
  e a abertura fora, a página sem JavaScript e a página com movimento reduzido
  passam a ser a mesma coisa — o que é o objetivo.

## Ordem de execução

O faseamento é deliberado: cada fase deixa o site funcional e visivelmente
melhor, e nenhuma depende de imagens que ainda não existam.

1. **Tokens, botão, tipografia, raios, sombras** — invisível na estrutura,
   imediato na percepção. Não depende de arte nenhuma.
2. **Cartão de produto e grelha** — 4:5, um badge, estrelas em SVG, sem pill.
3. **Herói novo** + aposentar as seis peças de texto do pacote. Enquanto as
   imagens novas não chegarem, usa `banner/fundo.webp` como fotografia.
4. **Categorias em cena única** (depende do inventário §7.2) + hover novo.
5. **Movimento consolidado** — `AberturaDaLoja` + `chegada.ts`, `Reveal`,
   `Carrossel`, a cascata apertada e a curva única em token. (Os loops do
   cartaz já caíram na fase 3, com o componente.)
6. **Header e ritmo da home.**
7. **Reescrever `DESIGN.md` e `.impeccable/design.json`** para o sistema que
   passou a existir (§8).

Fases 1, 2, 5 e 6 não esperam por imagem nenhuma.
