'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * `useLayoutEffect` no browser — a animação é montada antes da primeira
 * pintura depois de hidratar, e não há um salto entre estados. No servidor cai
 * em `useEffect` só para o React não avisar sobre um efeito de layout que ali
 * nunca corre.
 */
const useEfeitoDeLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * A base de toda a camada de movimento. Nada nesta pasta fala com o GSAP sem
 * passar por aqui.
 *
 * **`prefers-reduced-motion` é verificado neste sítio e em mais nenhum.** Quem
 * o tem ligado no sistema não corre animação nenhuma — e como tudo anima *a
 * partir* do estado final (`gsap.from`), a página fica exatamente como o
 * servidor a mandou: completa e parada. Nunca vazia.
 *
 * Pela mesma razão o conteúdo existe sem JavaScript: o HTML servido já tem
 * tudo visível, e é o script que o esconde por meio segundo para o trazer de
 * volta. Se o script não correr — Google incluído — não falta nada.
 *
 * `gsap.context` limita os seletores ao elemento e desfaz tudo (inclusive os
 * ScrollTriggers) quando o componente sai. `animar` pode devolver a sua
 * própria função de limpeza, para o que o GSAP não sabe desfazer sozinho.
 */
export function useMotion<T extends HTMLElement>(
  animar: (el: T) => (() => void) | void,
  deps: unknown[] = [],
) {
  const ref = useRef<T>(null)

  useEfeitoDeLayout(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let limpar: (() => void) | void
    const ctx = gsap.context(() => {
      limpar = animar(el)
    }, el)

    return () => {
      limpar?.()
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
