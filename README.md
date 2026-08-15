# ReUseStore — Usados & Recondicionados

Site de e-commerce de produtos usados e recondicionados, em **HTML + CSS + JavaScript** puro (sem npm, sem build).

## Como abrir

É só fazer duplo-clique em **`index.html`** — abre no browser. Não precisa de instalar nada.

Ou, se preferires, serve os ficheiros com qualquer servidor estático:

```bash
# Python 3
python -m http.server 8000
# → http://localhost:8000
```

```bash
# Node (sem instalar nada, via npx)
npx serve .
```

## Estrutura

```
.
├── index.html      # Markup + estrutura
├── styles.css      # Estilos (tokens, header, hero, filtros, grelha, footer)
├── products.js     # 16 produtos mock + constantes (categorias, marcas, etc.)
├── app.js          # Lógica: filtros, ordenação, pesquisa, render
└── README.md
```

## Funcionalidades

- Header sticky com barra de pesquisa ligada ao catálogo
- Hero com showcase de categorias
- Trust bar (garantia, envio, devolução)
- Catálogo em grelha responsiva (16 produtos)
- Filtros laterais:
  - Categoria, Estado, Marca
  - Slider duplo de preço (0–1500€)
  - Garantia mínima
  - Em stock / Em promoção
- Ordenação (relevância, preço asc/desc, melhor avaliação, maior desconto)
- Pesquisa por título / marca / categoria
- "Como funciona" em 3 passos
- Footer institucional

## Browser

Testado em browsers modernos (Chrome, Firefox, Edge, Safari). Usa apenas APIs estáveis — sem build, sem frameworks.

## Próximos passos

- Persistir filtros em query string (`?categoria=smartphones`)
- Carrinho com `localStorage`
- Páginas de detalhe de produto
- Imagens locais (substituir `picsum.photos` por assets próprios)

## Nota

Projeto de **demonstração** com dados fictícios. Não afiliado a nenhuma marca ou site comercial.
