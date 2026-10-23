'use client'

import { usePathname } from '../../i18n/navigation'

/**
 * O checkout tira o cabeçalho e o rodapé da loja: menu, pesquisa e links
 * só levam a pessoa para fora do pagamento. `usePathname` corre também no
 * servidor, por isso não há cabeçalho a aparecer e desaparecer.
 */
export function ForaDoCheckout({ children }: { children: React.ReactNode }) {
  return usePathname() === '/checkout' ? null : children
}
