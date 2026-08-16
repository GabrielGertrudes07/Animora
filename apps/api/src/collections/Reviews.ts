import type {
  Access,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  Where,
} from 'payload'
import { APIError } from 'payload'

import { ehStaff, soStaff, soStaffCampo } from '../access/staff'
import { idDaRelacao } from '../hooks/blockUnsellable'
import { validarInteiro } from '../validacoes'

/**
 * O que uma pessoa escreveu sobre um produto que comprou.
 *
 * Três regras mandam nesta coleção, e nenhuma delas é decorativa:
 *
 * 1. **Só avalia quem comprou.** Verificado contra as encomendas do próprio,
 *    num hook e não só no `access`, para valer também a qualquer caminho de
 *    escrita futuro.
 * 2. **Nasce `pendente`.** O estado é um campo de staff; quem escreve não lhe
 *    toca (ver o `access` do campo `estado`).
 * 3. **A leitura pública mostra só as aprovadas, e nunca o email de quem
 *    escreveu.** É texto e nomes de pessoas reais — abrir `read` numa coleção
 *    abre todos os campos dela, e foi assim que o custo de compra ficou público
 *    na fase 2.
 */

/**
 * Sem sessão: só as aprovadas. Cliente: as aprovadas de toda a gente mais as
 * suas, em qualquer estado. Staff: tudo.
 *
 * Devolver um `Where` em vez de `true`/`false` é o que faz a regra valer também
 * para o `findByID` e para um `?where=` montado à mão: a condição entra na
 * consulta (`combineQueries`), por isso pedir o id de uma avaliação pendente de
 * outra pessoa dá "não encontrado" em vez do texto dela.
 *
 * A pergunta é "é staff?" e não "tem sessão?": um cliente da loja também tem
 * sessão, e as avaliações por moderar não são dele — ver `access/staff.ts`.
 */
const aprovadasOuProprias: Access = ({ req }) => {
  const u = req.user
  if (ehStaff(u)) return true

  const aprovadas: Where = { estado: { equals: 'aprovada' } }
  if (u?.collection === 'customers') {
    const suas: Where = { cliente: { equals: u.id } }
    return { or: [aprovadas, suas] }
  }
  return aprovadas
}

/**
 * Escrever uma avaliação é coisa de cliente.
 *
 * O staff não cria avaliações — modera as que existem. Uma avaliação escrita do
 * painel seria prova social fabricada, que é exatamente o que a especificação
 * proíbe (§3, "avaliações não se inventam"). O seeder da demonstração escreve
 * com `overrideAccess`, como o checkout faz nas encomendas.
 */
const soClientes: Access = ({ req }) => req.user?.collection === 'customers'

/** "Ana Silva" → "Ana". O apelido é dado a mais para uma prateleira pública. */
const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? ''

/**
 * A regra do silêncio: um cliente só avalia um produto que comprou.
 *
 * Corre em `beforeValidate` (create), e não só no `access`, por duas razões: o
 * `access.create` do Payload decide com o `data` que lhe chega mas não pode
 * fazer perguntas à base sem o `req` da transação, e uma regra que vive no hook
 * vale para qualquer caminho de escrita — incluindo os que correm com
 * `overrideAccess`, como o seeder.
 *
 * Três decisões:
 *
 * - **O autor é sempre quem tem a sessão.** O `cliente` que vier no corpo é
 *   ignorado: sem isto, qualquer cliente registado escrevia avaliações em nome
 *   de outro, e o nome de outra pessoa aparecia por baixo do texto dele.
 * - **Uma encomenda cancelada não é uma compra.** O stock foi devolvido ao
 *   catálogo e a venda desfez-se; deixar avaliar por causa dela dava um caminho
 *   de uma linha para estrelas sem compra — encomendar, cancelar, avaliar.
 * - **`a-aguardar-pagamento` conta.** É o estado em que toda a encomenda nasce
 *   nesta loja (não há integração de pagamento), por isso exigir `pago` era
 *   fechar a porta a toda a gente.
 *
 * O `nomeAutor` é gravado aqui, do nome da conta, e é o que a loja mostra. É a
 * alternativa a populares a relação `cliente` na leitura pública: assim o
 * documento público nunca precisa de tocar na coleção `customers`.
 */
const soDeQuemComprou: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data

  const cliente =
    req.user?.collection === 'customers' ? req.user.id : idDaRelacao(data.cliente)
  const produto = idDaRelacao(data.produto)

  // Faltam campos obrigatórios: quem tem a mensagem certa é a validação de
  // campo, logo a seguir. Esta guarda cala-se para não a tapar.
  if (cliente === undefined || cliente === null || produto === undefined || produto === null) {
    return data
  }

  data.cliente = cliente

  const { docs: variantes } = await req.payload.find({
    collection: 'variants',
    where: { product: { equals: produto } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const comprou =
    variantes.length > 0 &&
    (
      await req.payload.count({
        collection: 'orders',
        where: {
          and: [
            { cliente: { equals: cliente } },
            { estado: { not_equals: 'cancelado' } },
            { 'linhas.variante': { in: variantes.map((v) => v.id) } },
          ],
        },
        overrideAccess: true,
        req,
      })
    ).totalDocs > 0

  if (!comprou) {
    throw new APIError(
      'Só se avalia um produto que se comprou. Não há nenhuma encomenda sua com este produto.',
      403,
    )
  }

  const dono = await req.payload.findByID({
    collection: 'customers',
    id: cliente,
    depth: 0,
    overrideAccess: true,
    req,
  })
  data.nomeAutor = primeiroNome(String(dono.nome ?? ''))

  return data
}

/**
 * Apagar a conta apaga as avaliações dela — a acrescentar ao `beforeDelete` dos
 * `customers` e ao dos `products`.
 *
 * Duas razões, e a primeira é a mesma armadilha do `anonimizarEncomendas`:
 * `cliente` e `produto` são `required`, logo `NOT NULL` na base, e a chave
 * estrangeira que o adaptador gera é `ON DELETE SET NULL` — sem isto, apagar
 * uma conta com avaliações dava 500. A segunda é o RGPD: ao contrário de uma
 * encomenda, que se anonimiza porque a contabilidade a exige, uma avaliação é
 * conteúdo pessoal e não tem nada que sobreviver a quem a escreveu.
 */
export const apagarAvaliacoesDe = (campo: 'cliente' | 'produto'): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    await req.payload.delete({
      collection: 'reviews',
      where: { [campo]: { equals: id } },
      overrideAccess: true,
      req,
    })
  }

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: 'Avaliação', plural: 'Avaliações' },
  hooks: { beforeValidate: [soDeQuemComprou] },
  admin: {
    useAsTitle: 'nomeAutor',
    defaultColumns: ['produto', 'nomeAutor', 'estrelas', 'estado', 'createdAt'],
  },
  access: {
    read: aprovadasOuProprias,
    create: soClientes,
    // Moderar é do staff, e é a única escrita depois de a avaliação nascer. Com
    // `update` fechado ao staff, "só staff muda o estado" já é verdade ao nível
    // da coleção — o `access` do campo `estado` (abaixo) é o que impede que ele
    // seja escolhido na criação.
    update: soStaff,
    delete: soStaff,
  },
  fields: [
    {
      name: 'produto',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Produto',
    },
    {
      name: 'cliente',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      label: 'Cliente',
      admin: { description: 'Quem escreveu. Preenchido a partir da sessão, nunca do corpo.' },
    },
    {
      // O nome que a loja mostra, copiado da conta na criação. Só o próprio
      // nome, sem apelido e sem email — a leitura pública desta coleção nunca
      // precisa de ir à coleção `customers`, que está fechada a toda a gente
      // menos ao próprio e ao staff.
      name: 'nomeAutor',
      type: 'text',
      label: 'Nome a mostrar',
      admin: { readOnly: true },
    },
    {
      name: 'estrelas',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      label: 'Estrelas',
      // `min`/`max` só sobrevivem porque o `validarInteiro` corre a validação
      // nativa do Payload antes da sua — um `validate` personalizado
      // substitui-a em vez de a completar. Recusa 0, 6 e 3,5.
      validate: validarInteiro,
    },
    { name: 'texto', type: 'textarea', label: 'Texto' },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'pendente',
      label: 'Estado',
      options: [
        { label: 'Pendente', value: 'pendente' },
        { label: 'Aprovada', value: 'aprovada' },
        { label: 'Recusada', value: 'recusada' },
      ],
      // Quem escreve não escolhe o estado: o Payload descarta o valor submetido
      // quando o access do campo recusa (`fields/hooks/beforeChange`), e fica a
      // omissão — `pendente`. Sem isto, um `POST` com `estado: "aprovada"`
      // publicava-se a si próprio.
      access: { create: soStaffCampo, update: soStaffCampo },
    },
  ],
}
