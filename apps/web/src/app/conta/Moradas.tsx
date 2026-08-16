'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { apagarMorada, guardarMorada } from '../../modules/account/acoes'
import type { Morada } from '../../modules/account/sessao'

const VAZIA: Morada = {
  etiqueta: '',
  nomeDestinatario: '',
  linha1: '',
  linha2: '',
  codigoPostal: '',
  localidade: '',
  telefone: '',
}

/**
 * As moradas da conta.
 *
 * O formato do código postal é verificado pelo browser (`pattern` nativo) e
 * pela coleção do Payload, que é quem decide o que fica gravado. Não há aqui
 * uma terceira cópia da expressão regular: duas versões da mesma regra acabam
 * sempre por discordar, e a que ganha é a que grava.
 */
export function Moradas({ moradas }: { moradas: Morada[] }) {
  const router = useRouter()
  const [nova, setNova] = useState<Morada>(VAZIA)
  const [aberto, setAberto] = useState(moradas.length === 0)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault()
    setAGravar(true)
    setErro('')

    const r = await guardarMorada(nova)
    setAGravar(false)

    if (!r.ok) {
      setErro(r.erro)
      return
    }

    setNova(VAZIA)
    setAberto(false)
    router.refresh()
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-ink">Moradas</h2>

      {moradas.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {moradas.map((m, i) => (
            <li key={`${m.codigoPostal}-${i}`} className="rounded-card bg-white p-4 shadow-sm">
              {m.etiqueta ? <p className="font-semibold text-ink">{m.etiqueta}</p> : null}
              <p className="text-sm text-ink">{m.nomeDestinatario}</p>
              <p className="text-sm text-ink-muted">
                {m.linha1}
                {m.linha2 ? `, ${m.linha2}` : ''}
                <br />
                {m.codigoPostal} {m.localidade}
                {m.telefone ? (
                  <>
                    <br />
                    {m.telefone}
                  </>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => {
                  void apagarMorada(i).then((r) => {
                    if (r.ok) router.refresh()
                    else setErro(r.erro)
                  })
                }}
                className="mt-3 text-sm text-ink-muted underline transition-colors hover:text-terracota-dark"
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-ink-muted">Ainda não guardou nenhuma morada.</p>
      )}

      {aberto ? (
        <form onSubmit={gravar} className="mt-4 grid gap-4 rounded-card bg-white p-4 shadow-sm sm:grid-cols-2">
          <Campo
            id="m-nome"
            rotulo="Destinatário"
            valor={nova.nomeDestinatario}
            obrigatorio
            aoMudar={(v) => setNova({ ...nova, nomeDestinatario: v })}
            className="sm:col-span-2"
          />
          <Campo
            id="m-linha1"
            rotulo="Morada"
            valor={nova.linha1}
            obrigatorio
            aoMudar={(v) => setNova({ ...nova, linha1: v })}
            className="sm:col-span-2"
          />
          <Campo
            id="m-linha2"
            rotulo="Morada (cont.)"
            valor={nova.linha2}
            aoMudar={(v) => setNova({ ...nova, linha2: v })}
            className="sm:col-span-2"
          />
          <Campo
            id="m-cp"
            rotulo="Código postal"
            valor={nova.codigoPostal}
            obrigatorio
            padrao="\d{4}-\d{3}"
            dica="1234-567"
            aoMudar={(v) => setNova({ ...nova, codigoPostal: v })}
          />
          <Campo
            id="m-localidade"
            rotulo="Localidade"
            valor={nova.localidade}
            obrigatorio
            aoMudar={(v) => setNova({ ...nova, localidade: v })}
          />
          <Campo
            id="m-telefone"
            rotulo="Telefone"
            valor={nova.telefone}
            tipo="tel"
            aoMudar={(v) => setNova({ ...nova, telefone: v })}
          />
          <Campo
            id="m-etiqueta"
            rotulo="Etiqueta (Casa, Trabalho…)"
            valor={nova.etiqueta}
            aoMudar={(v) => setNova({ ...nova, etiqueta: v })}
          />

          {erro ? (
            <p
              role="alert"
              className="rounded-lg border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink sm:col-span-2"
            >
              {erro}
            </p>
          ) : null}

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={aGravar}
              className="rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark disabled:opacity-60"
            >
              {aGravar ? 'A gravar…' : 'Guardar morada'}
            </button>
            {moradas.length > 0 ? (
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-xl border border-line px-6 py-3 font-medium text-ink-muted transition-colors hover:text-ink"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-4 rounded-xl border border-line bg-white px-6 py-3 font-medium text-ink transition-colors hover:border-terracota"
        >
          Acrescentar morada
        </button>
      )}
    </section>
  )
}

function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  obrigatorio = false,
  tipo = 'text',
  padrao,
  dica,
  className = '',
}: {
  id: string
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  obrigatorio?: boolean
  tipo?: string
  padrao?: string
  dica?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {rotulo}
        {obrigatorio ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        value={valor}
        required={obrigatorio}
        pattern={padrao}
        placeholder={dica}
        onChange={(e) => aoMudar(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-ink"
      />
    </div>
  )
}
