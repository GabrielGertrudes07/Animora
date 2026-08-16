# Camada de Retalho — Especificação de Desenho

**Data:** 2026-08-16
**Estado:** desenho aprovado pelo utilizador, pronto para plano de implementação
**Âmbito:** camada de apresentação da loja + duas peças de dados novas (pesquisa, avaliações)

---

## 1. O problema

A loja funciona, é indexável, tem carrinho e encomendas. Mas **não parece uma loja**. O utilizador abriu-a e disse: *"não parece um ecommerce, não chama atenção."*

Tem razão, e a comparação que dói é com o site que substituímos: **o site antigo tinha mais sinais de retalho do que este.**

| Sinal | Site antigo | Hoje |
|---|---|---|
| Barra de pesquisa | sim, ao centro do cabeçalho | **não existe** |
| Avaliações com estrelas | sim | não |
| Selo de desconto em percentagem | sim (`−25%`) | só preço anterior riscado |
| Barra de confiança | sim (garantia, envio, troca) | não |
| Adicionar ao carrinho na grelha | sim | só dentro da ficha |
| Favoritos visíveis no cartão | sim | não |
| Urgência de stock | parcial | não |

Reconstruímos a arquitetura corretamente e perdemos pelo caminho as afordâncias que fazem uma loja parecer uma loja.

**A causa visual:** muito espaço branco, títulos em serifa, paleta suave, densidade baixa. Essa linguagem é editorial — revista, portfólio, agência. Retalho é o oposto: densidade, preço em destaque, distintivos, prova social, ação imediata.

## 2. Referência e decisão

O utilizador escolheu explicitamente **"loja que vende"** — Zooplus, Maxizoo — em vez de "loja bonita de marca". Feia mas eficaz, desenhada para converter.

Escolheu a **abordagem A**: reconstruir a camada de apresentação para retalho, mantendo a arquitetura, a paleta e o código. Não é identidade nova de raiz; é o mesmo verde escuro `#18352A`, terracota `#D9825B` e creme `#F7F5EF`, aplicados com densidade e hierarquia de retalho.

**Confirmado:** vai haver **fotografia real de produto**. O desenho assume-a. Os retângulos coloridos do seeder são marcador temporário e não devem condicionar decisões de desenho.

## 3. Três limites que não se ultrapassam

Estas lojas convertem com truques que, aplicados a sério, são mentira. O utilizador vai vender este site a outra pessoa; o que aqui ficar, fica no negócio dela.

**1. Avaliações não se inventam.** O modelo existe e a demonstração tem avaliações semeadas, mas numa loja real elas **ficam escondidas até haver reais**. Estrelas fabricadas são falsificação de prova social.

**2. Urgência só quando é verdade.** "Restam 3" aparece apenas com stock ≤ 5 a sério. Nada de contadores regressivos nem de "17 pessoas a ver este produto".

**3. "Mais vendidos" vem das vendas.** Calculado das encomendas reais. Sem vendas suficientes, cai para os mais recentes — e diz que são recentes. Uma loja nova não tem mais vendidos.

---

## 4. O cartão de produto

É o átomo de tudo: a grelha, a home e a categoria são cartões arrumados. É aqui que se decide se aquilo parece loja.

**Hoje tem 4 informações.** Passa a ter 9.

```
┌─────────────────────┐
│ -25%          ♥     │  selo de desconto · favorito
│                     │
│      [foto]         │
│                     │
├─────────────────────┤
│ HAPPYPAWS           │  marca, pequena, maiúsculas
│ Coleira ajustável   │  título, máximo 2 linhas
│ ★★★★☆ (218)         │  avaliação · contagem
│ 29,90 €  39,90 €    │  preço grande terracota · anterior riscado
│ Restam 3            │  urgência, só quando stock ≤ 5
│ [ Adicionar ]       │  ação direta
└─────────────────────┘
```

### Decisões

**O preço é o elemento mais forte do cartão**, maior que o título. Hoje o título domina. Quem varre uma grelha compara preços, não lê nomes.

**Adicionar ao carrinho a partir da grelha.** Produtos com variantes (tamanho, cor) não podem ser comprados sem escolher — nesses o botão diz **"Escolher opções"** e abre a ficha. Um botão que às vezes compra e às vezes navega tem de dizer qual dos dois faz.

**Densidade:** 5 cartões por linha em ecrã grande (hoje 3), 2 em telemóvel. É o que faz a página parecer catálogo em vez de galeria.

**O selo de desconto é calculado**, não escrito: `round((anterior − atual) / anterior × 100)`. Só aparece com preço anterior maior que o atual.

---

## 5. Cabeçalho e barra de confiança

Três faixas, como as lojas da referência:

```
┌────────────────────────────────────────────────────────────┐
│ Entrega 24h · Garantia 24 meses · Troca fácil    Suporte   │  promessas
├────────────────────────────────────────────────────────────┤
│ [logo]   [ Procura ração, coleiras, brinquedos…    🔍 ]     │  pesquisa
│                          ♥ Favoritos   Conta   🛒 Carrinho │
├────────────────────────────────────────────────────────────┤
│ Cães  Gatos  Pássaros  Roedores  Aquário  …   ⚡ Promoções │  categorias
└────────────────────────────────────────────────────────────┘
```

### A pesquisa (peça de dados nova)

Procura em **título, marca e categoria**. Vive na URL — `/produtos?q=coleira` — logo é partilhável, indexável e sobrevive ao botão "voltar", como os filtros já fazem.

Sugestões enquanto se escreve ficam para depois. Uma pesquisa que funciona vale mais que uma que adivinha.

### A barra de confiança

Volta, e aparece **duas vezes**: no topo como promessas curtas, e no fim da home como bloco com ícones. Responde a *"posso confiar nestes?"* antes e depois de olharem para os produtos.

### Envio grátis sobe ao cabeçalho

A regra existe desde a fase 1 e só aparece no carrinho — quando a pessoa já decidiu. Em cima, muda o que ela põe no cesto.

### Barra de topo: promessas ou promoção

Por omissão, as promessas. Quando houver campanha ativa, a promoção substitui-as. Implica um sítio no painel para a criar — ver §6.

---

## 6. A home

**A mudança que mais pesa:** o herói deixa de ser declaração de marca e passa a ser **uma oferta**.

```
┌──────────────────────────────────────────────────────────┐
│  [foto grande]        RAÇÃO ATÉ −30%                     │
│                       Marcas premium para cão e gato,     │
│                       entrega em 24h                      │
│                       [ Ver promoções ]                   │
│                       Envio grátis acima de 50 €          │
└──────────────────────────────────────────────────────────┘

  Cães   Gatos   Pássaros   Roedores   Aquário   Higiene      com imagem

  MAIS VENDIDOS                                  ver todos →
  [5 cartões]

  EM PROMOÇÃO                                    ver todos →
  [5 cartões com selo]

  ┌ Garantia 24 meses ─ Entrega 24h ─ Troca fácil ─ Pagamento seguro ┐
```

### Decisões

**O herói é gerido no painel** — imagem, título, subtítulo, texto do botão e destino. Uma loja muda campanha todas as semanas; mudar campanha não pode implicar mudar código.

**"Mais vendidos" vem das encomendas reais.** Sem vendas suficientes, mostra os mais recentes **e diz que são recentes** — não finge.

**As categorias ganham imagem.** Hoje são cartões brancos com nome e seta. Numa loja de animais, uma foto de cão diz mais que a palavra "Cães", e é onde a fotografia real rende mais por metro quadrado.

### O que fica de fora, de propósito

- **Carrossel automático** — ninguém carrega, atrasa a página, é mau para acessibilidade
- **Contador regressivo** — urgência inventada
- **"Outros clientes também compraram"** — precisa de histórico de compras que não existe; inventá-lo seria a terceira mentira da lista

---

## 7. Peças de dados novas

### Pesquisa

Consulta sobre `products` por título, marca e categoria. Sem motor externo, sem índice dedicado — o Postgres do Payload chega para este catálogo. Se um dia deixar de chegar, o caminho é um índice de texto completo, e a fronteira já está isolada no módulo `catalog`.

### Avaliações

Coleção `reviews`: produto, cliente, estrelas (1–5), texto, data, estado de moderação.

No cartão e na ficha mostra-se **média e contagem**, calculadas das aprovadas. **Sem avaliações, não se mostra nada** — não "0 estrelas", não "sem avaliações ainda" em cinzento. Ausência silenciosa.

O seeder cria avaliações para a demonstração. Numa instalação real, começam a zero.

---

## 8. O que não muda

- Arquitetura, monorepo, coleções, checkout, stock serializado, encomendas com preço e custo congelados
- A paleta: verde escuro `#18352A`, terracota `#D9825B`, creme `#F7F5EF`
- A camada GSAP, com `prefers-reduced-motion` respeitado
- Os campos internos cortados na fronteira (`sanitize.ts`)
- O conteúdo servido do servidor, íntegro sem JavaScript
- A trava comercial do dashboard

## 9. Critério de aceitação

**Um teste de olhar:** alguém que abra a home tem de perceber em três segundos que aquilo vende coisas, e conseguir procurar um produto sem carregar em mais de um sítio.

**E um teste medível:** a grelha mostra 5 cartões por linha em 1440 px e 2 em 390 px; cada cartão tem preço, desconto quando existe, avaliação quando existe, stock quando é baixo, e uma ação; a pesquisa devolve resultados por título, marca e categoria; e nenhuma estrela, contagem ou "mais vendido" aparece sem dados reais por trás.
