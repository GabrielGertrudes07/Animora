import type { GlobalBeforeChangeHook, GlobalConfig } from 'payload'
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
 * A ORDEM e o CONTROLO por atributo não se repetem aqui: `ordem`, `controlo`
 * e `abertoPorOmissao` já são campos do próprio atributo (`Attributes.ts`).
 * Este ecrã só decide, por cima disso, quais atributos ficam ativos como
 * filtro, por que ordem de apresentação (a posição na lista, que o admin do
 * Payload já deixa arrastar nativamente) e com a possibilidade de os desligar
 * — ou de os substituir por completo numa categoria concreta. Duplicar
 * `controlo`/`abertoPorOmissao` aqui seria dois sítios para a mesma decisão.
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
          'Arraste as linhas para reordenar — é essa ordem que o catálogo usa. Desligar ' +
          '"Visível" remove o filtro da loja sem apagar a linha.',
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
