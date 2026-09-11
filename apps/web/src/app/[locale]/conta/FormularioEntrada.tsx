'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '../../../i18n/navigation'

import { entrar, registar } from '../../../modules/account/acoes'
import { useCarrinho } from '../../../modules/cart/CarrinhoProvider'

/**
 * Entrar e registar — o mesmo formulário, com um campo a mais no registo.
 *
 * O que interessa aqui é a linha do `entrarNaConta`: assim que há sessão, o
 * carrinho de convidado funde-se no da conta, ficando a **maior** quantidade
 * por variante (nunca a soma). Quem tinha 2 no browser e 2 na conta continua a
 * ter 2.
 *
 * `voltar` chega sempre sem prefixo de idioma (ver Task 9/10) — `router.push`
 * é o `useRouter` locale-aware de `i18n/navigation`, que acrescenta o prefixo
 * certo sozinho.
 */
export function FormularioEntrada({
  modo,
  voltar,
}: {
  modo: 'entrar' | 'registar'
  voltar: string
}) {
  const router = useRouter()
  const { entrarNaConta } = useCarrinho()
  const t = useTranslations('FormularioEntrada')

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
    <form
      onSubmit={submeter}
      className="mt-8 flex flex-col gap-4 rounded-card bg-white p-6 shadow-sm"
    >
      {ehRegisto ? (
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-ink">
            {t('nome')}
          </label>
          <input
            id="nome"
            name="nome"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-campo border border-line bg-papel px-3 py-2 text-base text-ink sm:min-h-0 sm:text-sm"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-campo border border-line bg-papel px-3 py-2 text-base text-ink sm:min-h-0 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          {t('palavraPasse')}
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
          className="mt-1 min-h-11 w-full rounded-campo border border-line bg-papel px-3 py-2 text-base text-ink sm:min-h-0 sm:text-sm"
        />
      </div>

      {erro ? (
        <p
          role="alert"
          className="rounded-campo border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink"
        >
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={aEnviar}
        className="botao-principal"
      >
        {aEnviar ? t('umMomento') : ehRegisto ? t('criarConta') : t('entrar')}
      </button>

      <p className="text-sm text-ink-muted">
        {ehRegisto ? t('jaTemConta') : t('aindaNaoTemConta')}
        <Link
          href={`/conta/${ehRegisto ? 'entrar' : 'registar'}?voltar=${encodeURIComponent(voltar)}`}
          className="inline-flex min-h-11 items-center underline hover:text-ink sm:min-h-0"
        >
          {ehRegisto ? t('entrar') : t('criarConta')}
        </Link>
      </p>
    </form>
  )
}
