import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart2, TrendingUp, Activity, Wrench, Package, Wallet, RefreshCw, Loader2, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKpiYear, KPI_YEARS } from '../../context/KpiYearContext'
import { useKpiSourceStatus } from '../../context/KpiSourceStatusContext'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import EmpresasDafSelector, { useEmpresasDaf } from '../../components/kpi/EmpresasDafSelector'
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

// Abas que vêm da planilha da Matriz (só total do grupo) — o seletor de empresa não as filtra.
const ABAS_SO_GRUPO = new Set(['resultados', 'bloco1', 'bloco2', 'orcamento-backlog'])

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
  const daf = useEmpresasDaf()

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho no padrão do BI Possibilidades - Sintonia do Dia (degradê e logo do painel Power BI da
          Caiobá): título à esquerda; à direita, status + Atualizar em cima e os filtros de período embaixo. */}
      <div className="px-6 pt-6">
        <div className="relative rounded-lg shadow-sm"
          style={{ background: 'linear-gradient(90deg, #fdf8ec 0%, #f8d78c 28%, #f0a30a 50%, #a08a35 68%, #4f6a6a 84%, #1a4d8f 100%)' }}>
          <div className="relative flex flex-wrap items-stretch justify-between gap-4 px-5 py-3">
            {/* Título no alto, na mesma linha do botão Atualizar (23/11/2026) — antes ficava centralizado na altura dos filtros. */}
            <div className="flex items-center gap-4 self-start">
              <img src={logoCaioba} alt="Caiobá" className="h-11 w-auto shrink-0" />
              <div className="w-0.5 self-stretch bg-[#1a4d8f]" />
              <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif" }}>
                <h1 className="text-[22px] font-bold text-slate-900 uppercase leading-tight">Matriz KPIs - DAF</h1>
                <p className="text-[15px] italic text-slate-900 uppercase leading-tight mt-0.5">Indicadores de desempenho</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Linha 1 (23/11/2026): etiqueta "Dados sincronizados" (ou Sincronizando…/Carregando…) ao lado do botão Atualizar. */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {/* Durante a Atualização (manual ou a automática do 1º acesso do dia): "Sincronizando…". */}
                {sync.executando ? (
                  <span className="flex items-center gap-1.5 rounded-full font-medium border px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                    title={sync.porQuem ? `Atualização iniciada por ${sync.porQuem}` : 'Atualização em andamento'}>
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Sincronizando… (pode levar alguns minutos)
                  </span>
                ) : sourceStatus.loading ? (
                  // Carregando os quadros da aba (14/11/2026): etiqueta visível no lugar do "Carregando..." cinza.
                  <span className="flex items-center gap-1.5 rounded-full font-semibold border px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Carregando os valores…
                  </span>
                ) : (
                  sourceStatus.source != null && <DataSourceBadge compacto source={sourceStatus.source} loading={false} refreshKey={refreshToken} />
                )}
                {/* Sem a permissão de Atualizar, o botão só aparece (travado, girando) durante uma atualização. */}
                {(podeSincronizar || sync.executando) && (
                  <button type="button" onClick={() => sync.iniciar(user?.email)} disabled={sync.executando || !podeSincronizar}
                    title={sync.executando ? `Atualização em andamento${sync.porQuem ? ` (iniciada por ${sync.porQuem})` : ''} — aguarde terminar` : 'Atualizar dados (Matriz KPIs e Campanha Pós-Venda - DAF)'}
                    aria-label="Atualizar dados"
                    className="flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    <RefreshCw className={`h-4 w-4 ${sync.executando ? 'animate-spin' : ''}`} />
                  </button>
                )}
                {/* Manual de operação (23/11/2026): pesos de cada bloco e onde ajustar as metas — à direita do Atualizar, sempre em outra aba. */}
                <a href="/kpi/matriz/manual" target="_blank" rel="noopener noreferrer"
                  title="Manual de operação da Matriz KPIs (abre em outra aba)" aria-label="Manual de operação da Matriz KPIs"
                  className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                  <BookOpen className="h-4 w-4" />
                </a>
              </div>
              {/* Linha 2 (23/11/2026), nesta ordem: Empresa · Visão · Mês/Ano (calendário) · Considerar o dia atual.
                  Nome de cada seletor acima dele; tudo alinhado pela base. */}
              <div className="flex flex-wrap items-end justify-end gap-3">
                {/* Empresas DAF (23/11/2026): Todas, uma ou várias — em todas as abas da Matriz. */}
                <EmpresasDafSelector />
                {abaAtual?.periodo && (
                  <PeriodSelector state={periodState} inlineTrimestral hideLegend escuro
                    // Visão Anual (23/11/2026) só na Matriz: a coluna do ano inteiro.
                    modes={abaAtual.periodo === 'semanal' ? [...MODES_COM_SEMANAL, 'anual'] : ['mensal', 'trimestral', 'anual']}
                    calendario={{ ano: year, anos: KPI_YEARS, onAno: setYear }} />
                )}
                {/* Mensal/Semanal: o ano vai no calendário do mês. O seletor de Ano fica só na visão Trimestral e nas
                    abas sem período. */}
                {/* Trimestral também escolhe o ano no calendário (Q1…Q4/ano). Ano à parte só nas abas sem período. */}
                {!abaAtual?.periodo && (
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-[10px] font-bold text-white uppercase">Ano</span>
                    <select
                      value={year}
                      onChange={e => setYear(Number(e.target.value))}
                      className="bg-white text-slate-700 text-xs font-medium rounded-md px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-400 cursor-pointer"
                    >
                      {KPI_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </span>
                )}
                {/* "Considerar o dia atual" (só Bloco 3 - Serviços: período em andamento até ontem; marcado, até agora). */}
                {abaAtual?.key === 'bloco3-servicos' && (
                  <label className="inline-flex items-center gap-1.5 pb-1.5 text-[10px] font-bold text-white uppercase cursor-pointer select-none"
                    title="Desmarcado: o mês, a semana, o trimestre e o ano em andamento mostram os valores apurados até ONTEM. Marcado: incluem o dia de hoje.">
                    <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer" checked={incluirHoje} onChange={e => setIncluirHoje(e.target.checked)} />
                    Considerar o dia atual
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Andamento e resultado da Atualização (Sincronizando… / parcial / erro) ficam na etiqueta do cabeçalho
          (16/11/2026); aqui só avisos que ela não mostra (ex.: não foi possível iniciar). */}
      {sync.mensagem && !/^(A atualização terminou com erro|Atualização parcial concluída|Dados atualizados|Atualizando a Matriz|Primeiro acesso do dia)/.test(sync.mensagem) && (
        <p role="status" className="px-6 pt-2 text-xs text-slate-600">{sync.mensagem}</p>
      )}

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

          {/* Abas da planilha da Matriz (SharePoint): só têm o total do grupo, não dá para separar por empresa. */}
          {ABAS_SO_GRUPO.has(abaAtual.key) && !daf.todas && (
            <p role="status" className="mx-6 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              Os valores desta aba são do grupo todo: a planilha da Matriz KPIs não separa por empresa, então o seletor de empresa não muda esta aba.
            </p>
          )}
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
