import React, { useEffect, useState, useMemo, useRef } from 'react'

function tarefaPassaFiltroData(t, ini, fim, tipo) {
  if (tipo === 'inicio') {
    if (!t.data_inicio) return false
    if (ini && t.data_inicio < ini) return false
    if (fim && t.data_inicio > fim) return false
    return true
  }
  if (tipo === 'ambos') {
    const tI = t.data_inicio, tF = t.data_fim
    if (!tI && !tF) return false
    if (fim && tI && tI > fim) return false
    if (ini && tF && tF < ini) return false
    return true
  }
  if (!t.data_fim) return false
  if (ini && t.data_fim < ini) return false
  if (fim && t.data_fim > fim) return false
  return true
}
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, RotateCcw, List, FileDown, FolderOpen, Users, CheckCircle2, PlayCircle, X, Filter, Activity, CheckCircle, AlertTriangle, Layers, ShieldAlert, BarChart2, Eye } from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais, _projetosSession } from '../../context/ProjetosFiltrosContext'
import TarefaFormModal from './TarefaFormModal'
import ProjetosFiltrosPanel, { FiltrosCompactBar } from './ProjetosFiltrosPanel'
import { getProjetosCache, setProjetosCache, clearProjetosCache } from '../../services/projetosCache'

const hojeISO = new Date().toISOString().slice(0, 10)

function CardKpi({ icon: Icon, label, count, ativo, onClick, st }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition-all hover:shadow-md ${st.bg} ${st.border} ${ativo ? 'ring-2 ring-offset-1 ' + st.ring + ' shadow-md' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-1 mb-1">
        <div className={`p-0.5 rounded ${st.icoBg}`}><Icon className={`h-2.5 w-2.5 ${st.icoTxt}`} /></div>
        <p className={`text-[8px] font-bold uppercase tracking-wide leading-tight ${st.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${st.numTxt} leading-none`}>{count}</p>
    </button>
  )
}

const TASK_KPI_CFG = {
  mapeado:      { label: 'Mapeado',      icon: Layers,        st: { bg:'bg-slate-50',  border:'border-slate-200',  ring:'ring-slate-400',  icoBg:'bg-slate-100',  icoTxt:'text-slate-500',  numTxt:'text-slate-800',  labelTxt:'text-slate-400'  } },
  programado:   { label: 'Programado',   icon: CheckCircle,   st: { bg:'bg-blue-50',   border:'border-blue-100',   ring:'ring-blue-400',   icoBg:'bg-blue-100',   icoTxt:'text-blue-500',   numTxt:'text-blue-800',   labelTxt:'text-blue-400'   } },
  em_andamento: { label: 'Em Andamento', icon: Activity,      st: { bg:'bg-amber-50',  border:'border-amber-100',  ring:'ring-amber-400',  icoBg:'bg-amber-100',  icoTxt:'text-amber-500',  numTxt:'text-amber-800',  labelTxt:'text-amber-400'  } },
  pausado:      { label: 'Pausado',      icon: AlertTriangle, st: { bg:'bg-purple-50', border:'border-purple-100', ring:'ring-purple-400', icoBg:'bg-purple-100', icoTxt:'text-purple-500', numTxt:'text-purple-800', labelTxt:'text-purple-400' } },
  concluido:    { label: 'Concluído',    icon: CheckCircle2,  st: { bg:'bg-teal-50',   border:'border-teal-100',   ring:'ring-teal-400',   icoBg:'bg-teal-100',   icoTxt:'text-teal-500',   numTxt:'text-teal-800',   labelTxt:'text-teal-400'   } },
  cancelado:    { label: 'Cancelado',    icon: ShieldAlert,   st: { bg:'bg-red-50',    border:'border-red-100',    ring:'ring-red-400',    icoBg:'bg-red-100',    icoTxt:'text-red-500',    numTxt:'text-red-800',    labelTxt:'text-red-400'    } },
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const STATUS_LABEL = {
  mapeado:      'Mapeado',
  programado:   'Programado',
  em_andamento: 'Em Andamento',
  pausado:      'Pausado',
  concluido:    'Concluído',
}

const STATUS_COR = {
  mapeado:      '#94a3b8',
  programado:   '#3b82f6',
  em_andamento: '#f59e0b',
  pausado:      '#a855f7',
  concluido:    '#0d9488',
}

const getTextColor = (hex) => {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const DIAS_SEMANA_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const fmtDiaSemana = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return DIAS_SEMANA_FULL[d.getDay()] }
const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const getSundayOf = (d) => {
  const dt = new Date(d); dt.setHours(12, 0, 0, 0)
  dt.setDate(dt.getDate() - dt.getDay())
  return dt
}
const addDaysLocal = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt }

export default function CalendarioProjetos({ abaInicial = 'lista' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, empresasPermitidas, departamentosPermitidosEfetivos, hasActionOrDefault, hasPermission, user } = useAuth()
  const ctx = useProjetosFiltros()
  const { modoVerTodos, setModoVerTodos } = ctx
  const canEditarProjeto  = !modoVerTodos && hasActionOrDefault('projetos', 'editar')
  const canEditarTarefa   = !modoVerTodos && hasActionOrDefault('projetos', 'editar_tarefa')
  const canIniciarTarefa  = !modoVerTodos && hasActionOrDefault('projetos', 'iniciar_tarefa')
  const canConcluirTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'concluir_tarefa')
  const hoje = new Date()

  const aba = abaInicial // 'lista' | 'calendario' — determinado pela rota
  const [vistaCalendario, setVistaCalendario] = useState('semanal') // 'mensal' | 'semanal'
  const [ano, setAno]             = useState(hoje.getFullYear())
  const [mes, setMes]             = useState(hoje.getMonth()) // 0-indexed
  const [semanaBase, setSemanaBase] = useState(() => getSundayOf(new Date()))
  const [projetos, setProjetos] = useState(getProjetosCache() ?? [])
  const [loading, setLoading]   = useState(getProjetosCache() === null)
  const [tooltip, setTooltip]   = useState(null) // { tarefa, x, y }
  const [filtroResponsavel,        setFiltroResponsavel]        = useState('')
  const [filtroResponsavelProjeto, setFiltroResponsavelProjeto] = useState('')
  const [filtroDepartamento,       setFiltroDepartamento]       = useState('')
  const filtroDataIni      = ctx.filtroDataIni
  const setFiltroDataIni   = ctx.setFiltroDataIni
  const filtroDataFim      = ctx.filtroDataFim
  const setFiltroDataFim   = ctx.setFiltroDataFim
  const filtroDataTipo     = ctx.filtroDataTipo
  const setFiltroDataTipo  = ctx.setFiltroDataTipo
  const filtroDataProjIni  = ctx.filtroDataProjIni
  const filtroDataProjFim  = ctx.filtroDataProjFim
  const filtroStatusLista   = ctx.filtroStatusTarefa
  const setFiltroStatusLista   = ctx.setFiltroStatusTarefa
  const filtroStatusProjeto = ctx.filtroStatusProjeto
  const setFiltroStatusProjeto = ctx.setFiltroStatusProjeto
  const [visualizacaoLista,  setVisualizacaoLista]   = useState('data') // 'data' | 'projeto' | 'responsavel'
  const [filtroStatusCard, setFiltroStatusCard] = useState(new Set(['mapeado', 'programado', 'em_andamento', 'pausado']))
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail]         = useState(null)
  const [googleEvents, setGoogleEvents]       = useState([])
  const [loadingGoogle, setLoadingGoogle]     = useState(false)
  const [modalEditarTarefa, setModalEditarTarefa] = useState(null)
  const [modalConcluir, setModalConcluir] = useState(null) // { tarefa, dataFim }
  const [optsResp,  setOptsResp]  = useState([])
  const [optsSist,  setOptsSist]  = useState([])
  const [optsFase,  setOptsFase]  = useState([])
  const [optsEmp,   setOptsEmp]   = useState([])
  const [optsArea,  setOptsArea]  = useState([])
  const tableRef = useRef(null)

  useEffect(() => {
    if (_projetosSession.primeiroAcesso) {
      ctx.setFiltrosAbertos(false)
      _projetosSession.primeiroAcesso = false
    }
  }, []) // fecha apenas no primeiro acesso da sessão (reseta em F5)

  useEffect(() => {
    if (getProjetosCache()) return
    const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getProjetosParaAta(filtrosEmpresa)
      .then(data => { setProjetosCache(data); setProjetos(data) })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [isAdmin, empresasPermitidas])

  useEffect(() => {
    Promise.all([
      apiService.getProjResponsaveis(),
      apiService.getProjSistemas(),
      apiService.getProjFases(),
      apiService.getProjEmpresas(),
      apiService.getProjAreas(),
    ]).then(([rs, ss, fs, es, as]) => {
      setOptsResp(rs.filter(r => r.ativo !== false))
      setOptsSist(ss.filter(s => s.ativo !== false))
      setOptsFase(fs.filter(f => f.ativo !== false))
      setOptsEmp(es.filter(e => e.ativo !== false))
      setOptsArea(as.filter(a => a.ativo !== false))
    }).catch(() => {})
  }, [])

  // Google Calendar — verifica status e carrega eventos apenas na aba Agenda
  useEffect(() => {
    if (abaInicial !== 'calendario' || !user?.id) return
    const params = new URLSearchParams(location.search)
    if (params.get('google_connected') === '1') {
      navigate('/projetos/calendario', { replace: true })
    }
    apiService.getGoogleCalendarStatus(user.id)
      .then(s => { setGoogleConnected(s.connected); setGoogleEmail(s.google_email || null) })
      .catch(() => {})
  }, [abaInicial, user?.id, location.search])

  useEffect(() => {
    if (abaInicial !== 'calendario' || !googleConnected || !user?.id) { setGoogleEvents([]); return }
    setLoadingGoogle(true)
    const d0 = toKey(diasSemana[0])
    const d6 = toKey(diasSemana[6])
    apiService.getGoogleCalendarEvents(user.id, d0, d6)
      .then(r => setGoogleEvents(r.events || []))
      .catch(() => setGoogleEvents([]))
      .finally(() => setLoadingGoogle(false))
  }, [abaInicial, googleConnected, user?.id, semanaBase])

  const handleConectarGoogle = async () => {
    if (!user?.id) return
    try {
      const url = await apiService.getGoogleCalendarAuthUrl(user.id)
      window.location.href = url
    } catch (err) { alert('Erro: ' + err.message) }
  }

  const handleDesconectarGoogle = async () => {
    if (!user?.id) return
    await apiService.disconnectGoogleCalendar(user.id).catch(() => {})
    setGoogleConnected(false); setGoogleEmail(null); setGoogleEvents([])
  }

  const recarregarDados = () => {
    const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
    clearProjetosCache()
    apiService.getProjetosParaAta(filtrosEmpresa)
      .then(data => { setProjetosCache(data); setProjetos(data) })
      .catch(err => console.error(err))
  }

  const handleIniciarTarefa = async (tarefa) => {
    try {
      await apiService.updateTarefa(tarefa.id, { status_kanban: 'em_andamento' })
      recarregarDados()
    } catch (err) { alert('Erro ao iniciar: ' + (err.message || String(err))) }
  }

  const handleConcluirTarefa = async () => {
    if (!modalConcluir) return
    const { tarefa, dataFim } = modalConcluir
    try {
      await apiService.updateTarefa(tarefa.id, {
        status_kanban: 'concluido',
        progresso_pct: 100,
        data_fim: dataFim || null,
      })
      setModalConcluir(null)
      recarregarDados()
    } catch (err) { alert('Erro ao concluir: ' + (err.message || String(err))) }
  }

  // Projetos após filtros globais compartilhados
  // modoVerTodos ignora restrição de departamento e bloqueia edições
  const projetosGlobal = useMemo(() => aplicarFiltrosGlobais(projetos, ctx, modoVerTodos ? null : departamentosPermitidosEfetivos), [
    projetos, ctx.filtroEmpresa, ctx.filtroDepartamento, ctx.filtroArea,
    ctx.filtroFase, ctx.filtroSistema, ctx.filtroRespProjeto, ctx.filtroRespTarefa,
    departamentosPermitidosEfetivos, modoVerTodos,
  ])

  // Todas as tarefas achatadas com nome do projeto, departamento e projeto_id
  // Usa campos do projeto como fallback quando a tarefa não tem os seus próprios preenchidos
  const tarefas = useMemo(() => {
    let projsFiltrados = projetosGlobal
    if (filtroDataProjIni || filtroDataProjFim) {
      projsFiltrados = projetosGlobal.filter(p => {
        const dataFimProj = (p.proj_tarefas || []).map(t => t.data_fim).filter(Boolean).sort().pop()
        if (!dataFimProj) return !filtroDataProjFim
        if (filtroDataProjIni && dataFimProj < filtroDataProjIni) return false
        if (filtroDataProjFim && dataFimProj > filtroDataProjFim) return false
        return true
      })
    }
    return projsFiltrados.flatMap(p =>
      (p.proj_tarefas || [])
        .filter(t => !ctx.filtroRespTarefa || (t.responsavel_nome || '') === ctx.filtroRespTarefa)
        .map(t => ({
          ...t,
          projeto_id:               p.id,
          projeto_nome:             p.nome,
          departamento_nome:        p.departamento_nome        || '',
          area_nome:                t.area_nome                || p.area_nome     || '',
          sistema_nome:             t.sistema_nome             || p.sistema_nome  || '',
          empresa_nome:             t.empresa_nome             || p.empresa_nome  || '',
          projeto_responsavel_nome: p.responsavel_nome || '',
          projeto_status:           p.status || '',
        }))
    )
  }, [projetosGlobal, ctx.filtroRespTarefa, filtroDataProjIni, filtroDataProjFim])

  // Listas únicas ordenadas para os filtros
  const responsaveis = useMemo(() =>
    [...new Set(tarefas.map(t => t.responsavel_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [tarefas]
  )
  const responsaveisProjeto = useMemo(() =>
    [...new Set(tarefas.map(t => t.projeto_responsavel_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [tarefas]
  )
  const departamentos = useMemo(() =>
    [...new Set(tarefas.map(t => t.departamento_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [tarefas]
  )

  // Tarefas após aplicar os filtros de responsável e departamento
  const tarefasFiltradas = useMemo(() =>
    tarefas.filter(t =>
      (!filtroResponsavel  || t.responsavel_nome  === filtroResponsavel) &&
      (!filtroDepartamento || t.departamento_nome === filtroDepartamento)
    ),
    [tarefas, filtroResponsavel, filtroDepartamento]
  )

  const sistemaCorMap = Object.fromEntries(optsSist.map(s => [s.nome, s.cor || '#1e293b']))

  // Tarefas para o calendário: apenas responsável da tarefa + status (sem departamento)
  const tarefasParaCalendario = useMemo(() => {
    let result = tarefas.filter(t => !filtroResponsavel || t.responsavel_nome === filtroResponsavel)
    if (filtroStatusCard.size > 0) result = result.filter(t => filtroStatusCard.has(t.status_kanban))
    return result
  }, [tarefas, filtroResponsavel, filtroStatusCard])

  // Monta a grade de semanas do mês atual
  const semanas = useMemo(() => {
    const primeiroDia  = new Date(ano, mes, 1)
    const ultimoDia    = new Date(ano, mes + 1, 0)
    const offsetInicio = primeiroDia.getDay() // 0=Dom

    const dias = []
    // Dias do mês anterior para preencher a primeira semana
    for (let i = offsetInicio - 1; i >= 0; i--) {
      dias.push({ data: new Date(ano, mes, -i), mesAtual: false })
    }
    // Dias do mês atual
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push({ data: new Date(ano, mes, d), mesAtual: true })
    }
    // Dias do próximo mês para completar a última semana
    const restante = 7 - (dias.length % 7)
    if (restante < 7) {
      for (let i = 1; i <= restante; i++) {
        dias.push({ data: new Date(ano, mes + 1, i), mesAtual: false })
      }
    }

    const result = []
    for (let i = 0; i < dias.length; i += 7) result.push(dias.slice(i, i + 7))
    return result
  }, [ano, mes])

  // Atribui lanes globais: cada tarefa recebe o menor slot livre, garantindo
  // que a mesma tarefa fique na mesma linha em todos os dias que ela abrange.
  const tasksWithLanes = useMemo(() => {
    const firstOfMonth = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const lastDay = new Date(ano, mes + 1, 0).getDate()
    const lastOfMonth = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const tasks = tarefasParaCalendario
      .filter(t => t.data_inicio || t.data_fim)
      .filter(t => {
        const start = t.data_inicio || t.data_fim
        const end   = t.data_fim   || t.data_inicio
        return start <= lastOfMonth && end >= firstOfMonth
      })
      .sort((a, b) => {
        const sa = a.data_inicio || a.data_fim
        const sb = b.data_inicio || b.data_fim
        return sa < sb ? -1 : sa > sb ? 1 : 0
      })

    const laneEnds = [] // laneEnds[i] = último data_fim ocupando a lane i

    return tasks.map(task => {
      const start = task.data_inicio || task.data_fim
      const end   = task.data_fim   || task.data_inicio
      let lane = 0
      while (lane < laneEnds.length && laneEnds[lane] !== undefined && laneEnds[lane] >= start) {
        lane++
      }
      laneEnds[lane] = end
      return { ...task, lane }
    })
  }, [tarefasParaCalendario, ano, mes])

  // Mapa: "YYYY-MM-DD" → { [lane]: tarefa } — slot fixo por dia
  const slotMap = useMemo(() => {
    const map = {}
    tasksWithLanes.forEach(t => {
      const dInicio = t.data_inicio || t.data_fim
      const dFim    = t.data_fim   || t.data_inicio
      semanas.flat().forEach(({ data, mesAtual }) => {
        if (!mesAtual) return
        const key = toKey(data)
        if (key >= dInicio && key <= dFim) {
          if (!map[key]) map[key] = {}
          map[key][t.lane] = { ...t, isStart: key === dInicio, isEnd: key === dFim }
        }
      })
    })
    return map
  }, [tasksWithLanes, semanas])

  // ── Vista semanal ─────────────────────────────────────────────────────────
  const diasSemana = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDaysLocal(semanaBase, i)),
    [semanaBase]
  )

  const { slotMapSemana, maxLaneSemana } = useMemo(() => {
    const d0 = toKey(diasSemana[0])
    const d6 = toKey(diasSemana[6])
    const tasks = tarefasParaCalendario
      .filter(t => t.data_inicio || t.data_fim)
      .filter(t => {
        const s = t.data_inicio || t.data_fim
        const e = t.data_fim   || t.data_inicio
        return s <= d6 && e >= d0
      })
      .sort((a, b) => {
        const sa = a.data_inicio || a.data_fim
        const sb = b.data_inicio || b.data_fim
        return sa < sb ? -1 : sa > sb ? 1 : 0
      })
    const laneEnds = []
    const withLanes = tasks.map(task => {
      const s = task.data_inicio || task.data_fim
      const e = task.data_fim   || task.data_inicio
      let lane = 0
      while (lane < laneEnds.length && laneEnds[lane] !== undefined && laneEnds[lane] >= s) lane++
      laneEnds[lane] = e
      return { ...task, lane }
    })
    const map = {}
    withLanes.forEach(t => {
      const dI = t.data_inicio || t.data_fim
      const dF = t.data_fim   || t.data_inicio
      diasSemana.forEach(data => {
        const key = toKey(data)
        if (key >= dI && key <= dF) {
          if (!map[key]) map[key] = {}
          map[key][t.lane] = { ...t, isStart: key === dI, isEnd: key === dF }
        }
      })
    })
    return { slotMapSemana: map, maxLaneSemana: laneEnds.length }
  }, [tarefasParaCalendario, diasSemana])

  const { slotMapGoogle, maxLaneGoogle } = useMemo(() => {
    if (!googleEvents.length) return { slotMapGoogle: {}, maxLaneGoogle: 0 }
    const d0 = toKey(diasSemana[0])
    const d6 = toKey(diasSemana[6])
    const evs = googleEvents
      .filter(e => {
        const start = (e.start?.date || e.start?.dateTime || '').slice(0, 10)
        const end   = (e.end?.date   || e.end?.dateTime   || '').slice(0, 10)
        return start && end && start <= d6 && end >= d0
      })
      .map(e => ({
        id:    e.id,
        nome:  e.summary || '(sem título)',
        data_inicio: (e.start?.date || e.start?.dateTime || '').slice(0, 10),
        data_fim:    (e.end?.date   || e.end?.dateTime   || '').slice(0, 10),
        google: true,
      }))
      .sort((a, b) => (a.data_inicio < b.data_inicio ? -1 : 1))
    const laneEnds = []
    const withLanes = evs.map(ev => {
      let lane = 0
      while (lane < laneEnds.length && laneEnds[lane] >= ev.data_inicio) lane++
      laneEnds[lane] = ev.data_fim
      return { ...ev, lane }
    })
    const map = {}
    withLanes.forEach(ev => {
      diasSemana.forEach(data => {
        const key = toKey(data)
        if (key >= ev.data_inicio && key <= ev.data_fim) {
          if (!map[key]) map[key] = {}
          map[key][ev.lane] = { ...ev, isStart: key === ev.data_inicio, isEnd: key === ev.data_fim }
        }
      })
    })
    return { slotMapGoogle: map, maxLaneGoogle: laneEnds.length }
  }, [googleEvents, diasSemana])

  const prevSemana = () => setSemanaBase(d => addDaysLocal(d, -7))
  const nextSemana = () => setSemanaBase(d => addDaysLocal(d, +7))
  const irParaHoje = () => { setSemanaBase(getSundayOf(new Date())); setAno(hoje.getFullYear()); setMes(hoje.getMonth()) }

  const semanaLabel = (() => {
    const d0 = diasSemana[0], d6 = diasSemana[6]
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
    const ano6 = d6.getFullYear()
    return `${fmt(d0)} — ${fmt(d6)} ${ano6}`
  })()

  // Lista ordenada por data_fim ASC para a aba Lista (com filtros de status, data e responsáveis)
  const tarefasLista = useMemo(() =>
    [...tarefasFiltradas]
      .filter(t => filtroStatusCard.size === 0 || filtroStatusCard.has(t.status_kanban || 'mapeado'))
      .filter(t => !filtroResponsavelProjeto || t.projeto_responsavel_nome === filtroResponsavelProjeto)
      .filter(t => {
        const temFiltroData = filtroDataIni || filtroDataFim
        if (!temFiltroData) return true
        if (!filtroDataFim && t.status_kanban === 'mapeado' && !t.data_inicio && !t.data_fim) return true
        return tarefaPassaFiltroData(t, filtroDataIni, filtroDataFim, 'fim')
      })
      .sort((a, b) => {
        const da = a.data_fim || a.data_inicio || '9999-99-99'
        const db = b.data_fim || b.data_inicio || '9999-99-99'
        return da < db ? -1 : da > db ? 1 : 0
      }),
    [tarefasFiltradas, filtroStatusCard, filtroResponsavelProjeto, filtroDataIni, filtroDataFim]
  )

  const gruposLista = useMemo(() => {
    const map = {}
    tarefasLista.forEach(t => {
      let key
      if (visualizacaoLista === 'responsavel')   key = t.responsavel_nome          || '— Sem responsável —'
      else if (visualizacaoLista === 'resp_projeto') key = t.projeto_responsavel_nome  || '— Sem responsável —'
      else if (visualizacaoLista === 'data')    key = t.data_fim                  || '— Sem data —'
      else                                       key = t.projeto_nome              || '— Sem projeto —'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    const grupos = Object.entries(map).sort(([a], [b]) => {
      if (a.startsWith('—')) return 1
      if (b.startsWith('—')) return -1
      if (visualizacaoLista === 'data') return a < b ? -1 : a > b ? 1 : 0
      return a.localeCompare(b, 'pt-BR')
    })
    // No modo Por Projeto, ordena as tarefas de cada grupo por etapa A→Z (nulls no fim)
    if (visualizacaoLista === 'projeto') {
      grupos.forEach(([, tarefas]) => {
        tarefas.sort((a, b) => {
          if (a.etapa == null && b.etapa == null) return 0
          if (a.etapa == null) return 1
          if (b.etapa == null) return -1
          return a.etapa - b.etapa
        })
      })
    }
    return grupos
  }, [tarefasLista, visualizacaoLista])

  const baixarPDF = async () => {
    if (!tableRef.current || gerandoPDF) return
    setGerandoPDF(true)
    const WRAP_W = 1400
    const applyPdfStyles = (el) => {
      el.querySelectorAll('table').forEach(t => { t.style.fontSize = '13px'; t.style.width = '100%'; t.style.borderCollapse = 'collapse' })
      el.querySelectorAll('th').forEach(th => { th.style.fontSize = '11px'; th.style.fontWeight = '700'; th.style.padding = '8px 12px'; th.style.borderBottom = '2px solid #e2e8f0'; th.style.backgroundColor = '#f8fafc'; th.style.color = '#475569' })
      el.querySelectorAll('td').forEach(td => { td.style.fontSize = '12px'; td.style.padding = '7px 12px'; td.style.borderBottom = '1px solid #f1f5f9'; td.style.color = '#334155' })
      el.querySelectorAll('span[data-pdf-badge]').forEach(b => { b.style.fontSize = '11px'; b.style.padding = '2px 8px'; b.style.borderRadius = '99px'; b.style.fontWeight = '700' })
    }
    const renderCanvas = async (el) => {
      const wrap = document.createElement('div')
      wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:white;z-index:-1;padding:24px;`
      wrap.appendChild(el)
      document.body.appendChild(wrap)
      await new Promise(r => requestAnimationFrame(r))
      const c = await html2canvas(wrap, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff', logging: false })
      document.body.removeChild(wrap)
      return c
    }
    const addCanvasToPdf = (pdf, canvas, first) => {
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW  = pageW
      const imgH  = (canvas.height * imgW) / canvas.width
      let yPos = 0
      let isFirst = first
      while (yPos < imgH) {
        if (!isFirst) pdf.addPage()
        isFirst = false
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -yPos, imgW, imgH)
        yPos += pageH
      }
      return false // not first anymore
    }
    try {
      const now = new Date()
      const stamp = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      if (visualizacaoLista === 'projeto') {
        // Cada projeto em sua própria página
        const table = tableRef.current.querySelector('table')
        const thead = table.querySelector('thead')
        const allRows = Array.from(table.querySelectorAll('tbody tr'))

        // Agrupa linhas por cabeçalho de projeto
        const groups = []
        let cur = null
        allRows.forEach(row => {
          if (row.dataset.groupHeader) { cur = [row]; groups.push(cur) }
          else if (cur) cur.push(row)
        })

        let first = true
        for (const groupRows of groups) {
          const mini = document.createElement('table')
          mini.style.cssText = 'width:100%;border-collapse:collapse;'
          mini.appendChild(thead.cloneNode(true))
          const tbody = document.createElement('tbody')
          groupRows.forEach(row => tbody.appendChild(row.cloneNode(true)))
          mini.appendChild(tbody)
          applyPdfStyles(mini)
          const canvas = await renderCanvas(mini)
          first = addCanvasToPdf(pdf, canvas, first)
        }
      } else {
        // Modo padrão: tabela inteira paginada por altura
        const clone = tableRef.current.cloneNode(true)
        clone.style.width = '100%'
        applyPdfStyles(clone)
        const canvas = await renderCanvas(clone)
        addCanvasToPdf(pdf, canvas, true)
      }

      pdf.save(`tarefas-${stamp}.pdf`)
    } finally {
      setGerandoPDF(false)
    }
  }

  const prevMes = () => {
    if (mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  const nextMes = () => {
    if (mes === 11) { setMes(0); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const anos = Array.from({ length: 8 }, (_, i) => hoje.getFullYear() - 3 + i)
  const hojeStr = toKey(hoje)

  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shrink-0">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {aba === 'lista' ? 'Lista de Tarefas' : 'Agenda'}
            </h1>
            <p className="text-xs text-slate-500">
              {aba === 'lista' ? 'Tarefas por status e projeto' : 'Visualização mensal das tarefas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasPermission('bi/projetos') && (
            <button
              onClick={() => navigate('/bi/projetos')}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors"
            >
              <BarChart2 className="h-4 w-4 text-indigo-500" /> Ir para Dashboard
            </button>
          )}
          {departamentosPermitidosEfetivos?.size > 0 && (
            <button
              onClick={() => setModoVerTodos(!modoVerTodos)}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border transition-colors ${
                modoVerTodos
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye className="h-4 w-4" />
              {modoVerTodos ? 'Sair da Visualização Geral' : 'Ver Todos os Projetos'}
            </button>
          )}
          {aba === 'lista' && (
            <button
              onClick={baixarPDF}
              disabled={gerandoPDF || tarefasLista.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              {gerandoPDF ? 'Gerando…' : 'Baixar PDF'}
            </button>
          )}
          {aba === 'calendario' && (<>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              {[['mensal','Mensal'],['semanal','Semanal']].map(([v, l]) => (
                <button key={v} onClick={() => setVistaCalendario(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    vistaCalendario === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            {vistaCalendario === 'mensal' ? (<>
              <button onClick={prevMes} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                className="text-sm font-semibold px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={ano} onChange={e => setAno(Number(e.target.value))}
                className="text-sm font-semibold px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={nextMes} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>) : (<>
              <button onClick={prevSemana} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700 min-w-[200px] text-center">{semanaLabel}</span>
              <button onClick={nextSemana} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={irParaHoje} className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-md hover:bg-slate-100 text-slate-600 transition-colors">
                Hoje
              </button>
            </>)}
          </>)}
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <ProjetosNav />
        <div className="flex items-start gap-2">
          {aba === 'calendario' && (googleConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-600">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#4285F4"/><path d="M17.82 12.2c0-.367-.033-.72-.094-1.06H12v2.006h3.264a2.79 2.79 0 01-1.211 1.83v1.52h1.961c1.147-1.056 1.807-2.613 1.807-4.297z" fill="#4285F4"/><path d="M12 18c1.638 0 3.012-.543 4.014-1.47l-1.961-1.52c-.543.364-1.237.578-2.053.578-1.578 0-2.915-1.066-3.392-2.497H6.577v1.57A6.002 6.002 0 0012 18z" fill="#34A853"/><path d="M8.608 13.09A3.603 3.603 0 018.42 12c0-.38.065-.748.188-1.09V9.34H6.577A6.002 6.002 0 006 12c0 .967.232 1.882.577 2.66l2.031-1.57z" fill="#FBBC05"/><path d="M12 8.413c.89 0 1.688.306 2.316.906l1.735-1.735C14.01 6.543 13.071 6 12 6a6.002 6.002 0 00-5.423 3.34l2.031 1.57C9.085 9.48 10.422 8.413 12 8.413z" fill="#EA4335"/></svg>
              <span className="max-w-[130px] truncate">{googleEmail}</span>
              <button onClick={handleDesconectarGoogle} className="ml-1 text-slate-400 hover:text-red-500 transition-colors" title="Desconectar"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button onClick={handleConectarGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Sincronizar com Google Calendar">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#4285F4"/><path d="M17.82 12.2c0-.367-.033-.72-.094-1.06H12v2.006h3.264a2.79 2.79 0 01-1.211 1.83v1.52h1.961c1.147-1.056 1.807-2.613 1.807-4.297z" fill="#4285F4"/><path d="M12 18c1.638 0 3.012-.543 4.014-1.47l-1.961-1.52c-.543.364-1.237.578-2.053.578-1.578 0-2.915-1.066-3.392-2.497H6.577v1.57A6.002 6.002 0 0012 18z" fill="#34A853"/><path d="M8.608 13.09A3.603 3.603 0 018.42 12c0-.38.065-.748.188-1.09V9.34H6.577A6.002 6.002 0 006 12c0 .967.232 1.882.577 2.66l2.031-1.57z" fill="#FBBC05"/><path d="M12 8.413c.89 0 1.688.306 2.316.906l1.735-1.735C14.01 6.543 13.071 6 12 6a6.002 6.002 0 00-5.423 3.34l2.031 1.57C9.085 9.48 10.422 8.413 12 8.413z" fill="#EA4335"/></svg>
              Conectar Google Calendar
            </button>
          ))}
          <FiltrosCompactBar />
        </div>
      </div>
      <ProjetosFiltrosPanel projetos={projetos} showTrigger={false} />

      {modoVerTodos && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
          <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          Modo Visualização Geral — exibindo todos os departamentos. Todas as edições estão bloqueadas.
          <button onClick={() => setModoVerTodos(false)} className="ml-auto text-amber-600 hover:text-amber-800 font-bold underline underline-offset-2">
            Sair
          </button>
        </div>
      )}

      {/* Cards KPI — visíveis em ambas as abas */}
      {!loading && (() => {
        const counts = {}
        Object.keys(TASK_KPI_CFG).forEach(s => { counts[s] = 0 })
        tarefasFiltradas.forEach(t => { const s = t.status_kanban || 'mapeado'; if (counts[s] !== undefined) counts[s]++ })
        const cards = Object.entries(TASK_KPI_CFG)
          .map(([status, cfg]) => ({ status, cfg, count: counts[status] || 0 }))
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length + 1}, 1fr)`, gap: '10px' }}>
            {cards.map(c => (
              <CardKpi key={c.status} icon={c.cfg.icon} label={c.cfg.label} count={c.count}
                ativo={filtroStatusCard.has(c.status)}
                onClick={() => setFiltroStatusCard(prev => { const s = new Set(prev); s.has(c.status) ? s.delete(c.status) : s.add(c.status); return s })}
                st={c.cfg.st} />
            ))}
            <CardKpi
              icon={Layers} label="Total Tarefas" count={tarefasFiltradas.length}
              ativo={false}
              onClick={() => setFiltroStatusCard(new Set())}
              st={{ bg:'bg-slate-50', border:'border-slate-200', ring:'ring-slate-300', icoBg:'bg-slate-100', icoTxt:'text-slate-500', numTxt:'text-slate-800', labelTxt:'text-slate-400' }}
            />
          </div>
        )
      })()}

      {/* ── ABA LISTA ────────────────────────────────────────────────────────── */}
      {aba === 'lista' && !loading && (
        <div className="space-y-3">
          {/* Tabela */}
          <div ref={tableRef} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] w-14">Etapa</th>
                  {visualizacaoLista !== 'data' && visualizacaoLista !== 'projeto' && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Término ↑</th>}
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[260px]">Tarefa</th>
                  {visualizacaoLista !== 'projeto' && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[220px]">Projeto</th>}
                  {visualizacaoLista !== 'resp_projeto' && visualizacaoLista !== 'projeto' && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Resp. Projeto</th>}
                  {visualizacaoLista !== 'responsavel' && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Resp. Tarefa</th>}
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[180px] leading-tight">Sistema<br/><span className="normal-case font-normal text-slate-400">Depto / Área</span></th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] pl-8">Status / Fase</th>
                  {visualizacaoLista === 'projeto' && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Início</th>}
                  {visualizacaoLista === 'projeto' && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Término</th>}
                  <th className="px-4 py-2.5 w-28" />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const numCols = 9
                  return gruposLista.length === 0 ? (
                  <tr><td colSpan={numCols} className="py-10 text-center text-slate-400">Nenhuma tarefa encontrada</td></tr>
                ) : gruposLista.map(([grupo, gTarefas]) => (
                  <React.Fragment key={grupo}>
                    {/* Cabeçalho do grupo */}
                    {(() => {
                      const isData = visualizacaoLista === 'data' && !grupo.startsWith('—')
                      const passado = isData && grupo < hojeISO
                      const ehHoje  = isData && grupo === hojeISO
                      const trCls   = passado ? 'bg-red-50/90 border-y border-red-200'
                                    : ehHoje  ? 'bg-amber-50/90 border-y border-amber-200'
                                    :           'bg-indigo-50/80 border-y border-indigo-100'
                      const txtCls  = passado ? 'text-red-700'
                                    : ehHoje  ? 'text-amber-700'
                                    :           'text-indigo-700'
                      const subCls  = passado ? 'text-red-400'
                                    : ehHoje  ? 'text-amber-500'
                                    :           'text-indigo-400'
                      return (
                        <tr className={trCls} data-group-header="true">
                          <td colSpan={numCols} className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide ${txtCls}`}>
                            <span className="flex items-center gap-2 flex-wrap">
                              {(visualizacaoLista === 'responsavel' || visualizacaoLista === 'resp_projeto')
                                ? <Users className="h-3.5 w-3.5 shrink-0" />
                                : visualizacaoLista === 'data'
                                ? <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                : <FolderOpen className="h-3.5 w-3.5 shrink-0" />}
                              {isData ? fmtData(grupo) : grupo}
                              {isData && (
                                <span className={`text-[10px] font-semibold normal-case tracking-normal ${subCls}`}>
                                  {fmtDiaSemana(grupo)}
                                  {ehHoje && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[9px] font-bold uppercase">hoje</span>}
                                </span>
                              )}
                              {visualizacaoLista === 'projeto' && gTarefas[0]?.projeto_responsavel_nome && (
                                <span className={`text-[10px] font-semibold normal-case tracking-normal ${subCls}`}>
                                  · Resp: {gTarefas[0].projeto_responsavel_nome}
                                </span>
                              )}
                              <span className={`text-[10px] font-normal normal-case tracking-normal ${subCls}`}>
                                · {gTarefas.length} tarefa{gTarefas.length !== 1 ? 's' : ''}
                              </span>
                            </span>
                          </td>
                        </tr>
                      )
                    })()}
                    {/* Linhas de tarefas */}
                    {gTarefas.map(t => {
                      const cor = STATUS_COR[t.status_kanban] || '#3b82f6'
                      const atrasada = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
                      const hoje_fim = t.status_kanban !== 'concluido' && t.data_fim === hojeISO
                      return (
                        <tr key={t.id} className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${canEditarTarefa ? 'cursor-pointer' : ''}`} onClick={() => canEditarTarefa && setModalEditarTarefa(t)}>
                          <td className="px-3 py-2.5 text-center">
                            {t.etapa != null
                              ? <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ${t.status_kanban === 'em_andamento' ? 'bg-orange-500 text-white shadow-sm' : 'bg-indigo-100 text-indigo-700'}`}>{t.etapa}ª</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          {visualizacaoLista !== 'data' && visualizacaoLista !== 'projeto' && (
                            <td className={`px-4 py-2.5 font-semibold tabular-nums ${atrasada ? 'text-red-500' : hoje_fim ? 'text-amber-600' : 'text-slate-700'}`}>
                              {fmtData(t.data_fim)}
                              {t.data_fim && (
                                <span className={`block text-[10px] font-normal ${atrasada ? 'text-red-400' : hoje_fim ? 'text-amber-500' : 'text-slate-400'}`}>
                                  {fmtDiaSemana(t.data_fim)}
                                  {hoje_fim && <span className="ml-1 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">hoje</span>}
                                </span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2.5 font-medium text-slate-800">{t.nome}</td>
                          {visualizacaoLista !== 'projeto' && (
                            <td className="px-4 py-2.5">
                              {canEditarProjeto ? (
                                <button
                                  onClick={e => { e.stopPropagation(); navigate(`/projetos/detalhe/${t.projeto_id}/editar`) }}
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline text-left text-xs"
                                >
                                  {t.projeto_nome}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-700">{t.projeto_nome}</span>
                              )}
                            </td>
                          )}
                          {visualizacaoLista !== 'resp_projeto' && visualizacaoLista !== 'projeto' && <td className="px-4 py-2.5 text-slate-500">{t.projeto_responsavel_nome || '—'}</td>}
                          {visualizacaoLista !== 'responsavel' && <td className="px-4 py-2.5 text-slate-500">{t.responsavel_nome || '—'}</td>}
                          <td className="px-4 py-2.5 leading-tight">
                            {t.sistema_nome
                              ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: sistemaCorMap[t.sistema_nome] || '#1e293b', color: getTextColor(sistemaCorMap[t.sistema_nome] || '#1e293b') }}>{t.sistema_nome}</span>
                              : null
                            }
                            <div className="text-[10px] text-slate-400 italic mt-0.5 whitespace-nowrap">
                              {[t.departamento_nome, t.area_nome].filter(Boolean).join(' / ') || '—'}
                            </div>
                          </td>
                          <td className="pl-8 pr-4 py-2.5 leading-tight">
                            <span data-pdf-badge className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                              style={{ background: cor + '22', color: cor }}>
                              {STATUS_LABEL[t.status_kanban] || t.status_kanban}
                            </span>
                            {t.fase_nome && <span className="block italic text-slate-400 text-[10px] pl-0.5 mt-0.5">{t.fase_nome}</span>}
                          </td>
                          {visualizacaoLista === 'projeto' && (
                            <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap text-xs">
                              {fmtData(t.data_inicio) || '—'}
                            </td>
                          )}
                          {visualizacaoLista === 'projeto' && (
                            <td className={`px-4 py-2.5 tabular-nums whitespace-nowrap text-xs font-semibold ${atrasada ? 'text-red-500' : hoje_fim ? 'text-amber-600' : 'text-slate-500'}`}>
                              {fmtData(t.data_fim) || '—'}
                            </td>
                          )}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              {canIniciarTarefa && t.status_kanban === 'programado' && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleIniciarTarefa(t) }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Iniciar tarefa"
                                >
                                  <PlayCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {canConcluirTarefa && t.status_kanban === 'em_andamento' && (
                                <button
                                  onClick={e => { e.stopPropagation(); setModalConcluir({ tarefa: t, dataFim: hojeISO }) }}
                                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                  title="Concluir tarefa"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))
                })()}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA CALENDÁRIO ───────────────────────────────────────────────────── */}
      {aba === 'calendario' && !loading && (<>

        {/* ── VISTA MENSAL ──────────────────────────────────────────────────── */}
        {vistaCalendario === 'mensal' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {DIAS_SEMANA.map((d, i) => (
              <div key={d} className={`py-2.5 text-center text-[10px] font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-500'}`}>{d}</div>
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {semanas.map((semana, si) => {
              const maxLaneWeek = semana.reduce((max, { data, mesAtual }) => {
                if (!mesAtual) return max
                const nums = Object.keys(slotMap[toKey(data)] || {}).map(Number)
                return nums.length ? Math.max(max, ...nums) : max
              }, -1)
              const numSlots = maxLaneWeek + 1
              const rowHeight = Math.max(56, 26 + numSlots * 17)
              return (
                <div key={si} className="grid grid-cols-7" style={{ minHeight: `${rowHeight}px` }}>
                  {semana.map(({ data, mesAtual }, di) => {
                    const key = toKey(data)
                    const slots = mesAtual ? (slotMap[key] || {}) : {}
                    const isHoje = mesAtual && key === hojeStr
                    const ehFimSem = di === 0 || di === 6
                    return (
                      <div key={di} className={`relative flex flex-col border-l border-slate-100 first:border-l-0 ${!mesAtual ? 'bg-slate-50/70' : ehFimSem ? 'bg-slate-50/30' : ''}`} style={{ overflow: 'visible' }}>
                        <div className="flex justify-end pr-2 pt-1 mb-1 shrink-0">
                          <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isHoje ? 'bg-indigo-600 text-white' : !mesAtual ? 'text-slate-300' : ehFimSem ? 'text-slate-400' : 'text-slate-600'}`}>{data.getDate()}</span>
                        </div>
                        <div className="flex flex-col" style={{ gap: '1px', overflow: 'visible' }}>
                          {Array.from({ length: numSlots }, (_, lane) => {
                            const t = slots[lane]
                            if (!t) return <div key={lane} style={{ height: '16px', flexShrink: 0 }} />
                            const isStartHere = t.isStart || di === 0
                            const isEndHere   = t.isEnd   || di === 6
                            const cor = STATUS_COR[t.status_kanban] || '#3b82f6'
                            return (
                              <div key={lane} onMouseMove={e => setTooltip({ tarefa: t, x: e.clientX, y: e.clientY })} onMouseLeave={() => setTooltip(null)} onDoubleClick={() => { if (!canEditarTarefa) return; setTooltip(null); setModalEditarTarefa(t) }}
                                style={{ position:'relative', zIndex:1, height:'16px', flexShrink:0, backgroundColor:cor, opacity:0.88, cursor:'pointer', display:'flex', alignItems:'center', overflow:'hidden',
                                  borderRadius:[isStartHere?'3px':'0', isEndHere?'3px':'0', isEndHere?'3px':'0', isStartHere?'3px':'0'].join(' '),
                                  marginLeft:isStartHere?'3px':'-1px', marginRight:isEndHere?'3px':'-1px', paddingLeft:isStartHere?'6px':'2px', paddingRight:'3px' }}>
                                {isStartHere && <span style={{ fontSize:'9px', fontWeight:700, color:'rgba(255,255,255,0.95)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1, userSelect:'none' }}>{t.nome}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
        )}

        {/* ── VISTA SEMANAL ─────────────────────────────────────────────────── */}
        {vistaCalendario === 'semanal' && (() => {
          const DIAS_SEG = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
          const numSlots      = Math.max(1, maxLaneSemana)
          const numSlotsGoogle = maxLaneGoogle
          const colHeight = Math.max(180, 52 + numSlots * 28 + (numSlotsGoogle > 0 ? 8 + numSlotsGoogle * 24 : 0))
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-7 border-b border-slate-200">
                {diasSemana.map((data, di) => {
                  const key = toKey(data)
                  const isHoje  = key === hojeStr
                  const ehFimSem = di === 0 || di === 6
                  return (
                    <div key={di} className={`flex flex-col items-center py-3 border-l border-slate-100 first:border-l-0 ${ehFimSem ? 'bg-slate-50' : 'bg-white'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${ehFimSem ? 'text-slate-400' : 'text-slate-400'}`}>{DIAS_SEG[di]}</span>
                      <span className={`text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full ${isHoje ? 'bg-indigo-600 text-white' : ehFimSem ? 'text-slate-400' : 'text-slate-700'}`}>{data.getDate()}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{data.toLocaleDateString('pt-BR', { month:'short' }).replace('.','')}</span>
                    </div>
                  )
                })}
              </div>
              {/* Grid de tarefas */}
              <div className="grid grid-cols-7 divide-x divide-slate-100" style={{ minHeight: `${colHeight}px` }}>
                {diasSemana.map((data, di) => {
                  const key = toKey(data)
                  const slots       = slotMapSemana[key] || {}
                  const slotsGoogle = slotMapGoogle[key]  || {}
                  const ehFimSem = di === 0 || di === 6
                  const isHoje  = key === hojeStr
                  return (
                    <div key={di} className={`relative flex flex-col p-1.5 gap-1 ${ehFimSem ? 'bg-slate-50/60' : ''} ${isHoje ? 'bg-indigo-50/30' : ''}`}>
                      {/* Tarefas do sistema */}
                      {Array.from({ length: numSlots }, (_, lane) => {
                        const t = slots[lane]
                        if (!t) return <div key={lane} style={{ height: '24px', flexShrink: 0 }} />
                        const cor = STATUS_COR[t.status_kanban] || '#3b82f6'
                        const isStartHere = t.isStart || di === 0
                        const isEndHere   = t.isEnd   || di === 6
                        return (
                          <div key={lane} onMouseMove={e => setTooltip({ tarefa: t, x: e.clientX, y: e.clientY })} onMouseLeave={() => setTooltip(null)} onDoubleClick={() => { if (!canEditarTarefa) return; setTooltip(null); setModalEditarTarefa(t) }}
                            style={{ height:'24px', flexShrink:0, backgroundColor:cor, opacity:0.85, cursor:'pointer', display:'flex', alignItems:'center', overflow:'hidden',
                              borderRadius:[isStartHere?'5px':'0', isEndHere?'5px':'0', isEndHere?'5px':'0', isStartHere?'5px':'0'].join(' '),
                              marginLeft:isStartHere?'0':'-7px', marginRight:isEndHere?'0':'-7px',
                              paddingLeft:isStartHere?'8px':'4px', paddingRight:'4px',
                              boxShadow: isStartHere ? '0 1px 3px rgba(0,0,0,0.15)' : 'none' }}>
                            {isStartHere && <span style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.95)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1, userSelect:'none' }}>{t.nome}</span>}
                          </div>
                        )
                      })}
                      {/* Separador + eventos Google Calendar */}
                      {numSlotsGoogle > 0 && (
                        <>
                          <div style={{ height:'4px', flexShrink:0, borderTop:'1px dashed #e2e8f0', margin:'2px -6px 0' }} />
                          {Array.from({ length: numSlotsGoogle }, (_, lane) => {
                            const ev = slotsGoogle[lane]
                            if (!ev) return <div key={lane} style={{ height: '22px', flexShrink: 0 }} />
                            const isStartHere = ev.isStart || di === 0
                            const isEndHere   = ev.isEnd   || di === 6
                            return (
                              <div key={lane}
                                title={ev.nome}
                                style={{ height:'22px', flexShrink:0, backgroundColor:'#4285F4', opacity:0.82, display:'flex', alignItems:'center', overflow:'hidden',
                                  borderRadius:[isStartHere?'4px':'0', isEndHere?'4px':'0', isEndHere?'4px':'0', isStartHere?'4px':'0'].join(' '),
                                  marginLeft:isStartHere?'0':'-7px', marginRight:isEndHere?'0':'-7px',
                                  paddingLeft:isStartHere?'7px':'4px', paddingRight:'4px' }}>
                                {isStartHere && <span style={{ fontSize:'9px', fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1, userSelect:'none' }}>{ev.nome}</span>}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </>)}

      {/* Legenda de status — só no calendário */}
      {aba === 'calendario' && !loading && (
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(STATUS_COR).map(([k, cor]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: cor }} />
              <span className="text-[10px] text-slate-500 font-medium">{STATUS_LABEL[k]}</span>
            </div>
          ))}
          {googleConnected && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#4285F4' }} />
              <span className="text-[10px] text-slate-500 font-medium">Google Calendar</span>
            </div>
          )}
        </div>
      )}

      {/* Modal Concluir Tarefa */}
      {modalConcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[380px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-teal-50 flex items-center gap-3">
              <div className="p-2 bg-teal-100 text-teal-600 rounded-full shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Concluir Tarefa</h3>
                <p className="text-xs text-slate-500 truncate">{modalConcluir.tarefa.nome}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data de Término</label>
                <input
                  type="date"
                  autoFocus
                  value={modalConcluir.dataFim}
                  onChange={e => setModalConcluir(prev => ({ ...prev, dataFim: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleConcluirTarefa()}
                  className="w-full mt-1 text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
              </div>
              <p className="text-xs text-slate-400">Status será alterado para <strong className="text-teal-700">Concluído</strong> e progresso definido em <strong>100%</strong>.</p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalConcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
              <button onClick={handleConcluirTarefa} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Tarefa */}
      {modalEditarTarefa && (
        <TarefaFormModal
          projetoId={modalEditarTarefa.projeto_id}
          tarefa={modalEditarTarefa}
          initialValues={null}
          tarefas={tarefas.filter(x => x.projeto_id === modalEditarTarefa.projeto_id)}
          dependenciasAtuais={[]}
          responsaveis={optsResp}
          sistemas={optsSist}
          fases={optsFase}
          empresas={optsEmp}
          areas={optsArea}
          onClose={() => setModalEditarTarefa(null)}
          onSaved={() => { setModalEditarTarefa(null); recarregarDados() }}
          onNavigate={(t) => setModalEditarTarefa(t)}
        />
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[200] pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 14, window.innerWidth - 240),
            top: tooltip.y + 18,
          }}
        >
          <div className="bg-slate-900 text-white rounded-lg shadow-2xl p-3 w-56">
            <p className="font-bold text-white text-[11px] leading-snug mb-2.5 border-b border-slate-700 pb-2">
              {tooltip.tarefa.nome}
            </p>
            <div className="space-y-1.5 text-[11px]">
              {tooltip.tarefa.responsavel_nome && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-20 shrink-0">Responsável</span>
                  <span className="text-slate-200">{tooltip.tarefa.responsavel_nome}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-slate-400 w-20 shrink-0">Status</span>
                <span className="font-semibold" style={{ color: STATUS_COR[tooltip.tarefa.status_kanban] || '#fff' }}>
                  {STATUS_LABEL[tooltip.tarefa.status_kanban] || tooltip.tarefa.status_kanban}
                </span>
              </div>
              {tooltip.tarefa.fase_nome && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-20 shrink-0">Fase</span>
                  <span className="text-slate-200">{tooltip.tarefa.fase_nome}</span>
                </div>
              )}
              {(tooltip.tarefa.data_inicio || tooltip.tarefa.data_fim) && (
                <div className="flex gap-2 pt-1.5 mt-1 border-t border-slate-700">
                  <span className="text-slate-400 w-20 shrink-0">Período</span>
                  <span className="text-slate-200">
                    {fmtData(tooltip.tarefa.data_inicio)} → <span className={
                      tooltip.tarefa.status_kanban !== 'concluido' && tooltip.tarefa.data_fim && tooltip.tarefa.data_fim < hojeISO ? 'text-red-400 font-bold' :
                      tooltip.tarefa.status_kanban !== 'concluido' && tooltip.tarefa.data_fim === hojeISO                           ? 'text-blue-300 font-bold' : ''
                    }>{fmtData(tooltip.tarefa.data_fim)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
