import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Edit2, Trash2, X, Loader2, Copy, ArrowRight, CheckCircle2, PlayCircle, FolderInput, RotateCcw, PartyPopper } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros } from '../../context/ProjetosFiltrosContext'
import { clearProjetosCache } from '../../services/projetosCache'
import { projLookups as _lookups } from '../../services/projLookups'
import TarefaFormModal from './TarefaFormModal'

const STATUS_PROJ = {
  mapeado:      'Mapeado',
  programado:   'Programado',
  em_andamento: 'Em Andamento',
  pausado:      'Pausado',
  concluido:    'Concluído',
}

const KANBAN_MAP = {
  mapeado:      { label: 'Mapeado',      cor: 'bg-slate-100 text-slate-600' },
  programado:   { label: 'Programado',   cor: 'bg-blue-100 text-blue-700' },
  em_andamento: { label: 'Em Andamento', cor: 'bg-amber-100 text-amber-700' },
  pausado:      { label: 'Pausado',      cor: 'bg-purple-100 text-purple-700' },
  concluido:    { label: 'Concluído',    cor: 'bg-teal-700 text-white' },
}

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : null
const hoje = new Date().toISOString().split('T')[0]

function getTextColor(hex) {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

const inp = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none'
const sel = inp + ' bg-white'
const Lbl = ({ children }) => <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{children}</label>

export default function ProjetoEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasActionOrDefault } = useAuth()
  const { modoVerTodos } = useProjetosFiltros()
  const canExcluir = !modoVerTodos && hasActionOrDefault('projetos', 'excluir')
  const canAlterarStatus = hasActionOrDefault('projetos', 'alterar_status')
  const isNew = !id

  // Se está em modo visualização geral, redireciona para o detalhe (sem edição)
  useEffect(() => {
    if (modoVerTodos) navigate(id ? `/projetos/detalhe/${id}` : '/projetos', { replace: true })
  }, [modoVerTodos, id, navigate])

  // Projeto
  const [proj, setProj] = useState({
    nome: '', departamento_nome: '', area_nome: '',
    status: 'mapeado', ativo: true,
    responsavel_nome: '',
    sistemas_nomes: [],
  })
  const [salvandoProj, setSalvandoProj] = useState(false)
  const [salvoProjOk, setSalvoProjOk] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [excluindoProj, setExcluindoProj] = useState(false)
  const [dropSistAberto, setDropSistAberto] = useState(false)
  const dropSistRef = useRef(null)
  const nomeInputRef = useRef(null)

  // Tarefas
  const [tarefas, setTarefas] = useState([])
  const [modalTarefa, setModalTarefa] = useState(null)
  const [dependencias, setDependencias] = useState([])
  const [sortConfig, setSortConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('proj_tarefas_sort')) || { campo: 'etapa', dir: 'asc' } }
    catch { return { campo: null, dir: 'asc' } }
  })
  const [filtroStatus, setFiltroStatus] = useState(new Set())
  const [filtroFase, setFiltroFase] = useState(new Set())
  const [editandoEtapa, setEditandoEtapa] = useState(null)
  const [salvandoEtapa, setSalvandoEtapa] = useState(null)

  // Deliberações
  const [delibersExp, setDelibersExp] = useState(new Set())
  const [delibersPor, setDelibsPor] = useState({})
  const [novaDelib, setNovaDelib] = useState({})
  const [editDelib, setEditDelib] = useState(null)
  const [selectedTarefas, setSelectedTarefas] = useState(new Set())
  const [modalMoverEditor, setModalMoverEditor] = useState(null)
  const [projetosListaEditor, setProjetosListaEditor] = useState([])
  const [projetoDestinoEditor, setProjetoDestinoEditor] = useState('')
  const [buscaProjetoEditor, setBuscaProjetoEditor] = useState('')
  const [movendoEditor, setMovendoEditor] = useState(false)
  const [modalNovoProj, setModalNovoProj] = useState(null) // { ids, nomeBase }
  const [nomeNovoProj, setNomeNovoProj] = useState('')
  const [criandoNovoProj, setCriandoNovoProj] = useState(false)
  const nomeNovoProjRef = useRef(null)

  // Opções dos selects
  const [departamentos, setDepartamentos] = useState(() => _lookups.departamentos ?? [])
  const [areas, setAreas] = useState(() => _lookups.areas ?? [])
  const [sistemas, setSistemas] = useState(() => _lookups.sistemas ?? [])
  const [responsaveis, setResponsaveis] = useState(() => _lookups.responsaveis ?? [])
  const [empresas, setEmpresas] = useState(() => _lookups.empresas ?? [])
  const [fases, setFases] = useState(() => _lookups.fases ?? [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        if (Object.values(_lookups).some(v => v === null)) {
          const [deps, ars, sis, resps, emps, fas] = await Promise.all([
            apiService.getProjDepartamentos(),
            apiService.getProjAreas(),
            apiService.getProjSistemas(),
            apiService.getProjResponsaveis(),
            apiService.getProjEmpresas(),
            apiService.getProjFases(),
          ])
          _lookups.departamentos = deps.filter(x => x.ativo !== false)
          _lookups.areas = ars.filter(x => x.ativo !== false)
          _lookups.sistemas = sis.filter(x => x.ativo !== false)
          _lookups.responsaveis = resps.filter(x => x.ativo !== false)
          _lookups.empresas = emps.filter(x => x.ativo !== false)
          _lookups.fases = fas.filter(x => x.ativo !== false)
          setDepartamentos(_lookups.departamentos)
          setAreas(_lookups.areas)
          setSistemas(_lookups.sistemas)
          setResponsaveis(_lookups.responsaveis)
          setEmpresas(_lookups.empresas)
          setFases(_lookups.fases)
        }

        if (!isNew) {
          const [p, ts, deps] = await Promise.all([
            apiService.getProjetoById(id),
            apiService.getTarefas(id),
            apiService.getDependencias(id),
          ])
          setProj(prev => ({ ...prev, ...p, sistemas_nomes: p.sistemas_nomes || [] }))
          setTarefas(ts)
          setDependencias(deps)
          const mapa = {}; ts.forEach(t => { if (t.proj_deliberacoes?.length) mapa[t.id] = t.proj_deliberacoes }); setDelibsPor(mapa)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    init()
  }, [id])

  // Fechar dropdown de sistemas ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropSistRef.current && !dropSistRef.current.contains(e.target)) {
        setDropSistAberto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Projeto ───────────────────────────────────────────────────────────────
  const handleProjChange = (e) => {
    const { name, value } = e.target
    if (name === 'nome') {
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      setProj(p => ({ ...p, nome: value.toUpperCase() }))
      requestAnimationFrame(() => {
        nomeInputRef.current?.setSelectionRange(start, end)
      })
    } else {
      setProj(p => ({ ...p, [name]: value }))
    }
  }

  const toggleSistema = (nome) => {
    setProj(p => ({
      ...p,
      sistemas_nomes: p.sistemas_nomes.includes(nome)
        ? p.sistemas_nomes.filter(n => n !== nome)
        : [...p.sistemas_nomes, nome],
    }))
  }

  const handleSalvarProjeto = async () => {
    if (!proj.nome.trim()) { alert('Informe o título do projeto.'); return }
    setSalvandoProj(true)
    try {
      const payload = {
        nome: proj.nome,
        departamento_nome: proj.departamento_nome || null,
        area_nome: proj.area_nome || null,
        status: proj.status || 'planejado',
        ativo: true,
        responsavel_nome: proj.responsavel_nome || null,
        sistemas_nomes: proj.sistemas_nomes?.length > 0 ? proj.sistemas_nomes : [],
      }
      if (isNew) {
        const novo = await apiService.createProjeto(payload, user?.email)
        navigate(`/projetos/detalhe/${novo.id}/editar`, { replace: true })
      } else {
        await apiService.updateProjeto(id, payload)
        clearProjetosCache()
        setSalvoProjOk(true)
        setTimeout(() => setSalvoProjOk(false), 2500)
      }
    } catch (err) { alert('Erro ao salvar projeto: ' + err.message) }
    finally { setSalvandoProj(false) }
  }

  const handleExcluirProjeto = async () => {
    if (!confirmExcluir) { setConfirmExcluir(true); return }
    setExcluindoProj(true)
    try {
      await apiService.deleteProjeto(id)
      clearProjetosCache()
      navigate('/projetos', { replace: true })
    } catch (err) {
      alert('Erro ao excluir projeto: ' + err.message)
      setExcluindoProj(false)
      setConfirmExcluir(false)
    }
  }

  // ── Tarefas ───────────────────────────────────────────────────────────────
  const recarregar = async () => {
    clearProjetosCache()
    const [ts, deps] = await Promise.all([
      apiService.getTarefas(id),
      apiService.getDependencias(id),
    ])
    setTarefas(ts)
    setDependencias(deps)
    const mapa = {}; ts.forEach(t => { if (t.proj_deliberacoes?.length) mapa[t.id] = t.proj_deliberacoes }); setDelibsPor(mapa)
  }

  const handleDeleteTarefa = async (tarefaId) => {
    if (!window.confirm('Excluir esta tarefa e suas deliberações?')) return
    try {
      await apiService.deleteTarefa(tarefaId)
      setTarefas(prev => prev.filter(t => t.id !== tarefaId))
      setDelibsPor(prev => { const n = { ...prev }; delete n[tarefaId]; return n })
      setSelectedTarefas(prev => { const s = new Set(prev); s.delete(tarefaId); return s })
    } catch (err) { alert('Erro: ' + err.message) }
  }

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
      area_nome: t.area_nome || proj.area_nome || '',
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
      area_nome: t.area_nome || proj.area_nome || '',
      empresa_nome: t.empresa_nome || '',
    }})
  }

  const salvarEtapaInline = async (t, novaEtapa) => {
    setSalvandoEtapa(t.id)
    try {
      if (novaEtapa != null) {
        const conflito = tarefas.find(c => c.id !== t.id && c.etapa === novaEtapa)
        if (conflito) {
          await apiService.updateTarefa(conflito.id, { etapa: null })
          setTarefas(prev => prev.map(x => x.id === conflito.id ? { ...x, etapa: null } : x))
        }
      }
      await apiService.updateTarefa(t.id, { etapa: novaEtapa })
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, etapa: novaEtapa } : x))
    } catch (err) { alert('Erro ao salvar etapa: ' + (err.message || String(err))) }
    finally { setSalvandoEtapa(null); setEditandoEtapa(null) }
  }

  // ── Deliberações ──────────────────────────────────────────────────────────
  const toggleDelibs = async (tarefaId) => {
    const novo = new Set(delibersExp)
    if (novo.has(tarefaId)) { novo.delete(tarefaId); setDelibersExp(novo); return }
    novo.add(tarefaId)
    setDelibersExp(novo)
    if (delibersPor[tarefaId]) return
    try {
      const rows = await apiService.getDeliberacoes(tarefaId)
      setDelibsPor(prev => ({ ...prev, [tarefaId]: rows }))
    } catch { /* silencioso */ }
  }

  const handleAddDelib = async (tarefaId) => {
    const form = novaDelib[tarefaId] || { data: hoje, texto: '' }
    if (!form.texto.trim()) return
    try {
      await apiService.createDeliberacao(tarefaId, form.data || hoje, form.texto.trim(), user?.email)
      const rows = await apiService.getDeliberacoes(tarefaId)
      setDelibsPor(prev => ({ ...prev, [tarefaId]: rows }))
      setNovaDelib(prev => ({ ...prev, [tarefaId]: { data: hoje, texto: '' } }))
    } catch (err) { alert('Erro: ' + err.message) }
  }

  const handleUpdateDelib = async () => {
    if (!editDelib?.texto?.trim()) return
    try {
      await apiService.updateDeliberacao(editDelib.id, editDelib.data, editDelib.texto.trim())
      const rows = await apiService.getDeliberacoes(editDelib.tarefaId)
      setDelibsPor(prev => ({ ...prev, [editDelib.tarefaId]: rows }))
      setEditDelib(null)
    } catch (err) { alert('Erro: ' + err.message) }
  }

  const handleDeleteDelib = async (deliberId, tarefaId) => {
    try {
      await apiService.deleteDeliberacao(deliberId)
      setDelibsPor(prev => ({ ...prev, [tarefaId]: prev[tarefaId].filter(d => d.id !== deliberId) }))
    } catch (err) { alert('Erro: ' + err.message) }
  }

  const [modalConcluir, setModalConcluir] = useState(null)
  const [modalConcluirProjeto, setModalConcluirProjeto] = useState(false)

  const handleIniciarTarefa = async (t) => {
    try {
      await apiService.updateTarefa(t.id, { status_kanban: 'em_andamento' })
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, status_kanban: 'em_andamento' } : x))
    } catch (err) { alert('Erro ao iniciar: ' + (err.message || String(err))) }
  }

  const handleConcluirTarefa = async () => {
    if (!modalConcluir) return
    const { tarefa, dataFim } = modalConcluir
    try {
      await apiService.updateTarefa(tarefa.id, { status_kanban: 'concluido', progresso_pct: 100, data_fim: dataFim || null })
      const novasTarefas = tarefas.map(x => x.id === tarefa.id ? { ...x, status_kanban: 'concluido', progresso_pct: 100, data_fim: dataFim || x.data_fim } : x)
      setTarefas(novasTarefas)
      setModalConcluir(null)
      const todasConcluidas = novasTarefas.length > 0 && novasTarefas.every(t => t.status_kanban === 'concluido')
      if (todasConcluidas && proj?.status !== 'concluido') {
        setModalConcluirProjeto(true)
      }
    } catch (err) { alert('Erro ao concluir: ' + (err.message || String(err))) }
  }

  const handleConcluirProjeto = async () => {
    try {
      await apiService.updateProjeto(id, { status: 'concluido' })
      setProj(p => ({ ...p, status: 'concluido' }))
      clearProjetosCache()
      setModalConcluirProjeto(false)
    } catch (err) { alert('Erro ao concluir projeto: ' + (err.message || String(err))) }
  }

  const toggleSelectTarefa = (id) => {
    setSelectedTarefas(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const handleDeleteSelecionadas = async () => {
    if (!selectedTarefas.size) return
    if (!window.confirm(`Excluir ${selectedTarefas.size} tarefa(s) selecionada(s) e suas deliberações?`)) return
    try {
      await Promise.all([...selectedTarefas].map(id => apiService.deleteTarefa(id)))
      setTarefas(prev => prev.filter(t => !selectedTarefas.has(t.id)))
      setDelibsPor(prev => {
        const n = { ...prev }
        selectedTarefas.forEach(id => delete n[id])
        return n
      })
      setSelectedTarefas(new Set())
    } catch (err) { alert('Erro ao excluir: ' + err.message) }
  }

  const handleResetarSelecionadas = async () => {
    if (!selectedTarefas.size) return
    if (!window.confirm(`Resetar ${selectedTarefas.size} tarefa(s): status, datas, progresso e sistema serão limpos. Confirmar?`)) return
    try {
      await Promise.all([...selectedTarefas].map(id => apiService.updateTarefa(id, {
        status_kanban: 'mapeado',
        data_inicio:   null,
        data_fim:      null,
        progresso_pct: 0,
        sistema_nome:  null,
      })))
      await recarregar()
      setSelectedTarefas(new Set())
    } catch (err) { alert('Erro ao resetar: ' + err.message) }
  }

  const abrirModalMoverEditor = async (modo = 'mover') => {
    if (!selectedTarefas.size) return
    const n = selectedTarefas.size
    setModalMoverEditor({ ids: [...selectedTarefas], label: `${n} tarefa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}`, modo })
    setProjetoDestinoEditor('')
    setBuscaProjetoEditor('')
    const lista = await apiService.getProjetosLista().catch(() => [])
    setProjetosListaEditor(lista.filter(p => p.id !== id))
  }

  const abrirModalNovoProj = () => {
    if (!selectedTarefas.size) return
    setNomeNovoProj(proj.nome || '')
    setModalNovoProj({ ids: [...selectedTarefas] })
  }

  const handleCriarNovoProj = async () => {
    if (!nomeNovoProj.trim()) { alert('Informe o nome do novo projeto.'); return }
    setCriandoNovoProj(true)
    try {
      const novo = await apiService.createProjeto({
        nome: nomeNovoProj.trim().toUpperCase(),
        departamento_nome: proj.departamento_nome || null,
        area_nome: proj.area_nome || null,
        status: 'mapeado',
        ativo: true,
        responsavel_nome: proj.responsavel_nome || null,
        sistemas_nomes: proj.sistemas_nomes || [],
      }, user?.email)
      await Promise.all(modalNovoProj.ids.map(tid =>
        apiService.updateTarefa(tid, { projeto_id: novo.id, etapa: null })
      ))
      setTarefas(prev => prev.filter(t => !modalNovoProj.ids.includes(t.id)))
      clearProjetosCache()
      setSelectedTarefas(new Set())
      setModalNovoProj(null)
      navigate(`/projetos/detalhe/${novo.id}/editar`)
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setCriandoNovoProj(false) }
  }

  const handleMoverEditor = async () => {
    if (!projetoDestinoEditor || !modalMoverEditor) return
    setMovendoEditor(true)
    try {
      if (modalMoverEditor.modo === 'copiar') {
        const para = tarefas.filter(t => modalMoverEditor.ids.includes(t.id))
        await Promise.all(para.map(({ id: _tid, criado_em: _ce, atualizado_em: _ae, ...dados }) =>
          apiService.createTarefa({ ...dados, projeto_id: projetoDestinoEditor, etapa: null })
        ))
      } else {
        await Promise.all(modalMoverEditor.ids.map(tid => apiService.updateTarefa(tid, { projeto_id: projetoDestinoEditor, etapa: null })))
        setTarefas(prev => prev.filter(t => !modalMoverEditor.ids.includes(t.id)))
      }
      setSelectedTarefas(new Set())
      setModalMoverEditor(null)
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setMovendoEditor(false) }
  }

  if (loading) return (
    <div className="p-10 flex justify-center">
      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
    </div>
  )

  const sistemaCorMap      = Object.fromEntries(sistemas.map(s => [s.nome, s.cor || '#1e293b']))
  const sistemaCorTextoMap = Object.fromEntries(sistemas.map(s => [s.nome, s.cor_texto || null]))
  const faseCorMap = Object.fromEntries(fases.map(f => [f.nome, f.cor || '#1e293b']))

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={() => navigate(isNew ? '/projetos' : -1)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{isNew ? 'Novo Projeto' : 'Editar Projeto'}</h1>
          <p className="text-xs text-slate-500">Informações do projeto e gerenciamento de tarefas.</p>
        </div>
        {!isNew && canExcluir && (
          <div className="ml-auto flex items-center gap-2">
            {confirmExcluir && (
              <span className="text-xs text-red-600 font-semibold">Isso excluirá o projeto e todas as tarefas.</span>
            )}
            {confirmExcluir && (
              <button onClick={() => setConfirmExcluir(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
                Cancelar
              </button>
            )}
            <button
              onClick={handleExcluirProjeto}
              disabled={excluindoProj}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${confirmExcluir ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
            >
              {excluindoProj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {confirmExcluir ? 'Confirmar exclusão' : 'Excluir Projeto'}
            </button>
          </div>
        )}
      </div>

      {/* Card: Informações do projeto */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Informações do Projeto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-1">
            <Lbl>Título do Projeto *</Lbl>
            <input ref={nomeInputRef} name="nome" value={proj.nome} onChange={handleProjChange}
              placeholder="Nome do projeto..." className={inp}
              onKeyDown={e => e.key === 'Enter' && handleSalvarProjeto()} />
          </div>
          <div className="flex flex-col gap-1">
            <Lbl>Departamento</Lbl>
            <select name="departamento_nome" value={proj.departamento_nome || ''} onChange={handleProjChange} className={sel}>
              <option value="">---</option>
              {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Lbl>Área</Lbl>
            <select name="area_nome" value={proj.area_nome || ''} onChange={handleProjChange} className={sel}>
              <option value="">---</option>
              {areas.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Lbl>Status</Lbl>
            {canAlterarStatus ? (
              <select name="status" value={proj.status || 'mapeado'} onChange={handleProjChange} className={sel}>
                {Object.entries(STATUS_PROJ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : (
              <div className={`${sel} bg-slate-50 text-slate-500 pointer-events-none`}>
                {STATUS_PROJ[proj.status || 'mapeado'] || 'Mapeado'}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Lbl>Resp.Projeto</Lbl>
            <select name="responsavel_nome" value={proj.responsavel_nome || ''} onChange={handleProjChange} className={sel}>
              <option value="">---</option>
              {responsaveis.map(r => <option key={r.id} value={r.nome}>{r.nome}</option>)}
            </select>
          </div>

          {/* Multi-select Sistemas */}
          <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-1">
            <Lbl>Sistemas Atendidos</Lbl>
            <div ref={dropSistRef} className="relative">
              <div
                onClick={() => setDropSistAberto(v => !v)}
                className="min-h-[34px] flex flex-wrap gap-1.5 items-center p-1.5 border border-slate-200 rounded-md bg-white cursor-pointer hover:border-blue-400 transition-colors"
              >
                {(!proj.sistemas_nomes || proj.sistemas_nomes.length === 0) && (
                  <span className="text-xs text-slate-400 pl-1">Selecionar sistemas...</span>
                )}
                {(proj.sistemas_nomes || []).map(nome => {
                  const sist = sistemas.find(s => s.nome === nome)
                  const cor = sist?.cor || '#1e293b'
                  const txtCor = sist?.cor_texto || getTextColor(cor)
                  return (
                    <span key={nome} style={{ backgroundColor: cor, color: txtCor }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold">
                      {nome}
                      <button
                        onClick={e => { e.stopPropagation(); toggleSistema(nome) }}
                        className="hover:opacity-70 transition-opacity ml-0.5"
                        title="Remover"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )
                })}
              </div>

              {dropSistAberto && sistemas.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-20 p-2 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {sistemas.map(s => {
                    const ativo = (proj.sistemas_nomes || []).includes(s.nome)
                    const cor = s.cor || '#1e293b'
                    const txtCor = s.cor_texto || getTextColor(cor)
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSistema(s.nome)}
                        style={ativo
                          ? { backgroundColor: cor, color: txtCor }
                          : { backgroundColor: cor + '22', color: cor, border: `1px solid ${cor}66` }
                        }
                        className="px-3 py-1 rounded text-[10px] font-bold transition-all hover:opacity-80"
                      >
                        {ativo ? '✓ ' : ''}{s.nome}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button onClick={handleSalvarProjeto} disabled={salvandoProj}
            className={`flex items-center gap-2 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors ${salvoProjOk ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {salvandoProj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : salvoProjOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {salvoProjOk ? 'Salvo!' : 'Salvar Projeto'}
          </button>
        </div>
      </div>

      {/* Card: Tarefas (só em modo edição) */}
      {!isNew && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={tarefas.length > 0 && tarefas.every(t => selectedTarefas.has(t.id))}
                ref={el => { if (el) el.indeterminate = selectedTarefas.size > 0 && !tarefas.every(t => selectedTarefas.has(t.id)) }}
                onChange={() => {
                  const allSel = tarefas.every(t => selectedTarefas.has(t.id))
                  setSelectedTarefas(allSel ? new Set() : new Set(tarefas.map(t => t.id)))
                }}
                className="w-4 h-4 cursor-pointer accent-blue-600"
                title="Selecionar todas"
              />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Tarefas <span className="text-slate-400 font-normal normal-case">({tarefas.length})</span>
              </h2>
              {selectedTarefas.size > 0 && (
                <>
                  <button onClick={() => abrirModalMoverEditor('mover')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                    <FolderInput className="h-3 w-3" /> Mover {selectedTarefas.size} selecionada(s)
                  </button>
                  <button onClick={() => abrirModalMoverEditor('copiar')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors">
                    <Copy className="h-3 w-3" /> Copiar {selectedTarefas.size} selecionada(s)
                  </button>
                  <button onClick={abrirModalNovoProj}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Plus className="h-3 w-3" /> Mover para Novo Projeto
                  </button>
                  <button onClick={handleResetarSelecionadas}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                    <RotateCcw className="h-3 w-3" /> Resetar {selectedTarefas.size} selecionada(s)
                  </button>
                  <button onClick={handleDeleteSelecionadas}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                    <Trash2 className="h-3 w-3" /> Excluir {selectedTarefas.size} selecionada(s)
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { campo: 'etapa',       label: 'Etapa' },
                { campo: 'nome',        label: 'A→Z Tarefa' },
                { campo: 'data_inicio', label: 'Data Início' },
                { campo: 'data_fim',    label: 'Data Término' },
              ].map(({ campo, label }) => {
                const ativo = sortConfig.campo === campo
                return (
                  <button
                    key={campo}
                    onClick={() => setSortConfig(prev => {
                      const next = prev.campo === campo
                        ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                        : { campo, dir: 'asc' }
                      localStorage.setItem('proj_tarefas_sort', JSON.stringify(next))
                      return next
                    })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      ativo
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {label}
                    <span className="text-[10px] opacity-80">{ativo ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                )
              })}
              {delibersExp.size > 0 && (
                <button
                  onClick={() => setDelibersExp(new Set())}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="Fechar todas as deliberações"
                >
                  <X className="h-3 w-3" /> Fechar deliberações
                </button>
              )}
              <button onClick={() => setModalTarefa({ tarefa: null, prefill: { area_nome: proj.area_nome || '' } })}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors border border-blue-200">
                <Plus className="h-4 w-4" /> Nova Tarefa
              </button>
            </div>
          </div>

          {tarefas.length > 0 && (
            <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Status:</span>
                {Object.entries(KANBAN_MAP).filter(([k]) => tarefas.some(t => t.status_kanban === k)).map(([k, v]) => (
                  <button key={k}
                    onClick={() => setFiltroStatus(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${filtroStatus.has(k) ? v.cor + ' ring-2 ring-offset-1 ring-blue-300' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >{v.label}</button>
                ))}
              </div>
              {tarefas.some(t => t.fase_nome) && fases.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Fase:</span>
                  {fases.filter(f => tarefas.some(t => t.fase_nome === f.nome)).map(f => (
                    <button key={f.id}
                      onClick={() => setFiltroFase(prev => { const s = new Set(prev); s.has(f.nome) ? s.delete(f.nome) : s.add(f.nome); return s })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${filtroFase.has(f.nome) ? 'border-transparent ring-2 ring-offset-1 ring-blue-300' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'}`}
                      style={filtroFase.has(f.nome) ? { color: '#fff', backgroundColor: f.cor || '#1e293b' } : {}}
                    >{f.nome}</button>
                  ))}
                </div>
              )}
              {(filtroStatus.size > 0 || filtroFase.size > 0) && (
                <button onClick={() => { setFiltroStatus(new Set()); setFiltroFase(new Set()) }}
                  className="ml-auto text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors">
                  ✕ Limpar
                </button>
              )}
            </div>
          )}

          {tarefas.length === 0 && (
            <p className="p-8 text-center text-xs text-slate-400 italic">
              Nenhuma tarefa cadastrada. Clique em "Nova Tarefa" para começar.
            </p>
          )}

          <div className="divide-y divide-slate-100">
            {[...tarefas].filter(t => {
              if (filtroStatus.size > 0 && !filtroStatus.has(t.status_kanban)) return false
              if (filtroFase.size > 0 && !filtroFase.has(t.fase_nome || '')) return false
              return true
            }).sort((a, b) => {
              if (!sortConfig.campo) return 0
              if (sortConfig.campo === 'etapa') {
                const va = a.etapa ?? 999
                const vb = b.etapa ?? 999
                return sortConfig.dir === 'asc' ? va - vb : vb - va
              }
              const va = a[sortConfig.campo] || ''
              const vb = b[sortConfig.campo] || ''
              const cmp = va < vb ? -1 : va > vb ? 1 : 0
              return sortConfig.dir === 'asc' ? cmp : -cmp
            }).map(t => {
              const kt = KANBAN_MAP[t.status_kanban] || { label: t.status_kanban, cor: 'bg-slate-100 text-slate-500' }
              const delibersAberto = delibersExp.has(t.id)
              const delibers = delibersPor[t.id] || []
              const formDelib = novaDelib[t.id] || { data: hoje, texto: '' }
              const atrasada  = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hoje
              const terminaHoje = t.status_kanban !== 'concluido' && t.data_fim === hoje

              return (
                <React.Fragment key={t.id}>
                  {/* Linha da tarefa */}
                  <div className={`px-5 py-3 ${atrasada ? 'bg-red-50/30' : ''}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTarefas.has(t.id)}
                          onChange={() => toggleSelectTarefa(t.id)}
                          className="mt-1 w-4 h-4 cursor-pointer accent-blue-600 shrink-0"
                        />
                        {/* Dados da tarefa */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {editandoEtapa === t.id ? (
                              <select autoFocus value={t.etapa ?? ''}
                                onChange={e => { const val = e.target.value === '' ? null : parseInt(e.target.value, 10); salvarEtapaInline(t, val) }}
                                onBlur={() => { if (salvandoEtapa !== t.id) setEditandoEtapa(null) }}
                                disabled={salvandoEtapa === t.id}
                                onClick={e => e.stopPropagation()}
                                className="text-[11px] p-1 border border-indigo-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/40 w-28 shrink-0">
                                <option value="">— Sem etapa —</option>
                                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n}>{n}ª Etapa{tarefas.some(x => x.id !== t.id && x.etapa === n) ? ' (em uso)' : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <button onClick={() => setEditandoEtapa(t.id)} title="Clique para alterar a etapa" className="group shrink-0">
                                {t.etapa != null
                                  ? <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-colors ${t.status_kanban === 'em_andamento' ? 'bg-orange-500 text-white shadow-sm group-hover:bg-orange-600' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'}`}>{t.etapa}ª</span>
                                  : <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors border border-slate-200 text-base">+</span>}
                              </button>
                            )}
                            <p className="text-sm font-semibold text-slate-800 leading-snug">
                              {t.nome}
                              {t.sistema_nome && (
                                <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-bold align-middle" style={{ backgroundColor: sistemaCorMap[t.sistema_nome] || '#1e293b', color: sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistemaCorMap[t.sistema_nome] || '#1e293b') }}>
                                  {t.sistema_nome}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${kt.cor}`}>{kt.label}</span>
                            {t.progresso_pct != null && <span>{t.progresso_pct}%</span>}
                            {t.area_nome && <span>Área: {t.area_nome}</span>}
                            {t.fase_nome && (
                              <span>Fase: <span className="font-bold" style={{ color: faseCorMap[t.fase_nome] || '#1e293b' }}>{t.fase_nome}</span></span>
                            )}
                            {t.empresa_nome && <span>Unidade: {t.empresa_nome}</span>}
                            {fmtData(t.data_inicio) && <span>Início: {fmtData(t.data_inicio)}</span>}
                            {fmtData(t.data_fim) && (
                              <span className={atrasada ? 'text-red-600 font-bold' : terminaHoje ? 'text-blue-600 font-bold' : ''}>
                                Término: {fmtData(t.data_fim)}
                              </span>
                            )}
                            {t.responsavel_nome && <span>Resp.Tarefa: {t.responsavel_nome}</span>}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1 shrink-0">
                          {t.status_kanban === 'programado' && (
                            <button onClick={() => handleIniciarTarefa(t)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Iniciar tarefa">
                              <PlayCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {t.status_kanban === 'em_andamento' && (
                            <button onClick={() => setModalConcluir({ tarefa: t, dataFim: hoje })}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Concluir tarefa">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleProximaEtapa(t)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Próxima Etapa">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDuplicar(t)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Duplicar">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setModalTarefa({ tarefa: t })}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteTarefa(t.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                  </div>

                  {/* Trigger deliberações */}
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => toggleDelibs(t.id)}
                      className={`w-full flex items-center gap-1 px-4 py-1 text-[10px] transition-colors ${delibersAberto ? 'text-blue-500 bg-blue-50/60 hover:bg-blue-50' : delibers.length > 0 ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-50'}`}
                    >
                      <Plus className={`h-3 w-3 transition-transform duration-150 ${delibersAberto ? 'rotate-45' : ''}`} />
                      <span>Deliberações{delibers.length > 0 ? ` (${delibers.length})` : ''}</span>
                    </button>
                  </div>

                  {/* Painel de deliberações */}
                  {delibersAberto && (
                    <div className="px-5 pb-4 pt-2 bg-blue-50/20 border-t border-blue-100/60">
                      <div className="pl-9 space-y-2">
                        {delibers.length > 0 ? (
                          <div className="space-y-1.5">
                            {delibers.map(d => {
                              const editando = editDelib?.id === d.id
                              return (
                                <div key={d.id} className="flex items-center gap-2 text-[11px] group">
                                  {editando ? (
                                    <>
                                      <input type="date" value={editDelib.data} autoFocus
                                        onChange={e => setEditDelib(p => ({ ...p, data: e.target.value }))}
                                        className="border border-blue-300 rounded px-1.5 py-0.5 text-[11px] w-28 shrink-0 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                      <input type="text" value={editDelib.texto}
                                        onChange={e => setEditDelib(p => ({ ...p, texto: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleUpdateDelib()}
                                        className="flex-1 border border-blue-300 rounded px-1.5 py-0.5 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                      <button onClick={handleUpdateDelib}
                                        className="shrink-0 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded transition-colors">
                                        Salvar
                                      </button>
                                      <button onClick={() => setEditDelib(null)} className="shrink-0 text-slate-400 hover:text-slate-600">
                                        <X className="h-3 w-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-slate-500 font-semibold whitespace-nowrap w-24 shrink-0">
                                        {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </span>
                                      <span className="text-slate-700 flex-1">{d.texto}</span>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button onClick={() => setEditDelib({ id: d.id, data: d.data, texto: d.texto, tarefaId: t.id })}
                                          className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => handleDeleteDelib(d.id, t.id)}
                                          className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
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
                        <div className="flex items-center gap-2 pt-1">
                          <input type="date" value={formDelib.data}
                            onChange={e => setNovaDelib(prev => ({ ...prev, [t.id]: { ...formDelib, data: e.target.value } }))}
                            className="border border-slate-200 rounded px-2 py-1 text-[11px] shrink-0 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <input type="text" value={formDelib.texto} placeholder="Nova deliberação... (Enter para salvar)"
                            onChange={e => setNovaDelib(prev => ({ ...prev, [t.id]: { ...formDelib, texto: e.target.value } }))}
                            onKeyDown={e => e.key === 'Enter' && handleAddDelib(t.id)}
                            className="flex-1 border border-slate-200 rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <button onClick={() => handleAddDelib(t.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded transition-colors shrink-0">
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              )
            })}

          </div>
        </div>
      )}

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
          onClose={() => setModalTarefa(null)}
          onSaved={() => { setModalTarefa(null); recarregar() }}
          onNavigate={(t) => setModalTarefa({ tarefa: t })}
        />
      )}

      {isNew && (
        <p className="text-xs text-slate-400 text-center italic">
          Salve o projeto para começar a adicionar tarefas.
        </p>
      )}

      {/* MODAL MOVER PARA NOVO PROJETO */}
      {modalNovoProj && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[460px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Mover para Novo Projeto</h3>
                <p className="text-xs text-slate-500">{modalNovoProj.ids.length} tarefa(s) serão movidas para o novo projeto</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Novo Projeto</label>
                <input
                  type="text"
                  autoFocus
                  ref={nomeNovoProjRef}
                  value={nomeNovoProj}
                  onChange={e => {
                    const start = e.target.selectionStart
                    const end = e.target.selectionEnd
                    setNomeNovoProj(e.target.value.toUpperCase())
                    requestAnimationFrame(() => nomeNovoProjRef.current?.setSelectionRange(start, end))
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleCriarNovoProj()}
                  placeholder="Nome do projeto…"
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400">O novo projeto herdará departamento, área, responsável e sistemas do projeto atual. As tarefas serão removidas deste projeto.</p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalNovoProj(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCriarNovoProj} disabled={!nomeNovoProj.trim() || criandoNovoProj}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                {criandoNovoProj ? 'Criando…' : 'Criar e Mover'}
              </button>
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
                O projeto <strong>"{proj?.nome}"</strong> teve todas as suas tarefas concluídas.
                Deseja atualizar o status do projeto para <strong className="text-teal-700">Concluído</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalConcluirProjeto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Agora não
              </button>
              <button onClick={handleConcluirProjeto}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors">
                Sim, concluir projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONCLUIR TAREFA */}
      {modalConcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[380px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-full shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Concluir Tarefa</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{modalConcluir.tarefa.nome}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data de Conclusão</label>
                <input type="date" value={modalConcluir.dataFim}
                  onChange={e => setModalConcluir(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="text-sm px-3 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 w-full" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalConcluir(null)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConcluirTarefa}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVER TAREFAS */}
      {modalMoverEditor && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[460px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className={`p-2 rounded-full shrink-0 ${modalMoverEditor.modo === 'copiar' ? 'bg-teal-50 text-teal-600' : 'bg-violet-50 text-violet-600'}`}>
                <FolderInput className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{modalMoverEditor.modo === 'copiar' ? 'Copiar para outro Projeto' : 'Mover para outro Projeto'}</h3>
                <p className="text-xs text-slate-500 truncate">{modalMoverEditor.label}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Buscar Projeto Destino</label>
                <input
                  type="text"
                  autoFocus
                  value={buscaProjetoEditor}
                  onChange={e => { setBuscaProjetoEditor(e.target.value); setProjetoDestinoEditor('') }}
                  placeholder="Digite o nome do projeto…"
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              {buscaProjetoEditor.trim().length >= 1 && (
                <div className="border border-slate-200 rounded-md max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {projetosListaEditor
                    .filter(p => p.nome.toLowerCase().includes(buscaProjetoEditor.toLowerCase()))
                    .map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setProjetoDestinoEditor(p.id); setBuscaProjetoEditor(p.nome) }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                          projetoDestinoEditor === p.id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex-1">{p.nome}</span>
                        {(p.sistemas_nomes?.length > 0 ? p.sistemas_nomes : p.sistema_nome ? [p.sistema_nome] : []).map(s => (
                          <span key={s} className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-white">{s}</span>
                        ))}
                      </button>
                    ))}
                  {projetosListaEditor.filter(p => p.nome.toLowerCase().includes(buscaProjetoEditor.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhum projeto encontrado.</p>
                  )}
                </div>
              )}
              {projetoDestinoEditor && (
                <p className="text-xs text-violet-700 font-medium">✓ Destino: <strong>{buscaProjetoEditor}</strong></p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalMoverEditor(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button onClick={handleMoverEditor} disabled={!projetoDestinoEditor || movendoEditor}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50 transition-colors ${modalMoverEditor.modo === 'copiar' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
                {modalMoverEditor.modo === 'copiar' ? <Copy className="h-3.5 w-3.5" /> : <FolderInput className="h-3.5 w-3.5" />}
                {movendoEditor ? (modalMoverEditor.modo === 'copiar' ? 'Copiando…' : 'Movendo…') : (modalMoverEditor.modo === 'copiar' ? 'Copiar Tarefas' : 'Mover Tarefas')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
