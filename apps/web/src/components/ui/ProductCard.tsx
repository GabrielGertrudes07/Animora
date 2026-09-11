import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import type { PublicProduct } from '../../modules/catalog'
import { precoDeMostra, getAvaliacaoProduto } from '../../modules/catalog'
import { mediaUrl } from '../../lib/api'
import { Link } from '../../i18n/navigation'
import { Price } from './Price'
import { Estrelas } from './Estrelas'
import { BotaoFavorito } from './BotaoFavorito'
import { AdicionarAoCarrinho } from './AdicionarAoCarrinho'
import { Icon } from '../icons/sprite'

/**
 * O cartão de produto — a peça que mais se repete na loja.
 *
 * `data-cartao` é o gancho da camada de movimento (`components/motion`): é por
 * ele que a grelha encontra os cartões para a cascata e para a micro-interação
 * do rato, sem que o GSAP precise de conhecer a estrutura interna deste
 * componente nem de o transformar num Client Component.
 *
 * Assíncrono para ler as avaliações do produto — uma leitura a mais por
 * cartão (`getAvaliacaoProduto`), aceitável numa grelha de destaques ou
 * ofertas com poucas dezenas de cartões.
 */
export async function ProductCard({ product }: { product: PublicProduct }) {
  const preco = precoDeMostra(product.variants)
  const img = product.primaryImage ?? product.gallery[0]?.image ?? null
  const stockTotal = product.variants.reduce((s, v) => s + v.stock, 0)
  const [avaliacao, t] = await Promise.all([
    getAvaliacaoProduto(product.id),
    getTranslations('ProductCard'),
  ])
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
      // Hairline em repouso, sem sombra: um cartão que já flutua parado não
      // tem para onde subir no hover. A elevação chega só quando o rato chega.
      className="group relative overflow-hidden rounded-card border border-line bg-white transition-shadow duration-200 ease-loja hover:shadow-md"
    >
      <Link href={`/produto/${product.slug}`} className="block">
        {/* 4:5 e não quadrado: o quadrado lê como grelha de marketplace, a
            vertical lê como editorial — e é a mesma proporção das cenas de
            categoria, o que faz a página inteira bater a compasso. */}
        <div className="relative aspect-[4/5] overflow-hidden bg-papel">
          {img ? (
            <Image
              src={mediaUrl(img.url)}
              alt={img.alt}
              width={img.width ?? 600}
              height={img.height ?? 600}
              // A escala no hover é CSS e não GSAP: é uma transição de uma
              // propriedade, disparada por `:hover` do cartão. Passava por um
              // ouvinte delegado no contentor da grelha, que existia só para
              // isto. `1.03` e não `1.06` — a imagem aproxima-se, não salta.
              className="h-full w-full object-cover transition-transform duration-500 ease-loja group-hover:scale-[1.03]"
            />
          ) : (
            // Sem fotografia, uma pata em marca de água — não um retângulo
            // vazio que parece a página a meio de carregar.
            <span className="flex h-full w-full items-center justify-center text-sage/40">
              <Icon name="paw" className="h-16 w-16" />
            </span>
          )}
          {/*
            Um sinal por cartão. O desconto em floresta e não em vermelho: o
            vermelho puro é a cor do saldo de fim de estação, e destaca-se pior
            sobre fotografia clara do que este verde quase preto.

            Um produto esgotado não anuncia desconto — daí o `else`, e não dois
            distintivos a dividir os cantos de cima. Os dois ficam à esquerda:
            o canto direito é do botão de favorito, fora deste link.
          */}
          {stockTotal === 0 ? (
            <span className="absolute left-3 top-3 rounded-full bg-floresta px-3 py-1 text-eyebrow font-semibold uppercase text-papel">
              {t('esgotado')}
            </span>
          ) : desconto ? (
            <span className="absolute left-3 top-3 rounded-full bg-floresta px-3 py-1 text-xs font-bold tabular-nums text-papel">
              -{desconto}%
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 p-5 pb-3">
          <p className="text-eyebrow font-semibold uppercase text-ink-muted">
            {product.brand.name}
          </p>
          {/* Duas linhas e reticências: um título de 50+ carateres não deve
              esticar o cartão nem empurrar o preço para alturas diferentes na
              mesma fiada. */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink sm:text-lg">
            {product.title}
          </h3>
          <Estrelas resumo={avaliacao} />
          <Price cents={preco.cents} old={preco.old} desde={preco.desde} className="mt-2 block" />
          {stockTotal > 0 ? (
            <p className="text-sm text-ink-muted">{t('emStock', { count: stockTotal })}</p>
          ) : (
            <p className="text-sm text-ink-muted">{t('semStock')}</p>
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
