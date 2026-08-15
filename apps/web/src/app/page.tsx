import { formatEuros } from '@animora/core'

export default function Home() {
  return (
    <main>
      <h1>Animora</h1>
      <p>A loja chega no plano 2. Exemplo de formatação: {formatEuros(2990)}</p>
    </main>
  )
}
