import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'

import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco2 } from '../../services/kpiService'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { useKpiYear } from '../../context/KpiYearContext'

const np = { meta: null, realizado: null }
// Fallback sem valores — dados reais vêm do SharePoint
const MOCK = [
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Market Share TOTAL',         orientacao: '>', metrica: '%',        metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Retail Novos',               orientacao: '>', metrica: 'Unid.',    metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Margem Bruta Novos',         orientacao: '>', metrica: '%',        metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Seminovos', indicador: 'Volume de Vendas Seminovos', orientacao: '>', metrica: 'Unid.',    metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'F&I',              indicador: 'Penetração de Seguros %',    orientacao: '>', metrica: '%',        metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Score Card', responsavel: 'João',    q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Oficina',          indicador: 'Passagens na Oficina',       orientacao: '>', metrica: 'OS/mês',   metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Score Card', responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Oficina',          indicador: 'Clientes Ativos',            orientacao: '>', metrica: 'Clientes', metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Peças',            indicador: 'Faturamento Peças (R$)',     orientacao: '>', metrica: 'R$',   metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'João',    q1: np, q2: np, q3: np, q4: np, fy: np },
]

const AREAS = [...new Set(MOCK.map(r => r.area))]
const RESPONSAVEIS = [...new Set(MOCK.map(r => r.responsavel))]

function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

function pct(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toFixed(1)}%`
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0)   return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8)   return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function fmtNum(v, metrica) {
  if (v === null || v === undefined) return '–'
  if (typeof v !== 'number') return v
  if (metrica === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (metrica === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export default function KpiIndicadoresOperacionais() {
  const periodState = usePeriodSelector('bloco2')
  const { activePeriods } = periodState
  const { year } = useKpiYear()
  const { data: allRows, loading, source } = useKpiData(fetchBloco2, MOCK, { year })

  const [filterArea, setFilterArea] = useState('Todas')
  const [filterResp, setFilterResp] = useState('Todos')
  const [collapsedAreas, setCollapsedAreas] = useState({})

  const filtered = useMemo(() =>
    allRows.filter(r =>
      (filterArea === 'Todas' || r.area === filterArea) &&
      (filterResp === 'Todos' || r.responsavel === filterResp)
    ), [allRows, filterArea, filterResp])

  const grouped = useMemo(() => {
    const g = {}
    for (const row of filtered) {
      if (!g[row.area]) g[row.area] = []
      g[row.area].push(row)
    }
    return g
  }, [filtered])

  const toggleArea = (area) => setCollapsedAreas(prev => ({ ...prev, [area]: !prev[area] }))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bloco 2 — Indicadores Operacionais</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detalhamento por área e responsabilidade — Matriz KPIs</p>
        </div>
        <DataSourceBadge source={source} loading={loading} />
      </div>

      <PeriodSelector state={periodState} />

      {/* Filtros de área/responsável */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Área:</label>
          <select
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option>Todas</option>
            {AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Responsável:</label>
          <select
            value={filterResp}
            onChange={e => setFilterResp(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option>Todos</option>
            {RESPONSAVEIS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela agrupada por área */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 sticky left-0 bg-slate-50 min-w-[180px]">Indicador</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 min-w-[130px]">Responsabilidade</th>
                <th className="text-center px-2 py-2.5 font-medium text-slate-500">Or.</th>
                <th className="text-center px-2 py-2.5 font-medium text-slate-500">P.Obj</th>
                <th className="text-center px-2 py-2.5 font-medium text-slate-500">P.Área</th>
                {activePeriods.map(p => (
                  <th key={p} colSpan={4} className="text-center px-2 py-2.5 font-semibold text-blue-700 border-l border-slate-200">
                    {getPeriodLabel(p, year)}
                  </th>
                ))}
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Origem</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Resp.</th>
              </tr>
              <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
                <th colSpan={5} />
                {activePeriods.map(p => (
                  <React.Fragment key={p}>
                    <th className="px-2 py-1.5 text-slate-400 font-medium border-l border-slate-200">Meta</th>
                    <th className="px-2 py-1.5 text-slate-400 font-medium">Real.</th>
                    <th className="px-2 py-1.5 text-slate-400 font-medium">%Ating.</th>
                    <th className="px-2 py-1.5 text-slate-400 font-medium">Contrib.</th>
                  </React.Fragment>
                ))}
                <th colSpan={2} />
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([area, rows]) => (
                <React.Fragment key={area}>
                  <tr
                    className="bg-blue-950/10 cursor-pointer hover:bg-blue-950/15 transition-colors"
                    onClick={() => toggleArea(area)}
                  >
                    <td colSpan={100} className="px-4 py-2 font-bold text-blue-900 text-xs">
                      <span className="flex items-center gap-2">
                        {collapsedAreas[area] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {area}
                        <span className="ml-1 text-slate-500 font-normal">({rows.length} indicadores)</span>
                      </span>
                    </td>
                  </tr>
                  {!collapsedAreas[area] && rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">{row.indicador}</td>
                      <td className="px-3 py-2.5 text-slate-500">{row.responsabilidade}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{(row.pesoObj * 100).toFixed(0)}%</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{(row.pesoArea * 100).toFixed(0)}%</td>
                      {activePeriods.map(p => {
                        const d = getPeriodData(row, p)
                        const ating = calcAtingimento(row.orientacao, d.meta, d.realizado)
                        const contrib = ating !== null ? ating * row.pesoObj : null
                        return (
                          <React.Fragment key={p}>
                            <td className="px-2 py-2.5 text-center text-slate-600 border-l border-slate-100">{fmtNum(d.meta, row.metrica)}</td>
                            <td className="px-2 py-2.5 text-center text-slate-600">{fmtNum(d.realizado, row.metrica)}</td>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] ${badgeClass(ating)}`}>
                                {pct(ating)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-500">{pct(contrib)}</td>
                          </React.Fragment>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center text-slate-500">{row.origem}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{row.responsavel}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

