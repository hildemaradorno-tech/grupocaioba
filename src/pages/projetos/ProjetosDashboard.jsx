import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Edit2, Trash2, FolderKanban, Filter, RotateCcw,
  Activity, CheckCircle, AlertTriangle, Layers, ShieldAlert,
  ChevronRight, ChevronDown, Loader2, X, CheckCircle2, CalendarCheck, Copy, BarChart2, Download, Eye,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais, _projetosSession } from '../../context/ProjetosFiltrosContext'
import ProjetosNav from './ProjetosNav'
import ProjetosFiltrosPanel, { FiltrosCompactBar } from './ProjetosFiltrosPanel'

const STATUS_MAP = {
  mapeado:      { label: 'Mapeado',      cor: 'bg-slate-100 text-slate-600', corAtivo: 'bg-slate-500 text-white' },
  programado:   { label: 'Programado',   cor: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', cor: 'bg-amber-100 text-amber-700' },
  pausado:      { label: 'Pausado',      cor: 'bg-purple-100 text-purple-700' },
  concluido:    { label: 'Concluído',    cor: 'bg-teal-700 text-white' },
}

const STATUS_ORDER = ['em_andamento', 'programado', 'mapeado', 'pausado', 'concluido', 'cancelado']
const STATUS_COR_HEADER = {
  em_andamento: '#f59e0b',
  programado:   '#3b82f6',
  mapeado:      '#94a3b8',
  pausado:      '#a855f7',
  concluido:    '#0d9488',
  cancelado:    '#ef4444',
}

const KANBAN_MAP = {
  mapeado:      { label: 'Mapeado',       cor: 'bg-slate-100 text-slate-500' },
  programado:   { label: 'Programado',    cor: 'bg-blue-100 text-blue-600' },
  em_andamento: { label: 'Em Andamento',  cor: 'bg-amber-100 text-amber-600' },
  pausado:      { label: 'Pausado',       cor: 'bg-purple-100 text-purple-600' },
  concluido:    { label: 'Concluído',     cor: 'bg-teal-100 text-teal-700' },
}

const FILTROS_VAZIOS = { nome: '', empresa_id: '', responsavel_id: '', sistema_id: '', fase_id: '', departamento_nome: '', area_nome: '' }

const STATUS_CARD_CONFIG = {
  mapeado:      { label: 'Mapeado',      icon: Layers,        st: { bg:'bg-slate-50',  border:'border-slate-200', ring:'ring-slate-300',  icoBg:'bg-slate-100',  icoTxt:'text-slate-500',  numTxt:'text-slate-700', labelTxt:'text-slate-500'  } },
  programado:   { label: 'Programado',   icon: CheckCircle,   st: { bg:'bg-blue-50',   border:'border-blue-200',  ring:'ring-blue-300',   icoBg:'bg-blue-100',   icoTxt:'text-blue-500',   numTxt:'text-blue-700',  labelTxt:'text-blue-500'   } },
  em_andamento: { label: 'Em Andamento', icon: Activity,      st: { bg:'bg-amber-50',  border:'border-amber-200', ring:'ring-amber-300',  icoBg:'bg-amber-100',  icoTxt:'text-amber-500',  numTxt:'text-amber-700', labelTxt:'text-amber-500'  } },
  pausado:      { label: 'Pausado',      icon: AlertTriangle, st: { bg:'bg-purple-50', border:'border-purple-200',ring:'ring-purple-300', icoBg:'bg-purple-100', icoTxt:'text-purple-500', numTxt:'text-purple-700',labelTxt:'text-purple-500' } },
  concluido:    { label: 'Concluído',    icon: CheckCircle2,  st: { bg:'bg-green-50',  border:'border-green-200', ring:'ring-green-300',  icoBg:'bg-green-100',  icoTxt:'text-green-500',  numTxt:'text-green-700', labelTxt:'text-green-500'  } },
}

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
  // 'fim' (padrão)
  if (!t.data_fim) return false
  if (ini && t.data_fim < ini) return false
  if (fim && t.data_fim > fim) return false
  return true
}

// Cache de módulo: sobrevive a navegações de rota, perdido apenas em F5
const _dash = {
  dados:                  null,
  empresas:               [],
  responsaveis:           [],
  sistemas:               [],
  fases:                  [],
  areas:                  [],
  departamentos:          [],
  filtros:                null,
  filtrosAbertos:         false,
  filtroRespProjeto:      '',
  filtroRespTarefa:       '',
  filtroDataTermIni:      '',
  filtroDataTermFim:      '',
  sortConfig:             [{ campo: 'titulo', dir: 'asc' }, { campo: 'sistemas', dir: 'asc' }],
  expandidos:             new Set(),
  tarefasPorProjeto:      {},
  deliberacoesExpandidas: new Set(),
  deliberacoesPorTarefa:  {},
  statusesRecolhidos:     new Set(STATUS_ORDER),
  deptosExpandidos:       new Set(),
}

// Chamado pelo SidebarLayout no logout — garante que ao logar novamente
// a tela começa recolhida (sem vazamento de estado entre sessões).
export function resetDashProjetos() {
  _dash.expandidos             = new Set()
  _dash.statusesRecolhidos     = new Set(STATUS_ORDER)
  _dash.deptosExpandidos       = new Set()
  _dash.deliberacoesExpandidas = new Set()
  _dash.deliberacoesPorTarefa  = {}
  _dash.tarefasPorProjeto      = {}
}

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

function getTextColor(hex) {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

function CardKpi({ icon: Icon, label, count, ativo, onClick, st }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition-all hover:shadow-md ${st.bg} ${st.border} ${ativo ? 'ring-2 ring-offset-1 ' + st.ring + ' shadow-md' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-1 mb-1">
        <div className={`p-0.5 rounded ${st.icoBg}`}>
          <Icon className={`h-2.5 w-2.5 ${st.icoTxt}`} />
        </div>
        <p className={`text-[8px] font-bold uppercase tracking-wide leading-tight ${st.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${st.numTxt} leading-none`}>{count}</p>
    </button>
  )
}

export default function ProjetosDashboard() {
  const navigate = useNavigate()
  const { isAdmin, empresasPermitidas, departamentosPermitidosEfetivos, hasActionOrDefault, hasPermission, user } = useAuth()
  const ctx = useProjetosFiltros()
  const { modoVerTodos, setModoVerTodos } = ctx
  const canCriar      = !modoVerTodos && hasActionOrDefault('projetos', 'criar')
  const canEditar     = !modoVerTodos && hasActionOrDefault('projetos', 'editar')
  const canExcluir    = !modoVerTodos && hasActionOrDefault('projetos', 'excluir')
  const canDuplicar   = !modoVerTodos && hasActionOrDefault('projetos', 'duplicar')
  const canEditarTar   = !modoVerTodos && hasActionOrDefault('projetos', 'editar_tarefa')
  const canExcluirTar  = !modoVerTodos && hasActionOrDefault('projetos', 'excluir_tarefa')
  const canConcluirTar = !modoVerTodos && hasActionOrDefault('projetos', 'concluir_tarefa')
  const hoje2 = new Date().toISOString().split('T')[0]

  const [dados, setDados] = useState(() => _dash.dados ?? [])
  const [empresas, setEmpresas] = useState(() => _dash.empresas)
  const [responsaveis, setResponsaveis] = useState(() => _dash.responsaveis)
  const [sistemas, setSistemas] = useState(() => _dash.sistemas)
  const [fases, setFases] = useState(() => _dash.fases)
  const [areas, setAreas] = useState(() => _dash.areas)
  const [departamentos, setDepartamentos] = useState(() => _dash.departamentos)
  const [loading, setLoading] = useState(() => _dash.dados === null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(() => _dash.filtros ?? FILTROS_VAZIOS)
  const [filtrosAbertos, setFiltrosAbertos] = useState(() => _dash.filtrosAbertos)
  const [filtroCards, setFiltroCards] = useState(() => new Set(['mapeado', 'programado', 'em_andamento', 'pausado']))
  const [filtroCardProjetos, setFiltroCardProjetos] = useState(() => new Set(['mapeado', 'programado', 'em_andamento', 'pausado']))
  const [sortConfig, setSortConfig] = useState(() => {
    const s = _dash.sortConfig
    if (!s) return [{ campo: 'titulo', dir: 'asc' }, { campo: 'sistemas', dir: 'asc' }]
    return Array.isArray(s) ? s : [s]
  })
  const [modalExcluir, setModalExcluir] = useState(false)
  const [idExcluir, setIdExcluir] = useState(null)
  const [nomeExcluir, setNomeExcluir] = useState('')
  const [expandidos, setExpandidos] = useState(() => new Set(_dash.expandidos))
  const [tarefasPorProjeto, setTarefasPorProjeto] = useState(() => ({ ..._dash.tarefasPorProjeto }))
  const [carregandoTarefas, setCarregandoTarefas] = useState(new Set())
  const [modalEditTarefa, setModalEditTarefa] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [modalDelibs, setModalDelibs] = useState([])
  const [modalNovaDelib, setModalNovaDelib] = useState({ data: hoje2, texto: '' })
  const [modalAdicionandoDelib, setModalAdicionandoDelib] = useState(false)
  const [modalExcluirTarefa, setModalExcluirTarefa] = useState(null)
  const [filtroAtrasadas, setFiltroAtrasadas] = useState(false)
  const [filtroHoje, setFiltroHoje] = useState(false)
  const [filtroRespProjeto, setFiltroRespProjeto] = useState(() => _dash.filtroRespProjeto ?? '')
  const filtroRespTarefa = ctx.filtroRespTarefa
  const filtroFase      = ctx.filtroFase
  const filtroSistema   = ctx.filtroSistema
  const filtroDataTermIni     = ctx.filtroDataIni
  const setFiltroDataTermIni  = ctx.setFiltroDataIni
  const filtroDataTermFim     = ctx.filtroDataFim
  const setFiltroDataTermFim  = ctx.setFiltroDataFim
  const filtroDataProjTermIni = ctx.filtroDataProjIni
  const filtroDataProjTermFim = ctx.filtroDataProjFim
  const [deliberacoesExpandidas, setDeliberacoesExpandidas] = useState(() => new Set(_dash.deliberacoesExpandidas))
  const [deliberacoesPorTarefa, setDeliberacoesPorTarefa] = useState(() => ({ ..._dash.deliberacoesPorTarefa }))
  const [novaDelib, setNovaDelib] = useState({})
  const [editandoDelib, setEditandoDelib] = useState(null)
  const [modalConcluir, setModalConcluir] = useState(null) // { tarefa, dataFim }
  const [deptosExpandidos, setDeptosExpandidos] = useState(() => new Set(_dash.deptosExpandidos))
  const [statusesRecolhidos, setStatusesRecolhidos] = useState(() => new Set(_dash.statusesRecolhidos))
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const tableRef = useRef(null)

  // Projetos após filtros globais (contexto compartilhado entre abas)
  // modoVerTodos ignora restrição de departamento e bloqueia edições
  const dadosGlobal = useMemo(() => aplicarFiltrosGlobais(dados, ctx, modoVerTodos ? null : departamentosPermitidosEfetivos), [
    dados, ctx.filtroEmpresa, ctx.filtroDepartamento, ctx.filtroArea,
    ctx.filtroFase, ctx.filtroSistema, ctx.filtroRespProjeto, ctx.filtroRespTarefa,
    departamentosPermitidosEfetivos, modoVerTodos,
  ])

  const loadData = useCallback(async (f = filtros, silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
      const projetos = await apiService.getProjetos({ ...f, ...filtrosEmpresa })
      setDados(projetos)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }, [filtros, isAdmin, empresasPermitidas])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(FILTROS_VAZIOS, _dash.dados !== null) }, [isAdmin, empresasPermitidas])
  useEffect(() => {
    if (_projetosSession.primeiroAcesso) {
      ctx.setFiltrosAbertos(false)
      _projetosSession.primeiroAcesso = false
    }
  }, []) // fecha apenas no primeiro acesso da sessão (reseta em F5)

  useEffect(() => { _dash.dados = dados }, [dados])
  useEffect(() => { _dash.filtros = filtros }, [filtros])
  useEffect(() => { _dash.filtrosAbertos = filtrosAbertos }, [filtrosAbertos])
  useEffect(() => { _dash.sortConfig = sortConfig }, [sortConfig])
  useEffect(() => { _dash.expandidos = new Set(expandidos) }, [expandidos])
  useEffect(() => { _dash.tarefasPorProjeto = { ...tarefasPorProjeto } }, [tarefasPorProjeto])
  useEffect(() => { _dash.deliberacoesExpandidas = new Set(deliberacoesExpandidas) }, [deliberacoesExpandidas])
  useEffect(() => { _dash.deliberacoesPorTarefa = { ...deliberacoesPorTarefa } }, [deliberacoesPorTarefa])
  useEffect(() => { _dash.statusesRecolhidos = new Set(statusesRecolhidos) }, [statusesRecolhidos])
  useEffect(() => { _dash.deptosExpandidos = new Set(deptosExpandidos) }, [deptosExpandidos])

  // Mapa taskId → contagem de deliberações (derivado do getProjetos, sempre fresco)
  const tarefaDelibsMap = useMemo(() => {
    const m = {}
    dados.forEach(p => (p.proj_tarefas || []).forEach(t => {
      if (t.id && t.proj_deliberacoes?.length) m[t.id] = t.proj_deliberacoes.length
    }))
    return m
  }, [dados])
  useEffect(() => { _dash.filtroRespProjeto = filtroRespProjeto }, [filtroRespProjeto])

  useEffect(() => {
    Promise.all([
      apiService.getEmpresas(),
      apiService.getProjResponsaveis(),
      apiService.getProjSistemas(),
      apiService.getProjFases(),
      apiService.getProjAreas(),
      apiService.getProjDepartamentos(),
    ])
      .then(([emp, resp, sist, fas, ars, deps]) => {
        const e  = emp
        const r  = resp.filter(x => x.ativo !== false)
        const s  = sist.filter(x => x.ativo !== false)
        const f  = fas.filter(x => x.ativo !== false)
        const ar = ars.filter(x => x.ativo !== false)
        const d  = deps.filter(x => x.ativo !== false)
        setEmpresas(e); setResponsaveis(r); setSistemas(s)
        setFases(f); setAreas(ar); setDepartamentos(d)
        _dash.empresas = e; _dash.responsaveis = r; _dash.sistemas = s
        _dash.fases = f; _dash.areas = ar; _dash.departamentos = d
      })
      .catch(() => {})
  }, [])

  const hoje = new Date()
  const hojeISO = hoje.toISOString().slice(0, 10)
  const getDataFimMax = (p) => {
    const datas = (p.proj_tarefas || []).map(t => t.data_fim).filter(Boolean).sort()
    return datas.length ? datas[datas.length - 1] : null
  }
  const isAtrasado = (p) => {
    const dataFim = getDataFimMax(p)
    return p.status !== 'concluido' && dataFim && dataFim < hojeISO
  }


  const getSortVal = (p, campo) => {
    switch (campo) {
      case 'titulo':      return (p.nome || '').toLowerCase()
      case 'depto':       return (p.departamento_nome || '').toLowerCase()
      case 'area':        return (p.area_nome || '').toLowerCase()
      case 'status':      return p.status || ''
      case 'conclusao': {
        const ts = p.proj_tarefas || []
        if (!ts.length) return -1
        return ts.reduce((s, t) => s + (Number(t.progresso_pct) || 0), 0) / ts.length
      }
      case 'data_inicio': {
        const datas = (p.proj_tarefas || []).map(t => t.data_inicio).filter(Boolean).sort()
        return datas[0] || ''
      }
      case 'data_fim': {
        const datas = (p.proj_tarefas || []).map(t => t.data_fim).filter(Boolean).sort().reverse()
        return datas[0] || ''
      }
      case 'fase':        return (p.fase_nome || '').toLowerCase()
      case 'sistema':     return (p.sistema_nome || '').toLowerCase()
      case 'sistemas':    return (p.sistemas_nomes || []).join(',').toLowerCase()
      case 'unidade':     return (p.empresa_nome || '').toLowerCase()
      case 'responsavel':
      case 'resp_projeto': return (p.responsavel_nome || '').toLowerCase()
      default:            return ''
    }
  }

  const dadosFiltrados = (() => {
    let base = filtroCardProjetos.size > 0
      ? dadosGlobal.filter(p => filtroCardProjetos.has(p.status))
      : dadosGlobal
    if (filtroCards.size > 0)
      base = base.filter(p => (p.proj_tarefas || []).some(t => filtroCards.has(t.status_kanban)))
    if (filtroAtrasadas)
      base = base.filter(p => isAtrasado(p) || (p.proj_tarefas || []).some(t => t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO))
    if (filtroHoje)
      base = base.filter(p => (p.proj_tarefas || []).some(t => t.status_kanban !== 'concluido' && t.data_fim === hojeISO))
    if (filtroDataProjTermIni || filtroDataProjTermFim)
      base = base.filter(p => {
        const dataFimProj = getDataFimMax(p)
        if (!dataFimProj) return !filtroDataProjTermFim
        if (filtroDataProjTermIni && dataFimProj < filtroDataProjTermIni) return false
        if (filtroDataProjTermFim && dataFimProj > filtroDataProjTermFim) return false
        return true
      })
    if (filtroDataTermIni || filtroDataTermFim)
      base = base.filter(p => {
        const tarefas = p.proj_tarefas || []
        if (!filtroDataTermFim && p.status === 'mapeado' && !tarefas.some(t => t.data_fim || t.data_inicio))
          return true
        return tarefas.some(t => tarefaPassaFiltroData(t, filtroDataTermIni, filtroDataTermFim, 'fim'))
      })
    if (!sortConfig.length) return base
    const normStr = v => typeof v === 'string' ? v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : v
    return [...base].sort((a, b) => {
      for (const { campo, dir } of sortConfig) {
        const va = normStr(getSortVal(a, campo))
        const vb = normStr(getSortVal(b, campo))
        let cmp
        if (typeof va === 'string' && typeof vb === 'string') {
          cmp = va.localeCompare(vb, 'pt-BR')
        } else {
          cmp = va < vb ? -1 : va > vb ? 1 : 0
        }
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  })()

  const dadosPorDepto = (() => {
    const deptos = [...new Set(dadosFiltrados.map(p => p.departamento_nome || 'Sem Departamento'))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return deptos.map(depto => {
      const projetos = dadosFiltrados
        .filter(p => (p.departamento_nome || 'Sem Departamento') === depto)
        .sort((a, b) => {
          const oa = STATUS_ORDER.indexOf(a.status); const ob = STATUS_ORDER.indexOf(b.status)
          return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob)
        })
      return {
        depto,
        projetos,
        totalTarefas: projetos.reduce((s, p) => s + (p.proj_tarefas || []).length, 0),
        resps: [...new Set(projetos.map(p => p.responsavel_nome).filter(Boolean))],
      }
    })
  })()
  const dadosPorDeptoFlat = dadosPorDepto.flatMap(({ projetos }) => projetos)
  const deptInfoMap = Object.fromEntries(dadosPorDepto.map(({ depto, projetos, totalTarefas, resps }) => [depto, { count: projetos.length, totalTarefas, resps }]))
  const statusInfoMap = (() => {
    const m = {}
    dadosPorDepto.forEach(({ depto, projetos }) => {
      STATUS_ORDER.forEach(st => {
        const count = projetos.filter(p => p.status === st).length
        if (count > 0) m[`${depto}__${st}`] = count
      })
    })
    return m
  })()

  const anyExpanded = expandidos.size > 0
  const qtdAtrasadas = dadosGlobal.reduce((total, p) =>
    total + (p.proj_tarefas || []).filter(t =>
      t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
    ).length,
  0)
  const qtdHoje = dadosGlobal.reduce((total, p) =>
    total + (p.proj_tarefas || []).filter(t =>
      t.status_kanban !== 'concluido' && t.data_fim === hojeISO
    ).length,
  0)
  const sistemaCorMap     = Object.fromEntries(sistemas.map(s => [s.nome, s.cor || '#1e293b']))
  const sistemaCorTextoMap = Object.fromEntries(sistemas.map(s => [s.nome, s.cor_texto || null]))
  const faseCorMap = Object.fromEntries(fases.map(f => [f.nome, f.cor || '#1e293b']))

  const handleRecolherTodos = () => { setExpandidos(new Set()); setDeptosExpandidos(new Set()); setStatusesRecolhidos(new Set(STATUS_ORDER)) }

  const handleSalvarPDF = async () => {
    if (gerandoPDF) return
    setGerandoPDF(true)
    try {
      // Carrega tarefas que faltam no cache (sem alterar estado visual)
      const tarefasCache = { ...tarefasPorProjeto }
      const idsParaCarregar = dadosFiltrados.map(p => p.id).filter(id => !tarefasCache[id] || !tarefasCache[id].some(t => t.proj_deliberacoes !== undefined))
      await Promise.all(idsParaCarregar.map(async id => {
        try {
          const tarefas = await apiService.getTarefas(id)
          tarefasCache[id] = tarefas
          setTarefasPorProjeto(prev => ({ ...prev, [id]: tarefas }))
        } catch { }
      }))

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // Mapeamento de cores inline (sem Tailwind) para o PDF
      const KANBAN_CSS = {
        mapeado:      { bg: '#f1f5f9', color: '#64748b' },
        programado:   { bg: '#dbeafe', color: '#2563eb' },
        em_andamento: { bg: '#fef3c7', color: '#d97706' },
        pausado:      { bg: '#f3e8ff', color: '#9333ea' },
        concluido:    { bg: '#ccfbf1', color: '#0f766e' },
      }

      // WRAP_W=960 · pdfW=297 A4 landscape → 1px=0,207mm → 10px≈5,9pt
      // Estrutura: wrap sem padding lateral → dept/status são full-width naturalmente
      //            projetos/tarefas têm margin lateral de 24px cada lado
      const WRAP_W    = 960
      const M_SIDE    = 24   // margem lateral em px para conteúdo de projeto/tarefa
      // Cols: Nº | Tarefa | Sistema | Depto/Área | Resp. | Status | % | Início | Término
      // largura disponível ≈ 896px (912px - padding 10px+6px do taskRow)
      const TASK_COLS = '26px 1fr 78px 86px 88px 96px 44px 52px 52px'

      const wrap = document.createElement('div')
      wrap.style.cssText = `position:fixed;left:-9999px;top:0;width:${WRAP_W}px;background:#fff;font-family:"Segoe UI",system-ui,Arial,sans-serif;color:#1e293b;`

      // Rastreia elementos para quebra de página inteligente
      const statusGroupEls = []
      const projHeaderEls  = []

      const filtroDepto = ctx.filtroDepartamento || filtros.departamento_nome || ''
      const filtroLabel = filtroDepto ? ` — ${filtroDepto}` : ''
      const totalTarefasGlobal = dadosPorDepto.reduce((s, d) => s + d.totalTarefas, 0)

      // ── Cabeçalho do documento (com padding lateral = margem da página) ──
      const docHeader = document.createElement('div')
      docHeader.style.cssText = `padding:16px ${M_SIDE}px 12px;border-bottom:2px solid #1e293b;display:flex;justify-content:space-between;align-items:center;`
      docHeader.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:#3b82f6;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:white;font-weight:800;font-size:13px">GP</span>
          </div>
          <div>
            <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px">Gestão de Projetos</div>
            <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;margin-top:1px">Relatório de Projetos${filtroLabel}</div>
            <div style="font-size:9px;color:#64748b;margin-top:2px">${dadosFiltrados.length} projeto${dadosFiltrados.length !== 1 ? 's' : ''} · ${totalTarefasGlobal} tarefa${totalTarefasGlobal !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Data</div>
          <div style="font-size:11px;color:#334155;font-weight:700;margin-top:2px">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        </div>
      `
      wrap.appendChild(docHeader)

      for (const { depto, projetos, totalTarefas } of dadosPorDepto) {
        // ── Dept header: full-width (sem margem lateral, padding interno) ──
        const deptHeader = document.createElement('div')
        deptHeader.style.cssText = `background:#334155;color:white;padding:8px ${M_SIDE}px;display:flex;justify-content:space-between;align-items:center;margin-top:10px;`
        deptHeader.innerHTML = `
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px">${depto}</span>
          <span style="font-size:9px;opacity:0.65;font-weight:400">${projetos.length} projeto${projetos.length !== 1 ? 's' : ''} · ${totalTarefas} tarefa${totalTarefas !== 1 ? 's' : ''}</span>
        `
        wrap.appendChild(deptHeader)

        for (const status of STATUS_ORDER) {
          const projetosStatus = projetos.filter(p => p.status === status)
          if (projetosStatus.length === 0) continue

          // ── Status header: full-width ──────────────────────────
          const stHdr = document.createElement('div')
          stHdr.style.cssText = `background:${STATUS_COR_HEADER[status] || '#94a3b8'};color:white;padding:6px ${M_SIDE}px;display:flex;align-items:center;gap:8px;margin-top:2px;`
          stHdr.innerHTML = `
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">${STATUS_MAP[status]?.label || status}</span>
            <span style="font-size:9px;opacity:0.8">· ${projetosStatus.length} projeto${projetosStatus.length !== 1 ? 's' : ''}</span>
          `
          wrap.appendChild(stHdr)
          statusGroupEls.push(stHdr)

          for (const p of projetosStatus) {
            const tarefas       = tarefasCache[p.id] || []
            const tsDatas       = p.proj_tarefas || []
            const dataFimMax    = tsDatas.map(t => t.data_fim).filter(Boolean).sort().reverse()[0] || null
            const dataInicioMin = [...tsDatas.map(t => t.data_inicio).filter(Boolean)].sort()[0] || null
            const total  = tsDatas.length
            const pct    = total > 0 ? Math.round(tsDatas.reduce((s, t) => s + (t.status_kanban === 'concluido' ? 100 : (Number(t.progresso_pct) || 0)), 0) / total) : 0
            const atrasado  = p.status !== 'concluido' && dataFimMax && dataFimMax < hojeISO
            const borderClr = atrasado ? '#ef4444' : (STATUS_COR_HEADER[p.status] || '#94a3b8')
            const pctClr    = atrasado ? '#ef4444' : '#3b82f6'

            const sistemasProj = p.sistemas_nomes && p.sistemas_nomes.length > 0
              ? p.sistemas_nomes.map(nome => {
                  const cor = sistemaCorMap[nome] || '#1e293b'
                  const txt = sistemaCorTextoMap[nome] || getTextColor(cor)
                  return `<span style="display:inline-block;background:${cor};color:${txt};padding:2px 7px;border-radius:3px;font-size:9px;font-weight:700;white-space:nowrap;vertical-align:middle">${nome}</span>`
                }).join('')
              : ''

            // ── Projeto: margem lateral, sem badge de status (já agrupado) ──
            const projHeader = document.createElement('div')
            projHeader.style.cssText = `margin:5px ${M_SIDE}px 0;padding:8px 8px 7px 10px;border-left:4px solid ${borderClr};background:${atrasado ? '#fff5f5' : '#f8fafc'};border-bottom:1px solid #e2e8f0;`
            projHeader.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                <div style="min-width:0;flex:1">
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:2px">
                    <span style="font-size:11px;font-weight:700;color:#0f172a;text-transform:uppercase;line-height:1.35">${p.nome}</span>
                    ${sistemasProj}
                  </div>
                  ${p.responsavel_nome ? `<div style="font-size:9px;color:#64748b">Resp. Projeto: <strong style="color:#475569">${p.responsavel_nome}</strong></div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;min-width:155px">
                  <div style="font-size:9px;color:#64748b;white-space:nowrap">
                    ${dataInicioMin ? fmtData(dataInicioMin) : '—'} → ${dataFimMax ? `<span style="color:${atrasado ? '#ef4444' : '#64748b'};font-weight:${atrasado ? '700' : '400'}">${fmtData(dataFimMax)}</span>` : '—'}
                  </div>
                  <div style="display:flex;align-items:center;gap:5px">
                    <div style="width:60px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden">
                      <div style="height:100%;width:${pct}%;background:${pctClr};border-radius:2px"></div>
                    </div>
                    <span style="font-size:9px;font-weight:700;color:${atrasado ? '#ef4444' : '#334155'}">${pct}% concluído</span>
                  </div>
                </div>
              </div>
            `
            wrap.appendChild(projHeader)
            projHeaderEls.push(projHeader)

            if (tarefas.length > 0) {
              // ── Tabela de tarefas: margem lateral ─────────────────
              const taskBlock = document.createElement('div')
              taskBlock.style.cssText = `margin:0 ${M_SIDE}px;border-bottom:2px solid #e2e8f0;margin-bottom:1px;`

              const taskHdr = document.createElement('div')
              taskHdr.style.cssText = `display:grid;grid-template-columns:${TASK_COLS};background:#e9ecef;padding:5px 6px 5px 10px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;border-bottom:1px solid #dee2e6;`
              taskHdr.innerHTML = `
                <span style="text-align:center">Nº</span>
                <span>Tarefa</span>
                <span>Sistema</span>
                <span>Depto / Área</span>
                <span>Resp. Tarefa</span>
                <span style="text-align:center">Status</span>
                <span style="text-align:center">%</span>
                <span style="text-align:center">Início</span>
                <span style="text-align:center">Término</span>
              `
              taskBlock.appendChild(taskHdr)

              const tarefasOrdenadas = [...tarefas].sort((a, b) => {
                if (a.etapa == null && b.etapa == null) return 0
                if (a.etapa == null) return 1
                if (b.etapa == null) return -1
                return Number(a.etapa) - Number(b.etapa)
              })
              for (let i = 0; i < tarefasOrdenadas.length; i++) {
                const t         = tarefasOrdenadas[i]
                const kt        = KANBAN_MAP[t.status_kanban] || { label: t.status_kanban }
                const pctT      = t.status_kanban === 'concluido' ? 100 : Math.min(100, Number(t.progresso_pct) || 0)
                const atrasadaT = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
                const stBadgeClr = STATUS_COR_HEADER[t.status_kanban] || '#94a3b8'
                const sistCor   = t.sistema_nome ? (sistemaCorMap[t.sistema_nome] || '#1e293b') : null
                const sistTxt   = t.sistema_nome ? (sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistCor)) : null
                const deptoArea = [p.departamento_nome, t.area_nome].filter(Boolean).join(' / ') || ''

                // Célula Sistema separada (badge colorido)
                const sistemaCell = t.sistema_nome
                  ? `<div><span style="display:inline-block;background:${sistCor};color:${sistTxt};padding:2px 5px;border-radius:3px;font-size:8px;font-weight:700;white-space:nowrap;vertical-align:middle">${t.sistema_nome}</span></div>`
                  : `<div style="color:#cbd5e1;font-size:9px">—</div>`

                // Célula Depto/Área separada
                const deptoCell = deptoArea
                  ? `<div style="font-size:8px;color:#64748b;line-height:1.35;word-break:break-word">${deptoArea}</div>`
                  : `<div style="color:#cbd5e1;font-size:9px">—</div>`

                // % sem barra, sem quebra de linha
                const pctText = `<span style="font-size:8px;font-weight:700;color:${pctT >= 100 ? '#0f766e' : '#64748b'};white-space:nowrap">${pctT}%</span>`

                const taskRow = document.createElement('div')
                taskRow.style.cssText = `display:grid;grid-template-columns:${TASK_COLS};padding:6px 6px 6px 10px;border-bottom:1px solid #f0f4f8;background:${atrasadaT ? '#fff5f5' : (i % 2 === 0 ? '#ffffff' : '#f8fafc')};align-items:start;font-size:10px;`
                taskRow.innerHTML = `
                  <div style="text-align:center;padding-top:1px">
                    ${t.etapa != null
                      ? `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;font-size:9px;font-weight:700;background:${t.status_kanban === 'em_andamento' ? '#f97316' : '#e0e7ff'};color:${t.status_kanban === 'em_andamento' ? '#fff' : '#3730a3'};text-align:center;line-height:18px">${t.etapa}</span>`
                      : '<span style="color:#cbd5e1">—</span>'}
                  </div>
                  <div style="color:#1e293b;font-weight:500;padding-right:6px;min-width:0;word-break:break-word;overflow-wrap:break-word;line-height:1.45">${t.nome}</div>
                  ${sistemaCell}
                  ${deptoCell}
                  <div style="color:#475569;line-height:1.4;font-size:10px;word-break:break-word">${t.responsavel_nome || '<span style="color:#cbd5e1">—</span>'}</div>
                  <div style="text-align:center;padding-top:1px">
                    <span style="display:inline-block;background:${stBadgeClr};color:white;padding:2px 6px;border-radius:3px;font-size:8px;font-weight:700;white-space:nowrap;vertical-align:middle">${kt.label || t.status_kanban}</span>
                  </div>
                  <div style="text-align:center;padding-top:3px">${pctText}</div>
                  <div style="text-align:center;color:#64748b;font-size:9px;padding-top:2px">${t.data_inicio ? fmtData(t.data_inicio) : '<span style="color:#cbd5e1">—</span>'}</div>
                  <div style="text-align:center;font-size:9px;padding-top:2px;color:${atrasadaT ? '#ef4444' : '#64748b'};font-weight:${atrasadaT ? '700' : '400'}">${t.data_fim ? fmtData(t.data_fim) : '<span style="color:#cbd5e1">—</span>'}</div>
                `
                taskBlock.appendChild(taskRow)
              }
              wrap.appendChild(taskBlock)
            }
          }
        }
      }
      // Após montar o DOM, mede posições Y de cada elemento antes de renderizar
      document.body.appendChild(wrap)
      const wrapTop  = wrap.getBoundingClientRect().top
      const SCALE    = 1.5
      const statusYs = statusGroupEls.map(el =>
        Math.round((el.getBoundingClientRect().top - wrapTop) * SCALE)
      )
      const projYs = projHeaderEls.map(el =>
        Math.round((el.getBoundingClientRect().top - wrapTop) * SCALE)
      )

      let canvas
      try {
        canvas = await html2canvas(wrap, { scale: SCALE, useCORS: true, backgroundColor: '#ffffff', logging: false, width: WRAP_W })
      } finally {
        document.body.removeChild(wrap)
      }

      // Dimensões PDF A4 landscape com margens de 10 mm em todos os lados
      const PAGE_W_MM = 297
      const PAGE_H_MM = 210
      const MARGIN_MM = 10
      const CONTENT_W = PAGE_W_MM - 2 * MARGIN_MM     // 277 mm de largura útil
      const mmPerPx   = CONTENT_W / canvas.width       // mm por pixel do canvas
      const pageHpx   = Math.floor((PAGE_H_MM - 2 * MARGIN_MM) / mmPerPx)

      // ── Corte inteligente de páginas ────────────────────────────────
      // • Grupos de status sempre começam numa nova página (corte mandatório)
      // • Projetos não são cortados ao meio (corte preferencial nos últimos 35%)
      const slices = []
      let cur = 0
      while (cur < canvas.height) {
        const ideal = cur + pageHpx
        if (ideal >= canvas.height) { slices.push({ start: cur, end: canvas.height }); break }

        // Status group dentro desta página → corta antes dele (ignora primeiros 25%)
        const minSt  = cur + Math.floor(pageHpx * 0.25)
        const nextSt = statusYs.find(y => y >= minSt && y <= ideal)
        if (nextSt != null) { slices.push({ start: cur, end: nextSt }); cur = nextSt; continue }

        // Projeto que começa nos últimos 35% → corta antes dele
        const lookback  = cur + Math.floor(pageHpx * 0.65)
        const lastProj  = projYs.filter(y => y >= lookback && y <= ideal).pop()
        if (lastProj != null) { slices.push({ start: cur, end: lastProj }); cur = lastProj; continue }

        slices.push({ start: cur, end: ideal }); cur = ideal
      }

      const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const datStr = new Date().toLocaleString('pt-BR')
      for (let pg = 0; pg < slices.length; pg++) {
        if (pg > 0) pdf.addPage('a4', 'landscape')
        const { start, end } = slices[pg]
        const sliceH  = end - start
        const pgCanvas = document.createElement('canvas')
        pgCanvas.width  = canvas.width
        pgCanvas.height = sliceH
        pgCanvas.getContext('2d').drawImage(canvas, 0, start, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const imgHmm = Math.round(sliceH * mmPerPx)
        pdf.addImage(pgCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN_MM, MARGIN_MM, CONTENT_W, imgHmm)
        // Rodapé em todas as páginas (texto direto no PDF, fora da imagem)
        pdf.setFontSize(7)
        pdf.setTextColor(148, 163, 184)
        pdf.text(`Portal de Gestão — ${datStr}`, MARGIN_MM, PAGE_H_MM - 4)
        pdf.text(`${pg + 1} / ${slices.length}`, PAGE_W_MM / 2, PAGE_H_MM - 4, { align: 'center' })
        pdf.text('Confidencial', PAGE_W_MM - MARGIN_MM, PAGE_H_MM - 4, { align: 'right' })
      }

      const sufixo = filtroDepto ? ` - ${filtroDepto}` : ''
      pdf.save(`Gestão de Projetos${sufixo}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    } finally {
      setGerandoPDF(false)
    }
  }

  const handleExpandirTodos = async () => {
    const todosDeptos = [...new Set(dadosFiltrados.map(p => p.departamento_nome || 'Sem Departamento'))]
    setDeptosExpandidos(new Set(todosDeptos))
    setStatusesRecolhidos(new Set())
    const ids = dadosFiltrados.map(p => p.id)
    setExpandidos(new Set(ids))
    const idsParaCarregar = ids.filter(id => {
      const c = tarefasPorProjeto[id]
      if (!c) return true
      const valido = c.some(t => t.proj_deliberacoes !== undefined)
      if (valido) prePopularDelibs(c)
      return !valido
    })
    await Promise.all(idsParaCarregar.map(async id => {
      setCarregandoTarefas(prev => new Set(prev).add(id))
      try {
        const tarefas = await apiService.getTarefas(id)
        setTarefasPorProjeto(prev => ({ ...prev, [id]: tarefas }))
        prePopularDelibs(tarefas)
      } catch { }
      finally {
        setCarregandoTarefas(prev => { const s = new Set(prev); s.delete(id); return s })
      }
    }))
  }

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    const novos = { ...filtros, [name]: value }
    setFiltros(novos)
    loadData(novos)
  }
  const handleLimpar = () => { setFiltros(FILTROS_VAZIOS); setFiltroRespProjeto(''); setFiltroRespTarefa(''); setFiltroDataTermIni(''); setFiltroDataTermFim(''); ctx.limparFiltros(); loadData(FILTROS_VAZIOS) }

  const prePopularDelibs = (tarefas) => {
    setDeliberacoesPorTarefa(prev => {
      const next = { ...prev }
      tarefas.forEach(t => { if (t.id && !next[t.id] && t.proj_deliberacoes?.length) next[t.id] = t.proj_deliberacoes })
      return next
    })
  }

  const toggleDepto = (depto) => setDeptosExpandidos(prev => {
    const next = new Set(prev)
    next.has(depto) ? next.delete(depto) : next.add(depto)
    return next
  })

  const toggleStatus = (st) => setStatusesRecolhidos(prev => {
    const next = new Set(prev)
    next.has(st) ? next.delete(st) : next.add(st)
    return next
  })

  const toggleExpandir = async (projetoId) => {
    const novoSet = new Set(expandidos)
    if (novoSet.has(projetoId)) {
      novoSet.delete(projetoId)
      setExpandidos(novoSet)
      return
    }
    novoSet.add(projetoId)
    setExpandidos(novoSet)
    const cached = tarefasPorProjeto[projetoId]
    // Cache sem proj_deliberacoes = stale (carregado antes do fix) → recarregar
    const cacheValido = cached && cached.some(t => t.proj_deliberacoes !== undefined)
    if (cacheValido) { prePopularDelibs(cached); return }
    setCarregandoTarefas(prev => new Set(prev).add(projetoId))
    try {
      const tarefas = await apiService.getTarefas(projetoId)
      setTarefasPorProjeto(prev => ({ ...prev, [projetoId]: tarefas }))
      prePopularDelibs(tarefas)
    } catch { /* silencioso */ }
    finally {
      setCarregandoTarefas(prev => { const s = new Set(prev); s.delete(projetoId); return s })
    }
  }

  const confirmarExcluir = (item) => { setIdExcluir(item.id); setNomeExcluir(item.nome); setModalExcluir(true) }
  const handleExcluir = async () => {
    try { await apiService.deleteProjeto(idExcluir); await loadData(filtros) }
    catch (err) { alert('Erro ao excluir: ' + (err.message || String(err))) }
    finally { setModalExcluir(false) }
  }

  const [duplicando, setDuplicando] = useState(null) // id do projeto sendo duplicado
  const [tarefasSelecionadas, setTarefasSelecionadas] = useState({}) // { [projetoId]: Set<tarefaId> }

  const duplicarProjeto = async (p) => {
    if (duplicando) return
    setDuplicando(p.id)
    try {
      // Busca dados completos do projeto e tarefas
      const [projetoOriginal, tarefasOriginais] = await Promise.all([
        apiService.getProjetoById(p.id),
        apiService.getTarefas(p.id),
      ])
      // Cria cópia do projeto (remove campos gerados pelo banco)
      const { id: _id, criado_em: _ce, atualizado_em: _ae, criado_por: _cp, ...dadosProjeto } = projetoOriginal
      const novoProjeto = await apiService.createProjeto({
        ...dadosProjeto,
        nome: `Cópia de ${projetoOriginal.nome}`,
        status: 'mapeado',
      }, user?.email)
      // Cria cada tarefa na cópia (preserva todos os campos exceto id/timestamps)
      await Promise.all(
        tarefasOriginais.map(({ id: _tid, criado_em: _tce, atualizado_em: _tae, ...dadosTarefa }) =>
          apiService.createTarefa({ ...dadosTarefa, projeto_id: novoProjeto.id })
        )
      )
      await loadData(filtros)
    } catch (err) {
      alert('Erro ao duplicar: ' + (err.message || String(err)))
    } finally {
      setDuplicando(null)
    }
  }

  const toggleSelecionarTarefa = (projetoId, tarefaId) => {
    setTarefasSelecionadas(prev => {
      const sel = new Set(prev[projetoId] || [])
      if (sel.has(tarefaId)) sel.delete(tarefaId)
      else sel.add(tarefaId)
      return { ...prev, [projetoId]: sel }
    })
  }

  const toggleSelecionarTodas = (projetoId, tarefas) => {
    setTarefasSelecionadas(prev => {
      const sel = prev[projetoId] || new Set()
      const todas = tarefas.map(t => t.id)
      const todasSel = todas.length > 0 && todas.every(id => sel.has(id))
      return { ...prev, [projetoId]: todasSel ? new Set() : new Set(todas) }
    })
  }

  const excluirTarefasSelecionadas = async (projetoId) => {
    const sel = tarefasSelecionadas[projetoId]
    if (!sel || sel.size === 0) return
    if (!window.confirm(`Excluir ${sel.size} tarefa(s) selecionada(s)? Esta ação não pode ser desfeita.`)) return
    try {
      await Promise.all([...sel].map(id => apiService.deleteTarefa(id)))
      const atualizadas = await apiService.getTarefas(projetoId)
      setTarefasPorProjeto(prev => ({ ...prev, [projetoId]: atualizadas }))
      setTarefasSelecionadas(prev => ({ ...prev, [projetoId]: new Set() }))
    } catch (err) { alert('Erro ao excluir: ' + (err.message || String(err))) }
  }

  const abrirEditTarefa = async (t) => {
    setEditForm({ ...t })
    setModalEditTarefa(t)
    setModalDelibs([])
    setModalNovaDelib({ data: hoje2, texto: '' })
    try {
      const rows = await apiService.getDeliberacoes(t.id)
      setModalDelibs(rows)
    } catch { /* silencioso */ }
  }

  const handleModalAddDelib = async () => {
    if (!modalNovaDelib.texto.trim()) return
    setModalAdicionandoDelib(true)
    try {
      await apiService.createDeliberacao(modalEditTarefa.id, modalNovaDelib.data || hoje2, modalNovaDelib.texto.trim(), user?.email)
      const rows = await apiService.getDeliberacoes(modalEditTarefa.id)
      setModalDelibs(rows)
      setModalNovaDelib({ data: hoje2, texto: '' })
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setModalAdicionandoDelib(false) }
  }

  const handleModalDeleteDelib = async (deliberId) => {
    try {
      await apiService.deleteDeliberacao(deliberId)
      setModalDelibs(prev => prev.filter(d => d.id !== deliberId))
    } catch (err) { alert('Erro: ' + err.message) }
  }
  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    if (name === 'status_kanban' && value === 'concluido') {
      setEditForm(prev => ({ ...prev, status_kanban: value, progresso_pct: 100 }))
      return
    }
    setEditForm(prev => ({ ...prev, [name]: value }))
  }
  const handleSalvarTarefa = async () => {
    const pct = editForm.status_kanban === 'concluido' ? 100 : (Number(editForm.progresso_pct) || 0)
    try {
      await apiService.updateTarefa(editForm.id, {
        nome:            editForm.nome,
        area_nome:       editForm.area_nome        || null,
        fase_nome:       editForm.fase_nome        || null,
        status_kanban:   editForm.status_kanban,
        progresso_pct:   pct,
        data_inicio:     editForm.data_inicio      || null,
        data_fim:        editForm.data_fim         || null,
        sistema_nome:    editForm.sistema_nome     || null,
        responsavel_nome:editForm.responsavel_nome || null,
      })
      const tarefas = await apiService.getTarefas(editForm.projeto_id)
      setTarefasPorProjeto(prev => ({ ...prev, [editForm.projeto_id]: tarefas }))
      setModalEditTarefa(null)
    } catch (err) { alert('Erro ao salvar: ' + (err.message || String(err))) }
  }
  const handleExcluirTarefa = async () => {
    try {
      await apiService.deleteTarefa(modalExcluirTarefa.id)
      const tarefas = await apiService.getTarefas(modalExcluirTarefa.projeto_id)
      setTarefasPorProjeto(prev => ({ ...prev, [modalExcluirTarefa.projeto_id]: tarefas }))
      setModalExcluirTarefa(null)
    } catch (err) { alert('Erro ao excluir: ' + (err.message || String(err))) }
  }

  const toggleDeliberacoes = async (tarefaId) => {
    const novo = new Set(deliberacoesExpandidas)
    if (novo.has(tarefaId)) { novo.delete(tarefaId); setDeliberacoesExpandidas(novo); return }
    novo.add(tarefaId)
    setDeliberacoesExpandidas(novo)
    if (deliberacoesPorTarefa[tarefaId]) return
    try {
      const rows = await apiService.getDeliberacoes(tarefaId)
      setDeliberacoesPorTarefa(prev => ({ ...prev, [tarefaId]: rows }))
    } catch { /* silencioso */ }
  }

  const handleAddDelib = async (tarefaId) => {
    const form = novaDelib[tarefaId] || { data: hoje2, texto: '' }
    if (!form.texto.trim()) return
    try {
      await apiService.createDeliberacao(tarefaId, form.data || hoje2, form.texto.trim(), user?.email)
      const rows = await apiService.getDeliberacoes(tarefaId)
      setDeliberacoesPorTarefa(prev => ({ ...prev, [tarefaId]: rows }))
      setNovaDelib(prev => ({ ...prev, [tarefaId]: { data: hoje2, texto: '' } }))
    } catch (err) { alert('Erro: ' + (err.message || String(err))) }
  }

  const handleDeleteDelib = async (deliberId, tarefaId) => {
    try {
      await apiService.deleteDeliberacao(deliberId)
      setDeliberacoesPorTarefa(prev => ({
        ...prev,
        [tarefaId]: prev[tarefaId].filter(d => d.id !== deliberId),
      }))
    } catch (err) { alert('Erro: ' + (err.message || String(err))) }
  }

  const handleConcluirTarefa = async () => {
    if (!modalConcluir) return
    const { tarefa, dataFim } = modalConcluir
    try {
      await apiService.updateTarefa(tarefa.id, {
        nome:             tarefa.nome,
        area_nome:        tarefa.area_nome        || null,
        fase_nome:        tarefa.fase_nome        || null,
        status_kanban:    'concluido',
        progresso_pct:    100,
        data_inicio:      tarefa.data_inicio      || null,
        data_fim:         dataFim                 || null,
        sistema_nome:     tarefa.sistema_nome     || null,
        responsavel_nome: tarefa.responsavel_nome || null,
      })
      const tarefasAtualizadas = await apiService.getTarefas(tarefa.projeto_id)
      setTarefasPorProjeto(prev => ({ ...prev, [tarefa.projeto_id]: tarefasAtualizadas }))
      setModalConcluir(null)
      loadData(filtros, true)
    } catch (err) { alert('Erro: ' + (err.message || String(err))) }
  }

  const handleUpdateDelib = async () => {
    if (!editandoDelib || !editandoDelib.texto.trim()) return
    try {
      await apiService.updateDeliberacao(editandoDelib.id, editandoDelib.data, editandoDelib.texto.trim())
      const rows = await apiService.getDeliberacoes(editandoDelib.tarefaId)
      setDeliberacoesPorTarefa(prev => ({ ...prev, [editandoDelib.tarefaId]: rows }))
      setEditandoDelib(null)
    } catch (err) { alert('Erro: ' + (err.message || String(err))) }
  }

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">{error}
        <button onClick={() => loadData(filtros)} className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shrink-0">
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Projetos</h1>
              <p className="text-xs text-slate-500">Controle de tarefas, cronograma e quadro Kanban dos projetos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={handleSalvarPDF}
              disabled={gerandoPDF || dadosFiltrados.length === 0}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors"
            >
              {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {gerandoPDF ? 'Gerando...' : 'Salvar PDF'}
            </button>
            {canCriar && (
              <button
                onClick={() => navigate('/projetos/novo')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Novo Projeto
              </button>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <ProjetosNav />
          <FiltrosCompactBar />
        </div>
        <ProjetosFiltrosPanel projetos={dados} showTrigger={false} />
      </div>

      {modoVerTodos && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
          <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          Modo Visualização Geral — exibindo todos os departamentos. Todas as edições estão bloqueadas.
          <button onClick={() => setModoVerTodos(false)} className="ml-auto text-amber-600 hover:text-amber-800 font-bold underline underline-offset-2">
            Sair
          </button>
        </div>
      )}

      {/* CARDS KPI — Projetos por status */}
      {(() => {
        const projCards = Object.entries(STATUS_CARD_CONFIG)
          .map(([status, cfg]) => ({ status, cfg, count: dadosGlobal.filter(p => p.status === status).length }))
        projCards.push({
          status: '__total__',
          cfg: { label: 'Total Projetos', icon: Layers, st: { bg:'bg-slate-50', border:'border-slate-200', ring:'ring-slate-300', icoBg:'bg-slate-100', icoTxt:'text-slate-500', numTxt:'text-slate-800', labelTxt:'text-slate-400' } },
          count: dadosGlobal.length,
        })
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${projCards.length}, 1fr)`, gap: '10px' }}>
            {projCards.map(c => (
              <CardKpi key={c.status} icon={c.cfg.icon} label={c.cfg.label} count={c.count}
                ativo={filtroCardProjetos.has(c.status)}
                onClick={() => {
                  if (c.status === '__total__') { setFiltroCardProjetos(new Set()); setFiltroCards(new Set()); setFiltroAtrasadas(false); setFiltroHoje(false) }
                  else setFiltroCardProjetos(prev => { const s = new Set(prev); s.has(c.status) ? s.delete(c.status) : s.add(c.status); return s })
                }}
                st={c.cfg.st} />
            ))}
          </div>
        )
      })()}

      {/* CARDS KPI — status de tarefas */}
      {(() => {
        const countTarefas = (status) => dadosGlobal.reduce((s, p) => s + (p.proj_tarefas || []).filter(t => t.status_kanban === status).length, 0)
        const cards = ['mapeado', 'programado', 'em_andamento', 'pausado', 'concluido'].map(status => ({
          key: status, cfg: STATUS_CARD_CONFIG[status], count: countTarefas(status),
        }))
        const totalTarefas = dadosGlobal.reduce((s, p) => s + (p.proj_tarefas || []).length, 0)
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length + 1}, 1fr)`, gap: '10px' }}>
            {cards.map(c => (
              <CardKpi key={c.key} icon={c.cfg.icon} label={c.cfg.label} count={c.count}
                ativo={filtroCards.has(c.key)}
                onClick={() => setFiltroCards(prev => { const s = new Set(prev); s.has(c.key) ? s.delete(c.key) : s.add(c.key); return s })}
                st={c.cfg.st} />
            ))}
            <CardKpi key="total" icon={Layers} label="Total Tarefas" count={totalTarefas} ativo={false}
              onClick={() => setFiltroCards(new Set())}
              st={{ bg:'bg-slate-50', border:'border-slate-200', ring:'ring-slate-300', icoBg:'bg-slate-100', icoTxt:'text-slate-500', numTxt:'text-slate-800', labelTxt:'text-slate-400' }} />
          </div>
        )
      })()}

      {/* TABELA */}
      <div ref={tableRef} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
        {!loading && dadosFiltrados.length > 0 && (() => {
          const todosDeptos = [...new Set(dadosFiltrados.map(p => p.departamento_nome || 'Sem Departamento'))]
          const anyDeptoExp  = deptosExpandidos.size > 0
          const anyStatusExp = statusesRecolhidos.size === 0   // true = status abertos
          const anyTarefaExp = anyExpanded

          // próxima ação de expandir em cascata
          const proximoExpandir = !anyDeptoExp
            ? { label: 'Expandir departamentos', fn: () => setDeptosExpandidos(new Set(todosDeptos)) }
            : !anyStatusExp
              ? { label: 'Expandir status',        fn: () => setStatusesRecolhidos(new Set()) }
              : !anyTarefaExp
                ? { label: 'Expandir projetos',     fn: handleExpandirTodos }
                : null

          // próxima ação de recolher em cascata (inverso)
          const proximoRecolher = anyTarefaExp
            ? { label: 'Recolher projetos',      fn: () => setExpandidos(new Set()) }
            : anyStatusExp && anyDeptoExp
              ? { label: 'Recolher status',        fn: () => setStatusesRecolhidos(new Set(STATUS_ORDER)) }
              : anyDeptoExp
                ? { label: 'Recolher departamentos', fn: () => setDeptosExpandidos(new Set()) }
                : null

          const btnBase = 'flex items-center gap-1 text-[11px] font-semibold transition-colors'
          const btnOn  = btnBase + ' text-blue-600 hover:text-blue-700'
          const btnOff = btnBase + ' text-slate-300 cursor-default'
          return (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[11px] text-slate-400 font-medium">
                {dadosFiltrados.length} projeto{dadosFiltrados.length !== 1 ? 's' : ''}
                {expandidos.size > 0 && ` · ${expandidos.size} expandido${expandidos.size !== 1 ? 's' : ''}`}
              </span>
              <div className="flex items-center gap-4">
                {/* Botão 1 — Expandir/Recolher tudo */}
                <button
                  onClick={anyDeptoExp ? handleRecolherTodos : handleExpandirTodos}
                  className={btnOn}
                >
                  {anyDeptoExp
                    ? <><ChevronDown className="h-3.5 w-3.5" /> Recolher tudo</>
                    : <><ChevronRight className="h-3.5 w-3.5" /> Expandir tudo</>
                  }
                </button>
                <span className="text-slate-200">|</span>
                {/* Botão 2 — Expandir por nível (label muda conforme estado) */}
                <button
                  onClick={proximoExpandir?.fn}
                  disabled={!proximoExpandir}
                  className={proximoExpandir ? btnOn : btnOff}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  {proximoExpandir?.label ?? 'Expandir nível'}
                </button>
                <span className="text-slate-200">|</span>
                {/* Botão 3 — Recolher por nível (label muda conforme estado) */}
                <button
                  onClick={proximoRecolher?.fn}
                  disabled={!proximoRecolher}
                  className={proximoRecolher ? btnOn : btnOff}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  {proximoRecolher?.label ?? 'Recolher nível'}
                </button>
              </div>
            </div>
          )
        })()}
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead></thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {dadosFiltrados.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">Nenhum projeto encontrado.</td></tr>
              ) : dadosPorDeptoFlat.map((p, pi) => {
                const depto = p.departamento_nome || 'Sem Departamento'
                const prevDepto = pi > 0 ? (dadosPorDeptoFlat[pi - 1].departamento_nome || 'Sem Departamento') : null
                const isNewDepto = depto !== prevDepto
                const deptoExpandido = deptosExpandidos.has(depto)
                const { count: deptoCount, totalTarefas, resps } = deptInfoMap[depto]
                if (!deptoExpandido && !isNewDepto) return null
                if (!deptoExpandido) return (
                  <tr key={`depto-${depto}`} className="cursor-pointer select-none" onClick={() => toggleDepto(depto)}>
                    <td colSpan={8}>
                      <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="opacity-60"><ChevronRight className="h-4 w-4" /></span>
                          <span className="text-sm font-bold uppercase tracking-widest shrink-0">{depto}</span>
                          {resps.length > 0 && <span className="text-xs opacity-75 font-medium hidden sm:inline">Responsável Geral: <span className="font-semibold opacity-100">{resps.join(' · ')}</span></span>}
                        </div>
                        <span className="text-xs opacity-80 font-medium shrink-0">{deptoCount} projeto{deptoCount !== 1 ? 's' : ''} · {totalTarefas} tarefa{totalTarefas !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                  </tr>
                )
                const pStatus = p.status
                const isNewStatus = isNewDepto || (pi > 0 && dadosPorDeptoFlat[pi - 1].status !== pStatus)
                const statusRecolhido = statusesRecolhidos.has(pStatus)
                const statusCount = statusInfoMap[`${depto}__${pStatus}`] || 0
                const statusLabel = STATUS_MAP[pStatus]?.label || pStatus
                const statusCor = STATUS_COR_HEADER[pStatus] || '#94a3b8'
                if (statusRecolhido && !isNewStatus) return null
                if (statusRecolhido && isNewStatus && !isNewDepto) return (
                  <tr key={`status-${depto}-${pStatus}`} className="cursor-pointer select-none" onClick={() => toggleStatus(pStatus)}>
                    <td colSpan={8}>
                      <div style={{ backgroundColor: statusCor }} className="px-5 py-2 flex items-center gap-2">
                        <span className="text-white/70"><ChevronRight className="h-3.5 w-3.5" /></span>
                        <span className="text-xs font-bold uppercase tracking-widest text-white">{statusLabel}</span>
                        <span className="text-xs text-white/75 font-medium">· {statusCount} projeto{statusCount !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                  </tr>
                )
                if (statusRecolhido && isNewStatus && isNewDepto) return (
                  <React.Fragment key={`deptstatus-${depto}-${pStatus}`}>
                    <tr className="cursor-pointer select-none" onClick={() => toggleDepto(depto)}>
                      <td colSpan={8} className={pi > 0 ? 'pt-1' : ''}>
                        <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="opacity-60"><ChevronDown className="h-4 w-4" /></span>
                            <span className="text-sm font-bold uppercase tracking-widest shrink-0">{depto}</span>
                            {resps.length > 0 && <span className="text-xs opacity-75 font-medium hidden sm:inline">Responsável Geral: <span className="font-semibold opacity-100">{resps.join(' · ')}</span></span>}
                          </div>
                          <span className="text-xs opacity-80 font-medium shrink-0">{deptoCount} projeto{deptoCount !== 1 ? 's' : ''} · {totalTarefas} tarefa{totalTarefas !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="cursor-pointer select-none" onClick={() => toggleStatus(pStatus)}>
                      <td colSpan={8}>
                        <div style={{ backgroundColor: statusCor }} className="px-5 py-2 flex items-center gap-2">
                          <span className="text-white/70"><ChevronRight className="h-3.5 w-3.5" /></span>
                          <span className="text-xs font-bold uppercase tracking-widest text-white">{statusLabel}</span>
                          <span className="text-xs text-white/75 font-medium">· {statusCount} projeto{statusCount !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                )
                const st = STATUS_MAP[p.status] || { label: p.status, cor: 'bg-slate-100 text-slate-500' }
                const atrasado = isAtrasado(p)
                const expandido = expandidos.has(p.id)
                const tsDatas = p.proj_tarefas || []
                const dataInicioMin = [...tsDatas.map(t => t.data_inicio).filter(Boolean)].sort()[0] || null
                const dataFimMax = getDataFimMax(p)
                const carregando = carregandoTarefas.has(p.id)
                const isAtrasadaTarefa = (t) => t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
                const isHojeTarefa    = (t) => t.status_kanban !== 'concluido' && t.data_fim === hojeISO
                const tarefas = [...(tarefasPorProjeto[p.id] || [])]
                  .filter(t => (filtroCards.size === 0 || filtroCards.has(t.status_kanban)) && (!filtroAtrasadas || isAtrasadaTarefa(t)) && (!filtroRespTarefa || (t.responsavel_nome || '') === filtroRespTarefa) && (!filtroFase || (t.fase_nome || '') === filtroFase) && (!filtroSistema || (t.sistema_nome || '') === filtroSistema))
                  .sort((a, b) => {
                    const ea = a.etapa ?? 9999; const eb = b.etapa ?? 9999
                    if (ea !== eb) return ea - eb
                    const da = a.data_inicio || '9999-99-99'; const db = b.data_inicio || '9999-99-99'
                    return da < db ? -1 : da > db ? 1 : 0
                  })
                return (
                  <React.Fragment key={p.id}>
                    {isNewDepto && (
                      <tr className="cursor-pointer select-none" onClick={() => toggleDepto(depto)}>
                        <td colSpan={8} className={pi > 0 ? 'pt-1' : ''}>
                          <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="opacity-60">{deptoExpandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                              <span className="text-sm font-bold uppercase tracking-widest shrink-0">{depto}</span>
                              {resps.length > 0 && <span className="text-xs opacity-75 font-medium hidden sm:inline">Responsável Geral: <span className="font-semibold opacity-100">{resps.join(' · ')}</span></span>}
                            </div>
                            <span className="text-xs opacity-80 font-medium shrink-0">{deptoCount} projeto{deptoCount !== 1 ? 's' : ''} · {totalTarefas} tarefa{totalTarefas !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isNewStatus && (
                      <tr className="cursor-pointer select-none" onClick={() => toggleStatus(pStatus)}>
                        <td colSpan={8}>
                          <div style={{ backgroundColor: statusCor }} className="px-5 py-2 flex items-center gap-2">
                            <span className="text-white/70"><ChevronDown className="h-3.5 w-3.5" /></span>
                            <span className="text-xs font-bold uppercase tracking-widest text-white">{statusLabel}</span>
                            <span className="text-xs text-white/75 font-medium">· {statusCount} projeto{statusCount !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isNewStatus && (
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        {[
                          { campo: 'titulo',       label: 'Título / Tarefa / Deliberações', style: { minWidth: '360px' } },
                          { campo: 'sistemas',     label: 'Sistemas', style: { minWidth: '160px' } },
                          { campo: 'depto',        label: 'Departamento / Área' },
                          { campo: 'resp_projeto', label: 'Resp. Projeto' },
                          { campo: 'conclusao',    label: '% Conclusão' },
                          { campo: 'data_inicio',  label: 'Data Início' },
                          { campo: 'data_fim',     label: 'Data Término' },
                        ].map(({ campo, label, style }) => {
                          const idx = sortConfig.findIndex(k => k.campo === campo)
                          const ativo = idx !== -1
                          const dir = ativo ? sortConfig[idx].dir : null
                          return (
                            <th key={campo} className="p-3 whitespace-nowrap" style={style}>
                              <button
                                title="Clique: ordenar | Shift+Clique: adicionar ordenação secundária"
                                onClick={e => {
                                  if (e.shiftKey) {
                                    setSortConfig(prev => { const i = prev.findIndex(k => k.campo === campo); if (i !== -1) { const next = [...prev]; next[i] = { campo, dir: prev[i].dir === 'asc' ? 'desc' : 'asc' }; return next }; return [...prev, { campo, dir: 'asc' }] })
                                  } else {
                                    setSortConfig(prev => { const cur = prev.find(k => k.campo === campo); return [{ campo, dir: cur?.dir === 'asc' ? 'desc' : 'asc' }] })
                                  }
                                }}
                                className="flex items-center gap-1 uppercase font-bold tracking-wider hover:text-blue-600 transition-colors"
                              >
                                {label}
                                <span className="normal-case font-normal flex items-center gap-0.5">
                                  {ativo ? (dir === 'asc' ? '↑' : '↓') : '↕'}
                                  {ativo && sortConfig.length > 1 && <span className="text-[8px] text-blue-400 font-bold">{idx + 1}</span>}
                                </span>
                              </button>
                            </th>
                          )
                        })}
                        <th className="p-3 w-20 text-center border-l border-slate-200">Ações</th>
                      </tr>
                    )}
                    {/* ── Linha do projeto ── */}
                    <tr
                      className={`transition-colors cursor-pointer border-b-2 ${
                        expandido
                          ? 'bg-blue-50 border-b-blue-200 hover:bg-blue-100/60'
                          : atrasado
                            ? 'bg-red-50 border-b-red-100 hover:bg-red-50/80'
                            : 'bg-slate-100/80 border-b-slate-200 hover:bg-blue-50/60'
                      }`}
                      onClick={() => navigate(`/projetos/detalhe/${p.id}`)}
                    >
                      <td className={`p-3 border-l-[3px] ${expandido ? 'border-l-blue-500' : atrasado ? 'border-l-red-400' : 'border-l-slate-400'}`}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); toggleExpandir(p.id) }}
                            className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-100 text-blue-500 transition-colors"
                            title={expandido ? 'Recolher tarefas' : 'Expandir tarefas'}
                          >
                            {carregando
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : expandido
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRight className="h-3.5 w-3.5" />
                            }
                          </button>
                          <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[8px] font-extrabold text-blue-500/80 uppercase tracking-widest leading-none mb-0.5">Projeto</div>
                            <span className="font-bold text-slate-900 text-[13px] leading-tight">{p.nome}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {p.sistemas_nomes && p.sistemas_nomes.length > 0
                          ? <div className="flex flex-wrap gap-1">
                              {p.sistemas_nomes.map(nome => {
                                const cor = sistemaCorMap[nome] || '#1e293b'
                                return (
                                  <span key={nome} style={{ backgroundColor: cor, color: sistemaCorTextoMap[nome] || getTextColor(cor) }}
                                    className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                                    {nome}
                                  </span>
                                )
                              })}
                            </div>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                      <td className="p-3 text-slate-600 leading-tight">
                        <span className="block">{p.departamento_nome || '—'}</span>
                        {p.area_nome && <span className="block italic text-slate-400 text-[10px]">{p.area_nome}</span>}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{p.responsavel_nome || <span className="text-slate-300">—</span>}</td>
                      <td className="p-3 whitespace-nowrap">{(() => {
                        const ts = p.proj_tarefas
                        if (!ts || ts.length === 0) return <span className="text-slate-400">—</span>
                        const pct = Math.round(ts.reduce((s, t) => s + (t.status_kanban === 'concluido' ? 100 : (Number(t.progresso_pct) || 0)), 0) / ts.length)
                        return (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-500">{pct}%</span>
                          </div>
                        )
                      })()}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{fmtData(dataInicioMin)}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={
                          atrasado                                           ? 'text-red-600 font-bold' :
                          p.status !== 'concluido' && dataFimMax === hojeISO ? 'text-blue-600 font-bold' :
                                                                               'text-slate-500'
                        }>{fmtData(dataFimMax)}</span>
                      </td>
                      <td className="p-3 text-center border-l border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {canEditar && (
                            <button
                              onClick={() => navigate(`/projetos/detalhe/${p.id}`)}
                              className="p-1 rounded transition-colors text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              title="Editar projeto"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDuplicar && (
                            <button
                              onClick={() => duplicarProjeto(p)}
                              disabled={duplicando === p.id}
                              className="p-1 rounded transition-colors text-slate-500 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-40"
                              title="Duplicar projeto com todas as tarefas"
                            >
                              {duplicando === p.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {canExcluir && (
                            <button onClick={() => confirmarExcluir(p)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir projeto e tarefas">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Tarefas (sub-tabela estilo Planejamento) ── */}
                    {expandido && tarefas.length > 0 && (
                      <tr>
                        <td colSpan={8} className="p-0 bg-slate-50">
                          <div className="ml-10 border-l-[3px] border-l-blue-300">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-200/70 border-y border-slate-300/50 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                                <th className="px-2 py-1.5 text-center w-10">#</th>
                                <th className="px-3 py-1.5 text-left">Tarefa</th>
                                <th className="px-2 py-1.5 text-center w-24 whitespace-nowrap">Sistema</th>
                                <th className="px-2 py-1.5 text-center w-32 whitespace-nowrap">Depto / Área</th>
                                <th className="px-2 py-1.5 text-center w-24 whitespace-nowrap">Responsável</th>
                                <th className="px-2 py-1.5 text-center w-24 whitespace-nowrap">Status</th>
                                <th className="px-2 py-1.5 text-center w-28 whitespace-nowrap">% Concl.</th>
                                <th className="px-2 py-1.5 text-center w-20 whitespace-nowrap">Início</th>
                                <th className="px-2 py-1.5 text-center w-20 whitespace-nowrap">Término</th>
                                <th className="px-1 py-1.5 w-16" />
                              </tr>
                            </thead>
                            <tbody>
                    {tarefas.map((t, i) => {
                      const kt = KANBAN_MAP[t.status_kanban] || { label: t.status_kanban, cor: 'bg-slate-100 text-slate-500' }
                      const atrasadaTarefa = isAtrasadaTarefa(t)
                      const delibersAberto = deliberacoesExpandidas.has(t.id)
                      const delibers = deliberacoesPorTarefa[t.id] || []
                      const formDelib = novaDelib[t.id] || { data: hoje2, texto: '' }
                      const pct = t.status_kanban === 'concluido' ? 100 : Math.min(100, t.progresso_pct || 0)
                      const sistCor = t.sistema_nome ? (sistemaCorMap[t.sistema_nome] || '#1e293b') : null
                      const sistTxt = t.sistema_nome ? (sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistCor)) : null
                      return (
                        <React.Fragment key={t.id}>
                          <tr className={`border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${atrasadaTarefa ? 'bg-red-50/20' : 'bg-white'}`}>
                            {/* Etapa */}
                            <td className="px-2 py-1.5 text-center">
                              {t.etapa != null
                                ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${t.status_kanban === 'em_andamento' ? 'bg-orange-500 text-white shadow-sm' : 'bg-indigo-100 text-indigo-700'}`}>{t.etapa}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            {/* Nome + deliberações */}
                            <td className="px-3 py-1.5">
                              <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                  {atrasadaTarefa && <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />}
                                  <span className="text-slate-700 font-medium leading-snug">{t.nome}</span>
                                </div>
                                <button
                                  onClick={() => toggleDeliberacoes(t.id)}
                                  title="Deliberações"
                                  className={`shrink-0 mt-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${delibersAberto ? 'bg-blue-100 text-blue-600' : (delibers.length > 0 || (tarefaDelibsMap[t.id] ?? 0) > 0) ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'text-slate-300 hover:bg-blue-50 hover:text-blue-500'}`}
                                >
                                  <Plus className={`h-3 w-3 transition-transform duration-150 ${delibersAberto ? 'rotate-45' : ''}`} />
                                  {(() => { const n = delibers.length || tarefaDelibsMap[t.id] || 0; return n > 0 ? <span>{n}</span> : null })()}
                                </button>
                              </div>
                            </td>
                            {/* Sistema */}
                            <td className="px-2 py-1.5 text-center whitespace-nowrap">
                              {t.sistema_nome
                                ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: sistCor, color: sistTxt }}>{t.sistema_nome}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            {/* Depto / Área */}
                            <td className="px-2 py-1.5 text-center text-[10px] text-slate-500 whitespace-nowrap">
                              {(p.departamento_nome || t.area_nome)
                                ? [p.departamento_nome, t.area_nome].filter(Boolean).join(' / ')
                                : <span className="text-slate-300">—</span>}
                            </td>
                            {/* Responsável */}
                            <td className="px-2 py-1.5 text-center text-slate-600 text-[11px]">{t.responsavel_nome || <span className="text-slate-300">—</span>}</td>
                            {/* Status */}
                            <td className="px-2 py-1.5 text-center whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${kt.cor}`}>{kt.label}</span>
                            </td>
                            {/* % Conclusão */}
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden min-w-[40px]">
                                  <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-[10px] font-bold whitespace-nowrap ${pct >= 100 ? 'text-teal-600' : pct > 0 ? 'text-slate-600' : 'text-slate-400'}`}>{pct}%</span>
                              </div>
                            </td>
                            {/* Início */}
                            <td className="px-2 py-1.5 text-center whitespace-nowrap text-[11px]">
                              {t.data_inicio ? <span className="text-slate-600">{fmtData(t.data_inicio)}</span> : <span className="text-slate-300">—</span>}
                            </td>
                            {/* Término */}
                            <td className="px-2 py-1.5 text-center whitespace-nowrap text-[11px]">
                              {t.data_fim
                                ? <span className={atrasadaTarefa ? 'text-red-500 font-semibold' : (isHojeTarefa(t) ? 'text-blue-600 font-semibold' : 'text-slate-600')}>{fmtData(t.data_fim)}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            {/* Ações */}
                            <td className="px-1 py-1.5">
                              <div className="flex items-center justify-center gap-0.5">
                                {t.status_kanban !== 'concluido' && canConcluirTar && (
                                  <button onClick={() => setModalConcluir({ tarefa: t, dataFim: hoje2 })} className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Concluir tarefa">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </button>
                                )}
                                {canEditarTar && (
                                  <button onClick={() => abrirEditTarefa(t)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar tarefa">
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                )}
                                {canExcluirTar && (
                                  <button onClick={() => setModalExcluirTarefa(t)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir tarefa">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* painel de deliberações */}
                          {delibersAberto && (
                            <tr className="border-b border-blue-100">
                              <td colSpan={10} className="pl-14 pr-6 py-4 bg-blue-50/30">
                                <div className="space-y-3">
                                  {/* lista */}
                                  {delibers.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {delibers.map(d => {
                                        const editando = editandoDelib?.id === d.id
                                        return (
                                          <div key={d.id} className="flex items-center gap-2 text-[11px] group">
                                            {editando ? (
                                              <>
                                                <input type="date" value={editandoDelib.data}
                                                  onChange={e => setEditandoDelib(prev => ({ ...prev, data: e.target.value }))}
                                                  className="border border-blue-300 rounded px-1.5 py-0.5 text-[11px] shrink-0 w-28 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                                <input type="text" value={editandoDelib.texto}
                                                  onChange={e => setEditandoDelib(prev => ({ ...prev, texto: e.target.value }))}
                                                  onKeyDown={e => e.key === 'Enter' && handleUpdateDelib()}
                                                  autoFocus
                                                  className="flex-1 border border-blue-300 rounded px-1.5 py-0.5 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                                <button onClick={handleUpdateDelib}
                                                  className="shrink-0 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded transition-colors">
                                                  Salvar
                                                </button>
                                                <button onClick={() => setEditandoDelib(null)}
                                                  className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors" title="Cancelar">
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-slate-500 whitespace-nowrap font-semibold w-24 shrink-0">
                                                  {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-slate-700 flex-1">{d.texto}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                  <button
                                                    onClick={() => setEditandoDelib({ id: d.id, data: d.data, texto: d.texto, tarefaId: t.id })}
                                                    className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                                    <Edit2 className="h-3 w-3" />
                                                  </button>
                                                  <button onClick={() => handleDeleteDelib(d.id, t.id)}
                                                    className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                                    <Trash2 className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">Nenhuma deliberação registrada.</p>
                                  )}

                                  {/* formulário */}
                                  <div className="flex items-center gap-2 pt-1">
                                    <input
                                      type="date"
                                      value={formDelib.data}
                                      onChange={e => setNovaDelib(prev => ({ ...prev, [t.id]: { ...formDelib, data: e.target.value } }))}
                                      className="border border-slate-200 rounded px-2 py-1 text-[11px] shrink-0 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <input
                                      type="text"
                                      value={formDelib.texto}
                                      placeholder="Digite a deliberação e pressione Enter..."
                                      onChange={e => setNovaDelib(prev => ({ ...prev, [t.id]: { ...formDelib, texto: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && handleAddDelib(t.id)}
                                      className="flex-1 border border-slate-200 rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <button
                                      onClick={() => handleAddDelib(t.id)}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded transition-colors shrink-0"
                                    >
                                      Adicionar
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                            </tbody>
                          </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandido && tarefas.length === 0 && !carregando && (
                      <tr className="bg-slate-50/50 border-b border-slate-100/60">
                        <td colSpan={8} className="py-3 pl-10 text-[11px] text-slate-400 italic">Nenhuma tarefa cadastrada.</td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10px] text-slate-400">
        {dadosFiltrados.length} projeto(s) exibido(s)
        {(() => {
          const excTar = Object.keys(STATUS_CARD_CONFIG).filter(k => filtroCards.size > 0 && !filtroCards.has(k))
          return excTar.length > 0 && <> · ocultando tarefas <strong>{excTar.map(k => STATUS_CARD_CONFIG[k]?.label).filter(Boolean).join(', ')}</strong></>
        })()}
        {(() => {
          const excluidos = Object.keys(STATUS_CARD_CONFIG).filter(k => filtroCardProjetos.size > 0 && !filtroCardProjetos.has(k))
          return excluidos.length > 0 && <> · ocultando <strong>{excluidos.map(k => STATUS_CARD_CONFIG[k]?.label).filter(Boolean).join(', ')}</strong></>
        })()}
      </p>

      {/* MODAL CONCLUIR TAREFA */}
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
              <p className="text-xs text-slate-400">Status será alterado para <strong className="text-teal-700">Concluído</strong> e conclusão definida em <strong>100%</strong>.</p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalConcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
              <button onClick={handleConcluirTarefa} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL EDITAR TAREFA */}
      {modalEditTarefa && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[600px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Editar Tarefa</h3>
              <button onClick={() => setModalEditTarefa(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tarefa</label>
                  <textarea name="nome" value={editForm.nome || ''} onChange={handleEditFormChange} rows={5}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Deliberações</label>
                  {modalDelibs.length === 0 ? (
                    <p className="mt-1 text-[11px] text-slate-400 italic">Nenhuma deliberação registrada.</p>
                  ) : (
                    <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
                      {modalDelibs.map(d => (
                        <div key={d.id} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded px-2 py-1.5">
                          <span className="text-slate-400 shrink-0 font-medium whitespace-nowrap">
                            {d.data ? new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          </span>
                          <span className="flex-1">{d.texto}</span>
                          <button onClick={() => handleModalDeleteDelib(d.id)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2 items-center">
                    <input type="date" value={modalNovaDelib.data}
                      onChange={e => setModalNovaDelib(p => ({ ...p, data: e.target.value }))}
                      className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 w-36 shrink-0" />
                    <input value={modalNovaDelib.texto}
                      onChange={e => setModalNovaDelib(p => ({ ...p, texto: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleModalAddDelib() }}
                      placeholder="Nova deliberação... (Enter para salvar)"
                      className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                    <button onClick={handleModalAddDelib} disabled={!modalNovaDelib.texto.trim() || modalAdicionandoDelib}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0">
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Área</label>
                  <select name="area_nome" value={editForm.area_nome || ''} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="">—</option>
                    {areas.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fase</label>
                  <select name="fase_nome" value={editForm.fase_nome || ''} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="">—</option>
                    {fases.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                  <select name="status_kanban" value={editForm.status_kanban || 'mapeado'} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white">
                    {Object.entries(KANBAN_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">% Conclusão</label>
                  <input type="number" name="progresso_pct" min="0" max="100" value={editForm.progresso_pct ?? 0} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data Início</label>
                  <input type="date" name="data_inicio" value={editForm.data_inicio || ''} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data Término</label>
                  <input type="date" name="data_fim" value={editForm.data_fim || ''} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sistema</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    {editForm.sistema_nome && (
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sistemaCorMap[editForm.sistema_nome] || '#1e293b' }} />
                    )}
                    <select name="sistema_nome" value={editForm.sistema_nome || ''} onChange={handleEditFormChange}
                      className="flex-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white">
                      <option value="">—</option>
                      {sistemas.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Tarefa</label>
                  <select name="responsavel_nome" value={editForm.responsavel_nome || ''} onChange={handleEditFormChange}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="">—</option>
                    {responsaveis.map(r => <option key={r.id} value={r.nome}>{r.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalEditTarefa(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
              <button onClick={handleSalvarTarefa} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR TAREFA */}
      {modalExcluirTarefa && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remover Tarefa</h3>
                <p className="text-xs text-slate-500">Confirma a exclusão permanente de <strong className="text-slate-800">"{modalExcluirTarefa.nome}"</strong>?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirTarefa(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleExcluirTarefa} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {modalExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remover Projeto</h3>
                <p className="text-xs text-slate-500">Confirma a exclusão permanente de <strong className="text-slate-800">"{nomeExcluir}"</strong>? Todas as tarefas e dependências também serão apagadas.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluir(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleExcluir} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
