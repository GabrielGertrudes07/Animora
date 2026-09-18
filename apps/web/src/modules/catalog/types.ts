export type PublicVariant = {
  id: number
  sku: string
  combination: Record<string, string>
  priceCents: number
  oldPriceCents?: number | null
  stock: number
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightG?: number | null
}

export type PublicProduct = {
  id: number
  title: string
  slug: string
  description?: unknown
  brand: { id: number; name: string; slug: string }
  categories: { id: number; name: string; slug: string }[]
  gallery: { image: { url: string; alt: string; width?: number; height?: number } }[]
  primaryImage?: { url: string; alt: string; width?: number; height?: number } | null
  /**
   * Imagem própria para partilha em redes sociais (tipicamente 1200×630).
   * Só é usada nos metadados Open Graph — a ficha continua a mostrar a
   * `primaryImage`, que é a fotografia do catálogo.
   */
  shareImage?: { url: string; alt: string; width?: number; height?: number } | null
  metaTitle?: string | null
  metaDescription?: string | null
  /** ISO, gerido pelo Payload — nunca escrito por esta loja. É o único sinal
   * real de "mais recente" que existe; a ordenação por recência usa isto. */
  createdAt: string
  variants: PublicVariant[]
}

/**
 * Definição de um atributo tal como a loja o vê — já depois da API ter
 * filtrado alcance `interno` (ver `access/leitura.ts` na API; a loja não
 * duplica essa verificação, só confia nela).
 *
 * `tipo` e `controlo` espelham `Attributes.ts`. A loja não tem um campo de
 * valor próprio por atributo: os valores reais vêm de `combination` nas
 * variantes (o mesmo JSON livre que já serve "Tamanho"/"Cor" na ficha de
 * produto), cruzado por nome com a `chave` normalizada — ver `facets.ts`.
 */
export type AttributeDef = {
  id: number
  nome: string
  chave: string
  tipo: 'select' | 'multiselect' | 'intervalo' | 'booleano'
  controlo: 'caixas' | 'intervalo' | 'amostras' | 'chips'
  ordem: number
  abertoPorOmissao: boolean
}

/**
 * Um `AttributeDef` já cruzado com os produtos publicados: só existe quando
 * há pelo menos um valor real. `valores` guarda o texto tal como aparece nas
 * variantes; `min`/`max` só se aplicam a `tipo: 'intervalo'`, calculados a
 * partir desses mesmos valores lidos como número.
 */
export type AttributeFacet = AttributeDef & {
  valores: string[]
  min?: number
  max?: number
}
