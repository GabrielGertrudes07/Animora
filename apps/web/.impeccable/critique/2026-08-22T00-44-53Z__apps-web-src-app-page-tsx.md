---
target: home page (apps/web/src/app/page.tsx)
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-08-22T00-44-53Z
slug: apps-web-src-app-page-tsx
---
Method: dual-agent (A: design-review subagent · B: detector+browser-evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sem indicador de categoria ativa na navegação do cabeçalho |
| 2 | Match System / Real World | 4 | Nomes de categoria, tom e convenções em português europeu, sem falhas |
| 3 | User Control and Freedom | 3 | Autoplay do carrossel só pausa em `onMouseEnter`; sem equivalente por teclado/toque |
| 4 | Consistency and Standards | 3 | O kicker "Esta semana" usa `text-promo`, violando a própria "Promo-Only Rule" do DESIGN.md |
| 5 | Error Prevention | 4 | Todas as secções da home são condicionadas a dados reais — nenhum placeholder falso |
| 6 | Recognition Rather Than Recall | 3 | Sem estado ativo na navegação; preço/stock/avaliação visíveis sem clique |
| 7 | Flexibility and Efficiency | 3 | Marcas já ligam para filtro real (`/produtos?marca=`); sem adicionar-ao-carrinho rápido na grelha |
| 8 | Aesthetic and Minimalist Design | 3 | Sete secções empilhadas, cada uma com kicker+título — repetitivo |
| 9 | Error Recovery | 3 | Pouco exercitado na home; renderização defensiva evita o erro em vez de o recuperar |
| 10 | Help and Documentation | 2 | Nenhuma afordância de ajuda na home (envio/devoluções só numa slide do carrossel) |
| **Total** | | **31/40** | **Bom — base sólida, áreas fracas identificadas** |

## Anti-Patterns Verdict

**Isto parece feito por IA?** Parcialmente.

**Avaliação de design (LLM)**: Sem gradiente em texto, sem glassmorphism, sem hero-metric template, sem marcadores numerados 01/02/03, sem grelhas de cartões decorativos idênticas — as duas grelhas de produto são catálogo real, não preenchimento. **Mas** o padrão de "kicker" (etiqueta pequena em maiúsculas com tracking largo) que o próprio DESIGN.md já tinha identificado e avisado ("mais uma repetição transforma um recurso de copy num tique visual") espalhou-se de 2 para **5 instâncias** na home: "Esta semana", "Em destaque", "Por onde começar", "Voz de quem sabe", "Marcas em que confiamos". É exactamente o reflexo de scaffolding-por-omissão que a regra visava evitar. Adicionalmente, o kicker "Esta semana" usa `text-promo` (vermelho de desconto) sobre um título de secção — uma violação direta e objetiva da "Promo-Only Rule" escrita no próprio DESIGN.md, não uma leitura subjetiva.

**Scan determinístico**: limpo — zero achados nos 9 ficheiros/pastas analisados (`page.tsx`, `marketing/`, `ProductCard.tsx`, `Price.tsx`, `Estrelas.tsx`, `layout/`). Sem falsos positivos a assinalar, porque não houve achados.

**Overlays visuais**: não disponíveis nesta sessão — nenhuma ferramenta de browser (Playwright/Puppeteer/computer-use) estava exposta a nenhuma das duas avaliações; ambas confirmaram isto por `ToolSearch` antes de desistir, em vez de fabricar observações visuais. Sinal de recurso: leitura de código-fonte (classes Tailwind explícitas) em vez de renderização real — qualquer coisa que dependa de renderização real (overflow de texto num breakpoint real, contraste contra as fotos reais do carrossel) fica por confirmar.

## Overall Impression

A base é sólida: paleta disciplinada, secções sempre guardadas por dados reais, motion que respeita `prefers-reduced-motion` de forma estrutural. O problema não é a arquitetura, é a disciplina de repetição — o kicker que o próprio sistema de design já tinha avisado para não generalizar generalizou-se mesmo assim, e arrastou consigo uma violação real de uma regra de cor escrita. A maior oportunidade única: cortar o kicker para 1-2 secções que precisam mesmo de etiqueta, e devolver à página uma hierarquia visual que hoje está achatada por repetição.

## What's Working

1. **Guardas de conteúdo real em toda a home.** `ofertas`, `categorias`, `destaques`, `marcas` e a avaliação da loja só renderizam com dados reais — nunca um placeholder falso ou "brevemente". É o princípio "nunca um beco sem saída" do PRODUCT.md implementado, não só declarado.
2. **`AprovadoPorQuemManda` é humor de marca com disciplina.** Citações assinadas por animais de estimação (não "cliente verificado") respeitam a doutrina de "não se inventam avaliações" e ainda assim trazem humor — exactamente a personalidade "humor comedido" a funcionar.
3. **Motion acessível por construção.** `Reveal` e `CascataProdutos`, incluindo o autoplay do carrossel, obedecem a uma única regra global de `prefers-reduced-motion` — não foi acrescentada componente a componente.

## Priority Issues

**[P1] O padrão de kicker ultrapassou o próprio aviso do DESIGN.md, e uma instância viola a Promo-Only Rule**
- **Porque importa**: 5 instâncias na mesma página é o exacto reflexo de scaffolding que o "absolute ban" da eyebrow tracked-uppercase existe para evitar; achata a hierarquia visual (nada sinaliza "esta secção importa mais"), e o "Esta semana" a vermelho de alerta contradiz uma regra de marca escrita.
- **Fix**: manter o kicker só onde a etiqueta é mesma necessária (ex.: "Ofertas desta semana"), recorindo a `terracota` em vez de `promo` aí; as outras quatro secções ficam só com título + uma linha de apoio.
- **Comando sugerido**: `/impeccable typeset`

**[P1] Os pontos de paginação do carrossel são o único controlo manual em mobile e falham a regra dos 44px**
- **Porque importa**: PRODUCT.md fixa "alvos de toque a 44px mínimo" como compromisso formal de acessibilidade; os pontos são `h-2`/`h-2 w-6` sem preenchimento, e as flechas ficam `hidden` abaixo de `sm` — o elemento interativo mais visível da página falha a própria regra do projeto, precisamente para a persona mobile.
- **Fix**: envolver cada ponto numa área de toque invisível de `min-h-[44px] min-w-[44px]` (o ponto visível continua pequeno), e considerar suporte a swipe em toque.
- **Comando sugerido**: `/impeccable adapt`

**[P2] O envio grátis só existe numa slide do carrossel autoplay**
- **Porque importa**: um comprador orientado a tarefa (a persona do próprio PRODUCT.md) que age sobre a slide 1 ou 2 nunca vê esta reassurance — é o sinal de confiança mais forte da página e está escondido por rotação.
- **Fix**: fixar como faixa persistente (sub-barra do cabeçalho ou linha sob o carrossel), independente da rotação de slides.
- **Comando sugerido**: `/impeccable layout`

**[P2] `bg-cream/40` cobre uma secção inteira ("Escolhas da casa"), tensionando com a Punctual Cream Rule**
- **Porque importa**: DESIGN.md é explícito — creme é para superfícies pequenas e pontuais (barra de pesquisa, folha de filtros), nunca uma superfície à escala da página; esta secção é à escala da página.
- **Fix**: remover o tom (branco, como a secção "Ofertas" acima) ou substituir por um `border-t` fino para separar, sem cor de fundo.
- **Comando sugerido**: `/impeccable colorize`

**[P3] A página termina no conteúdo mais "plano", desperdiçando o efeito peak-end**
- **Porque importa**: a ordem de scroll acaba em lista de marcas → rodapé de duas linhas, logo depois da secção mais calorosa (testemunhos de animais) e da avaliação real — a última impressão fica mais fria que o resto da página.
- **Fix**: fechar com uma linha curta, no mesmo tom de voz, mais um CTA para o catálogo, reaproveitando copy já existente.
- **Comando sugerido**: `/impeccable delight`

## Persona Red Flags

**Comprador orientado a tarefa, primeira visita (persona do próprio PRODUCT.md)**: o limiar de envio grátis está escondido numa slide que pode nunca alcançar antes de clicar para fora; o rodapé não tem nenhum sinal de confiança (envio/devoluções/contacto); os testemunhos de animais ficam imediatamente acima da avaliação real — um leitor rápido pode ler a piada como avaliação real e depois duvidar da avaliação real por causa da sequência.

**Utilizador mobile (Casey)**: os pontos do carrossel são o único controlo manual e falham os 44px; sem suporte a swipe/arrastar, apesar de ser o gesto natural em toque; a navegação de categorias no cabeçalho tem scroll horizontal sem qualquer sinal (sombra na margem, seta) de que há mais categorias fora do ecrã.

**Utilizador dependente de acessibilidade (Sam)**: o autoplay do carrossel só pausa em `onMouseEnter` — um utilizador de teclado ou leitor de ecrã não tem forma de o pausar a meio da interação, só `prefers-reduced-motion` o desliga por completo, o que não é o mesmo que "o utilizador pausou".

## Minor Observations

- `tailwind.config.ts` ainda tem um comentário desatualizado a referir "Fraunces, serifa suave" e "Nunito Sans" (linhas 21-23), apesar de as fontes reais carregadas serem Bricolage Grotesque + Figtree — inofensivo para a interface, mas confunde o próximo a ler o ficheiro de tokens, e é irónico dado ser exactamente o comentário sobre a correção do "cara de IA".
- O grid de categorias visuais chega a 5 colunas em `lg` — um acima do tecto de 4 recomendado para grupos, severidade baixa por ser uma grelha scanável, não uma lista de decisão.
- "Marcas em que confiamos" não tem estratégia de overflow/limite se o catálogo de marcas crescer muito.

## Questions to Consider

- Se o kicker já ultrapassou o próprio aviso do DESIGN.md num ciclo de revisão, a correção são cinco instâncias de contenção manual, ou o padrão em si é demasiado fácil de usar — deveria existir como componente reutilizável, em vez de ser escrito por secção só quando o título precisa mesmo de desambiguação?
- A home tem cinco mecanismos de confiança diferentes espalhados (avaliação real, humor de testemunho, lista de marcas, linha de envio grátis, guardas de estado vazio) e nenhum é decisivo por si só — a página está a tentar tranquilizar em pequenas doses, em vez de se comprometer com uma faixa de confiança persistente?
- Dado que o PRODUCT.md diz que os utilizadores chegam com uma tarefa concreta, não a navegar por lazer, um carrossel autoplay de 3 slides — o padrão mais sujeito a "banner blindness" do e-commerce — serve mesmo essa persona, ou serve mais o reflexo de "páginas iniciais têm herói"?
