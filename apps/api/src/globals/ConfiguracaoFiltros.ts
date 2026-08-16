import type { CollectionBeforeDeleteHook, GlobalBeforeChangeHook, GlobalConfig } from 'payload'
import { APIError } from 'payload'

import { soStaff } from '../access/staff'

/**
 * Porque é GLOBAL e não coleção: só existe um conjunto de configuração de
 * filtros por loja — não há "vários documentos" a listar, criar ou apagar,
 * só um ecrã de definições para editar. É exatamente o caso de uso que os
 * globals do Payload existem para servir; uma coleção de um único documento
 * seria a mesma coisa com mais cerimónia (lista com um item, apagar sem
 * sentido).
 *
 * O CONTROLO por atributo não se repete aqui: `controlo` e `abertoPorOmissao`
 * já são campos do próprio atributo (`Attributes.ts`). Este ecrã decide, por
 * cima disso, quais atributos ficam ativos como filtro, **por que ordem de
 * apresentação** (a posição na lista, que o admin do Payload já deixa arrastar
 * nativamente) e com a possibilidade de os desligar — ou de os substituir por
 * completo numa categoria concreta. Duplicar `controlo`/`abertoPorOmissao`
 * aqui seria dois sítios para a mesma decisão.
 *
 * A posição da linha ganha ao campo `ordem` do atributo, que fica a ser a
 * omissão de quem não está listado aqui. Não é redundância com `Attributes`:
 * é a substituição que a descrição desse campo anuncia, e é a loja que a
 * cumpre — ver `resolveActiveAttributeDefs` e `computeAttributeFacets` em
 * `apps/web/src/modules/catalog`.
 */
type LinhaAtributo = { atributo?: unknown }

const idsDeLinhas = (linhas: unknown): (number | string)[] =>
  (Array.isArray(linhas) ? (linhas as LinhaAtributo[]) : [])
    .map((linha) => linha?.atributo)
    .map((atributo) =>
      typeof atributo === 'object' && atributo !== null
        ? (atributo as { id?: number | string }).id
        : (atributo as number | string | undefined),
    )
    .filter((id): id is number | string => id !== undefined && id !== null)

/**
 * Um atributo de alcance `interno` (custo, fornecedor, margem) não pode ser
 * tornado público através deste ecrã — nem por manipulação direta do pedido,
 * sem passar pela UI que "bloqueia" a escolha. A UI é só conveniência; a
 * garantia real tem de estar aqui, correndo em toda a escrita (`update` do
 * global), porque é o mesmo erro de outra vez confiar só na camada visual
 * para proteger o que devia ser recusado na fronteira.
 *
 * Lê os atributos com o `req` do pedido: como só staff chega a esta escrita
 * (`access.update`), e a Local API do Payload usa `overrideAccess: true` por
 * omissão, esta consulta vê o `alcance` de todos, incluindo os `interno` que
 * a leitura pública nunca devolve — é precisamente esse campo que precisa de
 * inspecionar.
 */
export const semAtributosInternos: GlobalBeforeChangeHook = async ({ data, req }) => {
  const idsPadrao = idsDeLinhas(data?.padrao)
  const idsPorCategoria = (Array.isArray(data?.porCategoria) ? data.porCategoria : []).flatMap(
    (linha: { atributos?: unknown }) => idsDeLinhas(linha?.atributos),
  )

  const idsUnicos = [...new Set([...idsPadrao, ...idsPorCategoria])]
  if (idsUnicos.length === 0) return data

  const { docs } = await req.payload.find({
    collection: 'attributes',
    where: { id: { in: idsUnicos } },
    depth: 0,
    limit: 0,
    req,
  })

  const internos = docs.filter((doc) => doc.alcance === 'interno')
  if (internos.length > 0) {
    throw new APIError(
      `Os atributos ${internos.map((doc) => `"${doc.nome}"`).join(', ')} têm alcance interno ` +
        '(só admin e relatórios) e não podem ser ativados como filtro do catálogo. Mude o ' +
        'alcance do atributo para "filtro" ou "ficha" antes de o incluir aqui.',
      400,
    )
  }

  return data
}

/**
 * Recusa apagar um atributo que a configuração de filtros ainda usa.
 *
 * ## O defeito
 *
 * `atributo` é `required: true` nas linhas deste global, e o adaptador Postgres
 * gera a chave estrangeira com `ON DELETE SET NULL` sobre uma coluna `NOT NULL`.
 * `DELETE /api/attributes/<em uso>` dava **500 "Something went wrong"**; um
 * atributo livre dava 200. É a terceira aparição da mesma armadilha neste
 * projeto (produtos→variantes na fase 1, clientes→encomendas na fase 3).
 *
 * ## Recusar, e não apagar a linha em cascata
 *
 * As duas soluções já usadas aqui servem casos diferentes, e este é o de
 * recusar — pelo mesmo motivo que o `blockDeleteIfPublished`:
 *
 * - **a ordem das linhas é trabalho manual e é a que a loja mostra.** Desde que
 *   a posição da linha passou a mandar (ver `resolveActiveAttributeDefs`),
 *   apagar linhas em cascata mexe numa lista que o lojista arrastou à mão, e
 *   não há como a repor: o atributo volta a criar-se, a posição não.
 * - **a barra de filtros da loja mudava sozinha.** Quem apaga um atributo do
 *   painel não espera que a categoria "Ração" deixe de filtrar por peso sem
 *   ninguém lhe tocar, nem fica com lista nenhuma do que se perdeu.
 * - **apagar um atributo é um gesto raro e deliberado.** Custa um passo a mais;
 *   a cascata custa uma configuração desfeita em silêncio.
 *
 * A cascata é a escolha certa quando o filho não tem vida própria (uma variante
 * sem produto não é nada, e por isso produtos→variantes apagam em cascata). Uma
 * linha de configuração tem: é uma decisão de montra.
 *
 * ## Porque não leva o lock consultivo das outras guardas
 *
 * Esta conta antes de decidir, como as outras, mas não é ela que garante a
 * invariante — é a chave estrangeira. Uma escrita concorrente da configuração
 * a entrar entre a contagem e a eliminação acaba sempre em rollback (o `DELETE`
 * viola o `NOT NULL`, ou o `UPDATE` do global aponta para uma linha que já não
 * existe): feio, mas nunca deixa referência pendurada. O hook está aqui para
 * transformar o 500 sem explicação num 400 que diz o que fazer, não para
 * fechar uma corrida — e serializar todas as eliminações de atributos contra o
 * resto do catálogo para poupar um 500 raro não se paga.
 */
export const bloquearApagarSeConfigurado: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const config = await req.payload.findGlobal({
    slug: 'configuracao-filtros',
    depth: 0,
    overrideAccess: true,
    req,
  })

  const alvo = String(id)
  const usa = (linhas: unknown): boolean => idsDeLinhas(linhas).some((v) => String(v) === alvo)

  const noPadrao = usa(config.padrao)
  const categorias = (Array.isArray(config.porCategoria) ? config.porCategoria : []).filter(
    (linha: { atributos?: unknown }) => usa(linha?.atributos),
  ).length

  if (!noPadrao && categorias === 0) return

  const onde = [
    ...(noPadrao ? ['nos filtros por omissão'] : []),
    ...(categorias > 0
      ? [categorias === 1 ? 'numa substituição por categoria' : `em ${categorias} substituições por categoria`]
      : []),
  ].join(' e ')

  // Só no caminho da recusa: no caminho normal não se paga uma leitura para
  // compor uma mensagem que não vai ser escrita.
  const doc = await req.payload.findByID({
    collection: 'attributes',
    id,
    depth: 0,
    overrideAccess: true,
    req,
  })

  throw new APIError(
    `Não é possível apagar o atributo "${doc.nome}": está a ser usado na Configuração de filtros ` +
      `(${onde}). Abra Definições → Configuração de filtros, apague a linha desse atributo, grave, ` +
      'e só depois apague o atributo. É de propósito que não acontece sozinho: a ordem das linhas ' +
      'é a ordem dos filtros na loja, e apagá-las em cascata mudava a montra sem ninguém lhe tocar.',
    400,
  )
}

const camposDeLinha = (label: string) => [
  {
    name: 'atributo',
    type: 'relationship' as const,
    relationTo: 'attributes' as const,
    required: true,
    label,
    admin: {
      description:
        'Atributos de alcance interno aparecem na lista, mas a gravação é recusada: nunca ' +
        'podem ficar visíveis no catálogo.',
    },
  },
  { name: 'visivel', type: 'checkbox' as const, defaultValue: true, label: 'Visível no catálogo' },
]

export const ConfiguracaoFiltros: GlobalConfig = {
  slug: 'configuracao-filtros',
  label: 'Configuração de filtros',
  // A loja lê sem sessão para saber que filtros mostrar e por que ordem — não
  // há aqui nada equivalente ao custo de compra ou à margem: um `interno` na
  // lista nunca chega a ser gravado, graças ao hook abaixo, por isso não há
  // documento sensível a proteger na leitura.
  access: { read: () => true, update: soStaff },
  hooks: { beforeChange: [semAtributosInternos] },
  fields: [
    {
      name: 'padrao',
      type: 'array',
      label: 'Filtros por omissão',
      admin: {
        description:
          'Arraste as linhas para reordenar — é essa ordem que o catálogo usa, à frente do ' +
          'campo "Ordem" de cada atributo. Desligar "Visível" remove o filtro da loja sem ' +
          'apagar a linha; um atributo que não esteja nesta lista não é oferecido como filtro.',
      },
      fields: camposDeLinha('Atributo'),
    },
    {
      name: 'porCategoria',
      type: 'array',
      label: 'Substituição por categoria',
      admin: {
        description:
          'Uma categoria listada aqui substitui por completo os filtros por omissão — não os ' +
          'complementa. Ex.: em "Ração" filtra-se por peso, em "Coleiras" por tamanho.',
      },
      fields: [
        {
          name: 'categoria',
          type: 'relationship',
          relationTo: 'categories',
          required: true,
          label: 'Categoria',
        },
        {
          name: 'atributos',
          type: 'array',
          label: 'Filtros desta categoria',
          fields: camposDeLinha('Atributo'),
        },
      ],
    },
  ],
}
