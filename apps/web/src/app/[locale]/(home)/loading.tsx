/**
 * Esqueleto da home enquanto os dados carregam (Server Component, sem JS
 * necessário). Blocos neutros — `bg-cream`/`border-border`, não uma
 * identidade visual nova — só para o layout não saltar quando o conteúdo
 * real chega.
 */
export default function CarregandoHome() {
  return (
    <main aria-busy="true" className="animate-pulse">
      {/* O herói (`Hero`) é agora um banner de campanha a sangrar, na mesma
          proporção do canvas de referência — não o grid `38%/1fr` de antes. */}
      <div className="aspect-[2172/724] w-full bg-cream" />

      <div className="mx-auto max-w-7xl px-4 py-secao sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-lg border border-border bg-cream" />
          ))}
        </div>
      </div>
    </main>
  )
}
