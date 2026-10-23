import { getTranslations } from 'next-intl/server'
import type { PublicProduct } from '../../modules/catalog'
import { precoDeMostra } from '../../modules/catalog'
import type { ResumoAvaliacoes } from '@animora/core'
import { mediaUrl } from '../../lib/api'
import { Link } from '../../i18n/navigation'
import { Price } from './Price'
import { Estrelas } from './Estrelas'
import { BotaoFavorito } from './BotaoFavorito'
import { AdicionarAoCarrinho } from './AdicionarAoCarrinho'
import { ImagemComFallback } from './ImagemComFallback'
import { Icon } from '../icons/sprite'

/**
 * O cartão de produto — a peça que mais se repete na loja.
 *
 * `data-cartao` é o gancho da camada de movimento (`components/motion`): é por
 * ele que a grelha encontra os cartões para a cascata e para a micro-interação
 * do rato, sem que o GSAP precise de conhecer a estrutura interna deste
 * componente nem de o transformar num Client Component.
 *
 * `avaliacao` chega de fora, já resolvida — nunca busca a sua própria. Uma
 * leitura por cartão (`getAvaliacaoProduto`) numa grelha de dezenas era N+1
 * consultas por página; quem monta a grelha lê uma vez em lote
 * (`getAvaliacoesEmLote`) e distribui por aqui.
 *
 * `prioritario`: o Lighthouse confirmou (não achismo — `lcp-breakdown-insight`
 * contra o build de produção) que o elemento de LCP da PLP é a foto do
 * primeiro cartão da grelha, e que ela carregava `loading="lazy"` como
 * qualquer outra — um atraso de ~390ms medido só por isso. Quem monta a
 * grelha marca o primeiro cartão; os outros continuam preguiçosos, que é o
 * comportamento certo para quem nunca chega a entrar na viewport inicial.
 */
export async function ProductCard({
  product,
  avaliacao,
  prioritario = false,
}: {
  product: PublicProduct
  avaliacao: ResumoAvaliacoes
  prioritario?: boolean
}) {
  const preco = precoDeMostra(product.variants)
  const img = product.primaryImage ?? product.gallery[0]?.image ?? null
  const stockTotal = product.variants.reduce((s, v) => s + v.stock, 0)
  const t = await getTranslations('ProductCard')
  const desconto =
    preco.old && preco.old > preco.cents
      ? Math.round(((preco.old - preco.cents) / preco.old) * 100)
      : null
  // Produto sem opções reais: a variante única implícita (spec-animora.md
  // §4.1) pode ir direto ao carrinho. Com mais de uma, a escolha é da ficha.
  const unica = product.variants.length === 1 ? product.variants[0] : null

  return (
    <article
      data-cartao
      // Sombra de repouso (shadow-card) já suave; o hover sobe um nível
      // (shadow-card-hover), nunca aparece do nada.
      className="group relative overflow-hidden rounded-lg border border-border bg-white shadow-card transition-shadow duration-200 ease-brand hover:shadow-card-hover"
    >
      <Link href={`/produto/${product.slug}`} className="block">
        {/* 4:5 e não quadrado: o quadrado lê como grelha de marketplace, a
            vertical lê como editorial — e é a mesma proporção das cenas de
            categoria, o que faz a página inteira bater a compasso. */}
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          {img ? (
            <ImagemComFallback
              src={mediaUrl(img.url)}
              alt={img.alt}
              width={img.width ?? 600}
              height={img.height ?? 600}
              // A grelha vai de 2 a 5 colunas — sem `sizes`, o navegador
              // assume que a imagem enche o ecrã inteiro e pede sempre a
              // maior do `srcset`, mesmo num cartão de 200px numa grelha de
              // 5. Os números espelham os breakpoints da própria grelha
              // (`grid-cols-2` → `md:grid-cols-3` → ...) usada em toda a loja.
              sizes="(min-width: 1536px) 20vw, (min-width: 768px) 33vw, 50vw"
              priority={prioritario}
              // A escala no hover é CSS e não GSAP: é uma transição de uma
              // propriedade, disparada por `:hover` do cartão. Passava por um
              // ouvinte delegado no contentor da grelha, que existia só para
              // isto. `1.03` e não `1.06` — a imagem aproxima-se, não salta.
              className="h-full w-full object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
            />
          ) : (
            // Sem fotografia, uma pata em marca de água — não um retângulo
            // vazio que parece a página a meio de carregar.
            <span className="flex h-full w-full items-center justify-center text-teal-700/40">
              <Icon name="paw" className="h-16 w-16" />
            </span>
          )}
          {/*
            Um sinal por cartão. O desconto em teal-900 e não em vermelho: o
            vermelho puro é a cor do saldo de fim de estação, e destaca-se pior
            sobre fotografia clara do que este teal quase preto.

            Um produto esgotado não anuncia desconto — daí o `else`, e não dois
            distintivos a dividir os cantos de cima. Os dois ficam à esquerda:
            o canto direito é do botão de favorito, fora deste link.
          */}
          {stockTotal === 0 ? (
            <span className="absolute left-3 top-3 rounded-full bg-teal-900 px-3 py-1 text-eyebrow font-semibold uppercase text-white">
              {t('esgotado')}
            </span>
          ) : desconto ? (
            <span className="absolute left-3 top-3 rounded-full bg-teal-900 px-3 py-1 text-xs font-bold tabular-nums text-white">
              -{desconto}%
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 p-5 pb-3">
          <p className="text-eyebrow font-semibold uppercase text-text-muted">
            {product.brand.name}
          </p>
          {/* Duas linhas e reticências: um título de 50+ carateres não deve
              esticar o cartão nem empurrar o preço para alturas diferentes na
              mesma fiada. */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text sm:text-lg">
            {product.title}
          </h3>
          <Estrelas resumo={avaliacao} />
          <Price cents={preco.cents} old={preco.old} desde={preco.desde} className="mt-2 block" />
          {stockTotal > 0 ? (
            <p className="text-sm text-text-muted">{t('emStock', { count: stockTotal })}</p>
          ) : (
            <p className="text-sm text-text-muted">{t('semStock')}</p>
          )}
        </div>
      </Link>

      {/* Fora do `<Link>` de propósito: um botão dentro de uma ligação quebra
          o foco por teclado e a leitura por leitor de ecrã. Posicionado sobre
          a imagem por CSS, não por marcação. */}
      <div className="absolute right-3 top-3 z-10">
        <BotaoFavorito productId={product.id} compacto />
      </div>

      {/* Esgotado já foi dito pelo distintivo e pelo texto de stock acima —
          repetir "Esgotado" aqui embaixo seria a terceira vez a dizer a
          mesma coisa. */}
      {unica && unica.stock > 0 ? (
        <div className="px-5 pb-5">
          <AdicionarAoCarrinho
            variantId={unica.id}
            esgotado={false}
            etiqueta={product.title}
            comQuantidade
          />
        </div>
      ) : null}
    </article>
  )
}
