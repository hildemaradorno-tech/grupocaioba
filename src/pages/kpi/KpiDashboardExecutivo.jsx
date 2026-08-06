import React from 'react'
import { TrendingUp } from 'lucide-react'

// Fallback sem atingimentos — dados reais vêm do SharePoint
const MOCK_DATA = {
  Vendas: [
    { bloco: 'Companhia',    peso: 0.20, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Departamento', peso: 0.30, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Individual',   peso: 0.50, q1: null, q2: null, q3: null, q4: null, fy: null },
  ],
  'Pós-Vendas': [
    { bloco: 'Companhia',    peso: 0.20, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Departamento', peso: 0.30, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Individual',   peso: 0.50, q1: null, q2: null, q3: null, q4: null, fy: null },
  ],
  Peças: [
    { bloco: 'Companhia',    peso: 0.20, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Departamento', peso: 0.30, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Individual',   peso: 0.50, q1: null, q2: null, q3: null, q4: null, fy: null },
  ],
}

function pct(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toFixed(1)}%`
}

function weightedAvg(rows, field) {
  const valid = rows.filter(r => r[field] !== null)
  if (!valid.length) return null
  const totalPeso = valid.reduce((s, r) => s + r.peso, 0)
  if (!totalPeso) return null
  return valid.reduce((s, r) => s + r[field] * r.peso, 0) / totalPeso
}

function colorClass(val) {
  if (val === null) return 'text-slate-400'
  if (val >= 1.0) return 'text-emerald-600 font-semibold'
  if (val >= 0.8) return 'text-amber-500 font-semibold'
  return 'text-red-600 font-semibold'
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0) return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

const PERIODS = ['q1', 'q2', 'q3', 'q4', 'fy']
const PERIOD_LABELS = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4', fy: 'FY' }

function VerticalTable({ title, rows }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500 w-36">Bloco</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500 w-20">Peso</th>
              {PERIODS.map(p => (
                <th key={p} className="text-center px-3 py-2.5 font-medium text-slate-500">
                  % Ating. {PERIOD_LABELS[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-700">{row.bloco}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">{(row.peso * 100).toFixed(0)}%</td>
                {PERIODS.map(p => (
                  <td key={p} className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${badgeClass(row[p])}`}>
                      {pct(row[p])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {/* Linha de total */}
            <tr className="bg-blue-950/5 border-t-2 border-blue-200">
              <td className="px-4 py-2.5 font-bold text-slate-800 text-xs" colSpan={2}>
                Total Consolidado
              </td>
              {PERIODS.map(p => {
                const avg = weightedAvg(rows, p)
                return (
                  <td key={p} className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass(avg)}`}>
                      {pct(avg)}
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function KpiDashboardExecutivo() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard Executivo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Atingimento por verticais de negócio — Matriz KPIs</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> ≥ 100% — Meta atingida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> 80–99% — Atenção
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> &lt; 80% — Abaixo da meta
        </span>
      </div>

      {/* Tabelas por vertical */}
      {Object.entries(MOCK_DATA).map(([vertical, rows]) => (
        <VerticalTable key={vertical} title={vertical} rows={rows} />
      ))}
    </div>
  )
}
