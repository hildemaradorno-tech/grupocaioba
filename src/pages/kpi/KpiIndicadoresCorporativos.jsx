import React from 'react'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'
import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco1 } from '../../services/kpiService'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { useKpiYear } from '../../context/KpiYearContext'

const np = { meta: null, realizado: null }
// Fallback sem valores — dados reais vêm do SharePoint
const MOCK = [
  { indicador: 'Receita Líquida Total', orientacao: '>', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Bruta Total',    orientacao: '>', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Bruta %',        orientacao: '>', metrica: '%',          metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Líquida Total',  orientacao: '>', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Líquida %',      orientacao: '>', metrica: '%',          metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Despesas Operacionais', orientacao: '<', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
]

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

export default function KpiIndicadoresCorporativos() {
  const periodState = usePeriodSelector('bloco1')
  const { activePeriods } = periodState
  const { year } = useKpiYear()
  const { data: rows, loading, source } = useKpiData(fetchBloco1, MOCK, { year })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bloco 1 — Indicadores Corporativos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Saúde financeira e estratégica da empresa — Matriz KPIs</p>
        </div>
        <DataSourceBadge source={source} loading={loading} />
      </div>

      <PeriodSelector state={periodState} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 sticky left-0 bg-slate-50 min-w-[200px]">Indicador</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Or.</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Meta Anual</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Peso</th>
                {activePeriods.map(p => (
                  <th key={p} colSpan={4} className="text-center px-2 py-2.5 font-semibold text-blue-700 border-l border-slate-200">
                    {getPeriodLabel(p, year)}
                  </th>
                ))}
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Origem</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Resp.</th>
              </tr>
              <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
                <th colSpan={4} />
                {activePeriods.map(p => (
                  <React.Fragment key={p}>
                    <th className="px-2 py-1.5 text-slate-400 font-medium border-l border-slate-200">Meta</th>
                    <th className="px-2 py-1.5 text-slate-400 font-medium">Realiz.</th>
                    <th className="px-2 py-1.5 text-slate-400 font-medium">% Ating.</th>
                    <th className="px-2 py-1.5 text-slate-400 font-medium">Contrib.</th>
                  </React.Fragment>
                ))}
                <th colSpan={2} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">{row.indicador}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                  <td className="px-3 py-2.5 text-center text-slate-600">{fmtNum(row.metaAnual, row.metrica)}</td>
                  <td className="px-3 py-2.5 text-center text-slate-500">{(row.peso * 100).toFixed(0)}%</td>
                  {activePeriods.map(p => {
                    const d = getPeriodData(row, p)
                    const ating = calcAtingimento(row.orientacao, d.meta, d.realizado)
                    const contrib = ating !== null ? ating * row.peso : null
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

