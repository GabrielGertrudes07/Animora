import Image from 'next/image'
import Link from 'next/link'
import { listCategories } from '../../modules/catalog'
import { CarrinhoBotao } from './CarrinhoBotao'
import { Icon } from '../icons/sprite'

/**
 * Cabeçalho presente em todas as páginas.
 *
 * As categorias vêm da base de dados (`listCategories`) — nunca escritas à
 * mão aqui. Em ecrãs estreitos, a lista de categorias ganha scroll horizontal
 * próprio (`overflow-x-auto`) em vez de espremer a página inteira: a página
 * nunca ganha scroll horizontal, só esta barra.
 *
 * O carrinho deixou de ser um botão desativado com "em breve": é um link com o
 * número de artigos. É a única parte interativa daqui, e por isso a única que é
 * um Client Component — o resto continua a ser lido no servidor.
 */
export async function Header() {
  const categorias = await listCategories()

  return (
    <header className="border-b border-line bg-cream">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Animora — página inicial">
          <Image
            src="/logo.png"
            alt="Animora"
            width={1024}
            height={493}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/conta"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <Icon name="paw" className="h-5 w-5" />
            <span className="hidden sm:inline">Conta</span>
          </Link>
          <CarrinhoBotao />
        </div>
      </div>

      {categorias.length > 0 ? (
        <nav aria-label="Categorias" className="border-t border-line">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto whitespace-nowrap px-6 py-2 text-sm">
            {categorias.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={`/${c.slug}`}
                  className="block rounded-lg px-3 py-1.5 font-medium text-ink-muted transition-colors hover:bg-white hover:text-ink"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
