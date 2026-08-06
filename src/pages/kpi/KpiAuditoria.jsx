import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'
import { getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiYear } from '../../context/KpiYearContext'
import { useSessionState } from '../../hooks/useSessionState'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import EmpresaSelector from '../../components/kpi/EmpresaSelector'
import { fetchAuditoria } from '../../services/kpiService'

const PERIOD_KEYS = ['q1','q2','q3','q4','fy','m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12']

// Store module-level — persiste entre navegações; evita spinner ao voltar para a página
const _cache = new Map()

function fmtVal(v, tipo) {
  if (v === null || v === undefined) return '–'
  if (typeof v !== 'number') return v
  if (tipo === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  if (tipo === 'h')  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' h'
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

const GROUP_COLORS = {
  1: { header: 'bg-blue-700',   row: 'bg-blue-50',   resultado: 'bg-blue-100 font-semibold' },
  2: { header: 'bg-sky-600',    row: 'bg-sky-50',    resultado: 'bg-sky-100 font-semibold' },
  3: { header: 'bg-emerald-600',row: 'bg-emerald-50',resultado: 'bg-emerald-100 font-semibold' },
  4: { header: 'bg-teal-700',   row: 'bg-teal-50',   resultado: 'bg-teal-100 font-semibold' },
  5: { header: 'bg-violet-700', row: 'bg-violet-50', resultado: 'bg-violet-100 font-semibold' },
  6: { header: 'bg-orange-600', row: 'bg-orange-50', resultado: 'bg-orange-100 font-semibold' },
  7: { header: 'bg-rose-600',   row: 'bg-rose-50',   resultado: 'bg-rose-100 font-semibold' },
  8: { header: 'bg-amber-600',  row: 'bg-amber-50',  resultado: 'bg-amber-100 font-semibold' },
  9:  { header: 'bg-cyan-700',   row: 'bg-cyan-50',   resultado: 'bg-cyan-100 font-semibold' },
  10: { header: 'bg-pink-700',   row: 'bg-pink-50',   resultado: 'bg-pink-100 font-semibold' },
}

export default function KpiAuditoria() {
  const { year } = useKpiYear()
  const periodState = usePeriodSelector('kpi-auditoria')
  const { activePeriods } = periodState

  const [empresa, setEmpresa] = useSessionState('kpi_auditoria_empresa', 'todas')

  // Inicializa do store para exibir dados imediatamente ao voltar à página
  const initKey    = `${year}:todas`
  const initCached = _cache.get(initKey)

  const [rows,       setRows]       = useState(initCached?.indicadores ?? [])
  const [loading,    setLoading]    = useState(!initCached)
  const [source,     setSource]     = useState(null)
  const [meta,       setMeta]       = useState(initCached?.metaData    ?? null)
  const [openGroups, setOpenGroups] = useState({})

  const toggleGroup = useCallback((id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  async function load(extra = {}) {
    const isForce = !!extra._forceReload
    const key     = `${year}:${empresa}`
    if (!_cache.has(key) || isForce) setLoading(true)
    try {
      const result = await fetchAuditoria({ year, empresa, ...extra })
      if (result.data) {
        _cache.set(key, result.data)
        setRows(result.data.indicadores ?? [])
        setMeta(result.data.metaData)
      } else {
        setRows([])
      }
      setSource(result.source)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [year, empresa])

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.id]) acc[row.id] = { indicador: row.indicador, rows: [] }
    acc[row.id].rows.push(row)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Auditoria de Fontes — KPIs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Valores brutos por fonte para conferência — Bloco 3 Pós-Venda</p>
        </div>
        <DataSourceBadge source={source} loading={loading} />
      </div>

      <EmpresaSelector value={empresa} onChange={setEmpresa} />
      <PeriodSelector state={periodState} hideLegend />

      {meta && (
        <p className="text-xs text-slate-400">
          {meta.totalArquivos} arquivo(s) · {meta.totalLinhas?.toLocaleString('pt-BR')} linhas · períodos: {meta.periodos?.join(', ')}
        </p>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-10 text-center">Carregando dados...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-10 text-center">Sem dados disponíveis para {year}.</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([id, group]) => {
            const colors  = GROUP_COLORS[id] || GROUP_COLORS[1]
            const isOpen  = !!openGroups[id]
            const result  = group.rows.find(r => r.fonte === 'RESULTADO')
            return (
              <div key={id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Cabeçalho clicável */}
                <button
                  type="button"
                  onClick={() => toggleGroup(id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${colors.header} text-white hover:brightness-110 transition-all`}
                >
                  <div className="flex items-center gap-2">
                    {isOpen
                      ? <ChevronDown size={16} className="shrink-0" />
                      : <ChevronRight size={16} className="shrink-0" />
                    }
                    <span className="text-sm font-bold">Indicador {id} — {group.indicador}</span>
                  </div>

                </button>

                {/* Tabela — só renderiza quando aberto */}
                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-2 font-medium text-slate-500 sticky left-0 bg-slate-50 min-w-[180px]">Fonte</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-500 min-w-[240px]">Nome Coluna / Métrica</th>
                          <th className="text-center px-3 py-2 font-medium text-slate-500">Tipo</th>
                          {activePeriods.map(p => (
                            <th key={p} className="text-right px-3 py-2 font-semibold text-blue-700 border-l border-slate-200 min-w-[110px]">
                              {getPeriodLabel(p)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, i) => {
                          const isResult = row.fonte === 'RESULTADO'
                          const rowClass = isResult
                            ? `${colors.resultado} border-t-2 border-slate-300`
                            : `${colors.row} border-b border-slate-100`
                          return (
                            <tr key={i} className={rowClass}>
                              <td className={`px-4 py-2 sticky left-0 ${isResult ? colors.resultado : colors.row}`}>
                                {isResult ? <span className="font-bold text-slate-800">RESULTADO</span> : row.fonte}
                              </td>
                              <td className="px-4 py-2 text-slate-600">{row.metrica}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  row.tipo === '%' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                                }`}>{row.tipo}</span>
                              </td>
                              {activePeriods.map(p => (
                                <td key={p} className={`px-3 py-2 text-right border-l border-slate-100 ${
                                  isResult ? 'text-slate-900 font-bold' : 'text-slate-600'
                                }`}>
                                  {fmtVal(row.valores?.[p], row.tipo)}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
