import { describe, expect, it } from 'vitest'

import { construirDashboard, lerJanela, type Fonte, type Janela } from './dashboard'

/**
 * O corte do dia, no fuso da loja.
 *
 * Aritmética pura: não precisa de base de dados nenhuma, e é de propósito que
 * não a toca — o que aqui se fixa é onde acaba o dia, e isso tem de ser o mesmo
 * na máquina de quem desenvolve, no contentor em UTC e no servidor de produção.
 * Nenhuma destas asserções depende do `TZ` do processo: se alguém voltar a
 * ancorar a janela ao fuso da máquina (ou a UTC), falham aqui.
 */

const VAZIA: Fonte = {
  periodo: [],
  anterior: [],
  clientesNovos: 0,
  clientesRecorrentes: 0,
  ruturas: [],
  stockBaixo: [],
}

const dentro = (janela: Janela, instante: string): boolean => {
  const t = new Date(instante).getTime()
  return t >= janela.de.getTime() && t < janela.ate.getTime()
}

describe('lerJanela ancora o dia a Europe/Lisbon', () => {
  /**
   * O defeito medido: uma encomenda de 38,70 € criada às 00:30 de 16/08 em
   * Lisboa (23:30 UTC de 15/08) saía no relatório de 15/08. Durante a hora de
   * verão — sete meses por ano — todo o relatório diário e mensal andava uma
   * hora para trás.
   */
  const MEIA_NOITE_E_MEIA_DE_16 = '2026-08-15T23:30:00.000Z'

  it('hora de verão: o dia 16 começa às 23:00 UTC de 15 e a encomenda das 00:30 é do dia 16', () => {
    const dia16 = lerJanela({ de: '2026-08-16', ate: '2026-08-16' })
    expect(dia16.de.toISOString()).toBe('2026-08-15T23:00:00.000Z')
    expect(dia16.ate.toISOString()).toBe('2026-08-16T23:00:00.000Z')
    expect(dentro(dia16, MEIA_NOITE_E_MEIA_DE_16)).toBe(true)

    const dia15 = lerJanela({ de: '2026-08-15', ate: '2026-08-15' })
    expect(dentro(dia15, MEIA_NOITE_E_MEIA_DE_16)).toBe(false)
  })

  it('fora da hora de verão o corte é à meia-noite UTC, porque é essa a hora de Lisboa', () => {
    const dia15 = lerJanela({ de: '2026-01-15', ate: '2026-01-15' })
    expect(dia15.de.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    expect(dia15.ate.toISOString()).toBe('2026-01-16T00:00:00.000Z')

    // 00:30 de 15/01 em Lisboa é 00:30 UTC no inverno — e é do dia 15 na mesma.
    expect(dentro(dia15, '2026-01-15T00:30:00.000Z')).toBe(true)
    expect(dentro(lerJanela({ de: '2026-01-14', ate: '2026-01-14' }), '2026-01-15T00:30:00.000Z')).toBe(false)
  })

  it('um fecho de mês apanha a última noite do mês e não a primeira do seguinte', () => {
    const julho = lerJanela({ de: '2026-07-01', ate: '2026-07-31' })
    expect(julho.de.toISOString()).toBe('2026-06-30T23:00:00.000Z')
    expect(julho.ate.toISOString()).toBe('2026-07-31T23:00:00.000Z')

    // 23:30 de 31/07 em Lisboa: dentro de julho.
    expect(dentro(julho, '2026-07-31T22:30:00.000Z')).toBe(true)
    // 00:30 de 1/08 em Lisboa: já é agosto, e em UTC ainda diz 31 de julho.
    expect(dentro(julho, '2026-07-31T23:30:00.000Z')).toBe(false)
    expect(dentro(lerJanela({ de: '2026-08-01', ate: '2026-08-31' }), '2026-07-31T23:30:00.000Z')).toBe(true)
  })

  it('uma janela que atravessa a mudança da hora continua a ter os dias do calendário', () => {
    // Outubro de 2026 tem 25 horas no dia 25: somar 24 h a cada dia dava 30 dias
    // e um corte à 01:00. São 31 dias de calendário, e o último acaba à meia-noite.
    const outubro = lerJanela({ de: '2026-10-01', ate: '2026-10-31' })
    // Começa na hora de verão (23:00 UTC) e acaba já fora dela (00:00 UTC).
    expect(outubro.de.toISOString()).toBe('2026-09-30T23:00:00.000Z')
    expect(outubro.ate.toISOString()).toBe('2026-11-01T00:00:00.000Z')

    const d = construirDashboard(VAZIA, outubro, true)
    expect(d.periodo).toEqual({ de: '2026-10-01', ate: '2026-10-31', dias: 31 })
    // E o período de comparação é setembro inteiro, alinhado à meia-noite de Lisboa.
    expect(d.comparacao.periodo).toEqual({ de: '2026-08-31', ate: '2026-09-30', dias: 31 })
  })

  it('sem "de" nem "ate" são os últimos 30 dias, cortados à meia-noite de Lisboa', () => {
    const janela = lerJanela({})
    expect(construirDashboard(VAZIA, janela, true).periodo.dias).toBe(30)
    // "Agora" está sempre dentro do período por omissão — foi isso que se pediu.
    expect(dentro(janela, new Date().toISOString())).toBe(true)

    // Os dois extremos caem à meia-noite EM LISBOA, seja qual for a época do
    // ano: em UTC seriam 00:00 no inverno e 23:00 do dia anterior no verão.
    const horaEmLisboa = (d: Date) =>
      d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Lisbon', hourCycle: 'h23' })
    expect(horaEmLisboa(janela.de)).toBe('00:00:00')
    expect(horaEmLisboa(janela.ate)).toBe('00:00:00')
  })
})
