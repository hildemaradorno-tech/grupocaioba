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
import { useNavigate } from 'react-router-dom'
import { CalendarDays, FileDown, FolderOpen, Users, CheckCircle2, PlayCircle, Activity, CheckCircle, AlertTriangle, Layers, Eye, PartyPopper } from 'lucide-react'
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
}


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

// Lista de Tarefas (a aba Agenda foi excluída em 16/11/2026)
export default function CalendarioProjetos() {
  const navigate = useNavigate()
  const { isAdmin, departamentosPermitidosEfetivos, hasActionOrDefault } = useAuth()
  const ctx = useProjetosFiltros()
  const { modoVerTodos, setModoVerTodos } = ctx
  const canVerTodos       = !isAdmin && hasActionOrDefault('projetos', 'ver_todos_projetos')
  const canEditarTarefa        = !modoVerTodos && hasActionOrDefault('projetos', 'editar_tarefa')
  const canAlterarStatusTarefa = hasActionOrDefault('projetos', 'alterar_status_tarefa')
  const canIniciarTarefa  = !modoVerTodos && hasActionOrDefault('projetos', 'iniciar_tarefa')
  const canConcluirTarefa = !modoVerTodos && hasActionOrDefault('projetos', 'concluir_tarefa')

  const [projetos, setProjetos] = useState(getProjetosCache() ?? [])
  const [loading, setLoading]   = useState(getProjetosCache() === null)
  const [filtroResponsavel]        = useState('')
  const [filtroResponsavelProjeto] = useState('')
  const [filtroDepartamento]       = useState('')
  const filtroDataIni      = ctx.filtroDataIni
  const filtroDataFim      = ctx.filtroDataFim
  const filtroDataProjIni  = ctx.filtroDataProjIni
  const filtroDataProjFim  = ctx.filtroDataProjFim
  const [visualizacaoLista]   = useState('data') // 'data' | 'projeto' | 'responsavel'
  const [filtroStatusCard, setFiltroStatusCard] = useState(new Set(['mapeado', 'programado', 'em_andamento', 'pausado']))
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [modalEditarTarefa, setModalEditarTarefa] = useState(null)
  const [modalConcluir, setModalConcluir] = useState(null) // { tarefa, dataFim }
  const [modalConcluirProjeto, setModalConcluirProjeto] = useState(null) // projeto object
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
    apiService.getProjetosParaAta()
      .then(data => { setProjetosCache(data); setProjetos(data) })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

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


  const recarregarDados = () => {
    clearProjetosCache()
    apiService.getProjetosParaAta()
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
      // Verifica se todas as tarefas do mesmo projeto estão concluídas
      const tarefasDoProjeto = tarefas.filter(t => t.projeto_id === tarefa.projeto_id)
      const todasConcluidas = tarefasDoProjeto.length > 0 &&
        tarefasDoProjeto.every(t => t.id === tarefa.id ? true : t.status_kanban === 'concluido')
      if (todasConcluidas) {
        const proj = projetos.find(p => p.id === tarefa.projeto_id)
        if (proj && proj.status !== 'concluido' && hasActionOrDefault('projetos', 'concluir_projeto')) setModalConcluirProjeto(proj)
      }
      recarregarDados()
    } catch (err) { alert('Erro ao concluir: ' + (err.message || String(err))) }
  }

  const handleConcluirProjeto = async () => {
    if (!modalConcluirProjeto) return
    try {
      await apiService.updateProjeto(modalConcluirProjeto.id, { status: 'concluido' })
      setModalConcluirProjeto(null)
      recarregarDados()
    } catch (err) { alert('Erro ao concluir projeto: ' + (err.message || String(err))) }
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


  // Tarefas após aplicar os filtros de responsável e departamento
  const tarefasFiltradas = useMemo(() =>
    tarefas.filter(t =>
      (!filtroResponsavel  || t.responsavel_nome  === filtroResponsavel) &&
      (!filtroDepartamento || t.departamento_nome === filtroDepartamento)
    ),
    [tarefas, filtroResponsavel, filtroDepartamento]
  )

  const sistemaCorMap = Object.fromEntries(optsSist.map(s => [s.nome, s.cor || '#1e293b']))


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
      else if (visualizacaoLista === 'data')    key = t.data_fim                  || null
      else                                       key = t.projeto_nome              || '— Sem projeto —'
      if (key === null) return // modo data: ignora tarefas sem data
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    const grupos = Object.entries(map).sort(([a], [b]) => {
      if (a.startsWith('—')) return 1
      if (b.startsWith('—')) return -1
      if (visualizacaoLista === 'data') return a < b ? -1 : a > b ? 1 : 0
      return a.localeCompare(b, 'pt-BR')
    })
    // Ordena tarefas por etapa (nulls no fim) no modo Projeto e no modo Data
    if (visualizacaoLista === 'projeto' || visualizacaoLista === 'data') {
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
              Lista de Tarefas
            </h1>
            <p className="text-xs text-slate-500">
              Tarefas por status e projeto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canVerTodos && (
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
            onClick={baixarPDF}
            disabled={gerandoPDF || tarefasLista.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            {gerandoPDF ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <ProjetosNav />
        <div className="flex items-start gap-2">
          <FiltrosCompactBar />
        </div>
      </div>
      <ProjetosFiltrosPanel projetos={projetos} showTrigger={false} hiddenFilters={['termProjeto']} />

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
      {!loading && (
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
                              {isData ? fmtData(grupo) : (visualizacaoLista === 'projeto' && gTarefas[0]?.projeto_id) ? (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); navigate(`/projetos/detalhe/${gTarefas[0].projeto_id}`) }}
                                  title="Abrir detalhes do projeto"
                                  className="uppercase font-bold hover:underline text-left"
                                >
                                  {grupo}
                                </button>
                              ) : grupo}
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
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            <span>{t.nome}</span>
                            {t.proj_deliberacoes?.length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {t.proj_deliberacoes.map(d => (
                                  <div key={d.id} className="flex gap-1.5 text-[10px] bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    <span className="text-amber-600 font-semibold shrink-0 whitespace-nowrap">
                                      {d.data ? new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                    </span>
                                    <span className="text-slate-600 leading-snug">{d.texto}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          {visualizacaoLista !== 'projeto' && (
                            <td className="px-4 py-2.5">
                              {t.projeto_id ? (
                                <button
                                  onClick={e => { e.stopPropagation(); navigate(`/projetos/detalhe/${t.projeto_id}`) }}
                                  title="Abrir detalhes do projeto"
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



      {/* Modal Concluir Projeto */}
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
                O projeto <strong>"{modalConcluirProjeto.nome}"</strong> teve todas as suas tarefas concluídas.
                Deseja atualizar o status do projeto para <strong className="text-teal-700">Concluído</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalConcluirProjeto(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Agora não
              </button>
              <button onClick={handleConcluirProjeto} className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors">
                Sim, concluir projeto
              </button>
            </div>
          </div>
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
          canAlterarStatus={canAlterarStatusTarefa}
          onClose={() => setModalEditarTarefa(null)}
          onSaved={() => { setModalEditarTarefa(null); recarregarDados() }}
          onNavigate={(t) => setModalEditarTarefa(t)}
        />
      )}

    </div>
  )
}
