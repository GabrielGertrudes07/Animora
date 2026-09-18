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
 * `bg-teal-900` maciço (Task 4 da identidade laranja/teal): testado também
 * com `bg-surface` + `border-t border-border`, mas em 1440px o rodapé claro
 * confundia-se com o resto da página — o teal fecha a página com um bloco
 * de cor identificável, como o resto da paleta pede.
 */
export async function Footer() {
  const t = await getTranslations('Footer')

  return (
    <footer className="bg-teal-900">
      <div className="mx-auto max-w-7xl px-6 py-14 text-sm text-white/70">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-base font-bold text-white sm:min-h-0"
        >
          Animora
        </Link>
        <p className="mt-2 max-w-md">{t('descricao')}</p>
        <p className="mt-8 text-white/50">
          {t('direitos', { ano: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
