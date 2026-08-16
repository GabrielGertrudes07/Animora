import type { CollectionConfig } from 'payload'

import { soFiltroOuFichaSemSessao } from '../access/leitura'
import { soStaff } from '../access/staff'

export const Attributes: CollectionConfig = {
  slug: 'attributes',
  // Sem isto, o `defaultAccess` do Payload (`Boolean(req.user)`) aplica-se
  // também à leitura, e a loja pública — sem sessão — levava 403 em tudo.
  //
  // Mas `() => true` seria o MESMO erro da fase 2 (C1 do ledger de
  // 2026-08-15-loja-catalogo-ficha): abrir `read` numa coleção abre TODOS os
  // documentos, incluindo os de alcance `interno` — custo de compra,
  // fornecedor, margem. Aqui a proteção não é campo a campo (não há um campo
  // "interno" dentro do documento): é o documento inteiro que é interno ou
  // não, por isso a regra filtra por `alcance` — ver `access/leitura.ts`.
  access: {
    read: soFiltroOuFichaSemSessao,
    create: soStaff,
    update: soStaff,
    delete: soStaff,
  },
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'chave', 'alcance', 'tipo', 'ordem'],
  },
  fields: [
    { name: 'nome', type: 'text', required: true, label: 'Nome' },
    {
      name: 'chave',
      type: 'text',
      required: true,
      unique: true,
      label: 'Chave',
      admin: {
        description:
          'Identificador técnico do atributo. Gravado em minúsculas e sem espaços — ' +
          '"Peso do Animal" grava como "peso-do-animal".',
      },
      // Normaliza em vez de recusar: "Cor" e "cor" são o mesmo identificador
      // técnico, e sem isto seriam chaves distintas — o `unique` nativo do
      // Payload só compara depois desta transformação correr.
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, '-') : value,
        ],
      },
    },
    {
      name: 'tipo',
      type: 'select',
      required: true,
      label: 'Tipo',
      options: [
        { label: 'Seleção única', value: 'select' },
        { label: 'Seleção múltipla', value: 'multiselect' },
        { label: 'Intervalo', value: 'intervalo' },
        { label: 'Booleano', value: 'booleano' },
      ],
    },
    {
      name: 'alcance',
      type: 'select',
      required: true,
      label: 'Alcance',
      defaultValue: 'filtro',
      options: [
        { label: 'Filtro (filtra no catálogo, visível ao cliente)', value: 'filtro' },
        { label: 'Ficha (aparece nas especificações, não filtra)', value: 'ficha' },
        { label: 'Interno (só admin e relatórios — nunca sai para o site)', value: 'interno' },
      ],
      admin: {
        description:
          'Um atributo "interno" nunca é devolvido pela API sem sessão de staff, seja qual for ' +
          'a configuração de filtros do catálogo.',
      },
    },
    {
      name: 'controlo',
      type: 'select',
      required: true,
      label: 'Controlo',
      defaultValue: 'caixas',
      options: [
        { label: 'Caixas de verificação', value: 'caixas' },
        { label: 'Intervalo (slider)', value: 'intervalo' },
        { label: 'Amostras (cor/imagem)', value: 'amostras' },
        { label: 'Chips', value: 'chips' },
      ],
    },
    {
      name: 'ordem',
      type: 'number',
      defaultValue: 0,
      label: 'Ordem',
      admin: { description: 'Ordem de apresentação por omissão. Pode ser substituída no ecrã de configuração de filtros.' },
    },
    {
      name: 'abertoPorOmissao',
      type: 'checkbox',
      defaultValue: false,
      label: 'Secção aberta por omissão',
    },
    {
      name: 'categorias',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Categorias',
      admin: { description: 'Vazio = aplica-se a todas as categorias.' },
    },
  ],
}
