/**
 * Um bloco `<script type="application/ld+json">`. Escapa `<` de propósito —
 * um título ou descrição vindos do painel com um "</script>" literal
 * fechariam a tag cedo, e o resto do JSON viraria HTML solto na página.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
