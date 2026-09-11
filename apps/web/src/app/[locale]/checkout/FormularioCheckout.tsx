'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatEuros } from '@animora/core'

import { guardarMorada } from '../../../modules/account/acoes'
import type { Morada } from '../../../modules/account/sessao'
import { carregarLinhas, comprar, type FaltaStock } from '../../../modules/cart/acoes'
import { useCarrinho } from '../../../modules/cart/CarrinhoProvider'
import { totaisDoCarrinho, type LinhaCarrinho } from '../../../modules/cart/carrinho'
import { Link, useRouter } from '../../../i18n/navigation'
import { Totais } from '../../../components/ui/Totais'

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
 *
 * O formato de morada (código postal, `pattern`) continua só português nesta
 * fase, em português e em alemão — internacionalizar o checkout (país, formato
 * por país, portes) é o sub-projeto 3, fora desta spec.
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
  const t = useTranslations('FormularioCheckout')
  const tCheckout = useTranslations('CheckoutPage')

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
    return <p className="text-ink-muted">{t('aCarregar')}</p>
  }

  if (linhas.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink">{tCheckout('naoHaNadaParaComprar')}</p>
        <Link
          href="/"
          className="botao-principal mt-6"
        >
          {tCheckout('verProdutos')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={confirmar} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink">{t('moradaEnvio')}</h2>

        {moradas.length > 0 ? (
          <fieldset className="mt-4 flex flex-col gap-3">
            <legend className="sr-only">{t('escolherMorada')}</legend>
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
              {t('usarOutraMorada')}
            </label>
          </fieldset>
        ) : null}

        {escolhida === NOVA ? (
          <div className="mt-4 grid gap-4 rounded-card bg-white p-4 shadow-sm sm:grid-cols-2">
            <Campo
              id="nomeDestinatario"
              rotulo={t('destinatario')}
              valor={nova.nomeDestinatario}
              obrigatorio
              aoMudar={(v) => setNova({ ...nova, nomeDestinatario: v })}
              className="sm:col-span-2"
            />
            <Campo
              id="linha1"
              rotulo={t('morada')}
              valor={nova.linha1}
              obrigatorio
              aoMudar={(v) => setNova({ ...nova, linha1: v })}
              className="sm:col-span-2"
            />
            <Campo
              id="linha2"
              rotulo={t('moradaCont')}
              valor={nova.linha2}
              aoMudar={(v) => setNova({ ...nova, linha2: v })}
              className="sm:col-span-2"
            />
            <Campo
              id="codigoPostal"
              rotulo={t('codigoPostal')}
              valor={nova.codigoPostal}
              obrigatorio
              padrao="\d{4}-\d{3}"
              dica={t('codigoPostalDica')}
              aoMudar={(v) => setNova({ ...nova, codigoPostal: v })}
            />
            <Campo
              id="localidade"
              rotulo={t('localidade')}
              valor={nova.localidade}
              obrigatorio
              aoMudar={(v) => setNova({ ...nova, localidade: v })}
            />
            <Campo
              id="telefone"
              rotulo={t('telefone')}
              valor={nova.telefone}
              tipo="tel"
              aoMudar={(v) => setNova({ ...nova, telefone: v })}
            />
            <Campo
              id="etiqueta"
              rotulo={t('etiqueta')}
              valor={nova.etiqueta}
              aoMudar={(v) => setNova({ ...nova, etiqueta: v })}
            />
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={guardar}
                onChange={(e) => setGuardar(e.target.checked)}
              />
              {t('guardarMorada')}
            </label>
          </div>
        ) : null}

        <h2 className="mt-8 text-lg font-bold text-ink">{t('oQueVaiComprar')}</h2>
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
                  className="h-14 w-14 shrink-0 rounded-campo object-cover"
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
        <h2 className="text-lg font-bold text-ink">{t('resumo')}</h2>
        <Totais totais={totais} />

        {erro ? (
          <div
            role="alert"
            className="mt-4 rounded-campo border border-terracota bg-terracota/10 px-3 py-2 text-sm text-ink"
          >
            <p className="font-semibold">{erro}</p>
            {semStock.length > 0 ? (
              <ul className="mt-2 list-disc pl-4">
                {semStock.map((f) => (
                  <li key={f.variantId}>
                    {f.disponivel === 0
                      ? t('pediuNaoHaNenhum', { titulo: f.titulo, pedido: f.pedido })
                      : t('pediuSoHa', {
                          titulo: f.titulo,
                          pedido: f.pedido,
                          disponivel: f.disponivel,
                        })}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2">
              {t('carrinhoFicouComoEstava')}{' '}
              <Link href="/carrinho" className="underline">
                {t('voltarAoCarrinho')}
              </Link>
              .
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={aEnviar}
          className="botao-principal mt-6 w-full"
        >
          {aEnviar ? t('aConfirmar') : t('confirmarEncomenda')}
        </button>
        <p className="mt-3 text-xs text-ink-muted">{t('semPagamento')}</p>
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
        className="mt-1 min-h-11 w-full rounded-campo border border-line bg-papel px-3 py-2 text-base text-ink sm:min-h-0 sm:text-sm"
      />
    </div>
  )
}
