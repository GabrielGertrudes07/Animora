import { routing } from '../i18n/routing'

/**
 * A base de URL absoluta da loja. Ainda não há domínio de produção — a
 * env var fica pronta para o dia em que houver, e o placeholder documenta
 * que é um placeholder (nunca seria confundido com um domínio real).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://animora.exemplo.pt').replace(
  /\/+$/,
  '',
)

/**
 * O prefixo de idioma na URL, a mesma regra do `routing`
 * (`localePrefix: 'as-needed'`): o idioma por omissão não leva prefixo, os
 * outros levam `/<locale>`. Não reusa `getPathname` do next-intl de propósito
 * — essa regra aqui é fixa e só espelha esta configuração, e mantê-la pura
 * (sem o runtime do Next) é o que permite testar isto sem browser nenhum.
 */
export function localizedPathname(pathname: string, locale: string): string {
  return locale === routing.defaultLocale ? pathname : `/${locale}${pathname}`
}

/** URL absoluta de uma rota, no idioma indicado. */
export function absoluteUrl(pathname: string, locale: string): string {
  return `${SITE_URL}${localizedPathname(pathname, locale)}`
}

/**
 * `alternates` para uma página localizada: canónica no idioma atual, e uma
 * versão por idioma de `routing.locales`. `x-default` aponta para o idioma
 * por omissão (pt) — a recomendação do Google para quem chega sem
 * preferência de idioma conhecida.
 */
export function alternatesFor(
  pathname: string,
  locale: string,
): { canonical: string; languages: Record<string, string> } {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(pathname, l)]))

  return {
    canonical: absoluteUrl(pathname, locale),
    languages: { ...languages, 'x-default': absoluteUrl(pathname, routing.defaultLocale) },
  }
}

/**
 * Cêntimos → decimal ISO ("29.90"). O `Offer.price` do schema.org quer um
 * número decimal com ponto, nunca o texto localizado que `formatEuros`
 * produz ("29,90 €") — são dois públicos diferentes, humano e máquina.
 */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2)
}
