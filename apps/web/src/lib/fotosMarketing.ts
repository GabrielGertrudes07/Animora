/**
 * Os retratos de "Aprovado por quem manda" são imagens locais geradas para
 * a identidade laranja/teal. Prompts e origem: docs/imagens-marketing.md.
 * Referências Unsplash restantes preservadas para os outros consumidores.
 *
 * IDs verificados a resolver (200) antes de entrarem aqui — um ID adivinhado
 * dá 404 e mostra uma imagem partida.
 */
function unsplash(id: string, w: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`
}

export const FOTOS_MARKETING = {
  bulldogCamisola: '/marketing/oscar-bulldog.webp',
  gatinhoAEsticar: '/marketing/mimi-gatinha.webp',
  cachorroRetriever: '/marketing/boris-retriever.webp',
  gatoMalhado: '/marketing/simba-gato.webp',
  papagaioPoleiro: unsplash('1555169062-013468b47731', 600),
  porquinhosDaIndia: unsplash('1548767797-d8c844163c4c', 600),
  peixeDourado: unsplash('1522069169874-c58ec4b76be5', 600),
} as const
