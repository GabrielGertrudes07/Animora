/**
 * Esqueleto de `/produtos` — nunca de `/[categoria]` nem de
 * `/produto/[slug]`: as duas chamam `notFound()`, e um `loading.tsx`
 * ancestral força o Next a começar a transmitir a resposta como 200 antes
 * do `notFound()` resolver, trocando o 404 real por um 404 "de mentira"
 * (conteúdo certo, código de estado errado). Por isso este arquivo vive
 * só aqui — `/produtos` nunca dá 404 — e não em `[locale]/`, onde cobriria
 * as duas rotas que precisam do status certo. Ver `docs/CURRENT_STATE.md`,
 * Fase 7.
 */
export default function CarregandoProdutos() {
  return (
    <main aria-busy="true" className="mx-auto max-w-7xl animate-pulse px-4 py-6 sm:px-6 sm:py-10">
      <div className="h-4 w-40 rounded-full bg-papel" />
      <div className="mt-3 h-9 w-64 rounded-campo bg-papel" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-papel" />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="hidden w-64 shrink-0 flex-col gap-3 lg:flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-campo bg-papel" />
          ))}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-card border border-line bg-papel" />
          ))}
        </div>
      </div>
    </main>
  )
}
