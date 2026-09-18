'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useCarrinho } from '../../modules/cart'
import { Link, usePathname, getPathname } from '../../i18n/navigation'
import { useLocale } from 'next-intl'
import { Icon, type IconName } from '../icons/sprite'
import { estadoNavegacaoMobile } from './estadoNavegacaoMobile'

type Categoria = { slug: string; name: string }

/**
 * A navegação da loja em telemóvel: uma barra fixa ao fundo, ao alcance do
 * polegar, em vez de quatro linhas de cabeçalho a comer um terço do ecrã.
 *
 * O cabeçalho em mobile fica reduzido ao logótipo e ao idioma (ver `Header`);
 * tudo o que é ação — procurar, percorrer categorias, conta, carrinho — vive
 * aqui em baixo. A partir de `sm` esta barra desaparece e o cabeçalho volta ao
 * layout completo: são dois desenhos, não um a encolher.
 *
 * As duas folhas (categorias e pesquisa) são `<dialog>` nativos com
 * `showModal`, o mesmo padrão já usado nos filtros do catálogo — traz fundo,
 * fecho por Esc e retenção de foco sem uma linha de JavaScript nossa.
 */
export function BarraMobile({ categorias }: { categorias: Categoria[] }) {
  const t = useTranslations('BarraMobile')
  const locale = useLocale()
  const caminho = usePathname()
  const { contagem, pronto } = useCarrinho()
  const folhaCategorias = useRef<HTMLDialogElement>(null)
  const folhaPesquisa = useRef<HTMLDialogElement>(null)

  const { naHome, naConta, noCarrinho } = estadoNavegacaoMobile(caminho)

  return (
    <>
      <nav
        aria-label={t('navegacaoAria')}
        // `env(safe-area-inset-bottom)` mantém a barra acima do indicador de
        // home dos telemóveis sem entalhe fixo; em ecrãs sem ele vale 0.
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          <ItemLink href="/" icone="home" rotulo={t('inicio')} ativo={naHome} />
          <ItemBotao
            icone="grelha"
            rotulo={t('categorias')}
            onClick={() => folhaCategorias.current?.showModal()}
          />
          <ItemBotao
            icone="search"
            rotulo={t('pesquisa')}
            onClick={() => folhaPesquisa.current?.showModal()}
          />
          <ItemLink href="/conta" icone="paw" rotulo={t('conta')} ativo={naConta} />
          <ItemLink
            href="/carrinho"
            icone="cart"
            rotulo={t('carrinho')}
            ativo={noCarrinho}
            distintivo={pronto && contagem > 0 ? contagem : undefined}
          />
        </ul>
      </nav>

      <Folha ref={folhaCategorias} titulo={t('categoriasTitulo')} fechar={t('fechar')}>
        <ul className="grid grid-cols-2 gap-2 px-5 pb-8">
          <li className="col-span-2">
            <Link
              href="/produtos"
              onClick={() => folhaCategorias.current?.close()}
              className="flex min-h-[3rem] items-center rounded-md bg-teal-900 px-4 font-semibold text-white"
            >
              {t('todosOsProdutos')}
            </Link>
          </li>
          {categorias.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                onClick={() => folhaCategorias.current?.close()}
                className="flex min-h-[3rem] items-center rounded-md border border-border px-4 font-medium text-text"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </Folha>

      <Folha ref={folhaPesquisa} titulo={t('pesquisaTitulo')} fechar={t('fechar')}>
        <form
          action={getPathname({ href: '/produtos', locale })}
          method="get"
          className="flex items-center gap-2 px-5 pb-8"
        >
          <div className="flex flex-1 items-center gap-2 rounded-pill border border-border bg-cream/60 px-4 py-3 focus-within:border-orange">
            <Icon name="search" className="h-5 w-5 shrink-0 text-text-muted" />
            <input
              type="search"
              name="q"
              // Sem `autoFocus`: o teclado a saltar por cima da folha antes de
              // ela acabar de subir dá um salto feio. Quem abriu a folha já
              // tem o dedo a caminho do campo.
              placeholder={t('pesquisaPlaceholder')}
              aria-label={t('pesquisaAria')}
              className="w-full min-w-0 bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="botao-principal min-h-[3rem] shrink-0 px-5 py-0"
          >
            {t('procurar')}
          </button>
        </form>
      </Folha>
    </>
  )
}

function ItemLink({
  href,
  icone,
  rotulo,
  ativo,
  distintivo,
}: {
  href: string
  icone: IconName
  rotulo: string
  ativo: boolean
  distintivo?: number
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={ativo ? 'page' : undefined}
        className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
          ativo ? 'text-orange-deep' : 'text-text-muted'
        }`}
      >
        <Icon name={icone} className="h-6 w-6" />
        {rotulo}
        {distintivo ? (
          <span className="absolute right-[22%] top-1.5 min-w-[1.15rem] rounded-full bg-orange-deep px-1 text-center text-[0.625rem] font-bold leading-[1.15rem] text-white">
            {distintivo}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

function ItemBotao({
  icone,
  rotulo,
  onClick,
}: {
  icone: IconName
  rotulo: string
  onClick: () => void
}) {
  return (
    <li className="flex-1">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-text-muted"
      >
        <Icon name={icone} className="h-6 w-6" />
        {rotulo}
      </button>
    </li>
  )
}

/**
 * Folha inferior. Mesmo desenho da folha de filtros do catálogo: `<dialog>`
 * nativo ancorado em baixo, fundo creme, canto superior arredondado, e fecho
 * ao clicar fora — que se distingue do clique dentro comparando o alvo com o
 * próprio `<dialog>`.
 */
function Folha({
  ref,
  titulo,
  fechar,
  children,
}: {
  ref: React.RefObject<HTMLDialogElement | null>
  titulo: string
  fechar: string
  children: React.ReactNode
}) {
  return (
    <dialog
      ref={ref}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
      className="m-0 max-h-[85vh] w-full max-w-full rounded-t-lg border-t border-border bg-cream p-0 shadow-drawer backdrop:bg-text/40 sm:hidden [&[open]]:fixed [&[open]]:inset-x-0 [&[open]]:bottom-0 [&[open]]:top-auto"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-semibold text-text">{titulo}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={fechar}
          className="flex h-11 w-11 items-center justify-center rounded-sm border border-border text-text-muted"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
