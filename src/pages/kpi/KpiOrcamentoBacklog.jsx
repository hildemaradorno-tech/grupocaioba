import React, { useMemo } from 'react'
import { CalendarDays, CheckCircle2, Clock3, AlertCircle } from 'lucide-react'
import { useSessionState } from '../../hooks/useSessionState'

// Sem dados mock — itens carregados do SharePoint quando configurado
const MOCK = []

const STATUS_CONFIG = {
  'Em andamento': { icon: Clock3,       badge: 'bg-amber-100 text-amber-700 border border-amber-200',   dot: 'bg-amber-400' },
  'Finalizado':   { icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  'Planejado':    { icon: AlertCircle,  badge: 'bg-blue-100 text-blue-700 border border-blue-200',      dot: 'bg-blue-400' },
}

const STATUSES = ['Em andamento', 'Planejado', 'Finalizado']

function fmtDate(d) {
  if (!d) return '–'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function isOverdue(deadline, status) {
  if (status === 'Finalizado' || !deadline) return false
  return new Date(deadline) < new Date('2026-05-29')
}

export default function KpiOrcamentoBacklog() {
  const [filterStatus, setFilterStatus] = useSessionState('kpi_backlog_status', 'Todos')

  const filtered = useMemo(() =>
    MOCK.filter(r =>
      (filterStatus === 'Todos' || r.status === filterStatus)
    ), [filterStatus])

  const countByStatus = useMemo(() => {
    const c = {}
    MOCK.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Orçamento & Backlog</h1>
        <p className="text-sm text-slate-500 mt-0.5">Acompanhamento de planos de ação e investimentos por unidade</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        {STATUSES.map(st => {
          const cfg = STATUS_CONFIG[st]
          const Icon = cfg.icon
          return (
            <div key={st} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.badge}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{countByStatus[st] || 0}</p>
                <p className="text-xs text-slate-500">{st}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtro de status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Status:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option>Todos</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} itens</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Casa/Unidade</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500">Área</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500 min-w-[220px]">Item</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500">Atual</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500">Pleito</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Deadline</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-500">Atividade</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Status</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-500">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const cfg = STATUS_CONFIG[row.status]
                const Icon = cfg.icon
                const overdue = isOverdue(row.deadline, row.status)
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{row.casa}</td>
                    <td className="px-3 py-2.5 text-slate-500">{row.area}</td>
                    <td className="px-3 py-2.5 text-slate-700">{row.item}</td>
                    <td className="px-3 py-2.5 text-slate-500">{row.atual}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.pleito}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`flex items-center justify-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                        {overdue && <AlertCircle className="h-3 w-3" />}
                        {fmtDate(row.deadline)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{row.atividade}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.badge}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500">{fmtDate(row.entrega)}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum item encontrado com os filtros selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
