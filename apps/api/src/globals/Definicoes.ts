import type { GlobalConfig } from 'payload'

import { ehDono, soDono, soDonoCampo, soStaff } from '../access/staff'

/**
 * Definições da loja. Hoje só a trava comercial do dashboard.
 *
 * ## Porque é o servidor a decidir
 *
 * A trava é um interruptor lido **no servidor**, e não uma bandeira que o
 * dashboard receba e obedeça. Se fosse do lado do cliente, os números reais
 * viajavam na resposta e bastava abrir as ferramentas de programador para os
 * ler. Como está, com a trava ligada o endpoint nem chega a consultar
 * `orders` — devolve a série de demonstração e `locked: true` (ver
 * `endpoints/dashboard.ts`).
 *
 * ## Quem mexe
 *
 * `update` do global é `soDono`. Nos globals do Payload só existem `read` e
 * `update` — não há `create` nem `delete` a fechar — por isso esta linha fecha
 * toda a escrita: um `admin` recebe 403 no `PATCH /api/globals/definicoes`,
 * venha ele do painel ou de um pedido direto à API.
 *
 * O `access.read` do campo é a segunda metade, e não é redundante com a
 * primeira: sem ele o `admin` continuava a ver o interruptor no painel (a
 * cinzento) e a saber que existe. Com ele, o campo nem sai na resposta e o
 * `RenderFields` não o desenha.
 *
 * `read` do global é `soStaff` e não público: o estado da trava não interessa
 * à loja e não há razão para o anunciar a quem passa.
 *
 * ## Alcance honesto
 *
 * Quem tiver a base de dados ou o deploy destrava à força — um `UPDATE` numa
 * coluna booleana. É um travão comercial, não DRM, e construir mais não fecha
 * esse buraco. O que esta trava garante é o que interessa comercialmente: o
 * comprador, com a sessão que lhe é entregue, não vê os números reais nem os
 * consegue destapar por pedido nenhum da API.
 */
export const Definicoes: GlobalConfig = {
  slug: 'definicoes',
  label: 'Definições',
  // Arrumação, não proteção — e a distinção importa, porque já houve neste
  // projeto quem tomasse uma aba do painel por uma barreira. Sem isto o
  // comprador via na navegação um ecrã "Definições" que, para ele, abria
  // vazio: o único campo é invisível para quem não é dono. O que recusa a
  // escrita é o `access.update` abaixo, e é ele que os testes atacam.
  admin: { hidden: ({ user }) => !ehDono(user) },
  access: { read: soStaff, update: soDono },
  fields: [
    {
      name: 'dashboardDesbloqueado',
      type: 'checkbox',
      defaultValue: false,
      label: 'Dashboard de vendas com dados reais',
      admin: {
        description:
          'Desligado, o dashboard mostra uma série de demonstração com um aviso permanente de ' +
          'que os números não são os da loja. Ligado, mostra as vendas reais. Só o proprietário ' +
          'vê e muda este interruptor.',
      },
      access: { read: soDonoCampo, update: soDonoCampo },
    },
  ],
}
