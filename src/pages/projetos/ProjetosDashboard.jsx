import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Edit2, Trash2, FolderKanban, Filter, RotateCcw,
  Activity, CheckCircle, AlertTriangle, Layers, ShieldAlert,
  ChevronRight, ChevronDown, Loader2, X, CheckCircle2, CalendarCheck, Copy, BarChart2,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais } from '../../context/ProjetosFiltrosContext'
import ProjetosNav from './ProjetosNav'
import ProjetosFiltrosPanel from './ProjetosFiltrosPanel'

const STATUS_MAP = {
  mapeado:      { label: 'Mapeado',      cor: 'bg-slate-100 text-slate-600', corAtivo: 'bg-slate-500 text-white' },
  programado:   { label: 'Programado',   cor: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', cor: 'bg-amber-100 text-amber-700' },
  pausado:      { label: 'Pausado',      cor: 'bg-purple-100 text-purple-700' },
  concluido:    { label: 'Concluído',    cor: 'bg-teal-700 text-white' },
}

const KANBAN_MAP = {
  mapeado:      { label: 'Mapeado',       cor: 'bg-slate-100 text-slate-600' },
  programado:   { label: 'Programado',    cor: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento',  cor: 'bg-amber-100 text-amber-700' },
  pausado:      { label: 'Pausado',       cor: 'bg-purple-100 text-purple-700' },
  concluido:    { label: 'Concluído',     cor: 'bg-teal-700 text-white' },
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
  filtroCards:            null,
  filtroCardProjetos:     null,
  filtroRespProjeto:      '',
  filtroRespTarefa:       '',
  filtroDataTermIni:      '',
  filtroDataTermFim:      '',
  sortConfig:             [{ campo: 'titulo', dir: 'asc' }, { campo: 'sistemas', dir: 'asc' }],
  expandidos:             new Set(),
  tarefasPorProjeto:      {},
  deliberacoesExpandidas: new Set(),
  deliberacoesPorTarefa:  {},
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
  const canCriar      = hasActionOrDefault('projetos', 'criar')
  const canEditar     = hasActionOrDefault('projetos', 'editar')
  const canExcluir    = hasActionOrDefault('projetos', 'excluir')
  const canDuplicar   = hasActionOrDefault('projetos', 'duplicar')
  const canExcluirTar = hasActionOrDefault('projetos', 'excluir_tarefa')
  const ctx = useProjetosFiltros()
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
  const [filtroCards, setFiltroCards] = useState(() => new Set(_dash.filtroCards || []))
  const [filtroCardProjetos, setFiltroCardProjetos] = useState(() => new Set(_dash.filtroCardProjetos || []))
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
  const filtroDataTermIni = ctx.filtroDataIni
  const setFiltroDataTermIni = ctx.setFiltroDataIni
  const filtroDataTermFim = ctx.filtroDataFim
  const setFiltroDataTermFim = ctx.setFiltroDataFim
  const filtroDataTipo = ctx.filtroDataTipo
  const setFiltroDataTipo = ctx.setFiltroDataTipo
  const [deliberacoesExpandidas, setDeliberacoesExpandidas] = useState(() => new Set(_dash.deliberacoesExpandidas))
  const [deliberacoesPorTarefa, setDeliberacoesPorTarefa] = useState(() => ({ ..._dash.deliberacoesPorTarefa }))
  const [novaDelib, setNovaDelib] = useState({})
  const [editandoDelib, setEditandoDelib] = useState(null)
  const [modalConcluir, setModalConcluir] = useState(null) // { tarefa, dataFim }

  // Projetos após filtros globais (contexto compartilhado entre abas)
  const dadosGlobal = useMemo(() => aplicarFiltrosGlobais(dados, ctx, departamentosPermitidosEfetivos), [
    dados, ctx.filtroEmpresa, ctx.filtroDepartamento, ctx.filtroArea,
    ctx.filtroFase, ctx.filtroSistema, ctx.filtroRespProjeto, ctx.filtroRespTarefa,
    departamentosPermitidosEfetivos,
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

  useEffect(() => { _dash.dados = dados }, [dados])
  useEffect(() => { _dash.filtros = filtros }, [filtros])
  useEffect(() => { _dash.filtrosAbertos = filtrosAbertos }, [filtrosAbertos])
  useEffect(() => { _dash.filtroCards = [...filtroCards] }, [filtroCards])
  useEffect(() => { _dash.filtroCardProjetos = [...filtroCardProjetos] }, [filtroCardProjetos])
  useEffect(() => { _dash.sortConfig = sortConfig }, [sortConfig])
  useEffect(() => { _dash.expandidos = new Set(expandidos) }, [expandidos])
  useEffect(() => { _dash.tarefasPorProjeto = { ...tarefasPorProjeto } }, [tarefasPorProjeto])
  useEffect(() => { _dash.deliberacoesExpandidas = new Set(deliberacoesExpandidas) }, [deliberacoesExpandidas])
  useEffect(() => { _dash.deliberacoesPorTarefa = { ...deliberacoesPorTarefa } }, [deliberacoesPorTarefa])

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
    if (filtroDataTermIni || filtroDataTermFim)
      base = base.filter(p => {
        // Mapeado sem datas: inclui quando não há data final no filtro
        const tarefas = p.proj_tarefas || []
        if (!filtroDataTermFim && p.status === 'mapeado' && !tarefas.some(t => t.data_fim || t.data_inicio))
          return true
        return tarefas.some(t => tarefaPassaFiltroData(t, filtroDataTermIni, filtroDataTermFim, filtroDataTipo))
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

  const handleRecolherTodos = () => setExpandidos(new Set())
  const handleExpandirTodos = async () => {
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
      <div className="border-b border-slate-200 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Projetos</h1>
            <p className="text-xs text-slate-500">Controle de tarefas, cronograma e quadro Kanban dos projetos.</p>
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
        <div className="flex items-center justify-between gap-3">
          <ProjetosNav />
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-md p-0.5 shrink-0">
              {[{ k: 'inicio', l: 'Início' }, { k: 'fim', l: 'Término' }, { k: 'ambos', l: 'Ambos' }].map(({ k, l }) => (
                <button key={k} onClick={() => setFiltroDataTipo(k)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${filtroDataTipo === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">De</span>
            <input
              type="date"
              value={filtroDataTermIni}
              onChange={e => setFiltroDataTermIni(e.target.value)}
              onClick={e => e.target.showPicker?.()}
              className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">até</span>
            <input
              type="date"
              value={filtroDataTermFim}
              onChange={e => setFiltroDataTermFim(e.target.value)}
              onClick={e => e.target.showPicker?.()}
              min={filtroDataTermIni || undefined}
              className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
            />
            {(filtroDataTermIni || filtroDataTermFim) && (
              <button
                onClick={() => { setFiltroDataTermIni(''); setFiltroDataTermFim('') }}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                title="Limpar datas"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CARDS KPI — Projetos por status */}
      {(() => {
        const projCards = Object.entries(STATUS_CARD_CONFIG)
          .map(([status, cfg]) => ({ status, cfg, count: dadosGlobal.filter(p => p.status === status).length }))
          .filter(c => c.count > 0)
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

      {/* CARDS KPI — dinâmicos por status de tarefas + Atrasadas + Hoje */}
      {(() => {
        const countTarefas = (status) => dadosGlobal.reduce((s, p) => s + (p.proj_tarefas || []).filter(t => t.status_kanban === status).length, 0)
        const cards = []
        for (const status of ['mapeado', 'programado', 'em_andamento']) {
          const cnt = countTarefas(status)
          if (cnt > 0) cards.push({ key: status, cfg: STATUS_CARD_CONFIG[status], count: cnt, kind: 'status' })
          if (status === 'em_andamento') {
            if (qtdAtrasadas > 0) cards.push({ key: 'atrasadas', count: qtdAtrasadas, kind: 'atrasadas' })
            if (qtdHoje > 0)      cards.push({ key: 'hoje',      count: qtdHoje,      kind: 'hoje'      })
          }
        }
        for (const status of ['pausado', 'concluido']) {
          const cnt = countTarefas(status)
          if (cnt > 0) cards.push({ key: status, cfg: STATUS_CARD_CONFIG[status], count: cnt, kind: 'status' })
        }
        const totalTarefas = dadosGlobal.reduce((s, p) => s + (p.proj_tarefas || []).length, 0)
        cards.push({ key: 'total', count: totalTarefas, kind: 'total' })
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: '10px' }}>
            {cards.map(c => {
              if (c.kind === 'status') return (
                <CardKpi key={c.key} icon={c.cfg.icon} label={c.cfg.label} count={c.count}
                  ativo={filtroCards.has(c.key)}
                  onClick={() => setFiltroCards(prev => { const s = new Set(prev); s.has(c.key) ? s.delete(c.key) : s.add(c.key); return s })}
                  st={c.cfg.st} />
              )
              if (c.kind === 'atrasadas') return (
                <CardKpi key="atrasadas" icon={AlertTriangle} label="Atrasadas" count={c.count}
                  ativo={filtroAtrasadas} onClick={() => { setFiltroAtrasadas(p => !p); setFiltroHoje(false) }}
                  st={{ bg:'bg-red-50', border:'border-red-200', ring:'ring-red-300', icoBg:'bg-red-100', icoTxt:'text-red-600', numTxt:'text-red-700', labelTxt:'text-red-500' }} />
              )
              if (c.kind === 'hoje') return (
                <CardKpi key="hoje" icon={CalendarCheck} label="Hoje" count={c.count}
                  ativo={filtroHoje} onClick={() => { setFiltroHoje(p => !p); setFiltroAtrasadas(false) }}
                  st={{ bg:'bg-sky-50', border:'border-sky-200', ring:'ring-sky-300', icoBg:'bg-sky-100', icoTxt:'text-sky-600', numTxt:'text-sky-700', labelTxt:'text-sky-500' }} />
              )
              return (
                <CardKpi key="total" icon={Layers} label="Total Tarefas" count={c.count} ativo={false}
                  onClick={() => { setFiltroCards(new Set()); setFiltroAtrasadas(false); setFiltroHoje(false) }}
                  st={{ bg:'bg-slate-50', border:'border-slate-200', ring:'ring-slate-300', icoBg:'bg-slate-100', icoTxt:'text-slate-500', numTxt:'text-slate-800', labelTxt:'text-slate-400' }} />
              )
            })}
          </div>
        )
      })()}

      {/* FILTROS */}
      <ProjetosFiltrosPanel projetos={dados} />

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
        {!loading && dadosFiltrados.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <span className="text-[11px] text-slate-400 font-medium">
              {dadosFiltrados.length} projeto{dadosFiltrados.length !== 1 ? 's' : ''}
              {expandidos.size > 0 && ` · ${expandidos.size} expandido${expandidos.size !== 1 ? 's' : ''}`}
            </span>
            <button
              onClick={anyExpanded ? handleRecolherTodos : handleExpandirTodos}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {anyExpanded
                ? <><ChevronDown className="h-3.5 w-3.5" /> Recolher todos</>
                : <><ChevronRight className="h-3.5 w-3.5" /> Expandir todos</>
              }
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : (
          <table className="text-left border-collapse text-xs" style={{ minWidth: anyExpanded ? '1700px' : '1020px' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                {[
                  { campo: 'titulo',       label: 'Título / Tarefa / Deliberações', style: { minWidth: '360px' } },
                  { campo: 'sistemas',     label: 'Sistemas', style: { minWidth: '160px' } },
                  { campo: 'depto',        label: 'Departamento / Área' },
                  { campo: 'resp_projeto', label: 'Resp.Projeto / Tarefa', style: { minWidth: '160px' } },
                  { campo: 'status',       label: 'Status / Fase', style: { minWidth: '160px' } },
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
                            setSortConfig(prev => {
                              const i = prev.findIndex(k => k.campo === campo)
                              if (i !== -1) {
                                const next = [...prev]
                                next[i] = { campo, dir: prev[i].dir === 'asc' ? 'desc' : 'asc' }
                                return next
                              }
                              return [...prev, { campo, dir: 'asc' }]
                            })
                          } else {
                            setSortConfig(prev => {
                              const cur = prev.find(k => k.campo === campo)
                              return [{ campo, dir: cur?.dir === 'asc' ? 'desc' : 'asc' }]
                            })
                          }
                        }}
                        className="flex items-center gap-1 uppercase font-bold tracking-wider hover:text-blue-600 transition-colors"
                      >
                        {label}
                        <span className="normal-case font-normal flex items-center gap-0.5">
                          {ativo ? (dir === 'asc' ? '↑' : '↓') : '↕'}
                          {ativo && sortConfig.length > 1 && (
                            <span className="text-[8px] text-blue-400 font-bold">{idx + 1}</span>
                          )}
                        </span>
                      </button>
                    </th>
                  )
                })}
                {anyExpanded && (
                  <>
                    {[
                      { campo: 'sistema',     label: 'Sistema' },
                      { campo: 'unidade',     label: 'Unidade' },
                    ].map(({ campo, label }) => {
                      const idx = sortConfig.findIndex(k => k.campo === campo)
                      const ativo = idx !== -1
                      const dir = ativo ? sortConfig[idx].dir : null
                      return (
                        <th key={campo} className="p-3 whitespace-nowrap">
                          <button
                            title="Clique: ordenar | Shift+Clique: adicionar ordenação secundária"
                            onClick={e => {
                              if (e.shiftKey) {
                                setSortConfig(prev => {
                                  const i = prev.findIndex(k => k.campo === campo)
                                  if (i !== -1) {
                                    const next = [...prev]
                                    next[i] = { campo, dir: prev[i].dir === 'asc' ? 'desc' : 'asc' }
                                    return next
                                  }
                                  return [...prev, { campo, dir: 'asc' }]
                                })
                              } else {
                                setSortConfig(prev => {
                                  const cur = prev.find(k => k.campo === campo)
                                  return [{ campo, dir: cur?.dir === 'asc' ? 'desc' : 'asc' }]
                                })
                              }
                            }}
                            className="flex items-center gap-1 uppercase font-bold tracking-wider hover:text-blue-600 transition-colors"
                          >
                            {label}
                            <span className="normal-case font-normal flex items-center gap-0.5">
                              {ativo ? (dir === 'asc' ? '↑' : '↓') : '↕'}
                              {ativo && sortConfig.length > 1 && (
                                <span className="text-[8px] text-blue-400 font-bold">{idx + 1}</span>
                              )}
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </>
                )}
                <th className="p-3 w-20 text-center sticky right-0 bg-slate-50 border-l border-slate-200">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {dadosFiltrados.length === 0 ? (
                <tr><td colSpan={anyExpanded ? 11 : 9} className="p-10 text-center text-slate-400">Nenhum projeto encontrado.</td></tr>
              ) : dadosFiltrados.map(p => {
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
                    {/* ── Linha do projeto ── */}
                    <tr
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-slate-100 ${expandido ? 'bg-blue-50/20' : ''} ${atrasado && !expandido ? 'bg-red-50/30' : ''}`}
                      onClick={() => navigate(`/projetos/${p.id}`)}
                    >
                      <td className="p-3">
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
                          <FolderKanban className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="font-bold text-slate-900">{p.nome}</span>
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
                      <td className="p-3 text-slate-600 whitespace-nowrap">{p.responsavel_nome || '—'}</td>
                      <td className="p-3 leading-tight">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cor}`}>{st.label}</span>
                        {p.fase_nome && <span className="block italic text-slate-400 text-[10px] pl-0.5 mt-0.5">{p.fase_nome}</span>}
                      </td>
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
                      {anyExpanded && <><td className="p-3 text-slate-400">—</td><td className="p-3 text-slate-400">—</td></>}
                      <td className="p-3 text-center sticky right-0 bg-white border-l border-slate-100 shadow-[-4px_0_12px_rgba(0,0,0,0.03)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {canEditar && (
                            <button
                              onClick={() => navigate(`/projetos/${p.id}/editar`)}
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

                    {/* ── Linhas de tarefas (expandidas) ── */}
                    {expandido && tarefas.length > 0 && (() => {
                      const sel = tarefasSelecionadas[p.id] || new Set()
                      const todasSel = tarefas.length > 0 && tarefas.every(t => sel.has(t.id))
                      return (
                        <tr className="border-b border-slate-200 bg-slate-200/50">
                          <td colSpan={anyExpanded ? 11 : 9} className="py-1 px-3">
                            <div className="flex items-center gap-3 pl-6">
                              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                                <input
                                  type="checkbox"
                                  checked={todasSel}
                                  onChange={() => toggleSelecionarTodas(p.id, tarefas)}
                                  className="w-3.5 h-3.5 accent-blue-600"
                                />
                                Selecionar todos
                              </label>
                              {sel.size > 0 && canExcluirTar && (
                                <button
                                  onClick={() => excluirTarefasSelecionadas(p.id)}
                                  className="flex items-center gap-1 px-2.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Excluir {sel.size} selecionada{sel.size !== 1 ? 's' : ''}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })()}
                    {expandido && tarefas.map((t, i) => {
                      const kt = KANBAN_MAP[t.status_kanban] || { label: t.status_kanban, cor: 'bg-slate-100 text-slate-500' }
                      const atrasadaTarefa = isAtrasadaTarefa(t)
                      const delibersAberto = deliberacoesExpandidas.has(t.id)
                      const delibers = deliberacoesPorTarefa[t.id] || []
                      const formDelib = novaDelib[t.id] || { data: hoje2, texto: '' }
                      return (
                        <React.Fragment key={t.id}>
                          {/* linha da tarefa */}
                          <tr className={`text-[11px] border-b border-slate-100/60 ${atrasadaTarefa ? 'bg-red-50/20' : 'bg-slate-50/50'} hover:bg-slate-100/60 transition-colors`}>
                            <td className="py-2 pr-3 pl-7">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={(tarefasSelecionadas[p.id] || new Set()).has(t.id)}
                                  onChange={() => toggleSelecionarTarefa(p.id, t.id)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-3.5 h-3.5 accent-blue-600 shrink-0"
                                />
                                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                                {t.etapa != null && (
                                  <span className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${t.status_kanban === 'em_andamento' ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>{t.etapa}</span>
                                )}
                                <span className="text-slate-700 flex-1">{t.nome}</span>
                                <button
                                  onClick={() => toggleDeliberacoes(t.id)}
                                  title="Deliberações"
                                  className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${delibersAberto ? 'bg-blue-100 text-blue-600' : (delibers.length > 0 || (tarefaDelibsMap[t.id] ?? 0) > 0) ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-500'}`}
                                >
                                  <Plus className={`h-3 w-3 transition-transform duration-150 ${delibersAberto ? 'rotate-45' : ''}`} />
                                  {(() => { const n = delibers.length || tarefaDelibsMap[t.id] || 0; return n > 0 ? <span>{n}</span> : null })()}
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-400">—</td>
                            <td className="py-2 px-3 text-slate-600 leading-tight">
                              <span className="block">{p.departamento_nome || '—'}</span>
                              {p.area_nome && <span className="block italic text-slate-400 text-[10px]">{p.area_nome}</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{t.responsavel_nome || '—'}</td>
                            <td className="py-2 px-3 leading-tight">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${kt.cor}`}>{kt.label}</span>
                              {t.fase_nome && <span className="block italic text-slate-400 text-[10px] pl-0.5 mt-0.5">{t.fase_nome}</span>}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">{(() => {
                              const pct = t.status_kanban === 'concluido' ? 100 : Math.min(100, t.progresso_pct || 0)
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-14 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[11px] text-slate-400">{pct}%</span>
                                </div>
                              )
                            })()}</td>
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{fmtData(t.data_inicio)}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={
                                atrasadaTarefa       ? 'text-red-600 font-bold' :
                                isHojeTarefa(t)      ? 'text-blue-600 font-bold' :
                                                       'text-slate-400'
                              }>{fmtData(t.data_fim)}</span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {t.sistema_nome
                                ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: sistemaCorMap[t.sistema_nome] || '#1e293b', color: sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistemaCorMap[t.sistema_nome] || '#1e293b') }}>{t.sistema_nome}</span>
                                : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{t.empresa_nome || '—'}</td>
                            <td className="py-2 px-3 sticky right-0 bg-slate-50/80 border-l border-slate-100">
                              <div className="flex items-center justify-center gap-1">
                                {t.status_kanban !== 'concluido' && (
                                  <button
                                    onClick={() => setModalConcluir({ tarefa: t, dataFim: hoje2 })}
                                    className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                    title="Concluir tarefa"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </button>
                                )}
                                <button onClick={() => abrirEditTarefa(t)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar tarefa">
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button onClick={() => setModalExcluirTarefa(t)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir tarefa">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* painel de deliberações */}
                          {delibersAberto && (
                            <tr className="border-b border-blue-100">
                              <td colSpan={anyExpanded ? 11 : 9} className="pl-14 pr-6 py-4 bg-blue-50/30">
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
                    {expandido && tarefas.length === 0 && !carregando && (
                      <tr className="bg-slate-50/50 border-b border-slate-100/60">
                        <td colSpan={anyExpanded ? 11 : 9} className="py-3 pl-10 text-[11px] text-slate-400 italic">Nenhuma tarefa cadastrada.</td>
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
        {filtroCards.size > 0 && <> · filtrado por <strong>{[...filtroCards].map(k => STATUS_CARD_CONFIG[k]?.label).filter(Boolean).join(', ')}</strong></>}
        {filtroCardProjetos.size > 0 && <> · status <strong>{[...filtroCardProjetos].map(k => STATUS_CARD_CONFIG[k]?.label).filter(Boolean).join(', ')}</strong></>}
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
