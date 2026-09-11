import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'

/**
 * Rodapé mínimo, de propósito.
 *
 * O site antigo tinha 36 links a apontar para `#` — Ajuda, Conta, Sobre nós,
 * redes sociais, tudo por preencher. Isso foi apontado como defeito na
 * crítica que originou este projeto. Enquanto não existirem páginas de
 * apoio ao cliente (contactos, termos, privacidade, ...), o rodapé não
 * finge que existem: fica só o nome, a descrição da loja e o ano.
 *
 * Assenta no chão de floresta (ver `.chao-floresta` em `globals.css`) — é a
 * terceira e última aparição da clareira do cartaz na home, e é ela que fecha
 * a página na mesma luz com que abriu, em vez de a deixar acabar em creme.
 */
export async function Footer() {
  const t = await getTranslations('Footer')

  return (
    <footer className="chao-floresta">
      <div className="mx-auto max-w-7xl px-6 py-14 text-sm text-papel/65">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-base font-bold text-papel sm:min-h-0"
        >
          Animora
        </Link>
        <p className="mt-2 max-w-md">{t('descricao')}</p>
        <p className="mt-8 text-papel/50">
          {t('direitos', { ano: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
