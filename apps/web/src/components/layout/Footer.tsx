import Link from 'next/link'

/**
 * Rodapé mínimo, de propósito.
 *
 * O site antigo tinha 36 links a apontar para `#` — Ajuda, Conta, Sobre nós,
 * redes sociais, tudo por preencher. Isso foi apontado como defeito na
 * crítica que originou este projeto. Enquanto não existirem páginas de
 * apoio ao cliente (contactos, termos, privacidade, ...), o rodapé não
 * finge que existem: fica só o nome, a descrição da loja e o ano.
 */
export function Footer() {
  return (
    <footer className="border-t border-line bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-ink-muted">
        <Link href="/" className="text-base font-bold text-ink">
          Animora
        </Link>
        <p className="mt-2 max-w-md">
          Alimentação, acessórios, higiene e treino para cães, gatos, pássaros e pequenos animais.
        </p>
        <p className="mt-6">© {new Date().getFullYear()} Animora. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}
