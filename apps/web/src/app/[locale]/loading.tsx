/**
 * Esqueleto da home enquanto os dados carregam (Server Component, sem JS
 * necessário). Blocos neutros — o mesmo par `bg-papel`/`border-line` do
 * `MediaPlaceholder`, não uma identidade visual nova — só para o layout não
 * saltar quando o conteúdo real chega.
 */
export default function CarregandoHome() {
  return (
    <main aria-busy="true" className="mx-auto max-w-7xl animate-pulse px-4 py-secao sm:px-6">
      <div className="grid gap-6 md:grid-cols-[38%_1fr] md:items-center md:gap-10">
        <div className="flex flex-col gap-3">
          <div className="h-3 w-24 rounded-full bg-papel" />
          <div className="h-8 w-full rounded-campo bg-papel" />
          <div className="h-4 w-3/4 rounded-full bg-papel" />
        </div>
        <div className="aspect-[16/7] rounded-card border border-line bg-papel" />
      </div>

      <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] rounded-card border border-line bg-papel" />
        ))}
      </div>
    </main>
  )
}
