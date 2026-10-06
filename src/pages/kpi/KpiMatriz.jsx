import React, { useState } from 'react'
import { BarChart2, TrendingUp, Activity, Wrench, Package, Wallet, RefreshCw, Database } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKpiYear, KPI_YEARS } from '../../context/KpiYearContext'
import { useKpiSourceStatus } from '../../context/KpiSourceStatusContext'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { getStatusSincronizacao, executarSincronizacaoAgora } from '../../services/kpiService'
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
  { key: 'auditoria', label: 'Fontes', icon: Database, permKey: 'kpi/auditoria', Componente: KpiAuditoria },
]

export const KPI_MATRIZ_PERMS = ABAS.map(a => a.permKey)

export default function KpiMatriz() {
  const { hasPermission, hasActionOrDefault, user } = useAuth()
  const { year, setYear } = useKpiYear()
  const { status: sourceStatus, refreshToken, refreshData } = useKpiSourceStatus()
  const [sincronizando, setSincronizando] = useState(false)
  const [mensagemSync, setMensagemSync] = useState('')
  const abasVisiveis = ABAS.filter(a => hasPermission(a.permKey))
  const [aba, setAba] = useState(() => abasVisiveis[0]?.key)
  const abaAtual = abasVisiveis.find(a => a.key === aba) || abasVisiveis[0]
  const podeSincronizar = hasActionOrDefault('sincronizacao-dados', 'editar')

  const atualizarKpis = async () => {
    setSincronizando(true)
    setMensagemSync('')
    try {
      const anterior = await getStatusSincronizacao()
      const idAnterior = anterior?.ultimaExecucao?.id
      await executarSincronizacaoAgora(user?.email)

      const inicio = Date.now()
      let execucaoFinalizada = null
      while (Date.now() - inicio < 30 * 60 * 1000) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        const atual = await getStatusSincronizacao()
        const ultima = atual?.ultimaExecucao
        if (ultima && ultima.id !== idAnterior && ultima.status !== 'EXECUTANDO') {
          execucaoFinalizada = ultima
          break
        }
      }

      if (!execucaoFinalizada) throw new Error('A sincronização ainda não terminou. Atualize a página mais tarde para consultar os dados.')
      if (execucaoFinalizada.status === 'ERRO') throw new Error('A sincronização terminou com erro. Os dados não foram atualizados.')

      refreshData()
      setMensagemSync(execucaoFinalizada.status === 'PARCIAL' ? 'Atualização parcial concluída.' : 'KPIs atualizados.')
    } catch (err) {
      setMensagemSync(err.message || 'Não foi possível atualizar os KPIs.')
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Matriz KPIs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Indicadores de desempenho consolidados por bloco</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {sourceStatus.source != null && <DataSourceBadge source={sourceStatus.source} loading={sourceStatus.loading} refreshKey={refreshToken} />}
          {podeSincronizar && (
            <button type="button" onClick={atualizarKpis} disabled={sincronizando} title={sincronizando ? 'Sincronizando...' : 'Atualizar dados'} aria-label="Atualizar dados"
              className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
            </button>
          )}
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
      {mensagemSync && <p role="status" className="px-6 pt-2 text-xs text-slate-600">{mensagemSync}</p>}

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
