'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { entrar, registar } from '../../modules/account/acoes'
import { useCarrinho } from '../../modules/cart/CarrinhoProvider'

/**
 * Entrar e registar — o mesmo formulário, com um campo a mais no registo.
 *
 * O que interessa aqui é a linha do `entrarNaConta`: assim que há sessão, o
 * carrinho de convidado funde-se no da conta, ficando a **maior** quantidade
 * por variante (nunca a soma). Quem tinha 2 no browser e 2 na conta continua a
 * ter 2.
 *
 * `voltar` é para não perder a compra a meio: quem chegou aqui empurrado pelo
 * `/checkout` volta ao `/checkout`, com o carrinho intacto — ele nunca saiu do
 * `localStorage`.
 */
export function FormularioEntrada({ modo, voltar }: { modo: 'entrar' | 'registar'; voltar: string }) {
  const router = useRouter()
  const { entrarNaConta } = useCarrinho()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [aEnviar, setAEnviar] = useState(false)

  const ehRegisto = modo === 'registar'

  async function submeter(evento: React.FormEvent) {
    evento.preventDefault()
    setAEnviar(true)
    setErro('')

    const r = ehRegisto ? await registar(nome, email, password) : await entrar(email, password)

    if (!r.ok) {
      setErro(r.erro)
      setAEnviar(false)
      return
    }

    entrarNaConta(r.clienteId)
    router.push(voltar)
    // As páginas da conta são renderizadas no servidor com o cookie novo.
    router.refresh()
  }

  return (
    <form onSubmit={submeter} className="mt-8 flex flex-col gap-4 rounded-card bg-white p-6 shadow-sm">
      {ehRegisto ? (
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-ink">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-ink"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={ehRegisto ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-ink"
        />
      </div>

      {erro ? (
        <p
          role="alert"
          className="rounded-lg border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink"
        >
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={aEnviar}
        className="rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark disabled:opacity-60"
      >
        {aEnviar ? 'Um momento…' : ehRegisto ? 'Criar conta' : 'Entrar'}
      </button>

      <p className="text-sm text-ink-muted">
        {ehRegisto ? 'Já tem conta? ' : 'Ainda não tem conta? '}
        <Link
          href={`/conta/${ehRegisto ? 'entrar' : 'registar'}?voltar=${encodeURIComponent(voltar)}`}
          className="underline hover:text-ink"
        >
          {ehRegisto ? 'Entrar' : 'Criar conta'}
        </Link>
      </p>
    </form>
  )
}
