import type { AdminViewServerProps } from 'payload'
import { formatEuros } from '@animora/core'
import React from 'react'

import { ehStaff } from '../access/staff'
import {
  DashboardError,
  lerDashboard,
  type Artigo,
  type ArtigoStock,
  type Dashboard,
} from '../endpoints/dashboard'

/**
 * O ecrã de vendas do painel (`/admin/vendas`).
 *
 * Corre no servidor e chama `lerDashboard` diretamente — o mesmo caminho do
 * `GET /api/dashboard`, com a mesma verificação da trava. Não há aqui um
 * `fetch` ao próprio endpoint nem uma segunda cópia da decisão: com a trava
 * ligada, este ecrã recebe a série de demonstração porque foi o servidor que a
 * escolheu, e nenhum número real chega ao HTML.
 *
 * A faixa de demonstração aparece sempre que `locked` — não tem botão de
 * fechar e não é condicionada por preferência nenhuma. É a parte não
 * negociável: uma faturação inventada que alguém tome por sua leva a decisões
 * de negócio com números falsos.
 */

const cor = {
  texto: 'var(--theme-elevation-800)',
  fraco: 'var(--theme-elevation-500)',
  linha: 'var(--theme-elevation-150)',
  caixa: 'var(--theme-elevation-50)',
}

const cartao: React.CSSProperties = {
  background: cor.caixa,
  border: `1px solid ${cor.linha}`,
  borderRadius: '.25rem',
  padding: '1rem',
}

const percentagem = (centesimos: number | null): string =>
  centesimos === null
    ? 'desconhecida'
    : `${(centesimos / 100).toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} %`

const comSinal = (centesimos: number | null): string =>
  centesimos === null || centesimos <= 0 ? percentagem(centesimos) : `+${percentagem(centesimos)}`

const Numero = ({
  titulo,
  valor,
  nota,
}: {
  titulo: string
  valor: string
  nota?: string
}): React.ReactElement => (
  <div style={cartao}>
    <div style={{ color: cor.fraco, fontSize: '.8rem', textTransform: 'uppercase' }}>{titulo}</div>
    <div style={{ color: cor.texto, fontSize: '1.6rem', fontWeight: 600, lineHeight: 1.4 }}>
      {valor}
    </div>
    {nota !== undefined && <div style={{ color: cor.fraco, fontSize: '.8rem' }}>{nota}</div>}
  </div>
)

const Bloco = ({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}): React.ReactElement => (
  <section style={{ ...cartao, marginBottom: '1rem' }}>
    <h2 style={{ fontSize: '1rem', margin: '0 0 .75rem' }}>{titulo}</h2>
    {children}
  </section>
)

const Tabela = ({
  colunas,
  linhas,
}: {
  colunas: string[]
  linhas: (string | number)[][]
}): React.ReactElement =>
  linhas.length === 0 ? (
    <p style={{ color: cor.fraco, margin: 0 }}>Nada a mostrar neste período.</p>
  ) : (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          {colunas.map((c, i) => (
            <th
              key={c}
              style={{
                borderBottom: `1px solid ${cor.linha}`,
                color: cor.fraco,
                fontSize: '.8rem',
                fontWeight: 400,
                padding: '.4rem .5rem',
                textAlign: i === 0 ? 'left' : 'right',
              }}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={String(linha[0])}>
            {linha.map((celula, i) => (
              <td
                key={colunas[i]}
                style={{
                  borderBottom: `1px solid ${cor.linha}`,
                  padding: '.4rem .5rem',
                  textAlign: i === 0 ? 'left' : 'right',
                }}
              >
                {celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

const linhasDeArtigos = (artigos: Artigo[]): (string | number)[][] =>
  artigos.map((a) => [`${a.titulo} (${a.sku})`, a.unidades, formatEuros(a.receitaCents)])

const linhasDeStock = (artigos: ArtigoStock[]): (string | number)[][] =>
  artigos.map((a) => [`${a.titulo} (${a.sku})`, a.stock])

/** Faixa permanente. Sem botão de fechar, e é essa a intenção. */
const Faixa = ({ aviso }: { aviso: NonNullable<Dashboard['aviso']> }): React.ReactElement => (
  <aside
    style={{
      alignItems: 'center',
      background: '#fdf3d2',
      border: '1px solid #d9b64a',
      borderRadius: '.25rem',
      color: '#4a3a06',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      justifyContent: 'space-between',
      marginBottom: '1.5rem',
      padding: '1rem',
    }}
  >
    <div>
      <strong style={{ display: 'block', fontSize: '1.05rem' }}>{aviso.titulo}</strong>
      <span>{aviso.texto}</span>
    </div>
    <a
      href={aviso.url}
      target="_blank"
      rel="noreferrer"
      style={{
        background: '#128c7e',
        borderRadius: '.25rem',
        color: '#fff',
        padding: '.6rem 1rem',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {aviso.botao}
    </a>
  </aside>
)

const Periodo = ({ dados }: { dados: Dashboard }): React.ReactElement => (
  <form
    method="get"
    style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.5rem' }}
  >
    <label style={{ color: cor.fraco, fontSize: '.8rem' }}>
      De
      <br />
      <input type="date" name="de" defaultValue={dados.periodo.de} />
    </label>
    <label style={{ color: cor.fraco, fontSize: '.8rem' }}>
      Até
      <br />
      <input type="date" name="ate" defaultValue={dados.periodo.ate} />
    </label>
    <button type="submit">Ver período</button>
    <span style={{ color: cor.fraco, fontSize: '.8rem' }}>
      Comparado com {dados.comparacao.periodo.de} a {dados.comparacao.periodo.ate}
    </span>
  </form>
)

const PainelVendas = async (props: AdminViewServerProps): Promise<React.ReactElement> => {
  const req = props.initPageResult.req

  // O painel já exige sessão de staff para chegar aqui. A guarda repete-se
  // porque é a fronteira que esta tarefa inteira existe para defender, e um
  // ecrã que confia no enquadramento é um ecrã que deixa de estar protegido
  // quando o enquadramento mudar.
  if (!ehStaff(req.user)) {
    return <p style={{ padding: '2rem' }}>O dashboard de vendas é da administração da loja.</p>
  }

  let dados: Dashboard
  try {
    dados = await lerDashboard(req, (props.searchParams ?? {}) as Record<string, unknown>)
  } catch (erro) {
    if (!(erro instanceof DashboardError)) throw erro
    return <p style={{ padding: '2rem' }}>{erro.message}</p>
  }

  const { vendas, comparacao } = dados
  const semCusto =
    vendas.unidadesSemCustoConhecido > 0
      ? `${vendas.unidadesSemCustoConhecido} unidade(s) sem custo registado`
      : undefined

  return (
    <div style={{ color: cor.texto, margin: '0 auto', maxWidth: '68rem', padding: '2rem 1.5rem' }}>
      <h1 style={{ marginTop: 0 }}>Vendas</h1>

      {dados.aviso !== null && <Faixa aviso={dados.aviso} />}

      <Periodo dados={dados} />

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
          marginBottom: '1rem',
        }}
      >
        <Numero
          titulo="Faturação (artigos)"
          valor={formatEuros(vendas.faturacaoCents)}
          nota={`${comSinal(comparacao.variacaoFaturacaoPercent)} face a ${formatEuros(comparacao.faturacaoCents)}`}
        />
        <Numero
          titulo="Lucro"
          valor={formatEuros(vendas.lucroCents)}
          nota={semCusto ?? `Custo das mercadorias: ${formatEuros(vendas.custoCents)}`}
        />
        {/* Uma margem que não se sabe aparece como não se sabendo. Zero por
            cento e cem por cento são ambas respostas erradas — e a segunda é a
            que sai sozinha de tratar custo desconhecido como custo nulo. */}
        <Numero
          titulo="Margem"
          valor={percentagem(vendas.margemPercent)}
          nota={vendas.margemPercent === null ? semCusto : undefined}
        />
        <Numero
          titulo="Encomendas"
          valor={String(vendas.encomendas)}
          nota={`${comparacao.encomendas} no período anterior`}
        />
        <Numero
          titulo="Ticket médio"
          valor={formatEuros(vendas.ticketMedioCents)}
          nota={`${formatEuros(comparacao.ticketMedioCents)} no período anterior`}
        />
        <Numero
          titulo="Unidades"
          valor={String(vendas.unidades)}
          nota={`${comparacao.unidades} no período anterior`}
        />
        <Numero
          titulo="Clientes novos"
          valor={String(dados.clientes.novos)}
          nota={`${dados.clientes.recorrentes} recorrente(s)`}
        />
        <Numero
          titulo="Ruturas"
          valor={String(dados.stock.ruturas.length)}
          nota={`${dados.stock.baixo.length} artigo(s) com stock baixo`}
        />
      </div>

      <Bloco titulo="Mais vendidos por unidades">
        <Tabela
          colunas={['Artigo', 'Unidades', 'Receita']}
          linhas={linhasDeArtigos(dados.maisVendidosPorUnidades)}
        />
      </Bloco>

      <Bloco titulo="Mais vendidos por receita">
        <Tabela
          colunas={['Artigo', 'Unidades', 'Receita']}
          linhas={linhasDeArtigos(dados.maisVendidosPorReceita)}
        />
      </Bloco>

      <Bloco titulo="Receita por categoria">
        <Tabela
          colunas={['Categoria', 'Unidades', 'Receita']}
          linhas={dados.receitaPorCategoria.map((c) => [
            c.categoria,
            c.unidades,
            formatEuros(c.receitaCents),
          ])}
        />
      </Bloco>

      <Bloco titulo="Ruturas de stock">
        <Tabela colunas={['Artigo', 'Stock']} linhas={linhasDeStock(dados.stock.ruturas)} />
      </Bloco>

      <Bloco titulo="Stock baixo">
        <Tabela colunas={['Artigo', 'Stock']} linhas={linhasDeStock(dados.stock.baixo)} />
      </Bloco>
    </div>
  )
}

/** O link para o ecrã, na navegação do painel. */
export const LinkVendas = (): React.ReactElement => (
  <a href="/admin/vendas" className="nav__link" style={{ display: 'block' }}>
    Vendas
  </a>
)

export default PainelVendas
