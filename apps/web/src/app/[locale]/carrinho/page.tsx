'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatEuros } from '@animora/core'

import { carregarLinhas } from '../../../modules/cart/acoes'
import { useCarrinho } from '../../../modules/cart/CarrinhoProvider'
import { QTY_MAX, totaisDoCarrinho, type LinhaCarrinho } from '../../../modules/cart/carrinho'
import { Totais } from '../../../components/ui/Totais'
import { EstadoVazio } from '../../../components/ui/EstadoVazio'

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
  const [caidos, setCaidos] = useState(0)

  // `itens` é um array novo a cada render, e um efeito que dependa dele
  // diretamente volta a correr para sempre. A chave serializada só muda quando
  // o conteúdo muda.
  const chave = JSON.stringify(itens)

  useEffect(() => {
    if (!pronto) return
    let atual = true

    setACarregar(true)
    void carregarLinhas(JSON.parse(chave) as typeof itens).then((r) => {
      if (!atual) return
      setLinhas(r.linhas)
      setACarregar(false)
      // Artigos que saíram do catálogo entretanto: retirados aqui, e dito.
      // Deixá-los ficar dava um 400 no checkout sem explicação nenhuma.
      setCaidos(r.indisponiveis.length)
      for (const id of r.indisponiveis) remover(id)
    })

    return () => {
      atual = false
    }
  }, [chave, pronto, remover])

  const totais = totaisDoCarrinho(linhas)

  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Carrinho</h1>

      {caidos > 0 ? (
        <p className="mt-4 rounded-lg border border-terracota bg-terracota/10 px-4 py-3 text-sm text-ink">
          {caidos === 1
            ? 'Um artigo deixou de estar à venda e foi retirado do carrinho.'
            : `${caidos} artigos deixaram de estar à venda e foram retirados do carrinho.`}
        </p>
      ) : null}

      {!pronto || aCarregar ? (
        <p className="mt-8 text-ink-muted">A carregar o carrinho…</p>
      ) : linhas.length === 0 ? (
        <div className="mt-8">
          <EstadoVazio
            ilustracao="tigela"
            titulo="O carrinho está vazio"
            texto="A tigela ainda está por encher. Vê tudo o que há à venda ou escolhe uma categoria no cabeçalho."
          >
            <Link href="/produtos" className="botao-principal">
              Ver produtos
            </Link>
          </EstadoVazio>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <ul className="flex min-w-0 flex-col gap-4">
            {linhas.map((l) => (
              <li
                key={l.variantId}
                className="flex flex-wrap items-start gap-4 rounded-card bg-white p-4 shadow-sm"
              >
                <Link href={`/produto/${l.slug}`} className="shrink-0">
                  {l.imagem ? (
                    <Image
                      src={l.imagem.url}
                      alt={l.imagem.alt}
                      width={l.imagem.width}
                      height={l.imagem.height}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="block h-20 w-20 rounded-lg bg-cream" />
                  )}
                </Link>

                <div className="min-w-0 flex-1 basis-40">
                  <Link
                    href={`/produto/${l.slug}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {l.titulo}
                  </Link>
                  {l.opcoes ? <p className="text-sm text-ink-muted">{l.opcoes}</p> : null}
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatEuros(l.precoUnitarioCents)} cada
                  </p>
                  {l.qty > l.stock ? (
                    <p className="mt-1 text-sm font-medium text-terracota-dark">
                      {l.stock === 0 ? 'Sem stock de momento.' : `Só há ${l.stock} em stock.`}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`qty-${l.variantId}`}>
                    Quantidade de {l.titulo}
                  </label>
                  <input
                    id={`qty-${l.variantId}`}
                    type="number"
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
                    className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-center text-ink"
                  />
                  <span className="w-20 text-right font-semibold text-ink">
                    {formatEuros(l.precoUnitarioCents * l.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(l.variantId)}
                    className="text-sm text-ink-muted underline transition-colors hover:text-terracota-dark"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-card bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink">Resumo</h2>
            <Totais totais={totais} />
            <Link
              href="/checkout"
              className="botao-principal mt-6 block"
            >
              Finalizar compra
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
