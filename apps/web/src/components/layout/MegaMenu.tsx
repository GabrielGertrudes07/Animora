'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '../../i18n/navigation'
import { Icon } from '../icons/sprite'

export type PainelCategoria = {
  slug: string
  name: string
  marcas: { nome: string; slug: string }[]
  produtos: { titulo: string; slug: string }[]
  totalProdutos: number
}

/** Pausa antes de abrir: passar o rato pela barra a caminho da página não
 *  deve fazer piscar o painel. Já aberto, a troca é imediata. */
const ATRASO_ABRIR_MS = 120
/** Pausa antes de fechar: dá tempo de atravessar a folga entre o item e o
 *  painel, ou de escorregar um pouco para fora sem o perder. */
const ATRASO_FECHAR_MS = 180

/**
 * Barra de categorias com mega-menu ao passar o rato (desktop).
 *
 * Um painel só, sempre montado. Os conteúdos de todas as categorias estão
 * empilhados na mesma célula da grelha (`gridArea: 1 / 1`) e a troca de
 * categoria é só um cruzamento de opacidade — o painel não fecha, não
 * reabre e não muda de altura (a célula mede o conteúdo mais alto). Os
 * painéis invisíveis ficam `inert`, fora do foco e do leitor de ecrã.
 *
 * Abre também por foco do teclado; `Esc` fecha e devolve o foco ao item.
 */
export function MegaMenu({ paineis }: { paineis: PainelCategoria[] }) {
  const t = useTranslations('Header')
  const pathname = usePathname()
  const [ativa, setAtiva] = useState<string | null>(null)
  // Continua a mostrar a última categoria enquanto o painel desvanece ao
  // fechar — sem isto o conteúdo sumia antes da animação acabar.
  const [visivel, setVisivel] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const raiz = useRef<HTMLDivElement>(null)

  const limpar = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const mostrar = (slug: string) => {
    limpar()
    setAtiva(slug)
    setVisivel(slug)
  }
  const abrir = (slug: string) => {
    limpar()
    if (ativa) mostrar(slug)
    else timer.current = setTimeout(() => mostrar(slug), ATRASO_ABRIR_MS)
  }
  const fechar = () => {
    limpar()
    timer.current = setTimeout(() => setAtiva(null), ATRASO_FECHAR_MS)
  }

  // Navegar (clique num link do painel ou num item) fecha o menu.
  useEffect(() => {
    limpar()
    setAtiva(null)
  }, [pathname])
  useEffect(() => limpar, [])

  const aberto = ativa !== null

  return (
    <div
      ref={raiz}
      className="relative"
      onMouseLeave={fechar}
      onBlur={(e) => {
        if (!raiz.current?.contains(e.relatedTarget as Node | null)) fechar()
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !ativa) return
        limpar()
        setAtiva(null)
        raiz.current?.querySelector<HTMLElement>(`[data-categoria="${ativa}"]`)?.focus()
      }}
    >
      <ul className="mx-auto flex min-h-9 max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-6 text-sm font-medium">
        {/* Primeiro item, sempre: a loja inteira. Sem ele só se chegava a
            produtos escolhendo primeiro uma categoria. */}
        <li className="shrink-0" onMouseEnter={fechar}>
          <Link
            href="/produtos"
            className="block rounded-sm px-3 py-1.5 text-text transition-colors hover:bg-cream"
          >
            {t('todosOsProdutos')}
          </Link>
        </li>
        {paineis.map((c) => (
          <li key={c.slug} className="shrink-0" onMouseEnter={() => abrir(c.slug)}>
            <Link
              href={`/${c.slug}`}
              data-categoria={c.slug}
              aria-expanded={ativa === c.slug}
              aria-controls="mega-menu"
              onFocus={() => mostrar(c.slug)}
              className={`flex items-center gap-1 rounded-sm px-3 py-1.5 transition-colors hover:bg-cream hover:text-text ${
                ativa === c.slug ? 'bg-cream text-text' : 'text-text-muted'
              }`}
            >
              {c.name}
              <Icon
                name="chevronDown"
                className={`h-3.5 w-3.5 transition-transform duration-300 ease-brand motion-reduce:transition-none ${
                  ativa === c.slug ? 'rotate-180' : ''
                }`}
              />
            </Link>
          </li>
        ))}
      </ul>

      <div
        id="mega-menu"
        inert={!aberto}
        onMouseEnter={limpar}
        className={`absolute inset-x-0 top-full z-40 transition-[opacity,transform] duration-200 ease-brand motion-reduce:transition-none ${
          aberto ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        {/* `pt-2` é a folga transparente entre a barra e o cartão: continua
            dentro do painel, por isso atravessá-la não conta como sair. */}
        <div className="mx-auto max-w-7xl px-6 pt-2">
          <div className="grid rounded-lg border border-border bg-surface p-4 shadow-drawer">
            {paineis.map((c, i) => (
              <ConteudoPainel
                key={c.slug}
                painel={c}
                visivel={visivel === c.slug}
                cor={CORES_TESTE[i % CORES_TESTE.length]!}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// TESTE (pedido do Gabriel): uma cor por categoria só para ver a troca entre
// painéis. Sai quando houver decisão de cor/fotografia para o cartão.
const CORES_TESTE = [
  '#0B5C6B', '#ED6900', '#7C3AED', '#DB2777', '#16A34A',
  '#2563EB', '#CA8A04', '#DC2626', '#0891B2', '#4B5563',
]

function ConteudoPainel({
  painel: c,
  visivel,
  cor,
}: {
  painel: PainelCategoria
  visivel: boolean
  cor: string
}) {
  const t = useTranslations('Header')

  return (
    <div
      style={{ gridArea: '1 / 1' }}
      inert={!visivel}
      className={`grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,5fr)] gap-10 transition-opacity duration-300 ease-brand motion-reduce:transition-none ${
        visivel ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Link
        href={`/${c.slug}`}
        style={{ backgroundColor: cor }}
        className="group relative block h-64 overflow-hidden rounded-md"
      >
        {/* Sem fotografia, por pedido do Gabriel: cartão só na cor da marca. */}
        <Icon name="paw" className="absolute right-6 top-6 h-16 w-16 text-white/15" />
        <span className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3">
          <span className="font-display text-2xl font-bold text-white">{c.name}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-white text-teal-900 transition-transform duration-300 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none">
            <Icon name="chevronRight" className="h-4 w-4" />
          </span>
        </span>
      </Link>

      <Coluna titulo={t('menuMarcas')}>
        {c.marcas.map((m) => (
          <li key={m.slug}>
            <Link href={`/${c.slug}?marca=${encodeURIComponent(m.slug)}`} className={LINK}>
              {m.nome}
            </Link>
          </li>
        ))}
      </Coluna>

      <Coluna titulo={t('menuProdutos')}>
        {c.produtos.map((p) => (
          <li key={p.slug}>
            <Link href={`/produto/${p.slug}`} className={`${LINK} line-clamp-1`}>
              {p.titulo}
            </Link>
          </li>
        ))}
        <li className="pt-1">
          <Link
            href={`/${c.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange underline-offset-4 hover:underline"
          >
            {t('menuVerTodos', { total: c.totalProdutos })}
            <Icon name="chevronRight" className="h-3.5 w-3.5" />
          </Link>
        </li>
      </Coluna>
    </div>
  )
}

const LINK = 'text-[15px] text-text transition-colors hover:text-orange'

function Coluna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{titulo}</p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}
