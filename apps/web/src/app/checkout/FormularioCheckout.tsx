'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatEuros } from '@animora/core'

import { guardarMorada } from '../../modules/account/acoes'
import type { Morada } from '../../modules/account/sessao'
import { carregarLinhas, comprar, type FaltaStock } from '../../modules/cart/acoes'
import { useCarrinho } from '../../modules/cart/CarrinhoProvider'
import { totaisDoCarrinho, type LinhaCarrinho } from '../../modules/cart/carrinho'
import { Totais } from '../../components/ui/Totais'

/**
 * O checkout.
 *
 * Sem pagamento — a encomenda nasce a aguardar. O que este ecrã faz é: mostrar
 * os preços **relidos agora** do servidor, recolher a morada, e enviar ao
 * `POST /api/checkout` uma lista de `{ variantId, qty }`. Nenhum total, nenhum
 * preço. O servidor refaz a conta com os preços da base e é esse o número que
 * fica na fatura; o total aqui em cima sai da mesma função (`calcularTotais`)
 * alimentada pelos mesmos preços, e é por isso que é o mesmo número.
 *
 * A recusa por falta de stock (409) mostra o que falta e **não mexe no
 * carrinho**: quem estava a comprar cinco coisas não perde as outras quatro
 * porque outra pessoa levou a última unidade de uma.
 */

const MORADA_VAZIA: Morada = {
  etiqueta: '',
  nomeDestinatario: '',
  linha1: '',
  linha2: '',
  codigoPostal: '',
  localidade: '',
  telefone: '',
}

const NOVA = -1

export function FormularioCheckout({
  nome,
  moradas,
}: {
  nome: string
  /** Só as moradas da conta. Nada mais do cliente atravessa para o browser. */
  moradas: Morada[]
}) {
  const router = useRouter()
  const { itens, pronto, esvaziar } = useCarrinho()

  const [linhas, setLinhas] = useState<LinhaCarrinho[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [escolhida, setEscolhida] = useState<number>(moradas.length > 0 ? 0 : NOVA)
  const [nova, setNova] = useState<Morada>({ ...MORADA_VAZIA, nomeDestinatario: nome })
  const [guardar, setGuardar] = useState(true)
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState('')
  const [semStock, setSemStock] = useState<FaltaStock[]>([])

  const chave = JSON.stringify(itens)

  useEffect(() => {
    if (!pronto) return
    let atual = true

    void carregarLinhas(JSON.parse(chave) as typeof itens).then((r) => {
      if (!atual) return
      setLinhas(r.linhas)
      setACarregar(false)
    })

    return () => {
      atual = false
    }
  }, [chave, pronto])

  const totais = totaisDoCarrinho(linhas)
  const moradaEscolhida = escolhida === NOVA ? nova : (moradas[escolhida] ?? nova)

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault()
    setAEnviar(true)
    setErro('')
    setSemStock([])

    if (escolhida === NOVA && guardar) {
      // Se falhar, o erro é do código postal e a compra também falharia —
      // dizê-lo aqui poupa uma recusa mais adiante com a mesma causa.
      const g = await guardarMorada(nova)
      if (!g.ok) {
        setErro(g.erro)
        setAEnviar(false)
        return
      }
    }

    const r = await comprar(itens, moradaEscolhida)

    if (r.ok) {
      // Só depois do 201. Esvaziar antes deixava alguém sem carrinho e sem
      // encomenda se o servidor recusasse.
      esvaziar()
      router.push(`/conta/encomendas/${r.encomenda.id}?novo=1`)
      return
    }

    setErro(r.erro)
    setSemStock(r.semStock ?? [])
    setAEnviar(false)
  }

  if (!pronto || aCarregar) {
    return <p className="text-ink-muted">A carregar o carrinho…</p>
  }

  if (linhas.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink">Não há nada para comprar.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark"
        >
          Ver produtos
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={confirmar} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink">Morada de envio</h2>

        {moradas.length > 0 ? (
          <fieldset className="mt-4 flex flex-col gap-3">
            <legend className="sr-only">Escolha a morada</legend>
            {moradas.map((m, i) => (
              <label
                key={`${m.codigoPostal}-${i}`}
                className="flex cursor-pointer items-start gap-3 rounded-card bg-white p-4 shadow-sm"
              >
                <input
                  type="radio"
                  name="morada"
                  className="mt-1"
                  checked={escolhida === i}
                  onChange={() => setEscolhida(i)}
                />
                <span className="text-sm text-ink">
                  {m.etiqueta ? <strong className="block">{m.etiqueta}</strong> : null}
                  {m.nomeDestinatario}
                  <br />
                  {m.linha1}
                  {m.linha2 ? `, ${m.linha2}` : ''}
                  <br />
                  {m.codigoPostal} {m.localidade}
                  {m.telefone ? <br /> : null}
                  {m.telefone}
                </span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-card bg-white p-4 text-sm text-ink shadow-sm">
              <input
                type="radio"
                name="morada"
                checked={escolhida === NOVA}
                onChange={() => setEscolhida(NOVA)}
              />
              Usar outra morada
            </label>
          </fieldset>
        ) : null}

        {escolhida === NOVA ? (
          <div className="mt-4 grid gap-4 rounded-card bg-white p-4 shadow-sm sm:grid-cols-2">
            <Campo
              id="nomeDestinatario"
              rotulo="Destinatário"
              valor={nova.nomeDestinatario}
              obrigatorio
              aoMudar={(v) => setNova({ ...nova, nomeDestinatario: v })}
              className="sm:col-span-2"
            />
            <Campo
              id="linha1"
              rotulo="Morada"
              valor={nova.linha1}
              obrigatorio
              aoMudar={(v) => setNova({ ...nova, linha1: v })}
              className="sm:col-span-2"
            />
            <Campo
              id="linha2"
              rotulo="Morada (cont.)"
              valor={nova.linha2}
              aoMudar={(v) => setNova({ ...nova, linha2: v })}
              className="sm:col-span-2"
            />
            <Campo
              id="codigoPostal"
              rotulo="Código postal"
              valor={nova.codigoPostal}
              obrigatorio
              // `pattern` nativo: o formato português, verificado pelo browser
              // antes de haver pedido nenhum. A coleção valida o mesmo do outro
              // lado — esta é a cortesia, aquela é a regra.
              padrao="\d{4}-\d{3}"
              dica="1234-567"
              aoMudar={(v) => setNova({ ...nova, codigoPostal: v })}
            />
            <Campo
              id="localidade"
              rotulo="Localidade"
              valor={nova.localidade}
              obrigatorio
              aoMudar={(v) => setNova({ ...nova, localidade: v })}
            />
            <Campo
              id="telefone"
              rotulo="Telefone"
              valor={nova.telefone}
              tipo="tel"
              aoMudar={(v) => setNova({ ...nova, telefone: v })}
            />
            <Campo
              id="etiqueta"
              rotulo="Etiqueta (Casa, Trabalho…)"
              valor={nova.etiqueta}
              aoMudar={(v) => setNova({ ...nova, etiqueta: v })}
            />
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={guardar}
                onChange={(e) => setGuardar(e.target.checked)}
              />
              Guardar esta morada na minha conta
            </label>
          </div>
        ) : null}

        <h2 className="mt-8 text-lg font-bold text-ink">O que vai comprar</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {linhas.map((l) => (
            <li
              key={l.variantId}
              className="flex items-center gap-4 rounded-card bg-white p-4 shadow-sm"
            >
              {l.imagem ? (
                <Image
                  src={l.imagem.url}
                  alt={l.imagem.alt}
                  width={l.imagem.width}
                  height={l.imagem.height}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{l.titulo}</p>
                {l.opcoes ? <p className="text-sm text-ink-muted">{l.opcoes}</p> : null}
                <p className="text-sm text-ink-muted">
                  {l.qty} × {formatEuros(l.precoUnitarioCents)}
                </p>
              </div>
              <span className="font-semibold text-ink">
                {formatEuros(l.precoUnitarioCents * l.qty)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-card bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Resumo</h2>
        <Totais totais={totais} />

        {erro ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink"
          >
            <p className="font-semibold">{erro}</p>
            {semStock.length > 0 ? (
              <ul className="mt-2 list-disc pl-4">
                {semStock.map((f) => (
                  <li key={f.variantId}>
                    {f.titulo} — pediu {f.pedido},{' '}
                    {f.disponivel === 0 ? 'não há nenhum' : `só há ${f.disponivel}`}.
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2">
              O carrinho ficou como estava.{' '}
              <Link href="/carrinho" className="underline">
                Voltar ao carrinho
              </Link>
              .
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={aEnviar}
          className="mt-6 w-full rounded-xl bg-terracota px-6 py-3 font-semibold text-white transition-colors hover:bg-terracota-dark disabled:opacity-60"
        >
          {aEnviar ? 'A confirmar…' : 'Confirmar encomenda'}
        </button>
        <p className="mt-3 text-xs text-ink-muted">
          Sem pagamento nesta fase: a encomenda fica a aguardar pagamento.
        </p>
      </aside>
    </form>
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
