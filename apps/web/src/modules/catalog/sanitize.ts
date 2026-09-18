import type { PublicProduct, PublicVariant } from './types'

/**
 * Campos que existem no Payload para gestão e relatórios e que NUNCA
 * podem chegar ao browser.
 *
 * Atenção: no admin estes campos estão agrupados numa aba "Interno", mas
 * isso é só organização visual — a resposta REST do Payload é plana e
 * devolve-os ao lado dos públicos. Esta lista é a única barreira real.
 */
export const INTERNAL_PRODUCT_FIELDS = ['supplier'] as const
export const INTERNAL_VARIANT_FIELDS = [
  'ean',
  'warehouseLocation',
  'shippingWeightG',
  // O custo de compra vive na VARIANTE, não no produto: um saco de ração de
  // 2 kg e outro de 10 kg são variantes do mesmo produto com custos diferentes.
  // Foi movido durante a fase 1 — se procurares por ele no produto, não está lá.
  'costCents',
] as const

type Raw = Record<string, unknown>

function pickImage(raw: unknown): { url: string; alt: string; width?: number; height?: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Raw
  if (typeof m.url !== 'string') return null
  return {
    url: m.url,
    alt: typeof m.alt === 'string' ? m.alt : '',
    ...(typeof m.width === 'number' ? { width: m.width } : {}),
    ...(typeof m.height === 'number' ? { height: m.height } : {}),
  }
}

function sanitizeVariant(raw: Raw): PublicVariant {
  return {
    id: Number(raw.id),
    sku: String(raw.sku ?? ''),
    combination: (raw.combination ?? {}) as Record<string, string>,
    priceCents: Number(raw.priceCents ?? 0),
    oldPriceCents: typeof raw.oldPriceCents === 'number' ? raw.oldPriceCents : null,
    stock: Number(raw.stock ?? 0),
    lengthCm: typeof raw.lengthCm === 'number' ? raw.lengthCm : null,
    widthCm: typeof raw.widthCm === 'number' ? raw.widthCm : null,
    heightCm: typeof raw.heightCm === 'number' ? raw.heightCm : null,
    weightG: typeof raw.weightG === 'number' ? raw.weightG : null,
  }
}

/**
 * Constrói o objeto público campo a campo, em vez de apagar os internos
 * do objeto da API. É deliberado: com uma lista de exclusão, qualquer
 * campo novo acrescentado ao Payload amanhã vazaria por omissão. Assim,
 * um campo novo só chega ao browser se alguém o acrescentar aqui de propósito.
 */
export function sanitizeProduct(raw: unknown): PublicProduct {
  const p = (raw ?? {}) as Raw
  const brand = (p.brand ?? {}) as Raw
  const cats = Array.isArray(p.categories) ? p.categories : []
  const gallery = Array.isArray(p.gallery) ? p.gallery : []
  const variants = Array.isArray(p.variants) ? p.variants : []

  return {
    id: Number(p.id),
    title: String(p.title ?? ''),
    slug: String(p.slug ?? ''),
    description: p.description,
    brand: {
      id: Number(brand.id ?? 0),
      name: String(brand.name ?? ''),
      slug: String(brand.slug ?? ''),
    },
    categories: cats.map((c) => {
      const cat = c as Raw
      return {
        id: Number(cat.id ?? 0),
        name: String(cat.name ?? ''),
        slug: String(cat.slug ?? ''),
      }
    }),
    gallery: gallery
      .map((g) => pickImage((g as Raw).image))
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .map((image) => ({ image })),
    primaryImage: pickImage(p.primaryImage),
    shareImage: pickImage(p.shareImage),
    metaTitle: typeof p.metaTitle === 'string' ? p.metaTitle : null,
    metaDescription: typeof p.metaDescription === 'string' ? p.metaDescription : null,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(0).toISOString(),
    variants: variants
      .map((v) => v as Raw)
      .filter((v) => v.active !== false)
      .map(sanitizeVariant),
  }
}
