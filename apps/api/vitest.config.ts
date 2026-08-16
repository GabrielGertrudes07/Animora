import { defineConfig } from 'vitest/config'

// O `next dev` carrega apps/api/.env sozinho; o vitest não.
process.loadEnvFile(new URL('.env', import.meta.url))

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], testTimeout: 60_000, hookTimeout: 60_000 },
})
