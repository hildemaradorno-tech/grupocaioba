import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart2, TrendingUp, Activity, Wrench, Package, Wallet, RefreshCw, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKpiYear, KPI_YEARS } from '../../context/KpiYearContext'
import { useKpiSourceStatus } from '../../context/KpiSourceStatusContext'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { useSincronizacaoKpi } from '../../hooks/useSincronizacaoKpi'
import { getStatusSincronizacao } from '../../services/kpiService'
import KpiDashboardExecutivo from './KpiDashboardExecutivo'
import KpiIndicadoresCorporativos from './KpiIndicadoresCorporativos'
import KpiIndicadoresOperacionais from './KpiIndicadoresOperacionais'
import KpiBloco3Servicos from './KpiBloco3Servicos'
import KpiBloco3Pecas from './KpiBloco3Pecas'
import KpiOrcamentoBacklog from './KpiOrcamentoBacklog'
import PeriodSelector, { usePeriodSelector, MODES_COM_SEMANAL } from '../../components/kpi/PeriodSelector'
import logoCaioba from '../../assets/logo-grupo.png'

// periodo: a aba usa o seletor de Visão/Meses do topo (ao lado do Ano) — 'semanal' = também visão Semanal.
const ABAS = [
  { key: 'resultados', label: 'Resultados', icon: BarChart2, permKey: 'kpi/resultados', Componente: KpiDashboardExecutivo },
  { key: 'bloco1', label: 'Bloco 1 - Corporativo', icon: TrendingUp, permKey: 'kpi/bloco1-corporativo', Componente: KpiIndicadoresCorporativos, periodo: 'mensal' },
  { key: 'bloco2', label: 'Bloco 2 - Departamental', icon: Activity, permKey: 'kpi/bloco2-operacional', Componente: KpiIndicadoresOperacionais, periodo: 'mensal' },
  { key: 'bloco3-servicos', label: 'Bloco 3 - Serviços', icon: Wrench, permKey: 'kpi/bloco3-servicos', Componente: KpiBloco3Servicos, periodo: 'semanal' },
  { key: 'bloco3-pecas', label: 'Bloco 3 - Peças', icon: Package, permKey: 'kpi/bloco3-pecas', Componente: KpiBloco3Pecas, periodo: 'semanal' },
  { key: 'orcamento-backlog', label: 'Orçamento & Backlog', icon: Wallet, permKey: 'kpi/orcamento-backlog', Componente: KpiOrcamentoBacklog },
  // Aba "Fontes" (kpi/auditoria) retirada em 14/11/2026: nenhum quadro usa mais os indicadores calculados nela
  // (vêm do BI Possibilidades e dos Indicadores de Produtividade). O componente KpiAuditoria.jsx e a rota
  // /api/kpi/auditoria ficaram no projeto, sem uso.
]

export const KPI_MATRIZ_PERMS = ABAS.map(a => a.permKey)
export default function KpiMatriz() {
  const { hasPermission, hasActionOrDefault, user } = useAuth()
  // Sempre que entra na Matriz KPIs: visão Mensal no mês atual. Limpa a seleção de período guardada
  // (antes das abas montarem — elas leem esses valores ao iniciar). Trocar de aba dentro da Matriz
  // continua mantendo o período escolhido.
  useState(() => {
    for (const campo of ['viewMode', 'visibleT', 'visibleM', 'weekMonth', 'visibleS']) {
      try { localStorage.removeItem(`period_kpi-matriz_${campo}`) } catch { /* sem localStorage */ }
    }
  })
  // Seletor único de Visão/Meses no topo, ao lado do Ano (depois da limpeza acima: abre no mês atual).
  const periodState = usePeriodSelector('kpi-matriz')
  const { year, setYear, incluirHoje, setIncluirHoje } = useKpiYear()
  const { status: sourceStatus, refreshToken, refreshData } = useKpiSourceStatus()
  // Atualização compartilhada com o BI Campanha Pós-Venda (Matriz + Campanha, um processo só no
  // backend): o botão fica travado em todas as telas enquanto qualquer pessoa estiver atualizando,
  // e ao terminar a Matriz recarrega os dados.
  const sync = useSincronizacaoKpi((status) => { if (status !== 'ERRO') refreshData() })
  // Atualização automática 1 vez por dia (pedido do usuário, 14/11/2026): ao abrir a Matriz, se a última
  // Atualização não começou HOJE (horário de Campo Grande), qualquer usuário dispara — o botão gira para todos
  // e a tela recarrega ao terminar. Se outra pessoa já estiver atualizando, só acompanha (trava do backend).
  useEffect(() => {
    let vivo = true
    const dia = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Campo_Grande' })
    getStatusSincronizacao().then(st => {
      // configurado false = backend sem Supabase ou fora do ar (kpiService devolve assim): não dispara.
      if (!vivo || !st?.configurado || st?.executandoAgora) return
      const ultima = st?.ultimaExecucao?.iniciado_em
      if (ultima && dia(new Date(ultima)) === dia(new Date())) return
      sync.iniciar(user?.email, { automatica: true })
    }).catch(() => { /* backend fora do ar: segue com os dados guardados */ })
    return () => { vivo = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const abasVisiveis = ABAS.filter(a => hasPermission(a.permKey))
  // ?aba=bloco3-servicos (ex.: link da Campanha Pós-Venda) abre direto nessa aba, se o usuário puder vê-la.
  const [params] = useSearchParams()
  const [aba, setAba] = useState(() => {
    const pedida = params.get('aba')
    return abasVisiveis.some(a => a.key === pedida) ? pedida : abasVisiveis[0]?.key
  })
  const abaAtual = abasVisiveis.find(a => a.key === aba) || abasVisiveis[0]
  const podeSincronizar = hasActionOrDefault('kpi/resultados', 'editar')

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho no padrão do BI Possibilidades - Sintonia do Dia (degradê e logo do painel Power BI da
          Caiobá): título à esquerda; à direita, status + Atualizar em cima e os filtros de período embaixo. */}
      <div className="px-6 pt-6">
        <div className="relative rounded-lg shadow-sm"
          style={{ background: 'linear-gradient(90deg, #fdf8ec 0%, #f8d78c 28%, #f0a30a 50%, #a08a35 68%, #4f6a6a 84%, #1a4d8f 100%)' }}>
          <div className="relative flex flex-wrap items-stretch justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-4">
              <img src={logoCaioba} alt="Caiobá" className="h-11 w-auto shrink-0" />
              <div className="w-0.5 self-stretch bg-[#1a4d8f]" />
              <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif" }}>
                <h1 className="text-[22px] font-bold text-slate-900 uppercase leading-tight">Matriz KPIs - DAF</h1>
                <p className="text-[15px] italic text-slate-900 uppercase leading-tight mt-0.5">Indicadores de desempenho</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Visão / Meses (só nas abas que usam), Ano e o botão Atualizar ao lado — rótulos brancos. */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {abaAtual?.periodo && (
                  <PeriodSelector state={periodState} inlineTrimestral hideLegend escuro
                    modes={abaAtual.periodo === 'semanal' ? MODES_COM_SEMANAL : undefined} />
                )}
                <span className="text-[10px] font-bold text-white uppercase">Ano:</span>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="bg-white text-slate-700 text-xs font-medium rounded-md px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  {KPI_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {/* Sem a permissão de Atualizar, o botão só aparece (travado, girando) durante uma atualização. */}
                {(podeSincronizar || sync.executando) && (
                  <button type="button" onClick={() => sync.iniciar(user?.email)} disabled={sync.executando || !podeSincronizar}
                    title={sync.executando ? `Atualização em andamento${sync.porQuem ? ` (iniciada por ${sync.porQuem})` : ''} — aguarde terminar` : 'Atualizar dados (Matriz KPIs e Campanha Pós-Venda - DAF)'}
                    aria-label="Atualizar dados"
                    className="flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    <RefreshCw className={`h-4 w-4 ${sync.executando ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
              {/* Abaixo dos seletores: "Considerar o dia atual" (só Bloco 3 - Serviços: período em andamento até
                  ontem; marcado, até agora) e a etiqueta "Dados sincronizados", lado a lado. */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {abaAtual?.key === 'bloco3-servicos' && (
                  <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white uppercase cursor-pointer select-none"
                    title="Desmarcado: o mês, a semana, o trimestre e o ano em andamento mostram os valores apurados até ONTEM. Marcado: incluem o dia de hoje.">
                    <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer" checked={incluirHoje} onChange={e => setIncluirHoje(e.target.checked)} />
                    Considerar o dia atual
                  </label>
                )}
                {/* Durante a Atualização (manual ou a automática do 1º acesso do dia): "Sincronizando…". */}
                {sync.executando ? (
                  <span className="flex items-center gap-1.5 rounded-full font-medium border px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                    title={sync.porQuem ? `Atualização iniciada por ${sync.porQuem}` : 'Atualização em andamento'}>
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Sincronizando… (pode levar alguns minutos)
                  </span>
                ) : (
                  sourceStatus.source != null && <DataSourceBadge compacto source={sourceStatus.source} loading={sourceStatus.loading} refreshKey={refreshToken} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {sync.mensagem && <p role="status" className="px-6 pt-2 text-xs text-slate-600">{sync.mensagem}</p>}

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
            {abaAtual.periodo ? <abaAtual.Componente periodState={periodState} /> : <abaAtual.Componente />}
          </div>
        </>
      ) : (
        <p className="px-6 py-6 text-sm text-slate-500">Você não tem permissão para visualizar nenhum indicador da Matriz KPIs.</p>
      )}
    </div>
  )
}
