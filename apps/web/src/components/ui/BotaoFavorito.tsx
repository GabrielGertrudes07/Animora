'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '../../i18n/navigation'

import { alternarFavorito, ehFavorito } from '../../modules/account/acoes'
import { Icon } from '../icons/sprite'

/**
 * O coração da ficha de produto.
 *
 * Pergunta o estado depois de montar, em vez de o receber do servidor: a ficha
 * de produto é gerada estaticamente (`generateStaticParams`), e ler a sessão no
 * servidor para pintar um coração passava a página inteira a dinâmica — o
 * catálogo perdia o pré-render para desenhar um ícone.
 *
 * `null` quer dizer "sem sessão": aí não há coração para alternar, há um convite
 * a entrar. Um coração que não guarda nada é pior do que coração nenhum.
 */
export function BotaoFavorito({
  productId,
  compacto = false,
}: {
  productId: number
  /** Botão redondo, só o ícone — para caber sobre a imagem de um cartão. */
  compacto?: boolean
}) {
  const [favorito, setFavorito] = useState<boolean | null>(null)
  const [carregado, setCarregado] = useState(false)
  const [erro, setErro] = useState('')
  const t = useTranslations('BotaoFavorito')

  useEffect(() => {
    void ehFavorito(productId).then((estado) => {
      setFavorito(estado)
      setCarregado(true)
    })
  }, [productId])

  if (!carregado) return null

  if (favorito === null) {
    if (compacto) {
      return (
        <Link
          href="/conta/entrar"
          aria-label={t('entrarParaGuardar')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/90 text-ink-muted backdrop-blur-sm transition-colors hover:text-ink"
        >
          <Icon name="heart" className="h-5 w-5" />
        </Link>
      )
    }
    return (
      <Link
        href="/conta/entrar"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-muted underline transition-colors hover:text-ink sm:min-h-0"
      >
        <Icon name="heart" className="h-4 w-4" />
        {t('entrarParaGuardar')}
      </Link>
    )
  }

  const alternar = () => {
    void alternarFavorito(productId).then((r) => {
      if (r.ok) {
        setFavorito(r.favorito)
        setErro('')
      } else {
        setErro(r.erro)
      }
    })
  }

  if (compacto) {
    return (
      <button
        type="button"
        aria-pressed={favorito}
        aria-label={favorito ? t('nosFavoritos') : t('guardarNosFavoritos')}
        onClick={alternar}
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
          favorito
            ? 'border-terracota bg-terracota/10 text-terracota-dark'
            : 'border-line bg-white/90 text-ink-muted backdrop-blur-sm hover:text-ink'
        }`}
      >
        <Icon name="heart" className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-pressed={favorito}
        onClick={alternar}
        className={`inline-flex min-h-11 items-center gap-2 rounded-campo border px-3 py-2 text-sm font-medium transition-colors sm:min-h-0 ${
          favorito
            ? 'border-terracota bg-terracota/10 text-terracota-dark'
            : 'border-line text-ink-muted hover:text-ink'
        }`}
      >
        <Icon name="heart" className="h-4 w-4" />
        {favorito ? t('nosFavoritos') : t('guardarNosFavoritos')}
      </button>
      {erro ? <p className="mt-2 text-sm text-terracota-dark">{erro}</p> : null}
    </div>
  )
}
