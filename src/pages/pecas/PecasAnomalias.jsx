import React, { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Abas, Badge, CardKpi, fmtMoeda, fmtMoeda2, fmtNum, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'

const Motivos = ({ r }) => <ul className="list-disc pl-4 space-y-0.5 min-w-[260px]">{r.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>

function MiniPrecoCusto({ historico }) {
  return (
    <div className="w-28 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historico}>
          <Tooltip formatter={(v) => fmtMoeda2(v)} labelFormatter={(_, p) => p?.[0]?.payload?.mes} contentStyle={{ fontSize: 10 }} />
          <Line dataKey="preco" name="Preço" stroke="#16a34a" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          <Line dataKey="custo" name="Custo" stroke="#dc2626" dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function PecasAnomalias() {
  const [filtros, setFiltros] = useFiltrosPecas()
  const [aba, setAba] = useState('compra')
  const compra = useTela('anomalias-compra', filtros)
  const preco = useTela('anomalias-preco', filtros)
  const atual = aba === 'compra' ? compra : preco
  const kc = compra.dados?.kpis || {}
  const kp = preco.dados?.kpis || {}

  return (
    <PaginaPecas icone={ShieldAlert} titulo="Anomalias de Compra, Preço e Custo" tela="anomalias" fonte={atual.dados?.fonte} carregando={atual.carregando} erro={atual.erro}
      onRecarregar={() => { compra.recarregar(); preco.recarregar() }} filtros={filtros} setFiltros={setFiltros} iaTela={aba === 'compra' ? 'anomalias-compra' : 'anomalias-preco'}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <CardKpi label="Compras com anomalia (120 dias)" valor={fmtNum(kc.compras)} info={INFO.anomaliaCompra} onClick={() => setAba('compra')} />
        <CardKpi label="Valor dessas compras" valor={fmtMoeda(kc.valor)} info={INFO.anomaliaCompra} cor="#f59e0b" />
        <CardKpi label="Compras críticas" valor={fmtNum(kc.criticas)} info={INFO.anomaliaCompra} cor="#dc2626" />
        <CardKpi label="Itens com anomalia de preço/custo" valor={fmtNum(kp.itens)} info={INFO.anomaliaPreco} cor="#a855f7" onClick={() => setAba('preco')} />
        <CardKpi label="Preço abaixo do custo" valor={fmtNum(kp.abaixo_custo)} info={INFO.anomaliaPreco} cor="#dc2626" onClick={() => setAba('preco')} />
        <CardKpi label="Ocorrências críticas de preço" valor={fmtNum(kp.criticas)} info={INFO.anomaliaPreco} cor="#dc2626" />
      </div>
      <Abas abas={[['compra', 'Compras com anomalia'], ['preco', 'Preço e custo']]} aba={aba} onChange={setAba} />
      {aba === 'compra' && compra.dados && (
        <TabelaPecas rows={compra.dados.rows} nomeArquivo="anomalias-compra" cols={[
          { k: 'severidade', t: 'Severidade', render: r => <Badge texto={r.severidade} /> },
          { k: 'data_pedido', t: 'Data pedido', fmt: 'data' }, { k: 'nf', t: 'NF' }, { k: 'fornecedor', t: 'Fornecedor' },
          { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
          { k: 'qtd_pedida', t: 'Qtd', fmt: 'num' }, { k: 'custo_unitario', t: 'Custo unit.', fmt: 'moeda2' }, { k: 'valor', t: 'Valor', fmt: 'moeda' },
          { k: 'media_mensal', t: 'Venda média/mês', fmt: 'num1' }, { k: 'cobertura_dias', t: 'Cobertura hoje', fmt: 'dias' },
          { k: 'motivos', t: 'Motivos', render: r => <Motivos r={r} /> },
        ]} />
      )}
      {aba === 'preco' && preco.dados && (
        <TabelaPecas rows={preco.dados.rows} nomeArquivo="anomalias-preco" cols={[
          { k: 'severidade', t: 'Severidade', render: r => <Badge texto={r.severidade} /> },
          { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'marca', t: 'Marca' }, { k: 'abc', t: 'Curva Venda', render: r => <Badge texto={r.abc} /> },
          { k: 'historico', t: 'Preço × custo 12m', render: r => <MiniPrecoCusto historico={r.historico} />, exportar: () => '' },
          { k: 'custo', t: 'Custo', fmt: 'moeda2' }, { k: 'preco', t: 'Preço', fmt: 'moeda2' }, { k: 'margem', t: 'Margem', fmt: 'pct' },
          { k: 'var_custo_1m', t: 'Custo 1m', fmt: 'pct' }, { k: 'var_custo_3m', t: 'Custo 3m', fmt: 'pct' }, { k: 'var_preco_1m', t: 'Preço 1m', fmt: 'pct' },
          { k: 'meses_sem_reajuste', t: 'Meses s/ reajuste', fmt: 'num' }, { k: 'preco_sugerido', t: 'Preço sugerido', fmt: 'moeda2' },
          { k: 'qtd12', t: 'Qtd 12m', fmt: 'num' },
          { k: 'motivos', t: 'Motivos', render: r => <Motivos r={r} /> },
        ]} />
      )}
    </PaginaPecas>
  )
}
