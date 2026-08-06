import React, { useMemo, useState } from 'react'
import { Package } from 'lucide-react'
import { MOCK_BLOCO3_PECAS } from '../../data/kpiMockData'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'
import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco3Pecas } from '../../services/kpiService'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { useKpiYear } from '../../context/KpiYearContext'

const COR_HEADER = {
  blue:   'bg-blue-700   text-white',
  indigo: 'bg-indigo-700 text-white',
  violet: 'bg-violet-700 text-white',
  purple: 'bg-purple-700 text-white',
  fuchsia:'bg-fuchsia-700 text-white',
  teal:   'bg-teal-700   text-white',
}

const COR_SUBHEADER = {
  blue:   'bg-blue-50   border-blue-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  violet: 'bg-violet-50 border-violet-200',
  purple: 'bg-purple-50 border-purple-200',
  fuchsia:'bg-fuchsia-50 border-fuchsia-200',
  teal:   'bg-teal-50   border-teal-200',
}

function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

function pct(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toFixed(1)}%`
}

function fmtNum(v, metrica) {
  if (v === null || v === undefined) return '–'
  if (typeof v !== 'number') return v
  if (metrica === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (metrica === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0)   return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8)   return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function QuadroTable({ quadro, activePeriods, year }) {
  const headerCls  = COR_HEADER[quadro.cor]    ?? COR_HEADER.blue
  const subheadCls = COR_SUBHEADER[quadro.cor] ?? COR_SUBHEADER.blue

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 ${headerCls}`}>
        <Package className="h-4 w-4 opacity-80" />
        <span className="text-sm font-bold tracking-wide">{quadro.tituloGerente}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className={`border-b ${subheadCls}`}>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500 w-8">#</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 sticky left-0 bg-inherit min-w-[240px]">Indicador (KPI)</th>
              <th className="text-center px-2 py-2.5 font-medium text-slate-500">Or.</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Peso</th>
              {activePeriods.map(p => (
                <th key={p} colSpan={4} className="text-center px-2 py-2.5 font-semibold text-blue-700 border-l border-slate-200">
                  {getPeriodLabel(p, year)}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
              <th colSpan={4} />
              {activePeriods.map(p => (
                <React.Fragment key={p}>
                  <th className="px-2 py-1.5 text-slate-400 font-medium border-l border-slate-200">Meta</th>
                  <th className="px-2 py-1.5 text-slate-400 font-medium">Real.</th>
                  <th className="px-2 py-1.5 text-slate-400 font-medium">% Ating.</th>
                  <th className="px-2 py-1.5 text-slate-400 font-medium">Contrib.</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {quadro.kpis.map(row => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{row.id}</td>
                <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">{row.indicador}</td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">{(row.pesoObj * 100).toFixed(0)}%</td>
                {activePeriods.map(p => {
                  const d       = getPeriodData(row, p)
                  const ating   = calcAtingimento(row.orientacao, d.meta, d.realizado)
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function KpiBloco3Pecas() {
  const periodState = usePeriodSelector('bloco3-pecas')
  const { activePeriods } = periodState
  const { year } = useKpiYear()
  const [activeTab, setActiveTabRaw] = useState(() => { try { return sessionStorage.getItem('b3p_tab') || 'gestores' } catch { return 'gestores' } })
  const setActiveTab = (v) => { try { sessionStorage.setItem('b3p_tab', v) } catch {}; setActiveTabRaw(v) }
  const { data: quadros, loading, source } = useKpiData(fetchBloco3Pecas, MOCK_BLOCO3_PECAS, { year })

  const visibleQuadros = useMemo(() => {
    if (!quadros) return []
    if (activeTab === 'vendedores') {
      return quadros.filter(q => String(q.tituloGerente || '').toUpperCase().trim() === 'VENDEDOR')
    }
    return quadros.filter(q => String(q.tituloGerente || '').toUpperCase().trim() !== 'VENDEDOR')
  }, [activeTab, quadros])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bloco 3 — Peças</h1>
          <p className="text-sm text-slate-500 mt-0.5">Indicadores de performance de peças — Matriz KPIs</p>
        </div>
        <DataSourceBadge source={source} loading={loading} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
        {[
          { key: 'gestores', label: 'Gestores' },
          { key: 'vendedores', label: 'Vendedores' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PeriodSelector state={periodState} />

      <div className="space-y-6">
        {visibleQuadros.length > 0 ? (
          visibleQuadros.map((quadro, idx) => (
            <QuadroTable key={idx} quadro={quadro} activePeriods={activePeriods} year={year} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Nenhum bloco disponível para a aba {activeTab === 'vendedores' ? 'Vendedores' : 'Gestores'}.
          </div>
        )}
      </div>
    </div>
  )
}

