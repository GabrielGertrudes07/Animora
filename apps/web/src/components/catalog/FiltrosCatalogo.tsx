'use client'

import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { formatEuros } from '@animora/core'
import {
  filtersToQuery,
  type AttributeFacet,
  type CatalogFilters,
} from '../../modules/catalog'
import { Icon } from '../icons/sprite'

type Marca = { nome: string; slug: string }
type Bounds = { min: number; max: number }

type Props = {
  marcas: Marca[]
  bounds?: Bounds
  atributos: AttributeFacet[]
  filtrosAtuais: CatalogFilters
}

function contarSelecionados(f: CatalogFilters): number {
  let n = f.marca?.length ?? 0
  if (f.precoMin !== undefined) n += 1
  for (const valores of Object.values(f.atributos ?? {})) n += valores.length
  return n
}

/**
 * Um filtro por secção `<details>`: nativo, sem JS — colapsa sozinho e
 * respeita `abertoPorOmissao`. É a mesma peça que fecha a segunda metade do
 * defeito original (uma lista comprida de opções a empurrar o catálogo para
 * fora do ecrã): secções fechadas por omissão ocupam uma linha só.
 */
function Seccao({ titulo, aberta, children }: { titulo: string; aberta: boolean; children: ReactNode }) {
  return (
    <details open={aberta} className="border-b border-line pb-4 [&:not(:last-child)]:mb-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink marker:text-ink-muted">
        {titulo}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

/**
 * Os campos em si — sem preço nem limites hardcoded: `bounds` vem do
 * catálogo real (`precoBounds`, calculado a partir dos produtos publicados
 * da categoria), e `atributos`/`marcas` só chegam aqui depois de já terem
 * sido cruzados com valores que existem mesmo nos produtos (ver
 * `computeAttributeFacets`/`marcasDisponiveis`). Um filtro que devolveria
 * zero resultados nunca entra nestas listas.
 *
 * Preço fica em euros inteiros (`step="1"`) de propósito: a query string
 * `preco=A-B` só aceita inteiros (`parseFilters`), e um valor com cêntimos
 * saído deste formulário ficaria com efeito nenhum depois de navegar — os
 * limites arredondam para fora (baixo desce, alto sobe) para nunca cortar um
 * produto que só por causa dos cêntimos ficaria de fora.
 * ponytail: filtro de preço só a euro inteiro; se um cliente pedir precisão
 * ao cêntimo, alargar o formato de `preco` em `parseFilters` primeiro.
 */
function CamposFiltro({ marcas, bounds, atributos, filtrosAtuais }: Props) {
  const precoMinEuros = bounds ? Math.floor(bounds.min / 100) : 0
  const precoMaxEuros = bounds ? Math.ceil(bounds.max / 100) : 0

  return (
    <div>
      {bounds ? (
        <Seccao titulo="Preço" aberta>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              name="preco-min"
              defaultValue={
                filtrosAtuais.precoMin !== undefined
                  ? Math.floor(filtrosAtuais.precoMin / 100)
                  : precoMinEuros
              }
              min={precoMinEuros}
              max={precoMaxEuros}
              step={1}
              inputMode="numeric"
              aria-label="Preço mínimo em euros"
              className="w-full rounded-lg border border-line px-2 py-1.5 text-ink"
            />
            <span className="text-ink-muted">–</span>
            <input
              type="number"
              name="preco-max"
              defaultValue={
                filtrosAtuais.precoMax !== undefined
                  ? Math.ceil(filtrosAtuais.precoMax / 100)
                  : precoMaxEuros
              }
              min={precoMinEuros}
              max={precoMaxEuros}
              step={1}
              inputMode="numeric"
              aria-label="Preço máximo em euros"
              className="w-full rounded-lg border border-line px-2 py-1.5 text-ink"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {formatEuros(bounds.min)} – {formatEuros(bounds.max)}
          </p>
        </Seccao>
      ) : null}

      {marcas.length > 0 ? (
        <Seccao titulo="Marca" aberta>
          <div className="flex flex-col gap-2">
            {marcas.map((m) => (
              <label key={m.slug} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="marca"
                  value={m.slug}
                  defaultChecked={filtrosAtuais.marca?.includes(m.slug) ?? false}
                  className="h-4 w-4 shrink-0 rounded border-line text-terracota focus-visible:ring-2 focus-visible:ring-terracota"
                />
                {m.nome}
              </label>
            ))}
          </div>
        </Seccao>
      ) : null}

      {atributos.map((attr) => (
        <Seccao key={attr.chave} titulo={attr.nome} aberta={attr.abertoPorOmissao}>
          {attr.tipo === 'intervalo' ? (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                name={attr.chave}
                defaultValue={filtrosAtuais.atributos?.[attr.chave]?.[0] ?? attr.min}
                aria-label={`${attr.nome}, valor mínimo`}
                className="w-full rounded-lg border border-line px-2 py-1.5 text-ink"
              />
              <span className="text-ink-muted">–</span>
              <input
                type="number"
                name={attr.chave}
                defaultValue={filtrosAtuais.atributos?.[attr.chave]?.[1] ?? attr.max}
                aria-label={`${attr.nome}, valor máximo`}
                className="w-full rounded-lg border border-line px-2 py-1.5 text-ink"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {attr.valores.map((valor) => (
                <label key={valor} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name={attr.chave}
                    value={valor}
                    defaultChecked={filtrosAtuais.atributos?.[attr.chave]?.includes(valor) ?? false}
                    className="h-4 w-4 shrink-0 rounded border-line text-terracota focus-visible:ring-2 focus-visible:ring-terracota"
                  />
                  {valor}
                </label>
              ))}
            </div>
          )}
        </Seccao>
      ))}
    </div>
  )
}

/**
 * Barra lateral em desktop, folha inferior atrás de um botão em mobile — no
 * site antigo os filtros empurravam o catálogo para fora do ecrã em 390px.
 *
 * A folha usa `<dialog>` nativo: `showModal` já traz fundo, fecho por Esc e
 * fecho de foco sem nenhuma linha de código, e clicar fora fecha comparando
 * `e.target` com o próprio `<dialog>` (o clique só chega lá se não acertou
 * no cartão de conteúdo). Nenhuma biblioteca de modais.
 *
 * Os dois formulários (barra e folha) são o MESMO conjunto de campos
 * (`CamposFiltro`) desenhado duas vezes — uma por breakpoint, escondida com
 * CSS — porque um `<dialog>` não pode mostrar um nó que já está montado
 * noutro sítio da árvore. Cada um submete para o mesmo destino.
 */
export function FiltrosCatalogo(props: Props) {
  const { filtrosAtuais, atributos } = props
  const router = useRouter()
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [aplicando, setAplicando] = useState(false)

  const semNadaParaFiltrar = !props.bounds && props.marcas.length === 0 && atributos.length === 0
  if (semNadaParaFiltrar) return null

  function aplicar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAplicando(true)
    const dados = new FormData(e.currentTarget)

    const marca = dados.getAll('marca').map(String)

    // Só entra na query se estreitar mesmo os limites reais: os dois campos
    // têm sempre um valor (os limites, por omissão), e escrevê-los sempre
    // deixava um "preco=min-max" agarrado a todas as outras escolhas — um
    // catálogo que ganhasse um produto mais barato amanhã ficava excluído por
    // um filtro que ninguém pediu.
    const minStr = dados.get('preco-min')
    const maxStr = dados.get('preco-max')
    const precoMin =
      typeof minStr === 'string' && minStr !== '' ? Math.round(Number(minStr)) * 100 : undefined
    const precoMax =
      typeof maxStr === 'string' && maxStr !== '' ? Math.round(Number(maxStr)) * 100 : undefined
    const precoEstreitado =
      props.bounds &&
      precoMin !== undefined &&
      precoMax !== undefined &&
      Number.isFinite(precoMin) &&
      Number.isFinite(precoMax) &&
      (Math.min(precoMin, precoMax) > props.bounds.min || Math.max(precoMin, precoMax) < props.bounds.max)

    const selecionados: Record<string, string[]> = {}
    for (const attr of atributos) {
      const valores = dados.getAll(attr.chave).map(String).filter((v) => v !== '')
      if (valores.length === 0) continue

      if (attr.tipo === 'intervalo') {
        const [minV, maxV] = valores.map(Number)
        const estreitado =
          minV !== undefined &&
          maxV !== undefined &&
          Number.isFinite(minV) &&
          Number.isFinite(maxV) &&
          (Math.min(minV, maxV) > (attr.min ?? -Infinity) || Math.max(minV, maxV) < (attr.max ?? Infinity))
        if (estreitado) selecionados[attr.chave] = valores
      } else {
        selecionados[attr.chave] = valores
      }
    }

    const novosFiltros: CatalogFilters = {
      ordem: filtrosAtuais.ordem,
      ...(marca.length > 0 ? { marca } : {}),
      ...(precoEstreitado
        ? { precoMin: Math.min(precoMin!, precoMax!), precoMax: Math.max(precoMin!, precoMax!) }
        : {}),
      ...(Object.keys(selecionados).length > 0 ? { atributos: selecionados } : {}),
    }

    const query = filtersToQuery(novosFiltros)
    router.push(query ? `${pathname}?${query}` : pathname)
    dialogRef.current?.close()
    setAplicando(false)
  }

  const numeroAtivos = contarSelecionados(filtrosAtuais)

  return (
    <>
      {/* Desktop: barra lateral sempre visível, nunca atrás de um botão. */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <form onSubmit={aplicar}>
          <CamposFiltro {...props} />
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-terracota px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-terracota-dark"
            >
              Aplicar filtros
            </button>
            {numeroAtivos > 0 ? (
              <Link href={pathname} className="text-sm font-medium text-ink-muted underline hover:text-ink">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>
      </aside>

      {/* Mobile: botão que abre a folha inferior; o catálogo fica visível de imediato. */}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink lg:hidden"
      >
        <Icon name="filter" className="h-4 w-4" />
        Filtros
        {numeroAtivos > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracota px-1 text-xs font-semibold text-white">
            {numeroAtivos}
          </span>
        ) : null}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        aria-label="Filtros do catálogo"
        className="m-0 max-h-[85vh] w-full max-w-full rounded-t-card border-t border-line bg-cream p-0 shadow-md backdrop:bg-ink/40 lg:hidden [&[open]]:fixed [&[open]]:inset-x-0 [&[open]]:bottom-0 [&[open]]:top-auto"
      >
        <form onSubmit={aplicar} className="flex max-h-[85vh] flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-base font-semibold text-ink">Filtros</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar filtros"
              className="rounded-lg p-1 text-ink-muted hover:text-ink"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <CamposFiltro {...props} />
          </div>
          <div className="flex shrink-0 items-center gap-3 border-t border-line px-6 py-4">
            <button
              type="submit"
              disabled={aplicando}
              className="flex-1 rounded-lg bg-terracota px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracota-dark disabled:opacity-60"
            >
              Ver produtos
            </button>
            {numeroAtivos > 0 ? (
              <Link
                href={pathname}
                onClick={() => dialogRef.current?.close()}
                className="text-sm font-medium text-ink-muted underline hover:text-ink"
              >
                Limpar
              </Link>
            ) : null}
          </div>
        </form>
      </dialog>
    </>
  )
}
