import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Edit2, Plus, Trash2, ShieldAlert, ArrowRight, Copy, MessageSquare, CheckCircle2, FolderInput, PlayCircle, Loader2, PartyPopper, RotateCcw, Eye, Filter, Activity, CheckCircle, AlertTriangle, Layers, X, Flag, ClipboardList } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros } from '../../context/ProjetosFiltrosContext'
import { apiService } from '../../services/api'
import { clearProjetosCache } from '../../services/projetosCache'
import TarefaFormModal from './TarefaFormModal'
import DeliberacoesModal from './DeliberacoesModal'
import ManifestacoesTab from './ManifestacoesTab'
import IniciarFaseModal from './IniciarFaseModal'

const STATUS_MAP = {
  mapeado:      { label: 'Mapeado',      cor: 'bg-slate-100 text-slate-600' },
  programado:   { label: 'Programado',   cor: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', cor: 'bg-amber-100 text-amber-700' },
  pausado:      { label: 'Pausado',      cor: 'bg-purple-100 text-purple-700' },
  concluido:    { label: 'Concluído',    cor: 'bg-teal-700 text-white' },
}

const STATUS_COR = {
  mapeado:      '#94a3b8',
  programado:   '#3b82f6',
  em_andamento: '#f59e0b',
  pausado:      '#a855f7',
  concluido:    '#0d9488',
}


const TASK_KPI_CFG = {
  mapeado:      { label: 'Mapeado',      icon: Layers,        st: { bg:'bg-slate-50',  border:'border-slate-200',  ring:'ring-slate-400',  icoBg:'bg-slate-100',  icoTxt:'text-slate-500',  numTxt:'text-slate-800',  labelTxt:'text-slate-400'  } },
  programado:   { label: 'Programado',   icon: CheckCircle,   st: { bg:'bg-blue-50',   border:'border-blue-100',   ring:'ring-blue-400',   icoBg:'bg-blue-100',   icoTxt:'text-blue-500',   numTxt:'text-blue-800',   labelTxt:'text-blue-400'   } },
  em_andamento: { label: 'Em Andamento', icon: Activity,      st: { bg:'bg-amber-50',  border:'border-amber-100',  ring:'ring-amber-400',  icoBg:'bg-amber-100',  icoTxt:'text-amber-500',  numTxt:'text-amber-800',  labelTxt:'text-amber-400'  } },
  pausado:      { label: 'Pausado',      icon: AlertTriangle, st: { bg:'bg-purple-50', border:'border-purple-100', ring:'ring-purple-400', icoBg:'bg-purple-100', icoTxt:'text-purple-500', numTxt:'text-purple-800', labelTxt:'text-purple-400' } },
  concluido:    { label: 'Concluído',    icon: CheckCircle2,  st: { bg:'bg-teal-50',   border:'border-teal-100',   ring:'ring-teal-400',   icoBg:'bg-teal-100',   icoTxt:'text-teal-500',   numTxt:'text-teal-800',   labelTxt:'text-teal-400'   } },
  cancelado:    { label: 'Cancelado',    icon: ShieldAlert,   st: { bg:'bg-red-50',    border:'border-red-100',    ring:'ring-red-400',    icoBg:'bg-red-100',    icoTxt:'text-red-500',    numTxt:'text-red-800',    labelTxt:'text-red-400'    } },
}

function CardKpi({ icon: Icon, label, count, ativo, onClick, st }) {
  return (
    <button onClick={onClick} className={`rounded-lg border px-3 py-2 text-left transition-all hover:shadow-md ${st.bg} ${st.border} ${ativo ? 'ring-2 ring-offset-1 ' + st.ring + ' shadow-md' : 'shadow-sm'}`}>
      <div className="flex items-center gap-1 mb-1">
        <div className={`p-0.5 rounded ${st.icoBg}`}><Icon className={`h-2.5 w-2.5 ${st.icoTxt}`} /></div>
        <p className={`text-[8px] font-bold uppercase tracking-wide leading-tight ${st.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${st.numTxt} leading-none`}>{count}</p>
    </button>
  )
}

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const getTextColor = (hex) => {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.5 ? '#1e293b' : '#ffffff'
}

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state: navState, search } = useLocation()
  const _searchParams = new URLSearchParams(search)
  const { hasActionOrDefault, usuarioId, isAdmin } = useAuth()
  const { modoVerTodos } = useProjetosFiltros()
  const canEditar         = !modoVerTodos && hasActionOrDefault('projetos', 'editar')
  const canCriarTarefa        = !modoVerTodos && hasActionOrDefault('projetos', 'criar_tarefa')
  const canAlterarStatusTarefa = hasActionOrDefault('projetos', 'alterar_status_tarefa')
  const canEditarTarefa  = !modoVerTodos && hasActionOrDefault('projetos', 'editar_tarefa')
  const canExcluirTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'excluir_tarefa')
  const canMoverTarefa   = !modoVerTodos && hasActionOrDefault('projetos', 'mover_tarefa')
  const canDuplicarTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'duplicar_tarefa')
  const canResetarTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'resetar_tarefa')
  const canIniciarTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'iniciar_tarefa')
  const canConcluirTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'concluir_tarefa')
  const canDeliberacao   = !modoVerTodos && hasActionOrDefault('projetos', 'deliberacao')
  const canIniciarFase      = !modoVerTodos && hasActionOrDefault('projetos', 'iniciar_fase')
  const canResponderManif   = hasActionOrDefault('projetos/manifestacoes', 'responder_manifestacao')
  const canEncerrarManif    = hasActionOrDefault('projetos/manifestacoes', 'encerrar_periodo')

  const [aba, setAba] = useState(navState?.aba || _searchParams.get('aba') || 'tarefas')
  const [modalIniciarFase, setModalIniciarFase] = useState(false)
  const [projeto, setProjeto] = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [dependencias, setDependencias] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [sistemas, setSistemas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [fases, setFases] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalTarefa, setModalTarefa] = useState(null) // { tarefa: null|obj }
  const [modalDelib, setModalDelib] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [sortConfig, setSortConfig] = useState({ campo: 'etapa', dir: 'asc' })
  const [filtroStatusCard, setFiltroStatusCard] = useState(new Set())
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroSistema, setFiltroSistema] = useState('')
  const [filtroFase, setFiltroFase] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroDataTermIni, setFiltroDataTermIni] = useState('')
  const [filtroDataTermFim, setFiltroDataTermFim] = useState('')
  const [modalConcluir, setModalConcluir] = useState(null) // { tarefa, dataFim }
  const [modalConcluirProjeto, setModalConcluirProjeto] = useState(false)
  const [modalNovoProjeto, setModalNovoProjeto] = useState(null) // { nomeProjeto, salvando }
  const [tarefasSelecionadas, setTarefasSelecionadas] = useState(new Set())
  const [editandoEtapa, setEditandoEtapa] = useState(null)   // id da tarefa com etapa aberta
  const [salvandoEtapa, setSalvandoEtapa] = useState(null)   // id enquanto salva
  const [modalMover, setModalMover] = useState(null)         // tarefa a mover
  const [editProgresso, setEditProgresso] = useState(null)   // { id, value }
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [projetosLista, setProjetosLista] = useState([])
  const [projetoDestinoId, setProjetoDestinoId] = useState('')
  const [buscaProjeto, setBuscaProjeto] = useState('')
  const [movendoTarefa, setMovendoTarefa] = useState(false)
  const [convidados, setConvidados] = useState([])
  const [manifestacoesIniciais, setManifestoesIniciais] = useState([])
  const isConvidadoManif     = convidados.some(c => c.usuario_id === usuarioId)
  // A aba só existe se o projeto tiver alguma tarefa numa fase que aciona
  // manifestação (senão a mensagem "ainda não iniciado" apareceria em
  // projetos que nunca vão ter Período de Manifestação) — ou se o período já
  // foi iniciado/encerrado alguma vez (mantém o histórico visível mesmo que
  // a tarefa daquela fase tenha sido movida/excluída depois).
  const faseManifestacaoIds = new Set(fases.filter(f => f.aciona_manifestacao).map(f => f.id))
  const temTarefaManifestacao = tarefas.some(t => faseManifestacaoIds.has(t.fase_id))
  const manifestacaoJaIniciada = projeto?.manifestacao_status === 'aberto' || projeto?.manifestacao_status === 'encerrado'
  const podeVerManifestacoes = (isAdmin || canResponderManif || canEncerrarManif || isConvidadoManif)
    && (temTarefaManifestacao || manifestacaoJaIniciada)

  const loadData = useCallback(async () => {
    clearProjetosCache()
    setLoading(true); setError(null)
    try {
      const [proj, tfs, deps, conv, mans] = await Promise.all([
        apiService.getProjetoById(id),
        apiService.getTarefas(id),
        apiService.getDependencias(id),
        apiService.getConvidadosManifestacao(id),
        apiService.getManifestacoes(id),
      ])
      setProjeto(proj)
      setTarefas(tfs)
      setDependencias(deps)
      setConvidados(conv)
      setManifestoesIniciais(mans)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    Promise.all([
      apiService.getProjResponsaveis(),
      apiService.getProjSistemas(),
      apiService.getProjFases(),
      apiService.getProjEmpresas(),
      apiService.getProjAreas(),
      apiService.getUsuarios(),
    ]).then(([respData, sistData, faseData, empData, areaData, usuData]) => {
      setResponsaveis(respData.filter(r => r.ativo !== false))
      setSistemas(sistData.filter(s => s.ativo !== false))
      setFases(faseData.filter(f => f.ativo !== false))
      setEmpresas(empData.filter(e => e.ativo !== false))
      setAreas(areaData.filter(a => a.ativo !== false))
      setUsuarios(usuData)
    }).catch(() => {})
  }, [])

const abrirModalMover = async (tarefa) => {
    setModalMover({ ids: [tarefa.id], label: tarefa.nome })
    setProjetoDestinoId('')
    setBuscaProjeto('')
    const lista = await apiService.getProjetosLista().catch(() => [])
    setProjetosLista(lista.filter(p => p.id !== id))
  }

  const duplicarTarefasSelecionadas = async () => {
    if (tarefasSelecionadas.size === 0) return
    const selecionadas = tarefasOrdenadas.filter(t => tarefasSelecionadas.has(t.id))
    try {
      await Promise.all(selecionadas.map(t => {
        const { id: _id, criado_em, atualizado_em, ...resto } = t
        return apiService.createTarefa({ ...resto, etapa: null })
      }))
      setTarefasSelecionadas(new Set())
      await loadData()
    } catch (err) { alert('Erro ao duplicar: ' + (err.message || String(err))) }
  }

  const abrirModalMoverSelecionadas = async () => {
    if (tarefasSelecionadas.size === 0) return
    const n = tarefasSelecionadas.size
    setModalMover({ ids: [...tarefasSelecionadas], label: `${n} tarefa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}` })
    setProjetoDestinoId('')
    setBuscaProjeto('')
    const lista = await apiService.getProjetosLista().catch(() => [])
    setProjetosLista(lista.filter(p => p.id !== id))
  }

  const handleMoverTarefa = async () => {
    if (!projetoDestinoId || !modalMover) return
    setMovendoTarefa(true)
    try {
      await Promise.all(modalMover.ids.map(tid => apiService.updateTarefa(tid, { projeto_id: projetoDestinoId, etapa: null })))
      setModalMover(null)
      setTarefasSelecionadas(new Set())
      await loadData()
    } catch (err) { alert('Erro ao mover tarefa: ' + (err.message || String(err))) }
    finally { setMovendoTarefa(false) }
  }

  const handleExcluirTarefa = async () => {
    try {
      const etapaDeletada = modalExcluir.etapa
      await apiService.deleteTarefa(modalExcluir.id)
      if (etapaDeletada != null) {
        const afetadas = tarefas.filter(t => t.id !== modalExcluir.id && t.etapa != null && t.etapa > etapaDeletada)
        await Promise.all(afetadas.map(t => apiService.updateTarefa(t.id, { etapa: t.etapa - 1 })))
      }
      await loadData()
    } catch (err) { alert('Erro ao excluir: ' + (err.message || String(err))) }
    finally { setModalExcluir(null) }
  }

  if (loading) return <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">{error}</div>
    </div>
  )
  if (!projeto) return null

  const st = STATUS_MAP[projeto.status] || { label: projeto.status, cor: 'bg-slate-100 text-slate-500' }
  const nomeUsuario = (email) => usuarios.find(u => u.email === email)?.nome || email

  const handleProximaEtapa = (t) => {
    const proximoDia = t.data_fim
      ? new Date(new Date(t.data_fim + 'T12:00:00').getTime() + 86400000).toISOString().split('T')[0]
      : ''
    setModalTarefa({ tarefa: null, prefill: {
      nome: t.nome,
      status_kanban: 'mapeado',
      progresso_pct: 0,
      data_inicio: proximoDia,
      data_fim: '',
      fase_nome: t.fase_nome || '',
      sistema_nome: t.sistema_nome || '',
      responsavel_nome: t.responsavel_nome || '',
      area_nome: t.area_nome || projeto.area_nome || '',
      empresa_nome: t.empresa_nome || '',
    }})
  }

  const handleDuplicar = (t) => {
    setModalTarefa({ tarefa: null, prefill: {
      nome: t.nome,
      status_kanban: t.status_kanban,
      progresso_pct: t.progresso_pct,
      data_inicio: t.data_inicio || '',
      data_fim: t.data_fim || '',
      fase_nome: t.fase_nome || '',
      sistema_nome: t.sistema_nome || '',
      responsavel_nome: t.responsavel_nome || '',
      area_nome: t.area_nome || projeto.area_nome || '',
      empresa_nome: t.empresa_nome || '',
    }})
  }

  const hoje = new Date()
  const hojeISO = hoje.toISOString().slice(0, 10)
  const isAtrasada = (t) => t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
  const isHoje     = (t) => t.status_kanban !== 'concluido' && t.data_fim === hojeISO

  const handleIniciarTarefa = async (tarefa) => {
    try {
      await apiService.updateTarefa(tarefa.id, { status_kanban: 'em_andamento' })
      await loadData()
    } catch (err) { alert('Erro ao iniciar: ' + (err.message || String(err))) }
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
      setModalConcluir(null)
      const todasConcluidas = tarefas.length > 0 &&
        tarefas.every(t => t.id === tarefa.id ? true : t.status_kanban === 'concluido')
      if (todasConcluidas && projeto?.status !== 'concluido') {
        setModalConcluirProjeto(true)
      }
      await loadData()
    } catch (err) { alert('Erro: ' + (err.message || String(err))) }
  }

  const handleConcluirProjeto = async () => {
    try {
      await apiService.updateProjeto(id, { status: 'concluido' })
      setModalConcluirProjeto(false)
      await loadData()
    } catch (err) { alert('Erro ao concluir projeto: ' + (err.message || String(err))) }
  }

  const handleMoverParaNovoProjeto = async () => {
    if (!modalNovoProjeto?.nomeProjeto?.trim()) return
    setModalNovoProjeto(prev => ({ ...prev, salvando: true }))
    try {
      const novo = await apiService.createProjeto({
        nome:               modalNovoProjeto.nomeProjeto.trim(),
        departamento_nome:  projeto.departamento_nome  || null,
        area_nome:          projeto.area_nome           || null,
        sistema_nome:       projeto.sistema_nome        || null,
        responsavel_nome:   projeto.responsavel_nome    || null,
        status:             'mapeado',
      }, null)
      await Promise.all([...tarefasSelecionadas].map(tid =>
        apiService.updateTarefa(tid, { projeto_id: novo.id, etapa: null })
      ))
      setModalNovoProjeto(null)
      setTarefasSelecionadas(new Set())
      navigate(`/projetos/detalhe/${novo.id}`)
    } catch (err) {
      alert('Erro: ' + (err.message || String(err)))
      setModalNovoProjeto(prev => ({ ...prev, salvando: false }))
    }
  }

  // Filtros Avançados aplicados sem considerar seleção de card
  const tarefasFiltradas = (() => {
    let base = [...tarefas]
    if (filtroResponsavel) base = base.filter(t => t.responsavel_nome === filtroResponsavel)
    if (filtroArea)        base = base.filter(t => t.area_nome === filtroArea)
    if (filtroSistema)     base = base.filter(t => t.sistema_nome === filtroSistema)
    if (filtroFase)        base = base.filter(t => t.fase_nome === filtroFase)
    if (filtroUnidade)     base = base.filter(t => t.empresa_nome === filtroUnidade)
    if (filtroDataTermIni) base = base.filter(t => t.data_fim && t.data_fim >= filtroDataTermIni)
    if (filtroDataTermFim) base = base.filter(t => t.data_fim && t.data_fim <= filtroDataTermFim)
    return base
  })()

  const tarefasOrdenadas = (() => {
    let base = filtroStatusCard.size > 0 ? tarefasFiltradas.filter(t => filtroStatusCard.has(t.status_kanban || 'mapeado')) : tarefasFiltradas
    if (!sortConfig.campo) return base
    return [...base].sort((a, b) => {
      const vals = {
        etapa:         [a.etapa ?? 999,                           b.etapa ?? 999],
        nome:          [(a.nome || '').toLowerCase(),             (b.nome || '').toLowerCase()],
        responsavel:   [(a.responsavel_nome || '').toLowerCase(), (b.responsavel_nome || '').toLowerCase()],
        sistema_nome:  [(a.sistema_nome || '').toLowerCase(),     (b.sistema_nome || '').toLowerCase()],
        area_nome:     [(a.area_nome || '').toLowerCase(),        (b.area_nome || '').toLowerCase()],
        data_inicio:   [a.data_inicio || '',                      b.data_inicio || ''],
        data_fim:      [a.data_fim || '',                         b.data_fim || ''],
        status_kanban: [a.status_kanban || '',                    b.status_kanban || ''],
        progresso_pct: [a.progresso_pct || 0,                     b.progresso_pct || 0],
      }
      const [va, vb] = vals[sortConfig.campo] || ['', '']
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortConfig.dir === 'asc' ? cmp : -cmp
    })
  })()

  // Etapa "atual": a de menor número entre as ainda não concluídas — é a
  // única que deve aparecer em laranja (está ou deve ser executada agora)
  const etapaAtual = (() => {
    const abertas = tarefas.filter(t => t.etapa != null && t.status_kanban !== 'concluido')
    return abertas.length > 0 ? Math.min(...abertas.map(t => t.etapa)) : null
  })()

  const todasSelecionadas = tarefasOrdenadas.length > 0 && tarefasOrdenadas.every(t => tarefasSelecionadas.has(t.id))

  const toggleSelecionarTarefa = (tarefaId) => {
    setTarefasSelecionadas(prev => {
      const s = new Set(prev)
      if (s.has(tarefaId)) s.delete(tarefaId)
      else s.add(tarefaId)
      return s
    })
  }

  const toggleSelecionarTodas = () => {
    const ids = tarefasOrdenadas.map(t => t.id)
    setTarefasSelecionadas(todasSelecionadas ? new Set() : new Set(ids))
  }

  const excluirTarefasSelecionadas = async () => {
    if (tarefasSelecionadas.size === 0) return
    if (!window.confirm(`Excluir ${tarefasSelecionadas.size} tarefa(s) selecionada(s)? Esta ação não pode ser desfeita.`)) return
    try {
      const ids = [...tarefasSelecionadas]
      const etapasDeletadas = tarefas
        .filter(t => ids.includes(t.id) && t.etapa != null)
        .map(t => t.etapa)
      await Promise.all(ids.map(id => apiService.deleteTarefa(id)))
      if (etapasDeletadas.length > 0) {
        const tarefasRestantes = tarefas.filter(t => !ids.includes(t.id) && t.etapa != null)
        await Promise.all(tarefasRestantes.map(t => {
          const shift = etapasDeletadas.filter(e => e < t.etapa).length
          return shift > 0 ? apiService.updateTarefa(t.id, { etapa: t.etapa - shift }) : Promise.resolve()
        }))
      }
      setTarefasSelecionadas(new Set())
      await loadData()
    } catch (err) { alert('Erro ao excluir: ' + (err.message || String(err))) }
  }

  const resetarTarefasSelecionadas = async () => {
    if (tarefasSelecionadas.size === 0) return
    if (!window.confirm(`Resetar ${tarefasSelecionadas.size} tarefa(s): status, datas, progresso e sistema serão limpos. Confirmar?`)) return
    try {
      await Promise.all([...tarefasSelecionadas].map(id => apiService.updateTarefa(id, {
        status_kanban: 'mapeado',
        data_inicio:   null,
        data_fim:      null,
        progresso_pct: 0,
        sistema_nome:  null,
      })))
      setTarefasSelecionadas(new Set())
      await loadData()
    } catch (err) { alert('Erro ao resetar: ' + (err.message || String(err))) }
  }

  const salvarEtapaInline = async (t, novaEtapa) => {
    setSalvandoEtapa(t.id)
    try {
      if (novaEtapa != null) {
        // Abre espaço pra inserir nessa posição empurrando pra baixo (soma 1) quem já estava
        // nela em diante, em vez de apagar a etapa de quem já tinha uma — mesmo raciocínio já
        // usado ao excluir tarefas (shift), só que abrindo espaço em vez de fechando. Processa
        // da maior etapa pra menor pra nunca colidir com a próxima durante os updates.
        const paraEmpurrar = tarefas
          .filter(c => c.id !== t.id && c.etapa != null && c.etapa >= novaEtapa)
          .sort((a, b) => b.etapa - a.etapa)
        for (const c of paraEmpurrar) {
          await apiService.updateTarefa(c.id, { etapa: c.etapa + 1 })
          setTarefas(prev => prev.map(x => x.id === c.id ? { ...x, etapa: c.etapa + 1 } : x))
        }
      }
      await apiService.updateTarefa(t.id, { etapa: novaEtapa })
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, etapa: novaEtapa } : x))
    } catch (err) { alert('Erro ao salvar etapa: ' + (err.message || String(err))) }
    finally { setSalvandoEtapa(null); setEditandoEtapa(null) }
  }

  const salvarProgresso = async (id, valor) => {
    const pct = Math.min(100, Math.max(0, Number(valor) || 0))
    try {
      await apiService.updateTarefa(id, { progresso_pct: pct })
      setTarefas(prev => prev.map(x => x.id === id ? { ...x, progresso_pct: pct } : x))
    } catch (err) { alert('Erro ao salvar progresso: ' + (err.message || String(err))) }
    finally { setEditProgresso(null) }
  }

  const handleSalvarPDF = async () => {
    const cabEl = document.getElementById('projeto-detalhe-cabecalho')
    const tabEl = document.getElementById('projeto-detalhe-tabela')
    if (!cabEl && !tabEl) return
    setGerandoPDF(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const MARGIN = 20
      const GAP    = 8
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth()  - 2 * MARGIN
      const CH = pdf.internal.pageSize.getHeight() - 2 * MARGIN
      const WRAP_W = 1600

      const capture = async (el) => {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:white;z-index:-1;`
        const clone = el.cloneNode(true)
        clone.querySelectorAll('.no-print').forEach(e => { e.style.display = 'none' })
        clone.querySelectorAll('table').forEach(t => { t.style.fontSize = '13px' })
        wrap.appendChild(clone)
        document.body.appendChild(wrap)
        try {
          return await html2canvas(clone, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: WRAP_W })
        } finally {
          document.body.removeChild(wrap)
        }
      }

      const getH = (c) => (c.height / c.width) * CW
      const place = (c, y) => {
        const h = getH(c)
        pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, y, CW, h)
        return h
      }
      const placeSliced = (c, startY) => {
        const pageHpx = Math.floor(c.width * CH / CW)
        let srcY = 0; let y = startY
        while (srcY < c.height) {
          if (srcY > 0) { pdf.addPage(); y = MARGIN }
          const sliceH = Math.min(pageHpx, c.height - srcY)
          const slice = document.createElement('canvas')
          slice.width = c.width; slice.height = Math.ceil(sliceH)
          const ctx2 = slice.getContext('2d')
          ctx2.fillStyle = '#fff'
          ctx2.fillRect(0, 0, slice.width, slice.height)
          ctx2.drawImage(c, 0, -srcY)
          pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, y, CW, (sliceH / c.width) * CW)
          y += (sliceH / c.width) * CW + 2
          srcY += pageHpx
        }
        return y
      }

      let y = MARGIN
      if (cabEl) { y += place(await capture(cabEl), y) + GAP }
      if (tabEl) {
        const tabC = await capture(tabEl)
        if (y + getH(tabC) <= MARGIN + CH) place(tabC, y)
        else placeSliced(tabC, y)
      }

      pdf.save(`Projeto - ${projeto.nome}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerandoPDF(false)
    }
  }

  const sistemaCorMap      = Object.fromEntries(sistemas.map(s => [s.nome, s.cor || '#1e293b']))
  const sistemaCorTextoMap = Object.fromEntries(sistemas.map(s => [s.nome, s.cor_texto || null]))
  const getTextColor = (hex) => {
    const h = hex || '#1e293b'
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16)
    return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      {modoVerTodos && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
          <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          Modo Visualização Geral — todas as edições estão bloqueadas.
        </div>
      )}
      {/* CABEÇALHO */}
      <div id="projeto-detalhe-cabecalho" className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => navigate('/projetos')} className="p-1.5 mt-0.5 shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{projeto.nome}</h1>
              {projeto.sistemas_nomes && projeto.sistemas_nomes.length > 0 && projeto.sistemas_nomes.map(nome => {
                const cor = sistemaCorMap[nome] || '#1e293b'
                return (
                  <span key={nome} style={{ backgroundColor: cor, color: sistemaCorTextoMap[nome] || getTextColor(cor) }}
                    className="inline-flex px-2.5 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                    {nome}
                  </span>
                )
              })}
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.cor}`}>{st.label}</span>
              {projeto.fase_nome && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Flag className="h-3 w-3" /> {projeto.fase_nome}
                </span>
              )}
              {tarefas.length > 0 && (() => {
                const pct = Math.round(tarefas.reduce((s, t) => s + (t.status_kanban === 'concluido' ? 100 : Number(t.progresso_pct) || 0), 0) / tarefas.length)
                return (
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct === 100 ? 'bg-teal-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${pct === 100 ? 'text-teal-600' : 'text-slate-600'}`}>{pct}%</span>
                  </div>
                )
              })()}
            </div>
            {(() => {
              const starts = tarefas.map(t => t.data_inicio).filter(Boolean).sort()
              const ends   = tarefas.map(t => t.data_fim).filter(Boolean).sort().reverse()
              const ini = starts[0] || null
              const fim = ends[0]   || null
              return (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  {(ini || fim) && (
                    <>
                      {ini && <span><span className="font-semibold text-slate-400">Início:</span> {fmtData(ini)}</span>}
                      {ini && fim && <span className="text-slate-300">→</span>}
                      {fim && <span><span className="font-semibold text-slate-400">Fim:</span> {fmtData(fim)}</span>}
                    </>
                  )}
                  {projeto.responsavel_nome && (
                    <>
                      {(ini || fim) && <span className="text-slate-300">·</span>}
                      <span><span className="font-semibold text-slate-400">Resp.:</span> {projeto.responsavel_nome}</span>
                    </>
                  )}
                  {projeto.criado_por && (
                    <>
                      {(ini || fim || projeto.responsavel_nome) && <span className="text-slate-300">·</span>}
                      <span>
                        <span className="font-semibold text-slate-400">Cadastrado por:</span> {nomeUsuario(projeto.criado_por)}
                        {projeto.criado_em && <> em {new Date(projeto.criado_em).toLocaleDateString('pt-BR')}</>}
                      </span>
                    </>
                  )}
                </p>
              )
            })()}
          </div>
        </div>
        <div className="no-print flex items-center gap-2 shrink-0">
          {canIniciarFase && (
            <button
              onClick={() => setModalIniciarFase(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors whitespace-nowrap"
            >
              <Flag className="h-3.5 w-3.5" /> Iniciar Fase
            </button>
          )}
          {canEditar && (
            <button
              onClick={() => navigate(`/projetos/detalhe/${id}/editar`)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors whitespace-nowrap"
            >
              <Edit2 className="h-3.5 w-3.5" /> Editar Projeto
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="no-print flex items-center gap-1 border-b border-slate-200">
        {[
          { key: 'tarefas', label: 'Tarefas', icon: Layers },
          podeVerManifestacoes && { key: 'manifestacoes', label: 'Manifestações', icon: ClipboardList },
        ].filter(Boolean).map(t => (
          <button
            key={t.key}
            onClick={() => setAba(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              aba === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            {t.key === 'manifestacoes' && projeto.manifestacao_status === 'aberto' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {aba === 'manifestacoes' && (
        <ManifestacoesTab projeto={projeto} onReload={loadData} convidados={convidados} manifestacoesInicial={manifestacoesIniciais} />
      )}

      {aba === 'tarefas' && (
      <>

      {/* BARRA FILTROS + NOVA TAREFA */}
      {(() => {
        const filterCount = [filtroResponsavel, filtroArea, filtroSistema, filtroFase, filtroUnidade].filter(Boolean).length
          + ((filtroDataTermIni || filtroDataTermFim) ? 1 : 0)
        return (
          <div className="flex items-start justify-end gap-2">
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={() => setFiltrosAbertos(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  filtrosAbertos ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros Avançados
                {filterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">{filterCount}</span>
                )}
                <span className="text-slate-400 text-[10px]">{filtrosAbertos ? '▲' : '▼'}</span>
              </button>
              {filterCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {[
                    filtroResponsavel && { key: 'resp', text: `Resp.: ${filtroResponsavel}`, clear: () => setFiltroResponsavel('') },
                    filtroArea        && { key: 'area', text: `Área: ${filtroArea}`,          clear: () => setFiltroArea('') },
                    filtroSistema     && { key: 'sist', text: `Sistema: ${filtroSistema}`,    clear: () => setFiltroSistema('') },
                    filtroFase        && { key: 'fase', text: `Fase: ${filtroFase}`,          clear: () => setFiltroFase('') },
                    filtroUnidade     && { key: 'uni',  text: `Unidade: ${filtroUnidade}`,    clear: () => setFiltroUnidade('') },
                    (filtroDataTermIni || filtroDataTermFim) && {
                      key: 'data',
                      text: `Térm.: ${filtroDataTermIni ? new Date(filtroDataTermIni + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'} → ${filtroDataTermFim ? new Date(filtroDataTermFim + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}`,
                      clear: () => { setFiltroDataTermIni(''); setFiltroDataTermFim('') },
                    },
                  ].filter(Boolean).map(chip => (
                    <span key={chip.key} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                      <span className="truncate max-w-[160px]">{chip.text}</span>
                      <button onClick={chip.clear} className="shrink-0 p-0.5 hover:bg-indigo-100 rounded-full transition-colors"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                  <button
                    onClick={() => { setFiltroResponsavel(''); setFiltroArea(''); setFiltroSistema(''); setFiltroFase(''); setFiltroUnidade(''); setFiltroDataTermIni(''); setFiltroDataTermFim('') }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition-colors shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" /> Limpar tudo
                  </button>
                </div>
              )}
            </div>
            {canCriarTarefa && (
              <button
                onClick={() => setModalTarefa({ tarefa: null, prefill: { area_nome: projeto.area_nome || '' } })}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md shadow-sm transition-colors shrink-0"
              >
                <Plus className="h-4 w-4" /> Nova Tarefa
              </button>
            )}
          </div>
        )
      })()}

      {/* Painel de filtros colapsável */}
      {filtrosAbertos && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Término:</span>
            <input type="date" value={filtroDataTermIni} onChange={e => setFiltroDataTermIni(e.target.value)}
              className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-400/30" />
            <span className="text-xs text-slate-400">até</span>
            <input type="date" value={filtroDataTermFim} onChange={e => setFiltroDataTermFim(e.target.value)} min={filtroDataTermIni || undefined}
              className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-400/30" />
          </div>
          {(() => {
            const optsResp    = [...new Set(tarefas.map(t => t.responsavel_nome).filter(Boolean))].sort()
            const optsArea    = [...new Set(tarefas.map(t => t.area_nome).filter(Boolean))].sort()
            const optsSistema = [...new Set(tarefas.map(t => t.sistema_nome).filter(Boolean))].sort()
            const optsFase    = [...new Set(tarefas.map(t => t.fase_nome).filter(Boolean))].sort()
            const optsUnidade = [...new Set(tarefas.map(t => t.empresa_nome).filter(Boolean))].sort()
            const selectCls = "text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 max-w-[160px]"
            const filters = [
              { label: 'Responsável', opts: optsResp,    value: filtroResponsavel, set: setFiltroResponsavel },
              { label: 'Área',        opts: optsArea,    value: filtroArea,        set: setFiltroArea },
              { label: 'Sistema',     opts: optsSistema, value: filtroSistema,     set: setFiltroSistema },
              { label: 'Fase',        opts: optsFase,    value: filtroFase,        set: setFiltroFase },
              { label: 'Unidade',     opts: optsUnidade, value: filtroUnidade,     set: setFiltroUnidade },
            ].filter(f => f.opts.length > 0)
            return (
              <div className="flex items-center gap-3 flex-wrap">
                {filters.map(({ label, opts, value, set }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">{label}:</span>
                    <select value={value} onChange={e => set(e.target.value)} className={selectCls}>
                      <option value="">Todos</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {value && <button onClick={() => set('')} className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">✕</button>}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* LISTA DE TAREFAS */}
      <div className="space-y-3">
        {/* KPI cards de status das tarefas */}
        {(() => {
          const counts = {}
          Object.keys(TASK_KPI_CFG).forEach(s => { counts[s] = 0 })
          tarefasFiltradas.forEach(t => { const s = t.status_kanban || 'mapeado'; if (counts[s] !== undefined) counts[s]++ })
          const cards = Object.entries(TASK_KPI_CFG).map(([status, cfg]) => ({ status, cfg, count: counts[status] || 0 }))
          return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length + 1}, 1fr)`, gap: '10px' }}>
              {cards.map(c => (
                <CardKpi key={c.status} icon={c.cfg.icon} label={c.cfg.label} count={c.count}
                  ativo={filtroStatusCard.has(c.status)}
                  onClick={() => setFiltroStatusCard(prev => { const s = new Set(prev); s.has(c.status) ? s.delete(c.status) : s.add(c.status); return s })}
                  st={c.cfg.st}
                />
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

        {/* Ações em massa + contagem */}
        {(tarefasSelecionadas.size > 0 || tarefasOrdenadas.length !== tarefas.length) && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {tarefasSelecionadas.size > 0 && (
              <>
                {canMoverTarefa && (
                  <button onClick={abrirModalMoverSelecionadas}
                    className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-semibold rounded transition-colors">
                    <FolderInput className="h-3 w-3" />
                    Mover {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                  </button>
                )}
                {canMoverTarefa && (
                  <button onClick={() => setModalNovoProjeto({ fase: 'pergunta', nomeProjeto: '', salvando: false })}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded transition-colors">
                    <Plus className="h-3 w-3" />
                    Novo Projeto com {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                  </button>
                )}
                {canDuplicarTarefa && (
                  <button onClick={duplicarTarefasSelecionadas}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded transition-colors">
                    <Copy className="h-3 w-3" />
                    Duplicar {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                  </button>
                )}
                {canResetarTarefa && (
                  <button onClick={resetarTarefasSelecionadas}
                    className="flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold rounded transition-colors">
                    <RotateCcw className="h-3 w-3" />
                    Resetar {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                  </button>
                )}
                {canExcluirTarefa && (
                  <button onClick={excluirTarefasSelecionadas}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded transition-colors">
                    <Trash2 className="h-3 w-3" />
                    Excluir {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                  </button>
                )}
              </>
            )}
            <span className="text-[10px] text-slate-400">
              {tarefasOrdenadas.length} tarefa{tarefasOrdenadas.length !== 1 ? 's' : ''} de {tarefasFiltradas.length} total
            </span>
          </div>
        )}
        <div id="projeto-detalhe-tabela" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="no-print p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={todasSelecionadas}
                    onChange={toggleSelecionarTodas}
                    className="w-3.5 h-3.5 accent-blue-600"
                    title="Selecionar todos"
                  />
                </th>
                {[
                  { campo: 'etapa',         label: 'Etapa',       cls: 'w-20' },
                  { campo: 'nome',          label: 'Tarefa',      cls: 'min-w-[320px]' },
                  { campo: 'sistema_nome',  label: 'Sistema',     subtitle: 'Depto / Área', cls: 'w-36' },
                  { campo: 'responsavel',   label: 'Responsável', cls: 'w-32' },
                  { campo: 'data_inicio',   label: 'Início',      cls: 'w-16' },
                  { campo: 'data_fim',      label: 'Fim',         cls: 'w-16' },
                  { campo: 'status_kanban', label: 'Status',      cls: 'w-28' },
                  { campo: 'progresso_pct', label: 'Progresso',   cls: 'w-28' },
                  { campo: 'empresa_nome',  label: 'Unidade',     cls: 'w-28' },
                ].map(({ campo, label, subtitle, cls = '' }) => (
                  <th key={campo} className={`p-3 ${cls}`}>
                    <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => setSortConfig(prev =>
                        prev.campo === campo
                          ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                          : { campo, dir: 'asc' }
                      )}
                      className="flex items-center gap-1 uppercase font-bold tracking-wider hover:text-blue-600 transition-colors"
                    >
                      {label}
                      <span className="normal-case font-normal">
                        {sortConfig.campo === campo ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                    {subtitle && <span className="text-[10px] font-normal normal-case text-slate-400 tracking-normal">{subtitle}</span>}
                    </div>
                  </th>
                ))}
                <th className="no-print p-3 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {tarefas.length === 0 ? (
                <tr><td colSpan="12" className="p-10 text-center text-slate-400">Nenhuma tarefa cadastrada.</td></tr>
              ) : tarefasOrdenadas.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50/70 transition-colors ${tarefasSelecionadas.has(t.id) ? 'bg-blue-50/60' : ''}`}>
                  <td className="no-print p-3 text-center">
                    <input
                      type="checkbox"
                      checked={tarefasSelecionadas.has(t.id)}
                      onChange={() => toggleSelecionarTarefa(t.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                  </td>
                  <td className="p-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    {editandoEtapa === t.id ? (
                      <select
                        autoFocus
                        value={t.etapa ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                          salvarEtapaInline(t, val)
                        }}
                        onBlur={() => { if (salvandoEtapa !== t.id) setEditandoEtapa(null) }}
                        disabled={salvandoEtapa === t.id}
                        className="text-[11px] p-1 border border-indigo-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/40 w-28"
                      >
                        <option value="">— Sem etapa —</option>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => {
                          const emUso = tarefas.some(x => x.id !== t.id && x.etapa === n)
                          return (
                            <option key={n} value={n}>
                              {n}ª Etapa{emUso ? ' (em uso)' : ''}
                            </option>
                          )
                        })}
                      </select>
                    ) : (
                      canEditarTarefa ? (
                        <button
                          onClick={() => setEditandoEtapa(t.id)}
                          title="Clique para alterar a etapa"
                          className="group inline-flex items-center justify-center w-9 h-9"
                        >
                          {t.etapa != null
                            ? <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold transition-colors shadow-sm ${t.etapa === etapaAtual ? 'bg-orange-500 text-white group-hover:bg-orange-600' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'}`}>{t.etapa}ª</span>
                            : <span className="text-slate-300 group-hover:text-indigo-400 text-lg transition-colors">+</span>}
                        </button>
                      ) : (
                        t.etapa != null
                          ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold shadow-sm bg-indigo-100 text-indigo-700">{t.etapa}ª</span>
                          : null
                      )
                    )}
                  </td>
                  <td className="p-3 leading-snug" style={{ whiteSpace: 'normal' }}>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-slate-900 flex-1">{t.nome}</span>
                      {canDeliberacao && (
                        <button onClick={() => setModalDelib(t)} className="shrink-0 mt-0.5 p-0.5 text-slate-300 hover:text-amber-500 transition-colors" title="Deliberações">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-0.5">
                      {t.sistema_nome
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: sistemaCorMap[t.sistema_nome] || '#1e293b', color: sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistemaCorMap[t.sistema_nome] || '#1e293b') }}>{t.sistema_nome}</span>
                        : <span className="text-slate-400">—</span>}
                      {(projeto.departamento_nome || t.area_nome || projeto.area_nome) && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5 whitespace-nowrap">
                          {[projeto.departamento_nome, t.area_nome || projeto.area_nome].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{t.responsavel_nome || '—'}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{fmtData(t.data_inicio)}</td>
                  <td className={`p-3 whitespace-nowrap font-medium ${
                    isAtrasada(t) ? 'text-red-600 font-bold' :
                    isHoje(t)     ? 'text-blue-600 font-bold' :
                                    'text-slate-500'
                  }`}>{fmtData(t.data_fim)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${(STATUS_MAP[t.status_kanban] || { cor: 'bg-slate-100 text-slate-500' }).cor}`}>
                        {(STATUS_MAP[t.status_kanban] || { label: t.status_kanban?.replace('_', ' ') || '—' }).label}
                      </span>
                      {t.fase_nome && <span className="text-[10px] text-slate-400 italic pl-0.5">{t.fase_nome}</span>}
                    </div>
                  </td>
                  <td className="p-3" onDoubleClick={() => t.status_kanban !== 'concluido' && setEditProgresso({ id: t.id, value: t.progresso_pct || 0 })}>
                    {(() => {
                      const pct = t.status_kanban === 'concluido' ? 100 : Math.min(100, t.progresso_pct || 0)
                      if (editProgresso?.id === t.id) return (
                        <input
                          type="number" min="0" max="100" autoFocus
                          value={editProgresso.value}
                          onChange={e => setEditProgresso(p => ({ ...p, value: e.target.value }))}
                          onBlur={() => salvarProgresso(t.id, editProgresso.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') salvarProgresso(t.id, editProgresso.value)
                            if (e.key === 'Escape') setEditProgresso(null)
                          }}
                          className="w-16 text-xs text-center p-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        />
                      )
                      return (
                        <div className="flex items-center gap-2 cursor-pointer" title="Duplo clique para editar">
                          <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct === 100 ? 'bg-teal-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-[11px] ${pct === 100 ? 'text-teal-600 font-bold' : 'text-slate-400'}`}>{pct}%</span>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{t.empresa_nome || '—'}</td>
                  <td className="no-print p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canIniciarTarefa && t.status_kanban === 'programado' && (
                        <button
                          onClick={() => handleIniciarTarefa(t)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Iniciar tarefa"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canConcluirTarefa && t.status_kanban === 'em_andamento' && (
                        <button
                          onClick={() => setModalConcluir({ tarefa: t, dataFim: hojeISO })}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          title="Concluir tarefa"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canEditarTarefa && (
                        <button onClick={() => handleProximaEtapa(t)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Próxima Etapa">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDuplicarTarefa && (
                        <button onClick={() => handleDuplicar(t)} className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Duplicar">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canEditarTarefa && (
                        <button onClick={() => setModalTarefa({ tarefa: t })} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canMoverTarefa && (
                        <button onClick={() => abrirModalMover(t)} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors" title="Mover para outro projeto">
                          <FolderInput className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canExcluirTarefa && (
                        <button onClick={() => setModalExcluir(t)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* MODAL MOVER PARA NOVO PROJETO */}
      {modalNovoProjeto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[440px] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-emerald-50 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mover para Novo Projeto</h3>
                <p className="text-xs text-slate-500">{tarefasSelecionadas.size} tarefa{tarefasSelecionadas.size !== 1 ? 's' : ''} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''} serão movidas</p>
              </div>
            </div>

            {/* FASE 1 — Pergunta sobre o título */}
            {modalNovoProjeto.fase === 'pergunta' && (
              <>
                <div className="p-5 space-y-4">
                  <p className="text-sm font-semibold text-slate-700">Deseja usar o título do projeto atual no novo projeto?</p>
                  <div className="bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200 text-xs text-slate-600 font-medium truncate">
                    "{projeto.nome}"
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalNovoProjeto(prev => ({ ...prev, fase: 'nome', nomeProjeto: projeto.nome }))}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      Sim, copiar título
                    </button>
                    <button
                      onClick={() => setModalNovoProjeto(prev => ({ ...prev, fase: 'nome', nomeProjeto: '' }))}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Não, digitar novo
                    </button>
                  </div>
                </div>
                <div className="flex justify-start p-3 bg-slate-50 border-t border-slate-100">
                  <button onClick={() => setModalNovoProjeto(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                </div>
              </>
            )}

            {/* FASE 2 — Nome do projeto */}
            {modalNovoProjeto.fase === 'nome' && (
              <>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Novo Projeto</label>
                    <input
                      type="text"
                      autoFocus
                      value={modalNovoProjeto.nomeProjeto}
                      onChange={e => setModalNovoProjeto(prev => ({ ...prev, nomeProjeto: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleMoverParaNovoProjeto()}
                      placeholder="Digite o nome do novo projeto..."
                      className="w-full mt-1 text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    />
                  </div>
                  <p className="text-xs text-slate-400">O novo projeto herdará departamento, área, sistema e responsável do projeto atual.</p>
                </div>
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setModalNovoProjeto(prev => ({ ...prev, fase: 'pergunta' }))}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:bg-slate-200/60 transition-colors"
                  >
                    ← Voltar
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setModalNovoProjeto(null)} disabled={modalNovoProjeto.salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                    <button
                      onClick={handleMoverParaNovoProjeto}
                      disabled={!modalNovoProjeto.nomeProjeto.trim() || modalNovoProjeto.salvando}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {modalNovoProjeto.salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {modalNovoProjeto.salvando ? 'Criando...' : 'Criar e Mover'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* MODAL CONCLUIR PROJETO */}
      {modalConcluirProjeto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[420px] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-center gap-4">
              <div className="p-3 bg-teal-100 text-teal-600 rounded-full shrink-0">
                <PartyPopper className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Todas as tarefas concluídas!</h3>
                <p className="text-xs text-slate-500 mt-0.5">Deseja marcar o projeto como <strong className="text-teal-700">Concluído</strong>?</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                O projeto <strong>"{projeto?.nome}"</strong> teve todas as suas tarefas concluídas.
                Deseja atualizar o status do projeto para <strong className="text-teal-700">Concluído</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalConcluirProjeto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={handleConcluirProjeto}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"
              >
                Sim, concluir projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAREFA */}
      {modalTarefa && (
        <TarefaFormModal
          projetoId={id}
          tarefa={modalTarefa.tarefa}
          initialValues={modalTarefa.prefill}
          tarefas={tarefas}
          dependenciasAtuais={dependencias}
          responsaveis={responsaveis}
          sistemas={sistemas}
          fases={fases}
          empresas={empresas}
          areas={areas}
          canAlterarStatus={canAlterarStatusTarefa}
          onClose={() => setModalTarefa(null)}
          onSaved={() => { setModalTarefa(null); loadData() }}
          onNavigate={(t) => setModalTarefa({ tarefa: t })}
        />
      )}

      {/* MODAL DELIBERAÇÕES */}
      {modalDelib && (
        <DeliberacoesModal tarefa={modalDelib} onClose={() => setModalDelib(null)} />
      )}

      {/* MODAL MOVER TAREFA */}
      {modalMover && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[460px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-full shrink-0">
                <FolderInput className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Mover para outro Projeto</h3>
                <p className="text-xs text-slate-500 truncate">{modalMover.label}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Buscar Projeto Destino</label>
                <input
                  type="text"
                  autoFocus
                  value={buscaProjeto}
                  onChange={e => { setBuscaProjeto(e.target.value); setProjetoDestinoId('') }}
                  placeholder="Digite o nome do projeto…"
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              {buscaProjeto.trim().length >= 1 && (
                <div className="border border-slate-200 rounded-md max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {projetosLista
                    .filter(p => p.nome.toLowerCase().includes(buscaProjeto.toLowerCase()))
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProjetoDestinoId(p.id); setBuscaProjeto(p.nome) }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          projetoDestinoId === p.id
                            ? 'bg-violet-50 text-violet-700 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p.nome}
                      </button>
                    ))}
                  {projetosLista.filter(p => p.nome.toLowerCase().includes(buscaProjeto.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhum projeto encontrado.</p>
                  )}
                </div>
              )}
              {projetoDestinoId && (
                <p className="text-xs text-violet-700 font-medium">
                  ✓ Destino selecionado: <strong>{buscaProjeto}</strong>
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalMover(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleMoverTarefa}
                disabled={!projetoDestinoId || movendoTarefa}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                <FolderInput className="h-3.5 w-3.5" />
                {movendoTarefa ? 'Movendo…' : 'Mover Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INICIAR FASE */}
      {modalIniciarFase && (
        <IniciarFaseModal
          projeto={projeto}
          fases={fases}
          onClose={() => setModalIniciarFase(false)}
          onSaved={() => { setModalIniciarFase(false); loadData() }}
        />
      )}

      {/* MODAL EXCLUIR TAREFA */}
      {modalExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remover Tarefa</h3>
                <p className="text-xs text-slate-500">Confirma a exclusão permanente de <strong className="text-slate-800">"{modalExcluir.nome}"</strong>?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleExcluirTarefa} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
