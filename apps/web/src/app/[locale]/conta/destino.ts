import { routing } from '../../../i18n/routing'

/**
 * Para onde devolver alguém depois de entrar.
 *
 * O `?voltar=` vem do endereço, ou seja, de fora. Aceite tal e qual, um
 * `?voltar=https://sitio-parecido.pt/entrar` fazia a loja empurrar quem acabou
 * de se autenticar para um site de outra pessoa — logo a seguir a escrever a
 * palavra-passe, que é o pior momento possível para isso. Só caminhos internos
 * passam: começa por uma barra e não por duas (`//outro.pt` é um endereço
 * absoluto disfarçado de caminho).
 *
 * `voltar` é sempre um caminho SEM prefixo de idioma por convenção — o prefixo
 * é acrescentado uma única vez, no `redirect`/`router.push` que de facto
 * navega. Mas isto vem de fora, e nada impede `?voltar=/de/checkout`: sem
 * despir esse prefixo aqui, a navegação seguinte acrescentava outro por cima
 * (`/de/de/checkout`, um 404), ou pior — trocava de idioma sem se dar conta
 * logo a seguir a entrar com a palavra-passe.
 */
export function destinoSeguro(bruto: unknown): string {
  const v = typeof bruto === 'string' ? bruto : ''
  if (!v.startsWith('/') || v.startsWith('//')) return '/conta'

  for (const locale of routing.locales) {
    const prefixo = `/${locale}`
    if (v === prefixo) return '/'
    if (v.startsWith(`${prefixo}/`)) return v.slice(prefixo.length)
  }

  return v
}
