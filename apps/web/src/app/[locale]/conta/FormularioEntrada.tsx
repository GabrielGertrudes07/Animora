'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '../../../i18n/navigation'

import { entrar, registar } from '../../../modules/account'
import { useCarrinho } from '../../../modules/cart'
import { Icon } from '../../../components/icons/sprite'

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
  const [verPassword, setVerPassword] = useState(false)
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
    <form onSubmit={submeter} className="mt-8 flex flex-col gap-5">
      {ehRegisto ? (
        <Campo id="nome" rotulo={t('nome')}>
          <input
            id="nome"
            name="nome"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={CAMPO}
          />
        </Campo>
      ) : null}

      <Campo id="email" rotulo={t('email')}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t('emailExemplo')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={CAMPO}
        />
      </Campo>

      <Campo id="password" rotulo={t('palavraPasse')} dica={ehRegisto ? t('minimo8') : undefined}>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={verPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete={ehRegisto ? 'new-password' : 'current-password'}
            aria-describedby={ehRegisto ? 'password-dica' : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${CAMPO} pr-12`}
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? t('ocultarPalavraPasse') : t('mostrarPalavraPasse')}
            aria-pressed={verPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-sm text-text-muted transition-colors hover:text-text"
          >
            <Icon name={verPassword ? 'olhoFechado' : 'olho'} className="h-5 w-5" />
          </button>
        </div>
      </Campo>

      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          <Icon name="alerta" className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={aEnviar}
        className="botao-principal mt-1 h-12 w-full py-0 text-base disabled:cursor-wait disabled:opacity-70"
      >
        {aEnviar ? t('umMomento') : ehRegisto ? t('criarConta') : t('entrar')}
      </button>

      <p className="border-t border-border pt-5 text-center text-sm text-text-muted">
        {ehRegisto ? t('jaTemConta') : t('aindaNaoTemConta')}
        <Link
          href={`/conta/${ehRegisto ? 'entrar' : 'registar'}?voltar=${encodeURIComponent(voltar)}`}
          className="inline-flex min-h-11 items-center font-semibold text-orange underline-offset-4 hover:underline sm:min-h-0"
        >
          {ehRegisto ? t('entrar') : t('criarConta')}
        </Link>
      </p>
    </form>
  )
}

const CAMPO =
  'h-12 w-full rounded-sm border border-border bg-surface px-4 text-base text-text placeholder:text-text-muted/60 transition-[border-color,box-shadow] focus:border-orange focus:outline-none focus:ring-4 focus:ring-orange/15'

function Campo({
  id,
  rotulo,
  dica,
  children,
}: {
  id: string
  rotulo: string
  dica?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-text">
        {rotulo}
      </label>
      {children}
      {dica ? (
        <p id={`${id}-dica`} className="mt-1.5 text-xs text-text-muted">
          {dica}
        </p>
      ) : null}
    </div>
  )
}
