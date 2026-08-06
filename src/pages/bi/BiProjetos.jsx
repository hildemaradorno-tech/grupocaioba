import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, CheckCircle2, ListChecks, Building2, Users, Loader2, ExternalLink, XCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const fmtData = (s) => { if (!s) return '—'; try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }

function StatTile({ icon: Icon, label, valor, from, to }) {
  return (
    <div className={`rounded-xl p-4 text-white shadow-sm bg-gradient-to-br ${from} ${to}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white/20 rounded-md"><Icon className="h-4 w-4" /></div>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">{label}</p>
      </div>
      <p className="text-3xl font-bold leading-none">{valor}</p>
    </div>
  )
}

function BarraHorizontal({ dados, cor, filtroAtivo, onClickBarra }) {
  const max = Math.max(...dados.map(d => d.valor), 1)
  if (dados.length === 0) return <p className="text-xs text-slate-400 text-center py-6">Sem dados para o período selecionado.</p>
  return (
    <div className="space-y-2.5">
      {dados.map(d => {
        const ativo = filtroAtivo === d.label
        const esmaecido = !!filtroAtivo && !ativo
        const Wrapper = onClickBarra ? 'button' : 'div'
        return (
          <Wrapper
            type={onClickBarra ? 'button' : undefined}
            key={d.label}
            onClick={onClickBarra ? () => onClickBarra(d.label) : undefined}
            className={`flex items-center gap-3 w-full text-left transition-opacity ${onClickBarra ? 'cursor-pointer' : ''} ${esmaecido ? 'opacity-40' : ''}`}
          >
            <span className={`w-36 shrink-0 text-xs truncate ${ativo ? 'font-bold text-slate-900' : 'text-slate-600'}`} title={d.label}>{d.label}</span>
            <div className={`flex-1 h-5 bg-slate-100 rounded-full overflow-hidden ${ativo ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(d.valor / max) * 100}%`, backgroundColor: d.cor || cor, minWidth: d.valor > 0 ? '10px' : '0' }} />
            </div>
            <span className="w-8 text-right text-xs font-bold text-slate-700">{d.valor}</span>
          </Wrapper>
        )
      })}
    </div>
  )
}

function GraficoColunas({ dados, cor, filtroAtivo, onClickBarra }) {
  const max = Math.max(...dados.map(d => d.valor), 1)
  if (dados.length === 0) return <p className="text-xs text-slate-400 text-center py-6">Sem dados para o período selecionado.</p>
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 pb-2 pt-1" style={{ minWidth: `${dados.length * 72}px`, height: '180px' }}>
        {dados.map(d => {
          const ativo = filtroAtivo === d.label
          const esmaecido = !!filtroAtivo && !ativo
          const heightPct = (d.valor / max) * 100
          const color = d.cor || cor || '#0891b2'
          return (
            <button
              key={d.label}
              type="button"
              onClick={onClickBarra ? () => onClickBarra(d.label) : undefined}
              title={d.label}
              className={`flex flex-col items-center justify-end gap-1 flex-1 min-w-[56px] h-full transition-opacity ${onClickBarra ? 'cursor-pointer' : 'cursor-default'} ${esmaecido ? 'opacity-30' : ''}`}
            >
              <span className={`text-[11px] font-bold ${ativo ? 'text-slate-900' : 'text-slate-600'}`}>{d.valor}</span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  maxHeight: 'calc(100% - 32px)',
                  backgroundColor: color,
                  opacity: ativo ? 1 : 0.75,
                  outline: ativo ? `2px solid ${color}` : 'none',
                  outlineOffset: '2px',
                }}
              />
              <span
                className={`text-[10px] leading-tight text-center w-full line-clamp-2 ${ativo ? 'font-bold text-slate-900' : 'text-slate-500'}`}
                style={{ minHeight: '28px' }}
              >
                {d.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const PIZZA_COLORS = ['#4f46e5','#059669','#f59e0b','#dc2626','#a855f7','#0d9488','#f97316','#0ea5e9','#64748b','#84cc16']

function GraficoPizza({ dados, cor, filtroAtivo, onClickBarra }) {
  const total = dados.reduce((sum, d) => sum + d.valor, 0)
  if (total === 0 || dados.length === 0) return <p className="text-xs text-slate-400 text-center py-6">Sem dados para o período selecionado.</p>
  const R = 80, CX = 100, CY = 100
  let ang = -Math.PI / 2
  const slices = dados.map((d, i) => {
    const sweep = (d.valor / total) * 2 * Math.PI
    const a0 = ang; ang += sweep; const a1 = ang
    const x1 = CX + R * Math.cos(a0), y1 = CY + R * Math.sin(a0)
    const x2 = CX + R * Math.cos(a1), y2 = CY + R * Math.sin(a1)
    const mx = CX + R * 0.62 * Math.cos(a0 + sweep / 2)
    const my = CY + R * 0.62 * Math.sin(a0 + sweep / 2)
    return { ...d, x1, y1, x2, y2, large: sweep > Math.PI ? 1 : 0, mx, my, pct: Math.round((d.valor / total) * 100), color: d.cor || PIZZA_COLORS[i % PIZZA_COLORS.length] || cor }
  })
  return (
    <div className="flex items-start gap-5">
      <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0">
        {slices.map(s => {
          const ativo = filtroAtivo === s.label
          const esmaecido = !!filtroAtivo && !ativo
          return (
            <g key={s.label} onClick={onClickBarra ? () => onClickBarra(s.label) : undefined} className={onClickBarra ? 'cursor-pointer' : ''} style={{ opacity: esmaecido ? 0.25 : 1, transition: 'opacity 0.2s' }}>
              <path
                d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
                fill={s.color}
                stroke="white"
                strokeWidth={ativo ? 3 : 2}
                transform={ativo ? `translate(${(s.mx - CX) * 0.06}, ${(s.my - CY) * 0.06})` : undefined}
              />
              {s.pct >= 7 && (
                <text x={s.mx} y={s.my} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                  {s.pct}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex-1 space-y-1.5 pt-1 min-w-0">
        {slices.map(s => {
          const ativo = filtroAtivo === s.label
          const esmaecido = !!filtroAtivo && !ativo
          return (
            <button
              key={s.label}
              type="button"
              onClick={onClickBarra ? () => onClickBarra(s.label) : undefined}
              className={`flex items-center gap-2 w-full text-left text-xs transition-opacity ${esmaecido ? 'opacity-30' : ''} ${onClickBarra ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className={`flex-1 truncate ${ativo ? 'font-bold text-slate-900' : 'text-slate-600'}`} title={s.label}>{s.label}</span>
              <span className="font-bold text-slate-700 shrink-0">{s.valor}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_INFO = {
  planejado:    { label: 'Planejado',    cor: '#94a3b8' },
  mapeado:      { label: 'Mapeado',      cor: '#94a3b8' },
  programado:   { label: 'Programado',   cor: '#3b82f6' },
  em_andamento: { label: 'Em Andamento', cor: '#f59e0b' },
  pausado:      { label: 'Pausado',      cor: '#a855f7' },
  concluido:    { label: 'Concluído',    cor: '#0d9488' },
  cancelado:    { label: 'Cancelado',    cor: '#dc2626' },
}
const statusInfo = (key) => STATUS_INFO[key] || { label: key || 'Sem status', cor: '#64748b' }

export default function BiProjetos() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Filtros independentes — cada um afeta todos os outros gráficos (cross-filter)
  const [filtroDepartamento, setFiltroDepartamento] = useState(null)
  const [filtroStatusProjeto, setFiltroStatusProjeto] = useState(null)
  const [filtroStatusTarefa, setFiltroStatusTarefa] = useState(null)
  const [filtroSistema, setFiltroSistema] = useState(null)

  const toggleFiltroDepartamento = (label) => setFiltroDepartamento(prev => prev === label ? null : label)
  const toggleFiltroStatusProjeto = (label) => setFiltroStatusProjeto(prev => prev === label ? null : label)
  const toggleFiltroStatusTarefa = (label) => setFiltroStatusTarefa(prev => prev === label ? null : label)
  const toggleFiltroSistema = (label) => setFiltroSistema(prev => prev === label ? null : label)

  useEffect(() => {
    setLoading(true)
    apiService.getProjetosParaBi()
      .then(setProjetos)
      .catch(() => setProjetos([]))
      .finally(() => setLoading(false))
  }, [])

  const departamentoOf = (p) => p.departamento_nome?.trim() || 'Sem departamento'

  const dataTerminoProjeto = (p) => {
    const datasTarefas = (p.proj_tarefas || []).map(t => t.data_fim).filter(Boolean).sort()
    if (datasTarefas.length) return datasTarefas[datasTarefas.length - 1]
    return p.data_fim_real || p.data_fim_prevista || null
  }

  const dentroDoIntervalo = (data) => {
    if (!data) return false
    if (dataInicio && data < dataInicio) return false
    if (dataFim && data > dataFim) return false
    return true
  }
  const algumFiltroAtivo = !!(dataInicio || dataFim)

  // Todas as tarefas achatadas com dept do projeto pai + _pid para cross-filter
  const tarefasTodas = useMemo(() => projetos.flatMap(p =>
    (p.proj_tarefas || []).map(t => ({ ...t, departamento_nome: departamentoOf(p), projeto_nome: p.nome, _pid: p.id, _pstatus: p.status }))
  ), [projetos])

  // ── PROJETOS EFETIVOS ──────────────────────────────────────────────────────
  // Respeitam: dept + status de projeto. Usados nos gráficos de depto e tabela.
  const projetosEfetivos = useMemo(() => {
    let arr = filtroDepartamento ? projetos.filter(p => departamentoOf(p) === filtroDepartamento) : projetos
    if (filtroStatusProjeto) arr = arr.filter(p => statusInfo(p.status).label === filtroStatusProjeto)
    return arr
  }, [projetos, filtroDepartamento, filtroStatusProjeto])

  // Tarefas dos projetos efetivos, com filtro adicional de status de tarefa
  const tarefasEfetivas = useMemo(() => {
    const base = projetosEfetivos.flatMap(p =>
      (p.proj_tarefas || []).map(t => ({ ...t, departamento_nome: departamentoOf(p), projeto_nome: p.nome, _pid: p.id, _pstatus: p.status }))
    )
    return filtroStatusTarefa ? base.filter(t => statusInfo(t.status_kanban).label === filtroStatusTarefa) : base
  }, [projetosEfetivos, filtroStatusTarefa])

  // ── GRÁFICO: PROJETOS POR STATUS ───────────────────────────────────────────
  // Cross-filter: filtra por dept + status de TAREFA (para mostrar quais status de projeto
  // existem nos projetos que têm tarefas do status selecionado).
  const projetosParaStatusChart = useMemo(() => {
    let arr = filtroDepartamento ? projetos.filter(p => departamentoOf(p) === filtroDepartamento) : projetos
    if (filtroStatusTarefa) {
      const pidsComTarefa = new Set(
        tarefasTodas
          .filter(t => statusInfo(t.status_kanban).label === filtroStatusTarefa)
          .map(t => t._pid)
      )
      arr = arr.filter(p => pidsComTarefa.has(p.id))
    }
    return arr
  }, [projetos, filtroDepartamento, filtroStatusTarefa, tarefasTodas])

  // ── GRÁFICO: TAREFAS POR STATUS ────────────────────────────────────────────
  // Cross-filter: filtra por dept + status de PROJETO (para mostrar quais status de tarefa
  // existem nas tarefas de projetos do status selecionado).
  const tarefasParaStatusChart = useMemo(() => {
    let arr = filtroDepartamento ? tarefasTodas.filter(t => t.departamento_nome === filtroDepartamento) : tarefasTodas
    if (filtroStatusProjeto) {
      arr = arr.filter(t => statusInfo(t._pstatus).label === filtroStatusProjeto)
    }
    return arr
  }, [tarefasTodas, filtroDepartamento, filtroStatusProjeto])

  const projetosPorStatus = useMemo(() => {
    const map = new Map()
    for (const p of projetosParaStatusChart) map.set(p.status, (map.get(p.status) || 0) + 1)
    return [...map.entries()]
      .map(([key, valor]) => ({ label: statusInfo(key).label, cor: statusInfo(key).cor, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [projetosParaStatusChart])

  const tarefasPorStatus = useMemo(() => {
    const map = new Map()
    for (const t of tarefasParaStatusChart) map.set(t.status_kanban, (map.get(t.status_kanban) || 0) + 1)
    return [...map.entries()]
      .map(([key, valor]) => ({ label: statusInfo(key).label, cor: statusInfo(key).cor, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [tarefasParaStatusChart])

  // ── GRÁFICOS POR DEPARTAMENTO (pizza) ──────────────────────────────────────
  // Quando status de projeto selecionado: mostra aquele status por dept (sem filtro de data)
  // Quando nenhum status: mostra somente concluídos (com filtro de data)
  const projetosParaDepto = useMemo(() => {
    if (filtroStatusProjeto) return projetosEfetivos
    return projetosEfetivos.filter(p => {
      if (p.status !== 'concluido') return false
      if (algumFiltroAtivo) return dentroDoIntervalo(dataTerminoProjeto(p))
      return true
    })
  }, [projetosEfetivos, filtroStatusProjeto, dataInicio, dataFim])

  const tarefasParaDepto = useMemo(() => {
    if (filtroStatusTarefa) return tarefasEfetivas
    return tarefasEfetivas.filter(t => {
      if (t.status_kanban !== 'concluido') return false
      if (algumFiltroAtivo) return dentroDoIntervalo(t.data_fim)
      return true
    })
  }, [tarefasEfetivas, filtroStatusTarefa, dataInicio, dataFim])

  const projetosPorDepartamento = useMemo(() => {
    const map = new Map()
    for (const p of projetosParaDepto) map.set(departamentoOf(p), (map.get(departamentoOf(p)) || 0) + 1)
    return [...map.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor)
  }, [projetosParaDepto])

  const tarefasPorDepartamento = useMemo(() => {
    const map = new Map()
    for (const t of tarefasParaDepto) map.set(t.departamento_nome, (map.get(t.departamento_nome) || 0) + 1)
    return [...map.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor)
  }, [tarefasParaDepto])

  // ── GRÁFICO POR SISTEMA ────────────────────────────────────────────────────
  // Projeto pode ter múltiplos sistemas (sistemas_nomes) ou um só (sistema_nome)
  const sistemasOf = (p) => {
    const arr = (p.sistemas_nomes || []).filter(Boolean)
    if (arr.length) return arr
    if (p.sistema_nome?.trim()) return [p.sistema_nome.trim()]
    return ['Sem sistema']
  }

  const projetosPorSistema = useMemo(() => {
    const map = new Map()
    for (const p of projetosEfetivos) {
      for (const sis of sistemasOf(p)) {
        map.set(sis, (map.get(sis) || 0) + 1)
      }
    }
    return [...map.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor)
  }, [projetosEfetivos])

  // ── TABELA DE PROJETOS ─────────────────────────────────────────────────────
  const projetosExibidos = useMemo(() => {
    let base = filtroDepartamento
      ? projetosEfetivos.filter(p => departamentoOf(p) === filtroDepartamento)
      : projetosEfetivos
    if (filtroSistema) base = base.filter(p => sistemasOf(p).includes(filtroSistema))
    return base.slice().sort((a, b) => (dataTerminoProjeto(b) || '').localeCompare(dataTerminoProjeto(a) || ''))
  }, [projetosEfetivos, filtroDepartamento, filtroSistema])

  // ── STAT TILES ─────────────────────────────────────────────────────────────
  const departamentosEnvolvidos = useMemo(() => {
    const set = new Set([...projetosEfetivos.map(departamentoOf), ...tarefasEfetivas.map(t => t.departamento_nome)])
    return set.size
  }, [projetosEfetivos, tarefasEfetivas])

  const responsaveisEnvolvidos = useMemo(() => {
    const set = new Set(projetosEfetivos.map(p => p.responsavel_nome).filter(Boolean))
    return set.size
  }, [projetosEfetivos])

  const labelPeriodoAtivo = () => {
    if (dataInicio && dataFim) return `De ${fmtData(dataInicio)} até ${fmtData(dataFim)}.`
    if (dataInicio) return `A partir de ${fmtData(dataInicio)}.`
    if (dataFim) return `Até ${fmtData(dataFim)}.`
    return 'Todos os períodos.'
  }

  const numFiltrosAtivos = [filtroDepartamento, filtroStatusProjeto, filtroStatusTarefa, filtroSistema, algumFiltroAtivo].filter(Boolean).length
  const limparTudo = () => { setFiltroDepartamento(null); setFiltroStatusProjeto(null); setFiltroStatusTarefa(null); setFiltroSistema(null); setDataInicio(''); setDataFim('') }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3 text-slate-400 h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Carregando dados de projetos...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-indigo-500" />
            BI — Gestão de Projetos
          </h1>
          <p className="text-xs text-slate-500">
            Visão executiva de entregas e status do portfólio — projetos e tarefas, por departamento.
          </p>
        </div>
        {hasPermission('projetos') && (
          <button
            onClick={() => navigate('/projetos')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
            Ir para Controle de Projetos
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Período (término)</span>
        <input
          type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
          onClick={e => e.target.showPicker?.()}
          className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
        />
        <span className="text-[11px] text-slate-400">até</span>
        <input
          type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
          onClick={e => e.target.showPicker?.()}
          className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
        />
        {filtroDepartamento && (
          <button type="button" onClick={() => setFiltroDepartamento(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
            <XCircle className="h-3 w-3" /> Depto: {filtroDepartamento}
          </button>
        )}
        {filtroStatusProjeto && (
          <button type="button" onClick={() => setFiltroStatusProjeto(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
            <XCircle className="h-3 w-3" /> Status Projeto: {filtroStatusProjeto}
          </button>
        )}
        {filtroStatusTarefa && (
          <button type="button" onClick={() => setFiltroStatusTarefa(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
            <XCircle className="h-3 w-3" /> Status Tarefa: {filtroStatusTarefa}
          </button>
        )}
        {filtroSistema && (
          <button type="button" onClick={() => setFiltroSistema(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors">
            <XCircle className="h-3 w-3" /> Sistema: {filtroSistema}
          </button>
        )}
        {numFiltrosAtivos > 0 && (
          <button type="button" onClick={limparTudo}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
            <XCircle className="h-3 w-3" /> Limpar tudo
          </button>
        )}
      </div>

      {/* STAT TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatTile icon={CheckCircle2}
          label={filtroStatusProjeto ? `Projetos — ${filtroStatusProjeto}` : 'Projetos'}
          valor={projetosEfetivos.length}
          from="from-indigo-500" to="to-indigo-700" />
        <StatTile icon={ListChecks}
          label={filtroStatusTarefa ? `Tarefas — ${filtroStatusTarefa}` : 'Tarefas'}
          valor={tarefasEfetivas.length}
          from="from-emerald-500" to="to-emerald-700" />
        <StatTile icon={Building2} label="Departamentos" valor={departamentosEnvolvidos} from="from-violet-500" to="to-violet-700" />
        <StatTile icon={Users} label="Responsáveis" valor={responsaveisEnvolvidos} from="from-amber-500" to="to-amber-700" />
      </div>

      {/* GRÁFICOS POR STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-700 mb-1">Projetos por Status</p>
          <p className="text-[11px] text-slate-400 mb-4">
            {projetosParaStatusChart.length} projeto(s)
            {filtroDepartamento ? ` — ${filtroDepartamento}` : ''}
            {filtroStatusTarefa ? ` — tarefas "${filtroStatusTarefa}"` : ''}
            {filtroStatusProjeto ? <span className="text-violet-600 font-semibold"> · Filtrado: {filtroStatusProjeto}</span> : null}
          </p>
          <BarraHorizontal dados={projetosPorStatus} filtroAtivo={filtroStatusProjeto} onClickBarra={toggleFiltroStatusProjeto} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-700 mb-1">Tarefas por Status</p>
          <p className="text-[11px] text-slate-400 mb-4">
            {tarefasParaStatusChart.length} tarefa(s)
            {filtroDepartamento ? ` — ${filtroDepartamento}` : ''}
            {filtroStatusProjeto ? ` — projetos "${filtroStatusProjeto}"` : ''}
            {filtroStatusTarefa ? <span className="text-emerald-600 font-semibold"> · Filtrado: {filtroStatusTarefa}</span> : null}
          </p>
          <BarraHorizontal dados={tarefasPorStatus} filtroAtivo={filtroStatusTarefa} onClickBarra={toggleFiltroStatusTarefa} />
        </div>
      </div>

      {/* GRÁFICOS POR DEPARTAMENTO (pizza) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-700 mb-1">Projetos por Departamento</p>
          <p className="text-[11px] text-slate-400 mb-4">
            {filtroStatusProjeto ? `Status: ${filtroStatusProjeto}` : labelPeriodoAtivo()}
          </p>
          <GraficoPizza dados={projetosPorDepartamento} cor="#4f46e5" filtroAtivo={filtroDepartamento} onClickBarra={toggleFiltroDepartamento} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-700 mb-1">Tarefas por Departamento</p>
          <p className="text-[11px] text-slate-400 mb-4">
            {filtroStatusTarefa ? `Status: ${filtroStatusTarefa}` : labelPeriodoAtivo()}
          </p>
          <GraficoPizza dados={tarefasPorDepartamento} cor="#059669" filtroAtivo={filtroDepartamento} onClickBarra={toggleFiltroDepartamento} />
        </div>
      </div>

      {/* GRÁFICO POR SISTEMA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <p className="text-xs font-bold text-slate-700 mb-1">Projetos por Sistema</p>
        <p className="text-[11px] text-slate-400 mb-4">
          {projetosEfetivos.length} projeto(s)
          {filtroSistema && <span className="ml-1 text-cyan-700 font-semibold">· Filtrado: {filtroSistema}</span>}
        </p>
        <GraficoColunas dados={projetosPorSistema} cor="#0891b2" filtroAtivo={filtroSistema} onClickBarra={toggleFiltroSistema} />
      </div>

      {/* TABELA DE PROJETOS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <p className="text-xs font-bold text-slate-700 mb-1">Projetos</p>
          <p className="text-[11px] text-slate-400">{projetosExibidos.length} projeto(s) exibido(s)</p>
        </div>
        {projetosExibidos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">Nenhum projeto encontrado.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Projeto</th>
                <th className="p-3">Departamento</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Término</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {projetosExibidos.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">{p.nome}</td>
                  <td className="p-3 text-slate-600">{departamentoOf(p)}</td>
                  <td className="p-3 text-slate-600">{p.responsavel_nome || '—'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: statusInfo(p.status).cor + '22', color: statusInfo(p.status).cor }}>
                      {statusInfo(p.status).label}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium text-slate-700 whitespace-nowrap">{fmtData(dataTerminoProjeto(p))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
