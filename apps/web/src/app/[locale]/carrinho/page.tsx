'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatEuros } from '@animora/core'

import {
  carregarLinhas,
  useCarrinho,
  QTY_MAX,
  totaisDoCarrinho,
  type LinhaCarrinho,
} from '../../../modules/cart'
import { Link } from '../../../i18n/navigation'
import { Totais } from '../../../components/ui/Totais'
import { EstadoVazio } from '../../../components/ui/EstadoVazio'
import { Icon } from '../../../components/icons/sprite'

const BOTAO_QTY =
  'flex h-11 w-11 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-cream hover:text-text disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:h-9 sm:w-9'

/**
 * A página do carrinho.
 *
 * O que está guardado no browser são ids e quantidades. **Os preços vêm todos
 * daqui**, de uma leitura ao servidor feita a cada abertura da página e a cada
 * alteração de quantidade (`carregarLinhas`). Recarregar depois de alguém mexer
 * no preço no painel mostra o preço novo — não porque haja sincronização
 * nenhuma escrita para isso, mas porque não existe cópia guardada em lado
 * nenhum que pudesse ficar velha.
 */
export default function CarrinhoPage() {
  const { itens, pronto, alterarQty, remover } = useCarrinho()
  const [linhas, setLinhas] = useState<LinhaCarrinho[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)
  const [caidos, setCaidos] = useState(0)
  const [tentativa, setTentativa] = useState(0)
  const t = useTranslations('CarrinhoPage')

  // `itens` é um array novo a cada render, e um efeito que dependa dele
  // diretamente volta a correr para sempre. A chave serializada só muda quando
  // o conteúdo muda.
  const chave = JSON.stringify(itens)

  useEffect(() => {
    if (!pronto) return
    let atual = true

    setACarregar(true)
    setErroAoCarregar(false)
    carregarLinhas(JSON.parse(chave) as typeof itens)
      .then((r) => {
        if (!atual) return
        setLinhas(r.linhas)
        setACarregar(false)
        // Artigos que saíram do catálogo entretanto: retirados aqui, e dito.
        // Deixá-los ficar dava um 400 no checkout sem explicação nenhuma.
        setCaidos(r.indisponiveis.length)
        for (const id of r.indisponiveis) remover(id)
      })
      .catch(() => {
        // Sem isto, uma falha de rede deixava `aCarregar` preso em `true`
        // para sempre — a mensagem "a carregar" nunca resolvia, sem erro
        // nenhum visível nem forma de repetir sem recarregar a página.
        if (!atual) return
        setACarregar(false)
        setErroAoCarregar(true)
      })

    return () => {
      atual = false
    }
  }, [chave, pronto, remover, tentativa])

  const totais = totaisDoCarrinho(linhas)

  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-titulo text-text">{t('titulo')}</h1>

      {caidos > 0 ? (
        <p className="mt-4 rounded-sm border border-orange/30 bg-cream px-4 py-3 text-sm text-text">
          {t('itensCaidos', { count: caidos })}
        </p>
      ) : null}

      {!pronto || aCarregar ? (
        <p className="mt-8 text-text-muted">{t('aCarregar')}</p>
      ) : erroAoCarregar ? (
        <div
          role="alert"
          className="mt-8 rounded-sm border border-orange/30 bg-cream px-4 py-3 text-sm text-text"
        >
          <p>{t('erroAoCarregar')}</p>
          <button
            type="button"
            onClick={() => setTentativa((n) => n + 1)}
            className="botao-principal botao-principal-pequeno mt-3"
          >
            {t('tentarNovamente')}
          </button>
        </div>
      ) : linhas.length === 0 ? (
        <div className="mt-8">
          <EstadoVazio ilustracao="tigela" titulo={t('vazioTitulo')} texto={t('vazioTexto')}>
            <Link href="/produtos" className="botao-principal">
              {t('verProdutos')}
            </Link>
          </EstadoVazio>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <ul className="flex min-w-0 flex-col gap-4">
            {linhas.map((l) => (
              <li
                key={l.variantId}
                className="flex flex-wrap items-start gap-4 rounded-lg border border-border bg-surface p-4 shadow-card"
              >
                <Link href={`/produto/${l.slug}`} className="shrink-0">
                  {l.imagem ? (
                    <Image
                      src={l.imagem.url}
                      alt={l.imagem.alt}
                      width={l.imagem.width}
                      height={l.imagem.height}
                      className="h-20 w-20 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="block h-20 w-20 rounded-sm bg-cream" />
                  )}
                </Link>

                <div className="min-w-0 flex-1 basis-40">
                  <Link
                    href={`/produto/${l.slug}`}
                    className="font-semibold text-text hover:underline"
                  >
                    {l.titulo}
                  </Link>
                  {l.opcoes ? <p className="text-sm text-text-muted">{l.opcoes}</p> : null}
                  <p className="mt-1 text-sm text-text-muted">
                    {t('cada', { valor: formatEuros(l.precoUnitarioCents) })}
                  </p>
                  {l.qty > l.stock ? (
                    <p className="mt-1 text-sm font-medium text-orange-deep">
                      {l.stock === 0 ? t('semStock') : t('soHaEmStock', { stock: l.stock })}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  {/* − [n] +: o mesmo seletor dos cartões (AdicionarAoCarrinho).
                      O teto é o stock (ou QTY_MAX): o + não deixa pedir o que
                      não há. Escrever à mão continua possível no campo. */}
                  <div className="flex items-center rounded-pill border border-border bg-surface">
                    <button
                      type="button"
                      onClick={() => alterarQty(l.variantId, l.qty - 1)}
                      disabled={l.qty <= 1}
                      aria-label={t('diminuirDe', { titulo: l.titulo })}
                      className={BOTAO_QTY}
                    >
                      <Icon name="menos" className="h-4 w-4" />
                    </button>
                    <label className="sr-only" htmlFor={`qty-${l.variantId}`}>
                      {t('quantidadeDe', { titulo: l.titulo })}
                    </label>
                    <input
                      id={`qty-${l.variantId}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={QTY_MAX}
                      step={1}
                      value={l.qty}
                      onChange={(e) => {
                        const q = Number(e.target.value)
                        // Quantidade inválida é recusada, não arredondada — a
                        // mesma regra do módulo, que aqui evita atirar a exceção
                        // enquanto a pessoa ainda está a escrever.
                        if (Number.isInteger(q) && q >= 1 && q <= QTY_MAX) alterarQty(l.variantId, q)
                      }}
                      className="w-10 bg-transparent text-center text-sm font-semibold tabular-nums text-text [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => alterarQty(l.variantId, l.qty + 1)}
                      disabled={l.qty >= Math.min(QTY_MAX, Math.max(l.stock, 1))}
                      aria-label={t('aumentarDe', { titulo: l.titulo })}
                      className={BOTAO_QTY}
                    >
                      <Icon name="mais" className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="w-20 text-right font-semibold tabular-nums text-text">
                    {formatEuros(l.precoUnitarioCents * l.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(l.variantId)}
                    className="text-sm text-text-muted underline-offset-4 transition-colors hover:text-danger hover:underline"
                  >
                    {t('remover')}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-lg border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-bold text-text">{t('resumo')}</h2>
            <Totais totais={totais} />
            <Link href="/checkout" className="botao-principal mt-6 block">
              {t('finalizarCompra')}
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
