import type { Access, FieldAccess } from 'payload'

/**
 * Quem tem sessão no PAINEL — e não quem tem sessão, ponto.
 *
 * A partir do momento em que existe a coleção `customers`, `req.user` deixa de
 * querer dizer "staff": qualquer pessoa se regista na loja e passa a ter
 * sessão. Duas consequências, ambas verificadas contra a base antes desta
 * correção existir (ver `integracao.test.ts`, "um cliente não é staff"):
 *
 * 1. **Todas as regras que perguntavam `Boolean(req.user)` passaram a responder
 *    `true` a clientes.** Era o caso do `soComSessao` que protegia o custo de
 *    compra, o fornecedor, o EAN e a localização em armazém, e das duas regras
 *    de "só publicados": bastava registar-se na loja para ler a margem e os
 *    produtos por publicar. É literalmente a fuga da fase 2 a reabrir por outra
 *    porta.
 *
 * 2. **`create`, `update` e `delete` de todas as coleções ficaram abertos aos
 *    clientes.** Nenhuma coleção do catálogo os declarava, e o `defaultAccess`
 *    do Payload (`({ req: { user } }) => Boolean(user)`, em
 *    `payload/dist/auth/defaultAccess.js`) aplica-se a tudo o que não é
 *    declarado. Um cliente registado apagava produtos, mudava preços e criava
 *    contas de staff — o `role` saía rebaixado a `admin` pelo access do campo,
 *    mas `admin` já entra no painel.
 *
 * Por isso é que estas regras existem e por isso é que estão aplicadas a todas
 * as coleções: o `access` implícito é uma decisão como qualquer outra, e o
 * Payload toma-a por omissão da maneira errada para uma loja com contas.
 */
export const ehStaff = (user: { collection?: string } | null | undefined): boolean =>
  user?.collection === 'users'

/**
 * O proprietário. O papel só existe na coleção `users`, por isso a pergunta
 * começa sempre por "é staff?" — `role` num cliente é `undefined` e nunca
 * poderia ser `'owner'`, mas depender disso seria depender de um campo não
 * existir.
 */
export const ehDono = (user: { collection?: string; role?: unknown } | null | undefined): boolean =>
  ehStaff(user) && user?.role === 'owner'

/** Para `access` de coleção (create/update/delete do catálogo). */
export const soStaff: Access = ({ req }) => ehStaff(req.user)

export const soDono: Access = ({ req }) => ehDono(req.user)

/** Para `access` de campo (custo de compra, fornecedor, margem das encomendas). */
export const soStaffCampo: FieldAccess = ({ req }) => ehStaff(req.user)

/**
 * Para `access` de campo que só o proprietário vê — hoje só a trava comercial
 * do dashboard (`globals/Definicoes.ts`).
 *
 * Negar `read` a um campo não é cosmético no painel: o `RenderFields` do
 * `@payloadcms/ui` devolve `null` para qualquer campo nomeado sem permissão de
 * leitura (`forms/RenderFields/index.js`), portanto quem não é dono não vê o
 * interruptor. Quem o vê é decidido aqui, no servidor, e não por `admin.hidden`
 * — esse esconde da vista e deixa a escrita aberta.
 */
export const soDonoCampo: FieldAccess = ({ req }) => ehDono(req.user)
