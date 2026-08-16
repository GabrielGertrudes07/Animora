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
  variants: PublicVariant[]
}
