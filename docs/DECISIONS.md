# Decisões — Animora

Registo de decisões arquiteturais não óbvias, tomadas durante a validação
integrada (Fase 7 do plano estrutural v1). Este arquivo não existia antes;
criado agora porque as duas decisões abaixo mudam como o projeto deve
crescer daqui para a frente, não só o que foi corrigido.

## D01 — `loading.tsx` de segmento nunca pode ser ancestral de uma rota que chama `notFound()`

**Contexto:** rota inexistente (produto, categoria, encomenda) respondia
HTTP 200 em vez de 404 — confirmado que até uma rota totalmente aleatória
respondia 200, então o problema era estrutural, não um erro de lógica.

**Causa raiz (redigida com mais precisão após a revisão geral, achado do
processo sobre a D01):** a causa exata não é "existe um `loading.tsx`
ancestral" em abstrato — é o momento em que o corpo da resposta HTTP
começa a ser transmitido. Isso acontece assim que uma fronteira
`<Suspense>` renderiza o seu `fallback` (o que um `loading.tsx` cria
automaticamente para o segmento) **ou** quando um Server Component
suspende dentro de uma fronteira já existente. Nesse instante o Next já
enviou os cabeçalhos da resposta com status 200; se o componente da
página (async, pode chamar `notFound()`) só resolve depois, o código de
estado já não pode mudar — documentado na própria página do Next sobre
`loading.js` (secção "Status Codes"). Um `loading.tsx` em segmento
ancestral é a forma mais comum de criar essa fronteira, por isso "tirar o
`loading.tsx` do caminho de quem chama `notFound()`" resolve o problema
na prática — mas o que se está a evitar é o início do streaming antes da
checagem de existência, não o arquivo em si.

**Decisão:** `app/[locale]/loading.tsx` — que cobria a home e, por
herança, `/[categoria]` e `/produto/[slug]` (as duas rotas que chamam
`notFound()`) — foi removido dali. A home ganhou seu próprio grupo de
rota `app/[locale]/(home)/` só para isso: nenhuma outra rota herda o
`loading.tsx` de um grupo de rota que não a contém. `/produtos` (nunca
chama `notFound()`) ganhou o seu próprio `loading.tsx` local, mesmo
padrão.

**Alternativa não escolhida:** a doc do Next também aponta garantir a
existência do recurso *antes* do streaming começar (por exemplo, uma
checagem em middleware/proxy) como outra forma de obter um 404 real sem
mexer em fronteiras de Suspense. Não foi o caminho tomado aqui porque
exigiria uma consulta ao catálogo fora do componente de página, duplicando
a leitura que a própria página já faz — mas é a opção a considerar se uma
fase futura precisar de `loading.tsx` num segmento que também tem de
responder 404.

**Regra daqui para a frente:** antes de adicionar um `loading.tsx` a
qualquer segmento, perguntar se alguma rota abaixo dele chama
`notFound()` (ou qualquer outra mudança de status depois de um `await`
que possa suspender). Se sim, o `loading.tsx` tem de viver mais perto da
folha (a própria rota, ou um grupo de rota que isole só quem não chama
`notFound()`) — nunca num ancestral compartilhado — ou a checagem de
existência precisa acontecer antes do streaming começar.

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
