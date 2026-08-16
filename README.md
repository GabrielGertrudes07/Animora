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
