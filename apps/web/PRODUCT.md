# Product

## Register

product

## Platform

web

## Users

Donos de animais de estimação em Portugal à procura de comprar produtos para o seu animal — ração, acessórios, higiene e treino para cão, gato, pássaro ou pequenos animais. Chegam com uma tarefa concreta (repor ração, resolver um problema específico do animal, escolher um produto novo), não a navegar por lazer. Sucesso é a compra concluída: encontrar o produto certo, confirmar que serve para o animal deles, e chegar ao checkout sem atrito.

## Product Purpose

Substituir a demonstração estática anterior (16 produtos fixos, sem páginas de produto, sem checkout real) por uma loja a sério para o mercado português: catálogo gerido por quem trabalha na loja, páginas de produto indexáveis, filtros que devolvem resultados reais, e arquitetura pronta para receber pagamentos numa fase seguinte. O critério de sucesso não é "parecer uma loja" — é funcionar como uma: filtros que nunca devolvem zero resultados, categorias que não apontam para links mortos, um catálogo que reflete stock e preço reais.

## Positioning

Loja real, cuidada ao detalhe. Onde a maioria das lojas de animais online são vitrines genéricas montadas em cima de um template, a Animora é uma reconstrução a sério: páginas de produto reais, filtros funcionais, acessibilidade construída de propósito — não decoração por cima de uma demonstração.

## Brand Personality

Próxima, direta, com humor comedido — já expressa na loja: "cuidados a sério, sem ser sério demais". Fala como alguém que também tem animais, nunca como uma superfície de vendas fria. O humor é um toque, não uma piada constante; a seriedade é sobre o cuidado com o animal, nunca sobre o tom.

## Anti-references

Loja de startup genérica — o visual "cara de IA" (cream + gradiente + par de fontes geométricas quase-idênticas) já foi identificado e corrigido no código uma vez (troca de Fraunces + Nunito Sans por Bricolage Grotesque + Figtree); não regressar a esse género por omissão. Retalho frio e corporativo — evitar a sensação de armazém grande e impessoal; o tom próximo mantém-se mesmo nas superfícies mais funcionais (checkout, conta).

## Design Principles

Loja real, não maquete: cada padrão de UI resolve uma tarefa concreta de compra — filtrar, escolher variante, confirmar stock — nunca decorativo à custa da função. Nunca um beco sem saída: filtros derivam sempre de dados reais em stock, categorias e navegação nunca apontam para conteúdo vazio ou morto. Confiança visual antes da venda: foco visível, hierarquia de headings correta e alvos de toque generosos comunicam cuidado tanto quanto a paleta ou a tipografia. Cuidados a sério, sem ser sério demais: o tom da marca aparece na copy e nas microinterações, não só no logotipo. Evitar o género: nem clichê de startup, nem pet shop infantilizado, nem armazém frio — a Animora não se parece com a categoria por omissão.

## Accessibility & Inclusion

WCAG AA como nível formal. Já implementado no código e a manter em qualquer trabalho novo: `:focus-visible` na camada de tokens, diálogos com focus trap e devolução de foco ao fechar, skip link para o conteúdo principal, hierarquia de headings correta, alvos de toque a 44px mínimo, texto alternativo obrigatório em imagens de produto, e `prefers-reduced-motion` respeitado num único sítio para toda a animação GSAP.
