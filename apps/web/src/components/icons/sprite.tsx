const PATHS = {
  cart: 'M6 6h15l-1.5 9h-12zM6 6L5 3H2m4 16a1 1 0 100 2 1 1 0 000-2zm12 0a1 1 0 100 2 1 1 0 000-2z',
  heart: 'M12 20s-7-4.5-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.5-7 9-7 9z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  shield: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
  paw: 'M5 11a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM9 7a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm-3 5c-3 0-5 2-5 4s2 3 5 3 5-1 5-3-2-4-5-4z',
  filter: 'M4 5h16M7 5v0a3 3 0 006 0v0M7 12h10M11 12v0a3 3 0 006 0v0M4 19h16M9 19v0a3 3 0 006 0v0',
  close: 'M6 6l12 12M18 6L6 18',
  home: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z',
  grelha: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
} as const

export type IconName = keyof typeof PATHS

/**
 * `paw` não tem linha interior nenhuma para o traço preservar — só
 * círculos e um blob. Riscado (como todos os outros ícones), lê-se como
 * argolas ocas em vez de uma pata; a referência visual do Gabriel usa-a
 * sempre preenchida a sólido. É a única excepção à convenção de traço.
 */
const PREENCHIDOS = new Set<IconName>(['paw'])

/**
 * Ícone em SVG, herdando a cor do texto.
 *
 * Decorativo por omissão (`aria-hidden`). Se for a única coisa dentro de
 * um botão, passar `title` para lhe dar nome acessível.
 */
export function Icon({
  name,
  className = 'h-5 w-5',
  title,
}: {
  name: IconName
  className?: string
  title?: string
}) {
  const preenchido = PREENCHIDOS.has(name)
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={preenchido ? 'currentColor' : 'none'}
      stroke={preenchido ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  )
}
