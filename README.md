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
pnpm test
```

## Documentação

- Especificação: `docs/spec-animora.md`
- Planos: `docs/superpowers/plans/`
