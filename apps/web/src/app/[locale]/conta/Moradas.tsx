'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '../../../i18n/navigation'

import { apagarMorada, guardarMorada } from '../../../modules/account/acoes'
import type { Morada } from '../../../modules/account/sessao'

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
 * sempre por discordar, e a que ganha é a que grava. Fica português em pt e em
 * de nesta fase — internacionalizar o formato por país é o sub-projeto 3.
 */
export function Moradas({ moradas }: { moradas: Morada[] }) {
  const router = useRouter()
  const t = useTranslations('Moradas')
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
      <h2 className="text-xl font-bold text-ink">{t('titulo')}</h2>

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
                {t('apagar')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-ink-muted">{t('semMoradas')}</p>
      )}

      {aberto ? (
        <form onSubmit={gravar} className="mt-4 grid gap-4 rounded-card bg-white p-4 shadow-sm sm:grid-cols-2">
          <Campo
            id="m-nome"
            rotulo={t('destinatario')}
            valor={nova.nomeDestinatario}
            obrigatorio
            aoMudar={(v) => setNova({ ...nova, nomeDestinatario: v })}
            className="sm:col-span-2"
          />
          <Campo
            id="m-linha1"
            rotulo={t('morada')}
            valor={nova.linha1}
            obrigatorio
            aoMudar={(v) => setNova({ ...nova, linha1: v })}
            className="sm:col-span-2"
          />
          <Campo
            id="m-linha2"
            rotulo={t('moradaCont')}
            valor={nova.linha2}
            aoMudar={(v) => setNova({ ...nova, linha2: v })}
            className="sm:col-span-2"
          />
          <Campo
            id="m-cp"
            rotulo={t('codigoPostal')}
            valor={nova.codigoPostal}
            obrigatorio
            padrao="\d{4}-\d{3}"
            dica={t('codigoPostalDica')}
            aoMudar={(v) => setNova({ ...nova, codigoPostal: v })}
          />
          <Campo
            id="m-localidade"
            rotulo={t('localidade')}
            valor={nova.localidade}
            obrigatorio
            aoMudar={(v) => setNova({ ...nova, localidade: v })}
          />
          <Campo
            id="m-telefone"
            rotulo={t('telefone')}
            valor={nova.telefone}
            tipo="tel"
            aoMudar={(v) => setNova({ ...nova, telefone: v })}
          />
          <Campo
            id="m-etiqueta"
            rotulo={t('etiqueta')}
            valor={nova.etiqueta}
            aoMudar={(v) => setNova({ ...nova, etiqueta: v })}
          />

          {erro ? (
            <p
              role="alert"
              className="rounded-campo border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink sm:col-span-2"
            >
              {erro}
            </p>
          ) : null}

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={aGravar}
              className="botao-principal"
            >
              {aGravar ? t('aGravar') : t('guardarMorada')}
            </button>
            {moradas.length > 0 ? (
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-card border border-line px-6 py-3 font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('cancelar')}
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-4 rounded-card border border-line bg-white px-6 py-3 font-medium text-ink transition-colors hover:border-terracota"
        >
          {t('acrescentarMorada')}
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
        className="mt-1 w-full rounded-campo border border-line bg-papel px-3 py-2 text-ink"
      />
    </div>
  )
}
