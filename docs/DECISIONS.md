# Decisões — Animora

Registo de decisões arquiteturais não óbvias, tomadas durante a validação
integrada (Fase 7 do plano estrutural v1). Este arquivo não existia antes;
criado agora porque as duas decisões abaixo mudam como o projeto deve
crescer daqui para a frente, não só o que foi corrigido.

## D01 — `loading.tsx` de segmento nunca pode ser ancestral de uma rota que chama `notFound()`

**Contexto:** rota inexistente (produto, categoria, encomenda) respondia
HTTP 200 em vez de 404 — confirmado que até uma rota totalmente aleatória
respondia 200, então o problema era estrutural, não um erro de lógica.

**Causa raiz:** um `loading.tsx` em qualquer segmento ancestral envolve a
página numa fronteira `<Suspense>` automática do Next.js. O Next começa a
transmitir a resposta como 200 assim que a fronteira monta o `fallback`,
antes de o componente da página (async, pode chamar `notFound()`) resolver
— quando resolve para "não encontrado", o código de estado já está
travado em 200. É um comportamento documentado do App Router
(`vercel/next.js` discussions #76501, #70170), não um bug desta loja.

**Decisão:** `app/[locale]/loading.tsx` — que cobria a home e, por
herança, `/[categoria]` e `/produto/[slug]` (as duas rotas que chamam
`notFound()`) — foi removido dali. A home ganhou seu próprio grupo de
rota `app/[locale]/(home)/` só para isso: nenhuma outra rota herda o
`loading.tsx` de um grupo de rota que não a contém. `/produtos` (nunca
chama `notFound()`) ganhou o seu próprio `loading.tsx` local, mesmo
padrão.

**Regra daqui para a frente:** antes de adicionar um `loading.tsx` a
qualquer segmento, perguntar se alguma rota abaixo dele chama
`notFound()`. Se sim, o `loading.tsx` tem de viver mais perto da folha
(a própria rota, ou um grupo de rota que isole só quem não chama
`notFound()`) — nunca num ancestral compartilhado.

## D02 — Um `index.ts` de módulo não pode misturar arquivos `'use server'` com arquivos servidor-só sem a diretiva

**Contexto:** ao consolidar `modules/account/*` num único `index.ts`
público (fronteira "nada importa arquivo interno de outro módulo"), o
`BotaoFavorito.tsx` (Client Component) quebrou com `You're importing a
component that needs "next/headers"` — mesmo só usando
`alternarFavorito`/`ehFavorito`, que são seguras.

**Causa raiz:** `modules/account/acoes.ts` tem `'use server'` no topo —
o Next.js trata o arquivo inteiro como limite de Server Action e o
compila para um stub seguro sempre que chega a um Client Component,
não importa por qual caminho de import. `modules/account/sessao.ts` e
`modules/account/encomendas.ts` **não têm** essa diretiva — são módulos
comuns que usam `next/headers` direta ou indiretamente, e nunca podem
ser alcançados por um Client Component, nem por um caminho indireto. Ao
reexportar os três pelo mesmo `index.ts`, qualquer Client Component que
importasse qualquer coisa dali forçava o Next a varrer o módulo inteiro
— inclusive as partes servidor-só.

**Decisão:** `modules/account/index.ts` reexporta só o que vem de
`acoes.ts` (`'use server'`, seguro para qualquer consumidor). `sessao.ts`
e `encomendas.ts` continuam sendo importados diretamente pelos Server
Components que já os liam antes (as páginas de conta e checkout) — isso
não é uma violação de fronteira, é o limite real do módulo: ele tem duas
superfícies públicas porque tem duas audiências (leitura de sessão no
servidor vs. ações que o cliente também pode disparar).

**Regra daqui para a frente:** antes de barrilar um módulo, checar se
algum dos seus arquivos usa `next/headers`/`next/cookies`/outra API só
de servidor sem `'use server'`. Se sim, esse arquivo fica de fora do
`index.ts` e é importado diretamente por quem precisa dele (sempre um
Server Component) — o `index.ts` do módulo cobre só a fatia
genuinamente segura para os dois lados.

## Achado corrigido no mesmo commit

O barril de `modules/cart/index.ts` **não** tinha esse problema: os
métodos adicionados (`carregarLinhas`, `comprar`) vêm de
`modules/cart/acoes.ts`, que também tem `'use server'` — seguro pela
mesma razão da D02. Confirmado com o app rodando antes de assumir que
estava certo.
