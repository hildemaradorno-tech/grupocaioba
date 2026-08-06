import React from 'react'
import {
  T_PERIODS, T_LABELS,
  M_PERIODS, M_LABELS,
  MONTH_WEEK_RANGES, S_LABELS,
} from '../../utils/kpiPeriods'

const VIEW_MODES = ['trimestral', 'mensal', 'semanal']
const VIEW_LABELS_MAP = { trimestral: 'Trimestral', mensal: 'Mensal', semanal: 'Semanal' }

// ── helpers de data atual ────────────────────────────────────────────────────

function currentMonthKey() {
  return `m${String(new Date().getMonth() + 1).padStart(2, '0')}`
}

function currentQuarterKey() {
  const m = new Date().getMonth() + 1
  return m <= 3 ? 'q1' : m <= 6 ? 'q2' : m <= 9 ? 'q3' : 'q4'
}

function quarterDefault() {
  const q = currentQuarterKey()
  return Object.fromEntries(T_PERIODS.map(p => [p, p === q]))
}

function monthDefault() {
  const m = currentMonthKey()
  return Object.fromEntries(M_PERIODS.map(p => [p, p === m]))
}

function weekDefaultForMonth(mKey) {
  const weeks = MONTH_WEEK_RANGES[mKey] || []
  const allKeys = Object.values(MONTH_WEEK_RANGES).flat()
  return Object.fromEntries(allKeys.map(s => [s, weeks.includes(s)]))
}

// ── persistência de estado ────────────────────────────────────────────────────

function ssLoad(pageKey, field, fallback) {
  if (!pageKey) return typeof fallback === 'function' ? fallback() : fallback
  try {
    const raw = localStorage.getItem(`period_${pageKey}_${field}`)
    return raw !== null ? JSON.parse(raw) : (typeof fallback === 'function' ? fallback() : fallback)
  } catch { return typeof fallback === 'function' ? fallback() : fallback }
}

function ssSave(pageKey, field, value) {
  if (!pageKey) return
  try { localStorage.setItem(`period_${pageKey}_${field}`, JSON.stringify(value)) } catch {}
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function usePeriodSelector(pageKey) {
  const [viewMode,  setViewModeRaw]  = React.useState(() => ssLoad(pageKey, 'viewMode', 'mensal'))
  const [visibleT,  setVisibleTRaw]  = React.useState(() => ssLoad(pageKey, 'visibleT', quarterDefault))
  const [visibleM,  setVisibleMRaw]  = React.useState(() => ssLoad(pageKey, 'visibleM', monthDefault))
  const [weekMonth, setWeekMonthRaw] = React.useState(() => ssLoad(pageKey, 'weekMonth', currentMonthKey))
  const [visibleS,  setVisibleSRaw]  = React.useState(() => ssLoad(pageKey, 'visibleS', () => weekDefaultForMonth(currentMonthKey())))

  const setViewMode = (v) => { ssSave(pageKey, 'viewMode', v); setViewModeRaw(v) }

  const setVisibleT = (fn) => setVisibleTRaw(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    ssSave(pageKey, 'visibleT', next)
    return next
  })
  const setVisibleM = (fn) => setVisibleMRaw(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    ssSave(pageKey, 'visibleM', next)
    return next
  })
  const setVisibleS = (fn) => setVisibleSRaw(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    ssSave(pageKey, 'visibleS', next)
    return next
  })

  // Ao trocar de mês na visão semanal, pré-seleciona as semanas daquele mês
  const handleSetWeekMonth = React.useCallback((mKey) => {
    ssSave(pageKey, 'weekMonth', mKey)
    setWeekMonthRaw(mKey)
    setVisibleS(weekDefaultForMonth(mKey))
  }, [pageKey])

  const activePeriods = React.useMemo(() => {
    if (viewMode === 'trimestral') return T_PERIODS.filter(p => visibleT[p])
    if (viewMode === 'mensal')     return M_PERIODS.filter(p => visibleM[p])
    return (MONTH_WEEK_RANGES[weekMonth] || []).filter(p => visibleS[p])
  }, [viewMode, visibleT, visibleM, weekMonth, visibleS])

  const toggleT = (p) => setVisibleT(prev => ({ ...prev, [p]: !prev[p] }))
  const toggleM = (p) => setVisibleM(prev => ({ ...prev, [p]: !prev[p] }))
  const toggleS = (p) => setVisibleS(prev => ({ ...prev, [p]: !prev[p] }))

  const selectAllT = () => setVisibleT(Object.fromEntries(T_PERIODS.map(p => [p, true])))
  const clearAllT  = () => setVisibleT(Object.fromEntries(T_PERIODS.map(p => [p, false])))
  const selectAllM = () => setVisibleM(Object.fromEntries(M_PERIODS.map(p => [p, true])))
  const clearAllM  = () => setVisibleM(Object.fromEntries(M_PERIODS.map(p => [p, false])))
  const selectAllS = () => setVisibleS(prev => ({ ...prev, ...Object.fromEntries((MONTH_WEEK_RANGES[weekMonth] || []).map(p => [p, true])) }))
  const clearAllS  = () => setVisibleS(prev => ({ ...prev, ...Object.fromEntries((MONTH_WEEK_RANGES[weekMonth] || []).map(p => [p, false])) }))

  return {
    viewMode, setViewMode,
    visibleT, visibleM, visibleS,
    weekMonth, setWeekMonth: handleSetWeekMonth,
    activePeriods,
    toggleT, toggleM, toggleS,
    selectAllT, clearAllT, selectAllM, clearAllM, selectAllS, clearAllS,
  }
}

// ── componente ────────────────────────────────────────────────────────────────

export default function PeriodSelector({ state, hideLegend = false }) {
  const {
    viewMode, setViewMode,
    visibleT, visibleM, visibleS,
    weekMonth, setWeekMonth,
    toggleT, toggleM, toggleS,
    selectAllT, clearAllT, selectAllM, clearAllM, selectAllS, clearAllS,
  } = state

  const weekKeys = MONTH_WEEK_RANGES[weekMonth] || []

  const btnBase = 'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors'
  const btnOn   = 'bg-blue-950 text-white border-blue-950'
  const btnOff  = 'bg-white text-slate-500 border-slate-300 hover:border-blue-400'
  const modeOn  = 'bg-blue-700 text-white border-blue-700'
  const modeOff = 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'

  return (
    <div className="flex flex-col gap-2">
      {/* Linha 1: seletor de modo + legenda */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 shrink-0">Visão:</span>
        {VIEW_MODES.map(m => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`${btnBase} ${viewMode === m ? modeOn : modeOff}`}
          >
            {VIEW_LABELS_MAP[m]}
          </button>
        ))}
        {!hideLegend && (
          <span className="ml-auto flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ≥100%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 80-99%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;80%</span>
          </span>
        )}
      </div>

      {/* Trimestral: toggles Q1–Q4–FY */}
      {viewMode === 'trimestral' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Períodos:</span>
          {T_PERIODS.map(p => (
            <button key={p} onClick={() => toggleT(p)} className={`${btnBase} ${visibleT[p] ? btnOn : btnOff}`}>
              {T_LABELS[p]}
            </button>
          ))}
          <span className="w-px h-4 bg-slate-200 mx-1" />
          <button onClick={selectAllT} className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">Todos</button>
          <button onClick={clearAllT}  className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-500 transition-colors">Limpar</button>
        </div>
      )}

      {/* Mensal: toggles Jan–Dez */}
      {viewMode === 'mensal' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Meses:</span>
          {M_PERIODS.map(p => (
            <button key={p} onClick={() => toggleM(p)} className={`${btnBase} ${visibleM[p] ? btnOn : btnOff}`}>
              {M_LABELS[p]}
            </button>
          ))}
          <span className="w-px h-4 bg-slate-200 mx-1" />
          <button onClick={selectAllM} className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">Todos</button>
          <button onClick={clearAllM}  className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-500 transition-colors">Limpar</button>
        </div>
      )}

      {/* Semanal: seletor de MÊS + semanas daquele mês */}
      {viewMode === 'semanal' && (
        <div className="flex flex-col gap-1.5">
          {/* Seletor de mês */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Mês:</span>
            {M_PERIODS.map(m => (
              <button
                key={m}
                onClick={() => setWeekMonth(m)}
                className={`${btnBase} ${weekMonth === m ? 'bg-indigo-700 text-white border-indigo-700' : modeOff}`}
              >
                {M_LABELS[m]}
              </button>
            ))}
          </div>
          {/* Semanas do mês selecionado */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-slate-400 mr-1">Semanas:</span>
            {weekKeys.map(p => (
              <button key={p} onClick={() => toggleS(p)} className={`${btnBase} py-0.5 text-[10px] ${visibleS[p] ? btnOn : btnOff}`}>
                {S_LABELS[p]}
              </button>
            ))}
            <span className="w-px h-4 bg-slate-200 mx-1" />
            <button onClick={selectAllS} className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">Todos</button>
            <button onClick={clearAllS}  className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-500 transition-colors">Limpar</button>
          </div>
        </div>
      )}
    </div>
  )
}
