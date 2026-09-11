/**
 * Desenhos para os estados vazios — a mesma mão do sprite de ícones
 * (`sprite.tsx`): traço de espessura única, pontas redondas, cor herdada do
 * texto, com um acento em terracota nas partes cheias.
 *
 * São desenhos e não texto cinzento porque o sítio onde aparecem é sempre um
 * momento em que não há nada para mostrar — carrinho vazio, filtros sem
 * resultado, nenhuma encomenda ainda. Numa loja de animais há ali espaço para
 * simpatia, e um ecrã com um desenho não parece uma página partida.
 */

const PATA_GRANDE = (
  <>
    <ellipse cx="70" cy="60" rx="12" ry="10" className="fill-terracota/25 stroke-terracota" />
    <circle cx="55" cy="42" r="5" className="fill-terracota/25 stroke-terracota" />
    <circle cx="69" cy="36" r="5" className="fill-terracota/25 stroke-terracota" />
    <circle cx="84" cy="42" r="5" className="fill-terracota/25 stroke-terracota" />
  </>
)

const DESENHOS = {
  /** Tigela vazia — carrinho sem nada, catálogo sem produtos. */
  tigela: (
    <>
      <path d="M32 66h76l-9 30a12 12 0 0 1-11.5 9H52.5A12 12 0 0 1 41 96Z" className="fill-papel" />
      <ellipse cx="70" cy="66" rx="38" ry="10" className="fill-white" />
      <ellipse cx="70" cy="66" rx="26" ry="6" className="stroke-terracota/50" />
      <ellipse cx="70" cy="30" rx="8" ry="6.5" className="fill-terracota/25 stroke-terracota" />
      <circle cx="59" cy="18" r="3.5" className="fill-terracota/25 stroke-terracota" />
      <circle cx="70" cy="14" r="3.5" className="fill-terracota/25 stroke-terracota" />
      <circle cx="81" cy="18" r="3.5" className="fill-terracota/25 stroke-terracota" />
    </>
  ),
  /** Lupa com uma pata dentro — nenhum resultado para os filtros escolhidos. */
  lupa: (
    <>
      <circle cx="70" cy="52" r="36" className="fill-white" />
      <path d="M96 78 118 100" strokeWidth={7} />
      {PATA_GRANDE}
    </>
  ),
  /** Coração com uma pata — nenhum favorito guardado. */
  coracao: (
    <>
      <path
        d="M70 104C34 82 22 64 30 48c6-12 22-15 32-6 3 3 6 7 8 11 2-4 5-8 8-11 10-9 26-6 32 6 8 16-4 34-40 56Z"
        className="fill-papel"
      />
      <ellipse cx="70" cy="62" rx="10" ry="8" className="fill-terracota/25 stroke-terracota" />
      <circle cx="58" cy="48" r="4" className="fill-terracota/25 stroke-terracota" />
      <circle cx="70" cy="43" r="4" className="fill-terracota/25 stroke-terracota" />
      <circle cx="82" cy="48" r="4" className="fill-terracota/25 stroke-terracota" />
    </>
  ),
  /** Caixa fechada com um selo de pata — nenhuma encomenda ainda. */
  caixa: (
    <>
      <path d="M28 50h84v54a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6Z" className="fill-white" />
      <path d="M22 30h96v20H22Z" className="fill-papel" />
      <path d="M70 50V30" />
      <ellipse cx="70" cy="78" rx="9" ry="7" className="fill-terracota/25 stroke-terracota" />
      <circle cx="59" cy="66" r="3.6" className="fill-terracota/25 stroke-terracota" />
      <circle cx="70" cy="62" r="3.6" className="fill-terracota/25 stroke-terracota" />
      <circle cx="81" cy="66" r="3.6" className="fill-terracota/25 stroke-terracota" />
    </>
  ),
} as const

export type IlustracaoName = keyof typeof DESENHOS

/** Decorativa por natureza: o texto ao lado é que diz o que se passa. */
export function Ilustracao({
  name,
  className = 'h-28 w-auto',
}: {
  name: IlustracaoName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 140 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {DESENHOS[name]}
    </svg>
  )
}
