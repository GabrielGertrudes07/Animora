# Animora

Loja de produtos para animais. Monorepo TypeScript.

## Estrutura

- `apps/api` — Payload CMS: painel de administração, API e base de dados
- `apps/web` — Next.js: loja
- `packages/core` — lógica partilhada: dinheiro, variantes, SKU

## Arrancar

```bash
docker compose up -d          # Postgres
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @animora/api dev   # admin em http://localhost:3000/admin
pnpm --filter @animora/web dev   # loja em http://localhost:3001
```

## Seeder — catálogo de demonstração

```bash
pnpm seed   # ou: pnpm --filter @animora/api seed
```

Apaga o catálogo existente (categorias, marcas, atributos, produtos,
variantes, imagens, clientes, encomendas) e recria um catálogo realista de
pet shop portuguesa: 10 categorias, 12 marcas, 5 atributos (Tamanho, Cor, Peso
do saco, Animal de destino, Porte) já configurados como filtros, 42 produtos
publicados com 69 variantes — com e sem opções, alguns esgotados, alguns com
stock baixo, alguns em promoção, custo de compra preenchido na maioria mas
não em todas as variantes — 7 clientes e 20 encomendas dos últimos 60 dias
(estados variados, uma cancelada).

As imagens são geradas localmente com o `sharp` (sem serviços externos): um
cartaz por produto, com o nome composto sobre um fundo de cor por categoria.

Repetível: corre `payload run src/seed.ts` por baixo, apaga tudo o que cria
antes de recriar com dados deterministas — correr duas vezes seguidas dá o
mesmo catálogo, sem duplicar nada. Nunca toca em `users`: o proprietário
(`admin@animora.pt`) fica intacto, e a trava do dashboard
(`Definições → Dashboard de vendas com dados reais`) fica sempre desligada
no fim.

Os testes de integração do dashboard isolam-se apagando toda a tabela
`orders` antes de cada um (ver `apps/api/src/integracao.test.ts`), para as
contas exatas que fazem não dependerem de mais nenhuma encomenda na base —
incluindo as do seeder. Ou seja: **correr `pnpm -r test` depois do seeder
apaga as encomendas de demonstração** (o catálogo — produtos, variantes,
categorias, marcas, clientes — fica intacto). Corra `pnpm seed` outra vez a
seguir aos testes para as repor.

## Testes

```bash
pnpm test                          # tudo
pnpm --filter @animora/core test   # lógica pura: dinheiro, variantes, SKU
pnpm --filter @animora/api test    # integração — precisa do Postgres a correr
```

Os testes de `apps/api` não usam mocks: arrancam o Payload e falam com o
Postgres real. Precisam do `docker compose up -d` e de `apps/api/.env`
(copiado do `.env.example`). Correm contra a base de dados de desenvolvimento,
tudo o que criam leva o prefixo `zteste`, e apagam-no no fim.

Cobrem os cenários que já partiram este projeto: sincronização de variantes ao
mudar opções, gravação de rascunho sobre um produto publicado, publicação com
opções alteradas no mesmo pedido, atribuição concorrente de SKU e as vias de
escalada de privilégios de `admin` para `owner`.

## Documentação

- Especificação: `docs/spec-animora.md`
- Planos: `docs/superpowers/plans/`
