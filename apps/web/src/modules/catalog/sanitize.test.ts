import { describe, it, expect } from 'vitest'
import { sanitizeProduct, INTERNAL_PRODUCT_FIELDS, INTERNAL_VARIANT_FIELDS } from './sanitize'

const cru = {
  id: 1,
  title: 'Coleira ajustável para cães',
  slug: 'coleira-ajustavel-caes',
  brand: { id: 1, name: 'HappyPaws', slug: 'happypaws' },
  categories: [{ id: 1, name: 'Coleiras', slug: 'coleiras' }],
  gallery: [],
  // campos internos que a API devolve e que NUNCA podem chegar ao browser
  supplier: 'Fornecedor Secreto Lda',
  variants: [
    {
      id: 1,
      sku: 'HAP-COL-S',
      combination: { Tamanho: 'S' },
      priceCents: 2990,
      stock: 12,
      active: true,
      ean: '5601234567890',
      warehouseLocation: 'A-12-3',
      shippingWeightG: 150,
      costCents: 1200,
    },
  ],
}

describe('sanitizeProduct', () => {
  it('mantém os campos públicos', () => {
    const p = sanitizeProduct(cru)
    expect(p.title).toBe('Coleira ajustável para cães')
    expect(p.slug).toBe('coleira-ajustavel-caes')
    expect(p.brand.name).toBe('HappyPaws')
    expect(p.variants[0]?.priceCents).toBe(2990)
    expect(p.variants[0]?.stock).toBe(12)
  })

  it('remove o fornecedor do produto', () => {
    const p = sanitizeProduct(cru) as unknown as Record<string, unknown>
    expect(p.supplier).toBeUndefined()
  })

  it('remove EAN, armazém, peso de portes e CUSTO DE COMPRA das variantes', () => {
    const v = sanitizeProduct(cru).variants[0] as unknown as Record<string, unknown>
    expect(v.ean).toBeUndefined()
    expect(v.warehouseLocation).toBeUndefined()
    expect(v.shippingWeightG).toBeUndefined()
    // O custo vive na variante desde a fase 1. Se este teste passar por o campo
    // não existir no produto, em vez de por ser removido da variante, o custo
    // de compra vaza para a loja.
    expect(v.costCents).toBeUndefined()
  })

  it('nao deixa passar nenhum campo interno, mesmo que a API acrescente outros', () => {
    const serializado = JSON.stringify(sanitizeProduct(cru))
    for (const campo of [...INTERNAL_PRODUCT_FIELDS, ...INTERNAL_VARIANT_FIELDS]) {
      expect(serializado).not.toContain(campo)
    }
    expect(serializado).not.toContain('Fornecedor Secreto')
    expect(serializado).not.toContain('A-12-3')
  })

  it('copia a imagem de partilha, que a ficha usa no Open Graph', () => {
    // O campo existia no Payload e a spec prometia-o, mas não estava no
    // `PublicProduct` nem era copiado aqui — quem carregasse uma imagem 1200×630
    // própria para partilha via sair na mesma a fotografia quadrada do catálogo.
    const p = sanitizeProduct({
      ...cru,
      shareImage: { url: '/api/media/file/partilha.webp', alt: 'Partilha', width: 1200, height: 630 },
    })
    expect(p.shareImage).toEqual({
      url: '/api/media/file/partilha.webp',
      alt: 'Partilha',
      width: 1200,
      height: 630,
    })
  })

  it('sem imagem de partilha devolve null, para o encadeamento cair na seguinte', () => {
    expect(sanitizeProduct(cru).shareImage).toBeNull()
  })

  it('descarta variantes inativas', () => {
    const comInativa = {
      ...cru,
      variants: [...cru.variants, { ...cru.variants[0], id: 2, sku: 'X', active: false }],
    }
    expect(sanitizeProduct(comInativa).variants).toHaveLength(1)
  })
})
