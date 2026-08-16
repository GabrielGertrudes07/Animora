'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { sessaoClienteId } from '../account/acoes'
import {
  acrescentar as acrescentarItem,
  alterarQty as alterarQtyItem,
  contar,
  esvaziar as esvaziarItens,
  fundir,
  normalizar,
  remover as removerItem,
  type ItemCarrinho,
} from './carrinho'

/**
 * O carrinho vivo: `localStorage` + o estado que o cabeçalho e as páginas leem.
 *
 * ## Dois baldes, e porquê
 *
 * `animora.carrinho` é o do convidado. `animora.carrinho.<id>` é o da conta.
 * Ao entrar, o do convidado funde-se no da conta (a **maior** quantidade por
 * variante, ver `fundir`) e fica vazio; ao sair, volta-se ao do convidado sem
 * lhe tocar. Duas contas no mesmo browser não veem o carrinho uma da outra.
 *
 * ## Porque é que as funções são todas estáveis
 *
 * A página do carrinho relê os preços num `useEffect` que depende delas. Uma
 * função recriada a cada render torna esse efeito num ciclo infinito de
 * pedidos ao servidor. Daí o `useCallback` com dependências vazias e as
 * atualizações funcionais do estado — o balde vive num `ref` por isso mesmo:
 * mudá-lo não tem de repintar nada, só de mudar onde se grava.
 *
 * ponytail: o "carrinho da conta" vive neste browser e não no servidor — não há
 * coleção onde o guardar e a API está fechada nesta tarefa. Consequência real:
 * quem enche o carrinho no telemóvel não o encontra no computador. A fusão em
 * si, que é a parte com regra e a que é testada, é a mesma função nos dois
 * cenários; passar a um carrinho de servidor é trocar o `ler`/`gravar` abaixo
 * por chamadas à API.
 */

const BALDE_CONVIDADO = 'animora.carrinho'
const baldeDaConta = (clienteId: number) => `${BALDE_CONVIDADO}.${clienteId}`

function ler(balde: string): ItemCarrinho[] {
  try {
    return normalizar(JSON.parse(window.localStorage.getItem(balde) ?? '[]'))
  } catch {
    // `localStorage` indisponível (modo privado em alguns browsers) ou JSON
    // partido. Um carrinho vazio é mau; uma loja que não abre é pior.
    return []
  }
}

function gravar(balde: string, itens: ItemCarrinho[]): void {
  try {
    window.localStorage.setItem(balde, JSON.stringify(itens))
  } catch {
    /* idem */
  }
}

type Carrinho = {
  itens: ItemCarrinho[]
  contagem: number
  /** `false` até o `localStorage` ter sido lido. Ver a nota de hidratação. */
  pronto: boolean
  acrescentar: (variantId: number, qty?: number) => void
  alterarQty: (variantId: number, qty: number) => void
  remover: (variantId: number) => void
  esvaziar: () => void
  /** Depois de entrar: funde o carrinho de convidado no da conta. */
  entrarNaConta: (clienteId: number) => void
  sairDaConta: () => void
}

const Contexto = createContext<Carrinho | null>(null)

export function useCarrinho(): Carrinho {
  const c = useContext(Contexto)
  if (!c) throw new Error('useCarrinho fora do CarrinhoProvider')
  return c
}

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const balde = useRef(BALDE_CONVIDADO)
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [pronto, setPronto] = useState(false)

  const aplicar = useCallback((mudar: (atuais: ItemCarrinho[]) => ItemCarrinho[]) => {
    setItens((atuais) => {
      const proximos = mudar(atuais)
      gravar(balde.current, proximos)
      return proximos
    })
  }, [])

  const acrescentar = useCallback(
    (variantId: number, qty = 1) => aplicar((atuais) => acrescentarItem(atuais, variantId, qty)),
    [aplicar],
  )
  const alterarQty = useCallback(
    (variantId: number, qty: number) => aplicar((atuais) => alterarQtyItem(atuais, variantId, qty)),
    [aplicar],
  )
  const remover = useCallback(
    (variantId: number) => aplicar((atuais) => removerItem(atuais, variantId)),
    [aplicar],
  )
  const esvaziar = useCallback(() => aplicar(esvaziarItens), [aplicar])

  const entrarNaConta = useCallback((clienteId: number) => {
    const destino = baldeDaConta(clienteId)
    const fundido = fundir(ler(BALDE_CONVIDADO), ler(destino))

    gravar(destino, fundido)
    gravar(BALDE_CONVIDADO, [])
    balde.current = destino
    setItens(fundido)
  }, [])

  const sairDaConta = useCallback(() => {
    balde.current = BALDE_CONVIDADO
    setItens(ler(BALDE_CONVIDADO))
  }, [])

  /**
   * O `localStorage` não existe no servidor, por isso o primeiro render (o do
   * HTML) é sempre com o carrinho vazio e só aqui é que ele aparece. É de
   * propósito: pintar um número no servidor e outro no cliente é o erro de
   * hidratação clássico, e o React descarta a árvore inteira quando acontece.
   * Daí o `pronto` — o cabeçalho não mostra número nenhum enquanto não souber.
   */
  useEffect(() => {
    setItens(ler(BALDE_CONVIDADO))
    setPronto(true)

    // A sessão pode já existir de uma visita anterior (o cookie dura duas
    // horas). Sem esta pergunta, quem recarrega a página autenticado ficava a
    // ver o carrinho de convidado em vez do da sua conta.
    void sessaoClienteId().then((id) => {
      if (id !== null) entrarNaConta(id)
    })
  }, [entrarNaConta])

  const valor = useMemo<Carrinho>(
    () => ({
      itens,
      contagem: contar(itens),
      pronto,
      acrescentar,
      alterarQty,
      remover,
      esvaziar,
      entrarNaConta,
      sairDaConta,
    }),
    [itens, pronto, acrescentar, alterarQty, remover, esvaziar, entrarNaConta, sairDaConta],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
