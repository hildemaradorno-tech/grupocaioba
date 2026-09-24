import React, { useState } from 'react'
import { BarChart2, TrendingUp, Activity, Wrench, Package, Wallet, FlaskConical } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKpiYear, KPI_YEARS } from '../../context/KpiYearContext'
import { useKpiSourceStatus } from '../../context/KpiSourceStatusContext'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import KpiDashboardExecutivo from './KpiDashboardExecutivo'
import KpiIndicadoresCorporativos from './KpiIndicadoresCorporativos'
import KpiIndicadoresOperacionais from './KpiIndicadoresOperacionais'
import KpiBloco3Servicos from './KpiBloco3Servicos'
import KpiBloco3Pecas from './KpiBloco3Pecas'
import KpiOrcamentoBacklog from './KpiOrcamentoBacklog'
import KpiAuditoria from './KpiAuditoria'

const ABAS = [
  { key: 'resultados', label: 'Resultados', icon: BarChart2, permKey: 'kpi/resultados', Componente: KpiDashboardExecutivo },
  { key: 'bloco1', label: 'Bloco 1 - Corporativo', icon: TrendingUp, permKey: 'kpi/bloco1-corporativo', Componente: KpiIndicadoresCorporativos },
  { key: 'bloco2', label: 'Bloco 2 - Departamental', icon: Activity, permKey: 'kpi/bloco2-operacional', Componente: KpiIndicadoresOperacionais },
  { key: 'bloco3-servicos', label: 'Bloco 3 - Serviços', icon: Wrench, permKey: 'kpi/bloco3-servicos', Componente: KpiBloco3Servicos },
  { key: 'bloco3-pecas', label: 'Bloco 3 - Peças', icon: Package, permKey: 'kpi/bloco3-pecas', Componente: KpiBloco3Pecas },
  { key: 'orcamento-backlog', label: 'Orçamento & Backlog', icon: Wallet, permKey: 'kpi/orcamento-backlog', Componente: KpiOrcamentoBacklog },
  { key: 'auditoria', label: 'Auditoria de Fontes', icon: FlaskConical, permKey: 'kpi/auditoria', Componente: KpiAuditoria },
]

export const KPI_MATRIZ_PERMS = ABAS.map(a => a.permKey)

export default function KpiMatriz() {
  const { hasPermission } = useAuth()
  const { year, setYear } = useKpiYear()
  const { status: sourceStatus } = useKpiSourceStatus()
  const abasVisiveis = ABAS.filter(a => hasPermission(a.permKey))
  const [aba, setAba] = useState(() => abasVisiveis[0]?.key)
  const abaAtual = abasVisiveis.find(a => a.key === aba) || abasVisiveis[0]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Matriz KPIs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Indicadores de desempenho consolidados por bloco</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {sourceStatus.source != null && <DataSourceBadge source={sourceStatus.source} loading={sourceStatus.loading} />}
          <span className="text-xs text-slate-500 font-medium">Ano:</span>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-white text-slate-700 text-sm rounded-md px-2 py-1.5 border border-slate-300 focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {KPI_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {abaAtual ? (
        <>
          <div className="px-6 pt-4">
            <div className="flex items-center gap-1 flex-wrap border-b border-slate-200">
              {abasVisiveis.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setAba(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                    abaAtual.key === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <abaAtual.Componente />
          </div>
        </>
      ) : (
        <p className="px-6 py-6 text-sm text-slate-500">Você não tem permissão para visualizar nenhum indicador da Matriz KPIs.</p>
      )}
    </div>
  )
}
