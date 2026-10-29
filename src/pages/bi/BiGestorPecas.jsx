import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Package, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { AvisoIntegracao, BarraFiltros, CardGrafico, CardKpi, COR_ABC, COR_SITUACAO, eixo, fmtMil, fmtMoeda, fmtNum, fmtPct, nomeLoja, useFiltrosPecas, useTela } from '../pecas/components/ui'
import { INFO } from '../pecas/gestorPecasTextos'
import { useSegmento } from '../pecas/segmento'

const CAMPOS = ['loja', 'marca', 'grupo', 'fornecedor']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Dashboard executivo do Gestor de Peças 2.0 (padrão: dashboards ficam no menu BI, com ponte para a tela operacional)
export default function BiGestorPecas() {
  const sg = useSegmento()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const painel = useTela('painel', filtros)
  const demanda = useTela('demanda', filtros)
  const d = painel.dados
  const k = d?.kpis || {}
  const podeOperacional = ['central-alertas', 'reposicao', 'estoque'].map(sg.perm).find(p => hasPermission(p))

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      <div className="relative z-10 rounded-lg border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-100 via-amber-50 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shrink-0"><Package className="h-5 w-5 text-white" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Gestor de Peças 2.0 — {sg.nome}</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Dashboard executivo de estoque e compras · {sg.empresa} ({sg.sistema})</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {d?.fonte === 'mock' && <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold"><FlaskConical className="h-3 w-3" /> Dados simulados</span>}
              <button type="button" onClick={() => { painel.recarregar(); demanda.recarregar() }} title="Atualizar" aria-label="Atualizar"
                className="p-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white shadow-sm"><RefreshCw className={`h-3.5 w-3.5 ${painel.carregando ? 'animate-spin' : ''}`} /></button>
              {podeOperacional && <button type="button" onClick={() => navigate('/' + podeOperacional)} className="px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold shadow-sm">Ir para Gestor de Peças</button>}
            </div>
            <BarraFiltros filtros={filtros} setFiltros={setFiltros} mostrar={CAMPOS} />
          </div>
        </div>
      </div>
      {d?.fonte && d.fonte !== 'mock' && <AvisoIntegracao fonte={d.fonte} />}
      {painel.erro && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-700">{painel.erro}</div>}
      {d && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <CardKpi label="Valor em estoque" valor={fmtMoeda(k.valor)} info={INFO.valorEstoque} />
            <CardKpi label="SKUs com saldo" valor={fmtNum(k.skus_ativos)} info={INFO.skusAtivos} cor="#0ea5e9" />
            <CardKpi label="Giro anual" valor={`${fmtNum(k.giro_anual, 2)}x`} info={INFO.giro} cor="#a855f7" />
            <CardKpi label="Cobertura média" valor={`${fmtNum(k.cobertura_media_dias)} d`} info={INFO.cobertura} cor="#eab308" />
            <CardKpi label="Ruptura" valor={fmtPct(k.pct_ruptura)} sub={`${fmtMoeda(k.venda_perdida_mes)}/mês perdidos`} info={INFO.ruptura} cor="#dc2626" />
            <CardKpi label="Excesso" valor={fmtMoeda(k.excesso_valor)} info={INFO.excesso} cor="#0ea5e9" />
            <CardKpi label="Obsoletos" valor={fmtMoeda(k.obsoleto_valor)} sub={`${fmtPct(k.pct_obsoleto)} do estoque`} info={INFO.obsoleto} cor="#475569" />
            <CardKpi label="Sugestão de compra" valor={fmtMoeda(k.sugestao_compra_valor)} info={INFO.reposicao} cor="#16a34a" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <CardGrafico titulo="Estoque por situação" info={INFO.valorEstoque}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.porSituacao.filter(s => s.valor > 0)} dataKey="valor" nameKey="situacao" innerRadius="50%" outerRadius="80%">
                    {d.porSituacao.filter(s => s.valor > 0).map(s => <Cell key={s.situacao} fill={COR_SITUACAO[s.situacao]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoeda(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Valor em estoque por curva ABC" info={INFO.abc}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.valorAbc}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="classe" tick={eixo} /><YAxis tick={eixo} tickFormatter={fmtMil} /><Tooltip formatter={(v, n, p) => [`${fmtMoeda(v)} · ${fmtNum(p.payload.itens)} itens`, 'Valor']} /><Bar dataKey="valor">{d.valorAbc.map(a => <Cell key={a.classe} fill={COR_ABC[a.classe]} />)}</Bar></BarChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Comparativo por loja" info={INFO.excesso}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.porLoja.map(l => ({ ...l, loja: nomeLoja(l.chave) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="loja" tick={eixo} /><YAxis tick={eixo} tickFormatter={fmtMil} /><Tooltip formatter={(v) => fmtMoeda(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="valor" name="Estoque" fill="#ea580c" /><Bar dataKey="excesso_valor" name="Excesso" fill="#0ea5e9" /><Bar dataKey="obsoleto_valor" name="Obsoleto" fill="#475569" /></BarChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>
          {demanda.dados && (
            <CardGrafico titulo="Vendas de peças — 24 meses (unidades e faturamento)" altura="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={demanda.dados.serie.map(s => ({ ...s, rot: `${MESES[Number(s.mes.slice(5, 7)) - 1]}/${s.mes.slice(2, 4)}` }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="rot" tick={{ ...eixo, fontSize: 10 }} /><YAxis yAxisId="l" tick={eixo} /><YAxis yAxisId="r" orientation="right" tick={eixo} tickFormatter={fmtMil} />
                  <Tooltip formatter={(v, n) => (n === 'Faturamento' ? fmtMoeda(v) : fmtNum(v))} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="qtd" name="Unidades" fill="#fdba74" /><Line yAxisId="r" dataKey="faturamento" name="Faturamento" stroke="#ea580c" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardGrafico>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardKpi label="Transferências possíveis" valor={fmtMoeda(k.transferencias_valor)} info={INFO.transferencia} cor="#0ea5e9" />
            <CardKpi label="Pedidos atrasados (itens)" valor={fmtNum(k.pedidos_atrasados)} info={INFO.pedidos} cor="#f59e0b" />
            <CardKpi label="Compras com anomalia" valor={fmtNum(k.anomalias_compra)} info={INFO.anomaliaCompra} cor="#dc2626" />
            <CardKpi label="Itens com anomalia de preço" valor={fmtNum(k.anomalias_preco)} info={INFO.anomaliaPreco} cor="#a855f7" />
          </div>
        </>
      )}
    </div>
  )
}
