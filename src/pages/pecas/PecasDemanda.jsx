import React, { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Abas, Badge, CardGrafico, CardKpi, eixo, fmtMil, fmtMoeda, fmtNum, fmtPct, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const rotMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`

function Mini({ serie, cor }) {
  return (
    <div className="w-24 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={serie.map((v, i) => ({ i, v }))}><Line dataKey="v" stroke={cor} dot={false} strokeWidth={1.5} isAnimationActive={false} /></LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const colsTendencia = (cor) => [
  { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'grupo', t: 'Tipo de produto' }, { k: 'abc', t: 'Curva Venda', render: r => <Badge texto={r.abc} /> },
  { k: 'serie12', t: '12 meses', render: r => <Mini serie={r.serie12} cor={cor} />, exportar: r => r.serie12.join(' ') },
  { k: 'qtd12_anterior', t: 'Qtd 12m ant.', fmt: 'num' }, { k: 'qtd12', t: 'Qtd 12m', fmt: 'num' }, { k: 'variacao_ano', t: 'Var. ano', fmt: 'pct' },
  { k: 'tendencia', t: 'Tendência', render: r => fmtPct(r.tendencia * 100, 0), exportar: r => r.tendencia },
  { k: 'previsao_mes', t: 'Previsão mês', fmt: 'num1' }, { k: 'saldo', t: 'Saldo', fmt: 'num' },
]

export default function PecasDemanda() {
  const [filtros, setFiltros] = useFiltrosPecas()
  const { dados, carregando, erro, recarregar } = useTela('demanda', filtros)
  const [aba, setAba] = useState('crescentes')
  const k = dados?.kpis || {}
  const varQtd = k.qtd12_anterior ? (k.qtd12 / k.qtd12_anterior - 1) * 100 : null
  const varFat = k.faturamento12_anterior ? (k.faturamento12 / k.faturamento12_anterior - 1) * 100 : null

  return (
    <PaginaPecas icone={TrendingUp} titulo="Demanda e Tendências" tela="demanda" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="demanda">
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardKpi label="Unidades vendidas 12m" valor={fmtNum(k.qtd12)} sub={`${varQtd >= 0 ? '+' : ''}${fmtPct(varQtd)} vs 12m anteriores`} cor={varQtd >= 0 ? '#16a34a' : '#dc2626'} />
            <CardKpi label="Faturamento 12m" valor={fmtMoeda(k.faturamento12)} sub={`${varFat >= 0 ? '+' : ''}${fmtPct(varFat)} vs 12m anteriores`} cor={varFat >= 0 ? '#16a34a' : '#dc2626'} />
            <CardKpi label="Previsão próximo mês (un)" valor={fmtNum(k.previsao_mes)} info={INFO.previsao} cor="#0ea5e9" />
            <CardKpi label="Itens em crescimento / queda" valor={`${fmtNum(dados.crescentes.length)} / ${fmtNum(dados.em_queda.length)}`} info={INFO.tendencia} cor="#a855f7" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2">
              <CardGrafico titulo="Vendas mensais — 24 meses">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dados.serie.map(s => ({ ...s, rot: rotMes(s.mes) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="rot" tick={{ ...eixo, fontSize: 10 }} />
                    <YAxis yAxisId="l" tick={eixo} />
                    <YAxis yAxisId="r" orientation="right" tick={eixo} tickFormatter={fmtMil} />
                    <Tooltip formatter={(v, n) => (n === 'Faturamento' ? fmtMoeda(v) : fmtNum(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="l" dataKey="qtd" name="Unidades" fill="#fdba74" />
                    <Line yAxisId="r" dataKey="faturamento" name="Faturamento" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardGrafico>
            </div>
            <CardGrafico titulo="Índice de sazonalidade por mês" info={INFO.sazonalidade}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.sazonalidade.map(s => ({ ...s, rot: MESES[s.mes - 1] }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rot" tick={{ ...eixo, fontSize: 10 }} />
                  <YAxis tick={eixo} domain={[0, 'auto']} />
                  <ReferenceLine y={1} stroke="#64748b" strokeDasharray="4 4" />
                  <Tooltip formatter={(v) => fmtNum(v, 2)} />
                  <Bar dataKey="indice" name="Índice" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>
          <Abas abas={[['crescentes', `Em crescimento (${dados.crescentes.length})`], ['queda', `Em queda (${dados.em_queda.length})`], ['grupo', 'Por tipo de produto']]} aba={aba} onChange={setAba} />
          {aba === 'crescentes' && <TabelaPecas rows={dados.crescentes} cols={colsTendencia('#16a34a')} nomeArquivo="demanda-crescimento" />}
          {aba === 'queda' && <TabelaPecas rows={dados.em_queda} cols={colsTendencia('#dc2626')} nomeArquivo="demanda-queda" />}
          {aba === 'grupo' && <TabelaPecas rows={dados.porGrupo} nomeArquivo="demanda-tipo-produto" cols={[{ k: 'chave', t: 'Tipo de produto' }, { k: 'qtd12', t: 'Qtd 12m', fmt: 'num' }, { k: 'previsao_mes', t: 'Previsão próximo mês', fmt: 'num' }]} />}
        </>
      )}
    </PaginaPecas>
  )
}
