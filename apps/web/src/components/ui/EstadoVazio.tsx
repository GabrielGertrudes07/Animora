import type { ReactNode } from 'react'
import { Ilustracao, type IlustracaoName } from '../icons/ilustracoes'

/**
 * O ecrã de "não há nada aqui", igual em toda a loja: carrinho, favoritos,
 * encomendas, catálogo sem resultados.
 *
 * Eram cinco blocos escritos à mão, cada um com o seu tamanho de texto e a
 * sua margem. Agora é um só, com desenho — e o botão de saída fica a cargo de
 * quem chama, porque o sítio para onde se manda a pessoa muda com o contexto.
 */
export function EstadoVazio({
  ilustracao,
  titulo,
  texto,
  children,
}: {
  ilustracao: IlustracaoName
  titulo: string
  texto?: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-card border border-line bg-white px-6 py-12 text-center shadow-sm">
      <Ilustracao name={ilustracao} className="mx-auto h-28 w-auto text-sage" />
      <h2 className="mt-6 text-xl font-semibold text-ink">{titulo}</h2>
      {texto ? <p className="mx-auto mt-2 max-w-sm text-ink-muted">{texto}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
