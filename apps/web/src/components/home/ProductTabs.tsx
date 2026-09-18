'use client'

import { useState, type ReactNode } from 'react'

type Grupo = { chave: string; titulo: string; produtos: ReactNode }

/**
 * Alterna entre grupos de produtos já montados por fora (Server Component
 * pai) — a única interação real aqui é a troca de aba, daí ser o único
 * pedaço desta secção que precisa de ser Client Component.
 */
export function ProductTabs({ grupos }: { grupos: Grupo[] }) {
  const [ativa, setAtiva] = useState(grupos[0]?.chave)

  return (
    <div>
      <div role="tablist" className="flex gap-2 border-b border-border">
        {grupos.map((g) => (
          <button
            key={g.chave}
            role="tab"
            aria-selected={g.chave === ativa}
            onClick={() => setAtiva(g.chave)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition-colors ${
              g.chave === ativa ? 'bg-orange text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {g.titulo}
          </button>
        ))}
      </div>
      {grupos.map((g) => (g.chave === ativa ? <div key={g.chave}>{g.produtos}</div> : null))}
    </div>
  )
}
