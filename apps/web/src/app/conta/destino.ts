/**
 * Para onde devolver alguém depois de entrar.
 *
 * O `?voltar=` vem do endereço, ou seja, de fora. Aceite tal e qual, um
 * `?voltar=https://sitio-parecido.pt/entrar` fazia a loja empurrar quem acabou
 * de se autenticar para um site de outra pessoa — logo a seguir a escrever a
 * palavra-passe, que é o pior momento possível para isso. Só caminhos internos
 * passam: começa por uma barra e não por duas (`//outro.pt` é um endereço
 * absoluto disfarçado de caminho).
 */
export function destinoSeguro(bruto: unknown): string {
  const v = typeof bruto === 'string' ? bruto : ''
  return v.startsWith('/') && !v.startsWith('//') ? v : '/conta'
}
