'use client'

import { useEffect } from 'react'
import { registarVisto } from '../../lib/vistos'

/**
 * Não desenha nada — só grava, ao montar, que este produto foi visto.
 * "Vistos recentemente" (Home) lê essa lista depois.
 */
export function RegistrarVisualizacao({ produtoId }: { produtoId: number }) {
  useEffect(() => {
    registarVisto(produtoId)
  }, [produtoId])

  return null
}
