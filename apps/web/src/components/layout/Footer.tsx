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
 * Fase estrutural v1: fundo neutro. O chão de floresta (`.chao-floresta` em
 * `globals.css`) que fechava a home na mesma luz do cartaz volta na fase de
 * criativos — não foi removido, só desligado aqui.
 */
export async function Footer() {
  const t = await getTranslations('Footer')

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl px-6 py-14 text-sm text-ink-muted">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-base font-bold text-ink sm:min-h-0"
        >
          Animora
        </Link>
        <p className="mt-2 max-w-md">{t('descricao')}</p>
        <p className="mt-8 text-ink-muted/70">
          {t('direitos', { ano: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
