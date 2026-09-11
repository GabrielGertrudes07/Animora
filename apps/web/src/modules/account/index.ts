/**
 * Só `acoes.ts` — o único arquivo do módulo com `'use server'` — passa por
 * aqui. `sessao.ts` e `encomendas.ts` importam `next/headers` (direta ou
 * indiretamente) e não têm essa diretiva: reexportá-los deste barril
 * quebraria qualquer Client Component que importasse qualquer coisa daqui
 * (o Next varre o módulo inteiro do `index.ts`, não só o nome importado) —
 * foi exatamente o que aconteceu com o `BotaoFavorito` na Fase 7, corrigido
 * voltando os dois a serem importados diretamente por quem já era Server
 * Component (as páginas de conta/checkout). Ver `docs/CURRENT_STATE.md`,
 * Fase 7.
 */
export {
  entrar,
  registar,
  sair,
  guardarMorada,
  apagarMorada,
  alternarFavorito,
  ehFavorito,
} from './acoes'
