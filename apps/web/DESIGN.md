---
name: Animora
description: Loja de animais de estimação para o mercado português — fundo quase-branco, laranja como única ação, teal como estrutura. Substitui "A Clareira e o Balcão" (2026-08-28).
colors:
  bg: "#FFFDFC"
  surface: "#FFFFFF"
  cream: "#FDF3EC"
  orange: "#F57C00"
  orange-hover: "#E96F00"
  orange-deep: "#B85800"
  teal-900: "#085B6B"
  teal-700: "#0F6F78"
  aqua: "#00B4B0"
  text: "#103F46"
  text-muted: "#647679"
  border: "#E8ECEC"
  success: "#1F8A5B"
  danger: "#C84444"
typography:
  display:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontWeight: 400
  script:
    fontFamily: "Caveat, cursive"
    fontWeight: 500
rounded:
  sm: "10px"
  md: "16px"
  lg: "22px"
  xl: "28px"
  pill: "999px"
shadow:
  card: "0 6px 24px rgba(8, 91, 107, 0.06)"
  card-hover: "0 12px 32px rgba(8, 91, 107, 0.10)"
  drawer: "0 20px 60px rgba(0, 0, 0, 0.16)"
---

# Design System: Animora

## 1. Overview

**Direção atual: identidade laranja/teal.**

Substitui por completo "A Clareira e o Balcão" (verde-floresta/terracota,
Bricolage Grotesque/Figtree — ver `git log` para o histórico, e
`docs/superpowers/specs/2026-08-28-linguagem-visual-premium-design.md`
para a spec original, mantida por registo histórico, não por vigor).

Origem: uma especificação técnica definitiva entregue pelo utilizador em
2026-09-18 (`docs/superpowers/specs/2026-09-18-identidade-laranja-teal-design.md`),
com paleta e tipografia próprias, executada via
`docs/superpowers/plans/2026-09-18-identidade-laranja-teal.md`. A loja
deixa de ter "dois chãos" (balcão branco / clareira escura); passa a ter
um chão só, quase-branco, com o laranja como única cor de ação e o teal
como cor de estrutura — títulos, texto de leitura, superfícies de
campanha escuras.

**Key Characteristics:**
- Fundo quase-branco (`bg` `#FFFDFC`) em toda a loja — sem faixa escura nenhuma; creme (`cream`) só em blocos pontuais de campanha.
- Laranja é a única cor de ação: se algo é laranja, é clicável ou está ativo. Teal nunca substitui essa função.
- **Regra de contraste, não negociável:** texto branco sobre laranja usa sempre `orange-deep` (`#B85800`), nunca `orange` (`#F57C00`) sozinho — branco sobre `orange` dá 2,70:1, falha WCAG AA a qualquer tamanho de texto; sobre `orange-deep` dá 4,73:1, passa. `orange`/`orange-hover` ficam para uso decorativo sem texto branco por cima (ícones, acentos, fundos claros com texto escuro).
- Três famílias tipográficas, cada uma com um papel só: Fredoka (títulos/promoções, nunca abaixo de 24px), Montserrat (interface/corpo), Caveat (manuscrito decorativo, nunca em informação funcional).
- Sombras tingidas de teal (`rgba(8, 91, 107, …)`), não preto neutro — excepto `shadow-drawer`, que cobre a página inteira e por isso fica neutra.

## 2. Colors

- **`orange` (#F57C00) / `orange-hover` (#E96F00):** a cor de marca "pura". Decorativa ou de fundo sem texto branco por cima. `orange-hover` é o estado de hover do botão principal (repouso é `orange-deep`).
- **`orange-deep` (#B85800):** repouso de qualquer superfície laranja com texto branco (botão principal, barra promocional, aba ativa de `ProductTabs`, botão de favorito ativo). Existe só por causa do contraste — nunca escolher `orange` onde `orange-deep` é exigido.
- **`teal-900` (#085B6B) / `teal-700` (#0F6F78):** estrutura — títulos, rodapé (fundo maciço), texto de contraste sobre creme, hover de links secundários.
- **`aqua` (#00B4B0):** único acento saturado fora da família laranja/teal. Usar com parcimónia — pontual, nunca em texto de leitura.
- **`text` (#103F46) / `text-muted` (#647679):** texto de leitura e o seu tom secundário. `text-muted` foi ajustado de `#6D7F82` (valor original da spec) para `#647679` durante a revisão final — o valor da spec dava 4,13:1 sobre `bg`, abaixo do 4,5:1 exigido a texto normal; `#647679` dá 4,70:1, mesmo tom frio.
- **`border` (#E8ECEC):** única cor de divisória/hairline da loja.
- **`success` (#1F8A5B) / `danger` (#C84444):** estado, nunca marca — confirmação e erro, não usados em UI de ação.

### Named Rules

**The Orange-Deep Rule.** Texto branco sobre laranja usa `orange-deep`, sempre. Nenhuma exceção, nenhuma opacidade a compensar — foi assim que a spec original chegou com o defeito (`orange` sozinho) e replicou-se em 3 sítios até a revisão final o intercetar.

**No Opacity as Hierarchy.** Um `/NN` de opacidade num token de texto é uma cor nova que não passou pela tabela — e já produziu 3 casos abaixo de AA nesta execução (`text-muted/70`, `text-white/50`, `text-teal-900/70`). Se a hierarquia tipográfica precisa de um terceiro nível, isso é um token, não uma opacidade à mão.

## 3. Typography

Fredoka (700–800, títulos/campanha) · Montserrat (400–700, interface/corpo) · Caveat (500–700, manuscrito decorativo, nunca em informação funcional). Carregadas por `next/font` em `layout.tsx`. Fredoka não tem corte de peso 800 disponível nesta versão do Next — usa-se 700.

## 4. Elevation

`shadow-card` em repouso, `shadow-card-hover` no hover de qualquer cartão — nunca uma superfície levantada sem sombra nenhuma. `shadow-drawer` é a única elevação sem tinta de marca (cobre a página inteira em overlays/modais).

## 5. Components

- **Botão principal:** repouso `orange-deep`, hover `orange` (ganha luz — o mesmo padrão do sistema anterior, só com os tokens novos). Pílula (`rounded-pill`).
- **Cartão de produto:** `rounded-lg`, `border-border`, `shadow-card` em repouso, `shadow-card-hover` no hover.
- **Superfícies de campanha:** duas variantes, nunca mais — `bg-teal-700 text-white` ou `bg-cream text-teal-900`, `rounded-xl`, sem chão escuro terceiro.
- **Rodapé:** `bg-teal-900 text-white`.

## 6. Limitações conhecidas (ver `docs/CURRENT_STATE.md` para o registo completo)

Esta execução (2026-09-18) migrou o shell (header, navegação, rodapé) e a
Home inteira para os tokens acima. **Catálogo (PLP), ficha de produto
(PDP), carrinho, checkout e conta continuam nos tokens antigos** (`ink`,
`terracota`, `sage`, `papel`, `line`, `floresta`) — como esses tokens
foram removidos do `tailwind.config.ts` sem alias, essas páginas
renderizam hoje sem cor de marca (raios, bordas e texto caem no
comportamento por omissão do Tailwind/browser). Não é um bug desta
execução — é um âmbito ainda por fazer. A loja está, deliberadamente por
agora, em duas identidades: Home nova, resto da loja antiga.
