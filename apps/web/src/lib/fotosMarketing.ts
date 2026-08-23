/**
 * Fotografia de referência (Unsplash) para o hero, categorias visuais e a
 * secção "Aprovado por quem manda" — enquanto não há fotografia própria de
 * produto nem de categoria. Um sítio só, para trocar por fotografia real
 * sem caçar URLs espalhadas por vários componentes.
 *
 * IDs verificados a resolver (200) antes de entrarem aqui — um ID adivinhado
 * dá 404 e mostra uma imagem partida.
 */
function unsplash(id: string, w: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`
}

export const FOTOS_MARKETING = {
  bulldogCamisola: unsplash('1583337130417-3346a1be7dee', 700),
  gatinhoAEsticar: unsplash('1592194996308-7b43878e84a6', 700),
  cachorroRetriever: unsplash('1591160690555-5debfba289f0', 700),
  gatoMalhado: unsplash('1573865526739-10659fec78a5', 600),
  papagaioPoleiro: unsplash('1555169062-013468b47731', 600),
  porquinhosDaIndia: unsplash('1548767797-d8c844163c4c', 600),
  peixeDourado: unsplash('1522069169874-c58ec4b76be5', 600),
} as const
