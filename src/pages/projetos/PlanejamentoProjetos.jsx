import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, RotateCcw, AlertCircle, X, Download, Loader2, Filter, Pencil, PlayCircle, CheckCircle2, Edit2, ScrollText } from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import TarefaFormModal from './TarefaFormModal'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais } from '../../context/ProjetosFiltrosContext'

const STATUS_PROJETO = [
  { value: 'mapeado',      label: 'Mapeado',      cor: 'bg-slate-100 text-slate-600 border-slate-300' },
  { value: 'programado',   label: 'Programado',   cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'em_andamento', label: 'Em Andamento', cor: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'concluido',    label: 'Concluído',    cor: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'pausado',      label: 'Pausado',      cor: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'cancelado',    label: 'Cancelado',    cor: 'bg-red-100 text-red-700 border-red-300' },
]

const STATUS_TAREFA = [
  { value: 'mapeado',      label: 'Mapeado' },
  { value: 'programado',   label: 'Programado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido',    label: 'Concluído' },
  { value: 'pausado',      label: 'Pausado' },
]

const STATUS_TAREFA_COR = {
  mapeado:      'bg-slate-100 text-slate-600',
  programado:   'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  concluido:    'bg-teal-100 text-teal-700',
  pausado:      'bg-purple-100 text-purple-700',
  cancelado:    'bg-red-100 text-red-700',
}

const STATUS_TAREFA_LABEL = {
  mapeado: 'Mapeado', programado: 'Programado', em_andamento: 'Em Andamento',
  concluido: 'Concluído', pausado: 'Pausado', cancelado: 'Cancelado',
}

const STATUS_COR = {
  mapeado:      '#94a3b8',
  programado:   '#3b82f6',
  em_andamento: '#f59e0b',
  pausado:      '#a855f7',
  concluido:    '#0d9488',
  cancelado:    '#ef4444',
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
  if (!t.data_fim) return false
  if (ini && t.data_fim < ini) return false
  if (fim && t.data_fim > fim) return false
  return true
}

const fmtData = (d) => {
  if (!d) return ''
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

const hojeISO = new Date().toISOString().slice(0, 10)

function getTextColor(hex) {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

export default function PlanejamentoProjetos() {
  const navigate = useNavigate()
  const { isAdmin, empresasPermitidas, departamentosPermitidosEfetivos, hasActionOrDefault } = useAuth()
  const canEditarProjeto  = hasActionOrDefault('projetos/planejamento', 'editar_projeto')
  const canEditarTarefa   = hasActionOrDefault('projetos/planejamento', 'editar_tarefa')
  const canIniciarTarefa  = hasActionOrDefault('projetos/planejamento', 'iniciar_tarefa')
  const canConcluirTarefa = hasActionOrDefault('projetos/planejamento', 'concluir_tarefa')
  const ctx = useProjetosFiltros()
  const {
    filtroDataIni:  filtroDataTermIni, setFiltroDataIni,
    filtroDataFim:  filtroDataTermFim, setFiltroDataFim,
    filtroDataTipo, setFiltroDataTipo,
    filtroStatusProjeto,  setFiltroStatusProjeto,
    filtroStatusTarefa,   setFiltroStatusTarefa,
    filtrosAbertos,       setFiltrosAbertos,
    filtroEmpresa,        setFiltroEmpresa,
    filtroDepartamento,   setFiltroDepartamento,
    filtroArea,           setFiltroArea,
    filtroFase,           setFiltroFase,
    filtroSistema,        setFiltroSistema,
    filtroRespProjeto,    setFiltroRespProjeto,
    filtroRespTarefa,     setFiltroRespTarefa,
    limparFiltros,
  } = ctx

  const [projetos, setProjetos]         = useState([])
  const [fases, setFases]               = useState([])
  const [sistemas, setSistemas]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [recolhidos, setRecolhidos]           = useState(new Set())
  const [deptosExpandidos, setDeptosExpandidos] = useState(new Set())
  const [statusesRecolhidos, setStatusesRecolhidos] = useState(new Set(['em_andamento','programado','mapeado','pausado','concluido','cancelado']))
  const [gerandoPDF, setGerandoPDF]           = useState(false)
  const [verTodos, setVerTodos]               = useState(false)
  const [modalEditarTarefa, setModalEditarTarefa] = useState(null)
  const [modalConcluir, setModalConcluir]     = useState(null)
  const [delibersAbertos, setDelibersAbertos] = useState(new Set())
  const [optsResp, setOptsResp]               = useState([])
  const [optsEmp,       setOptsEmp]       = useState([])
  const [modalOptsArea, setModalOptsArea] = useState([])

  const recarregarDados = useCallback(() => {
    const filtrosEmpresa = (isAdmin || verTodos) ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getProjetosParaAta(filtrosEmpresa)
      .then(setProjetos)
      .catch(err => setError(err.message || String(err)))
  }, [isAdmin, empresasPermitidas, verTodos])

  useEffect(() => {
    setLoading(true)
    const filtrosEmpresa = (isAdmin || verTodos) ? {} : { empresa_ids: [...empresasPermitidas] }
    Promise.all([
      apiService.getProjetosParaAta(filtrosEmpresa),
      apiService.getProjFases(),
      apiService.getProjSistemas(),
    ])
      .then(([ps, fs, sis]) => { setProjetos(ps); setFases(fs); setSistemas(sis); setRecolhidos(new Set(ps.map(p => p.id))) })
      .catch(err => setError(err.message || String(err)))
      .finally(() => setLoading(false))
  }, [isAdmin, empresasPermitidas, verTodos])

  useEffect(() => {
    Promise.all([
      apiService.getProjResponsaveis(),
      apiService.getProjEmpresas(),
      apiService.getProjAreas(),
    ]).then(([rs, es, as]) => {
      setOptsResp(rs.filter(r => r.ativo !== false))
      setOptsEmp(es.filter(e => e.ativo !== false))
      setModalOptsArea(as.filter(a => a.ativo !== false))
    }).catch(() => {})
  }, [])

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
      await apiService.updateTarefa(tarefa.id, { status_kanban: 'concluido', progresso_pct: 100, data_fim: dataFim || null })
      setModalConcluir(null)
      recarregarDados()
    } catch (err) { alert('Erro ao concluir: ' + (err.message || String(err))) }
  }

  // mapa: nome → posição no array (getProjFases já retorna na ordem correta do cadastro)
  const faseOrdemPorNome = useMemo(() =>
    Object.fromEntries(fases.map((f, i) => [f.nome, i]))
  , [fases])

  const toggleStatus = (arr, setter, val) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const projetosBase = useMemo(() => {
    let base = aplicarFiltrosGlobais(projetos, ctx, verTodos ? null : departamentosPermitidosEfetivos)
    if (filtroStatusProjeto.length > 0)
      base = base.filter(p => filtroStatusProjeto.includes(p.status))
    return base
      .map(p => ({
        ...p,
        proj_tarefas: (p.proj_tarefas || []).filter(t =>
          filtroStatusTarefa.length === 0 || filtroStatusTarefa.includes(t.status_kanban || 'mapeado')
        ),
      }))
      .filter(p => p.proj_tarefas.length > 0)
  }, [projetos, ctx, filtroStatusProjeto, filtroStatusTarefa, departamentosPermitidosEfetivos])

  const projetosRender = useMemo(() => {
    const base = (!filtroDataTermIni && !filtroDataTermFim) ? projetosBase : projetosBase
      .map(p => ({
        ...p,
        proj_tarefas: p.proj_tarefas.filter(t => {
          if (!filtroDataTermFim && t.status_kanban === 'mapeado' && !t.data_inicio && !t.data_fim) return true
          return tarefaPassaFiltroData(t, filtroDataTermIni, filtroDataTermFim, 'fim')
        }),
      }))
      .filter(p => p.proj_tarefas.length > 0)
    return base.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [projetosBase, filtroDataTermIni, filtroDataTermFim])

  // Calcula as fases com data de um conjunto de tarefas (usado por projeto)
  const fasesComDataDe = (tarefas) => {
    const nomes = new Set(tarefas.map(t => t.fase_nome).filter(Boolean))
    return [...nomes]
      .sort((a, b) => (faseOrdemPorNome[a] ?? 9999) - (faseOrdemPorNome[b] ?? 9999))
      .filter(fase => tarefas.some(t => {
        if (t.fase_nome !== fase) return false
        return !!t.data_fim
      }))
  }

  const toggleRecolhido = (id) => setRecolhidos(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleDepto = (depto) => setDeptosExpandidos(prev => {
    const next = new Set(prev)
    next.has(depto) ? next.delete(depto) : next.add(depto)
    return next
  })

  // Departamentos únicos ordenados, derivados dos projetos filtrados
  const departamentos = useMemo(() =>
    [...new Set(projetosRender.map(p => p.departamento_nome || 'Sem Departamento'))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  , [projetosRender])

  const sistemaCorMap      = useMemo(() => Object.fromEntries(sistemas.map(s => [s.nome, s.cor || '#1e293b'])), [sistemas])
  const sistemaCorTextoMap = useMemo(() => Object.fromEntries(sistemas.map(s => [s.nome, s.cor_texto || null])), [sistemas])

  const handleSalvarPDF = async () => {
    const ids = projetosRender.map(p => p.id)
    if (ids.length === 0) return
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

      const capture = async (elP) => {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:white;z-index:-1;`
        const clone = elP.cloneNode(true)
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
      const place = (c, y) => pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, y, CW, getH(c))
      const placeSliced = (c, startY) => {
        const pageHpx = Math.floor(c.width * CH / CW)
        let srcY = 0, y = startY
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
          y += (sliceH / c.width) * CW
          srcY += pageHpx
        }
        return y
      }

      // Cada projeto é capturado como um bloco único (título + tabela de
      // tarefas), para nunca separar o título do projeto das suas tarefas
      // ao trocar de página. Só faz slice no meio quando o próprio bloco
      // já é maior que uma página inteira.
      let y = MARGIN
      let primeiro = true
      for (const id of ids) {
        const elP = document.getElementById(`planejamento-projeto-${id}`)
        if (!elP) continue
        const canvas = await capture(elP)
        const h = getH(canvas)
        if (h <= CH) {
          if (!primeiro && y + h > MARGIN + CH) { pdf.addPage(); y = MARGIN }
          place(canvas, y)
          y += h + GAP
        } else {
          if (!primeiro && y > MARGIN) { pdf.addPage(); y = MARGIN }
          y = placeSliced(canvas, y) + GAP
        }
        primeiro = false
      }

      pdf.save('Planejamento de Projetos.pdf')
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerandoPDF(false)
    }
  }

  const tarefasTodas = useMemo(() => projetos.flatMap(p => p.proj_tarefas || []), [projetos])
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const optsEmpresa     = useMemo(() => uniq(projetos.map(p => p.empresa_nome)),        [projetos])
  const optsDepto       = useMemo(() => uniq(projetos.map(p => p.departamento_nome)),   [projetos])
  const optsArea        = useMemo(() => uniq(projetos.map(p => p.area_nome)),           [projetos])
  const optsFase        = useMemo(() => uniq(tarefasTodas.map(t => t.fase_nome)),       [tarefasTodas])
  const optsSistema     = useMemo(() => uniq(tarefasTodas.map(t => t.sistema_nome)),    [tarefasTodas])
  const optsRespProjeto = useMemo(() => uniq(projetos.map(p => p.responsavel_nome)),    [projetos])
  const optsRespTarefa  = useMemo(() => uniq(tarefasTodas.map(t => t.responsavel_nome)),[tarefasTodas])

  const numFiltrosAtivos = [
    filtroEmpresa, filtroDepartamento, filtroArea, filtroFase,
    filtroSistema, filtroRespProjeto, filtroRespTarefa,
    (filtroDataTermIni || filtroDataTermFim) ? 'data' : '',
  ].filter(Boolean).length

  const sel = 'text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white w-full'

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
  if (error)   return <div className="p-6 text-center text-sm text-red-500">{error}</div>

  return (
    <div className="p-6 space-y-3 max-w-screen-2xl">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={() => navigate('/projetos')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Planejamento</h1>
          <p className="text-xs text-slate-500">Visão matricial de tarefas por fase/etapa.</p>
        </div>
        <button
          onClick={() => setVerTodos(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${verTodos ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
          title={verTodos ? 'Voltar para minha visão' : 'Ver todos os projetos (somente leitura)'}
        >
          {verTodos ? '← Minha Visão' : 'Ver Todos os Projetos'}
        </button>
        <button
          onClick={handleSalvarPDF}
          disabled={gerandoPDF}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors whitespace-nowrap"
        >
          {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {gerandoPDF ? 'Gerando...' : 'Salvar PDF'}
        </button>
      </div>
      {verTodos && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700 font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          Modo visualização — todos os projetos · somente leitura
        </div>
      )}

      {/* Barra de navegação + botão Filtros Avançados */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ProjetosNav />
        <button
          onClick={() => setFiltrosAbertos(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors shrink-0 ${filtrosAbertos ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'}`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros Avançados
          {numFiltrosAtivos > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-bold leading-none">{numFiltrosAtivos}</span>
          )}
        </button>
      </div>

      {/* Painel colapsável de filtros */}
      {filtrosAbertos && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
          {/* Filtro de período — Término */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Término entre:</span>
            <input type="date" value={filtroDataTermIni} onChange={e => setFiltroDataIni(e.target.value)}
              onClick={e => e.target.showPicker?.()}
              className="text-[11px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            <span className="text-[10px] text-slate-400">e</span>
            <input type="date" value={filtroDataTermFim} onChange={e => setFiltroDataFim(e.target.value)}
              onClick={e => e.target.showPicker?.()}
              min={filtroDataTermIni || undefined}
              className="text-[11px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            {(filtroDataTermIni || filtroDataTermFim) && (
              <button onClick={() => { setFiltroDataIni(''); setFiltroDataFim('') }}
                className="p-1 text-red-400 hover:text-red-600 rounded transition-colors" title="Limpar datas">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
              <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={sel}>
                <option value="">Todas</option>
                {optsEmpresa.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
              <select value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)} className={sel}>
                <option value="">Todos</option>
                {optsDepto.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Área</label>
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={sel}>
                <option value="">Todas</option>
                {optsArea.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Fase</label>
              <select value={filtroFase} onChange={e => setFiltroFase(e.target.value)} className={sel}>
                <option value="">Todas</option>
                {optsFase.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Sistema</label>
              <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)} className={sel}>
                <option value="">Todos</option>
                {optsSistema.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Projeto</label>
              <select value={filtroRespProjeto} onChange={e => setFiltroRespProjeto(e.target.value)} className={sel}>
                <option value="">Todos</option>
                {optsRespProjeto.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Tarefa</label>
              <select value={filtroRespTarefa} onChange={e => setFiltroRespTarefa(e.target.value)} className={sel}>
                <option value="">Todos</option>
                {optsRespTarefa.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <button onClick={limparFiltros}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Limpar Filtros
          </button>
        </div>
      )}

      {/* Status chips + ações */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Linhas de chips */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Projeto */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0 w-14">Projeto:</span>
              {STATUS_PROJETO.map(s => {
                const cor = STATUS_COR[s.value] || '#94a3b8'
                const ativo = filtroStatusProjeto.includes(s.value)
                return (
                  <button key={s.value}
                    onClick={() => toggleStatus(filtroStatusProjeto, setFiltroStatusProjeto, s.value)}
                    style={{ background: ativo ? cor : cor + '18', color: ativo ? '#fff' : cor, border: `1.5px solid ${cor}40` }}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all">
                    {s.label}
                  </button>
                )
              })}
              {filtroStatusProjeto.length > 0 && (
                <button onClick={() => setFiltroStatusProjeto([])}
                  className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-red-500 transition-colors ml-1">
                  <X className="h-3 w-3" /> Limpar projeto
                </button>
              )}
            </div>
            {/* Tarefa */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0 w-14">Tarefa:</span>
              {STATUS_TAREFA.map(s => {
                const cor = STATUS_COR[s.value] || '#94a3b8'
                const ativo = filtroStatusTarefa.includes(s.value)
                return (
                  <button key={s.value}
                    onClick={() => toggleStatus(filtroStatusTarefa, setFiltroStatusTarefa, s.value)}
                    style={{ background: ativo ? cor : cor + '18', color: ativo ? '#fff' : cor, border: `1.5px solid ${cor}40` }}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all">
                    {s.label}
                  </button>
                )
              })}
              {filtroStatusTarefa.length > 0 && (
                <button onClick={() => setFiltroStatusTarefa([])}
                  className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-red-500 transition-colors ml-1">
                  <X className="h-3 w-3" /> Limpar tarefa
                </button>
              )}
            </div>
          </div>

          {/* Ações de status */}
          <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-200 pl-4">
            <button
              onClick={() => { setFiltroStatusProjeto([]); setFiltroStatusTarefa([]) }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap">
              <X className="h-3 w-3" /> Limpar Todos
            </button>
            <button
              onClick={() => { setFiltroStatusProjeto(['mapeado','programado','em_andamento','pausado']); setFiltroStatusTarefa(['mapeado','programado','em_andamento','pausado']) }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap">
              <RotateCcw className="h-3 w-3" /> Filtro Original
            </button>
          </div>
        </div>
      </div>

      {/* Botões recolher / expandir */}
      {projetosRender.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setDeptosExpandidos(new Set()); setRecolhidos(new Set(projetosRender.map(p => p.id))); setStatusesRecolhidos(new Set(['em_andamento','programado','mapeado','pausado','concluido','cancelado'])) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
            <ChevronRight className="h-3.5 w-3.5" /> Recolher tudo
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <button
            onClick={() => { setDeptosExpandidos(new Set(departamentos)); setRecolhidos(new Set()); setStatusesRecolhidos(new Set()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
            <ChevronDown className="h-3.5 w-3.5" /> Expandir tudo
          </button>
          {deptosExpandidos.size > 0 && statusesRecolhidos.size > 0 ? (
            <button
              onClick={() => { setDeptosExpandidos(new Set()); setStatusesRecolhidos(new Set(['em_andamento','programado','mapeado','pausado','concluido','cancelado'])); setRecolhidos(new Set(projetosRender.map(p => p.id))) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" /> Recolher Status
            </button>
          ) : (
            <button
              onClick={() => { setDeptosExpandidos(new Set(departamentos)); setStatusesRecolhidos(new Set(['em_andamento','programado','mapeado','pausado','concluido','cancelado'])); setRecolhidos(new Set(projetosRender.map(p => p.id))) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
              <ChevronDown className="h-3.5 w-3.5" /> Expandir por Status
            </button>
          )}
          {deptosExpandidos.size > 0 && statusesRecolhidos.size === 0 && recolhidos.size > 0 ? (
            <button
              onClick={() => { setDeptosExpandidos(new Set()); setStatusesRecolhidos(new Set(['em_andamento','programado','mapeado','pausado','concluido','cancelado'])); setRecolhidos(new Set(projetosRender.map(p => p.id))) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" /> Recolher Projetos
            </button>
          ) : (
            <button
              onClick={() => { setDeptosExpandidos(new Set(departamentos)); setStatusesRecolhidos(new Set()); setRecolhidos(new Set(projetosRender.map(p => p.id))) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors">
              <ChevronDown className="h-3.5 w-3.5" /> Expandir por Projetos
            </button>
          )}
        </div>
      )}

      {/* Conteúdo agrupado por departamento */}
      {projetosRender.length === 0 ? (
        <div className="p-16 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">
          Nenhum projeto encontrado com os filtros selecionados.
        </div>
      ) : (
        <div id="planejamento-conteudo" className="space-y-1">
          {departamentos.map((depto, di) => {
            const projsDepto = projetosRender
              .filter(p => (p.departamento_nome || 'Sem Departamento') === depto)
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            if (projsDepto.length === 0) return null
            const deptoRecolhido = !deptosExpandidos.has(depto)
            const totalTarefas = projsDepto.reduce((sum, p) => sum + p.proj_tarefas.length, 0)
            const resps = [...new Set(projsDepto.map(p => p.responsavel_nome).filter(Boolean))]

            return (
              <div key={depto} className={di > 0 ? 'mt-3' : ''}>
                {/* Cabeçalho do Departamento */}
                <div
                  className="px-5 py-3 flex items-center justify-between bg-slate-700 text-white gap-4 cursor-pointer select-none rounded-t-lg"
                  onClick={() => toggleDepto(depto)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="opacity-60">
                      {deptoRecolhido ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-widest shrink-0">{depto}</span>
                    {resps.length > 0 && (
                      <span className="text-xs opacity-75 font-medium hidden sm:inline">
                        Responsável Geral: <span className="font-semibold opacity-100">{resps.join(' · ')}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs opacity-80 font-medium shrink-0">
                    {projsDepto.length} projeto{projsDepto.length !== 1 ? 's' : ''} · {totalTarefas} tarefa{totalTarefas !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Projetos do departamento agrupados por status */}
                {!deptoRecolhido && (
                  <div className="space-y-0 border border-t-0 border-slate-200 rounded-b-lg overflow-hidden">
                    {['em_andamento','programado','mapeado','pausado','concluido','cancelado'].map(stValue => {
                      const st = STATUS_PROJETO.find(s => s.value === stValue)
                      if (!st) return null
                      const projsStatus = projsDepto.filter(p => p.status === stValue)
                      if (projsStatus.length === 0) return null
                      const corStatus = STATUS_COR[stValue] || '#94a3b8'
                      return (
                        <React.Fragment key={stValue}>
                          {/* Cabeçalho do status */}
                          <div
                            className="px-5 py-2 flex items-center gap-2 cursor-pointer select-none"
                            style={{ backgroundColor: corStatus }}
                            onClick={() => setStatusesRecolhidos(prev => {
                              const next = new Set(prev)
                              next.has(stValue) ? next.delete(stValue) : next.add(stValue)
                              return next
                            })}
                          >
                            <span className="text-white/70">
                              {statusesRecolhidos.has(stValue)
                                ? <ChevronRight className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-widest text-white">{st.label}</span>
                            <span className="text-xs text-white/75 font-medium">· {projsStatus.length} projeto{projsStatus.length !== 1 ? 's' : ''}</span>
                          </div>
                          {!statusesRecolhidos.has(stValue) && projsStatus.map((p, pi) => {
                      const tarefas = p.proj_tarefas.slice().sort((a, b) => {
                        const ea = a.etapa ?? 999
                        const eb = b.etapa ?? 999
                        if (ea !== eb) return ea - eb
                        const oa = faseOrdemPorNome[a.fase_nome] ?? 9999
                        const ob = faseOrdemPorNome[b.fase_nome] ?? 9999
                        if (oa !== ob) return oa - ob
                        return (a.data_fim || '').localeCompare(b.data_fim || '')
                      })
                      const recolhido = recolhidos.has(p.id)
                      const fasesProj = fasesComDataDe(tarefas)

                      return (
                        <div key={p.id} id={`planejamento-projeto-${p.id}`} className={pi > 0 ? 'border-t border-slate-200' : ''}>
                          {/* Cabeçalho do projeto */}
                          {(() => {
                            const todasTarefas = projetos.find(orig => orig.id === p.id)?.proj_tarefas || []
                            const progresso = todasTarefas.length > 0
                              ? Math.round(todasTarefas.reduce((s, t) => s + (t.status_kanban === 'concluido' ? 100 : (Number(t.progresso_pct) || 0)), 0) / todasTarefas.length)
                              : 0
                            const datasIni = todasTarefas.map(t => t.data_inicio).filter(Boolean).sort()
                            const datasFim = todasTarefas.map(t => t.data_fim).filter(Boolean).sort()
                            const dataIniT = datasIni[0]
                            const dataFimT = datasFim[datasFim.length - 1]
                            return (
                              <div className="bg-slate-100 px-4 py-2 flex items-center gap-2">
                                <button onClick={() => toggleRecolhido(p.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                  {recolhido
                                    ? <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                  <span className="font-bold text-slate-800 text-[11px] truncate">{p.nome}</span>
                                  {(p.sistemas_nomes || []).map(s => {
                                    const cor = sistemaCorMap[s] || '#1e293b'
                                    const txt = sistemaCorTextoMap[s] || getTextColor(cor)
                                    return (
                                      <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: cor, color: txt }}>{s}</span>
                                    )
                                  })}
                                </button>
                                <button
                                  onClick={() => navigate(`/projetos/detalhe/${p.id}/editar`)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors shrink-0"
                                  title="Editar projeto"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                {(dataIniT || dataFimT) && (
                                  <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                                    Início/Término: {fmtData(dataIniT) || '—'} → {fmtData(dataFimT) || '—'}
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold whitespace-nowrap shrink-0 ${progresso >= 100 ? 'text-teal-600' : progresso >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                                  {progresso}% concluído
                                </span>
                              </div>
                            )
                          })()}

                          {/* Tabela do projeto */}
                          {!recolhido && (
                            <div className="overflow-x-auto">
                              <table className="text-xs border-collapse w-full">
                                <thead>
                                  <tr className="bg-white border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="px-3 py-2 text-center w-14 sticky left-0 bg-white z-10">Etapa</th>
                                    <th className="px-4 py-2 text-left min-w-[280px]">Tarefa</th>
                                    <th className="px-3 py-2 text-center w-36 whitespace-nowrap">Sistema<br/><span className="normal-case font-normal text-slate-300">Depto / Área</span></th>
                                    <th className="px-3 py-2 text-center w-28 whitespace-nowrap">Resp. Tarefa</th>
                                    <th className="px-3 py-2 text-center w-32 whitespace-nowrap">Status</th>
                                    <th className="px-3 py-2 text-center w-36 whitespace-nowrap">% Conclusão</th>
                                    <th className="px-3 py-2 text-center w-28 whitespace-nowrap">Início</th>
                                    <th className="px-3 py-2 text-center w-28 whitespace-nowrap">Término</th>
                                    <th className="px-2 py-2 w-8" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {tarefas.map(t => {
                                    const atrasada = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
                                    const statusCor = STATUS_TAREFA_COR[t.status_kanban || 'mapeado'] || 'bg-slate-100 text-slate-600'
                                    const statusLabel = STATUS_TAREFA_LABEL[t.status_kanban || 'mapeado'] || t.status_kanban || '—'
                                    const pct = t.progresso_pct ?? (t.status_kanban === 'concluido' ? 100 : 0)
                                    const sistCor = t.sistema_nome ? (sistemaCorMap[t.sistema_nome] || '#1e293b') : null
                                    const sistTxt = t.sistema_nome ? (sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistCor)) : null
                                    return (
                                      <tr key={t.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${atrasada ? 'bg-red-50/30' : 'bg-white'}`}>
                                        <td className={`px-3 py-2.5 text-center sticky left-0 z-10 ${atrasada ? 'bg-red-50/60' : 'bg-white'}`}>
                                          {t.etapa != null
                                            ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${t.status_kanban === 'em_andamento' ? 'bg-orange-500 text-white shadow-sm' : 'bg-indigo-100 text-indigo-700'}`}>{t.etapa}</span>
                                            : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-start gap-1.5">
                                            {atrasada && <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />}
                                            <div className="flex flex-col gap-0.5 w-full">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-slate-700 font-medium leading-snug">{t.nome}</span>
                                                {(t.proj_deliberacoes || []).length > 0 && (
                                                  <button
                                                    onClick={() => setDelibersAbertos(prev => {
                                                      const next = new Set(prev)
                                                      next.has(t.id) ? next.delete(t.id) : next.add(t.id)
                                                      return next
                                                    })}
                                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0 ${delibersAbertos.has(t.id) ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                    title={delibersAbertos.has(t.id) ? 'Ocultar deliberações' : 'Ver deliberações'}
                                                  >
                                                    <ScrollText className="h-3 w-3" />
                                                    {(t.proj_deliberacoes || []).length}
                                                  </button>
                                                )}
                                              </div>
                                              {delibersAbertos.has(t.id) && (t.proj_deliberacoes || []).length > 0 && (
                                                <div className="flex flex-col gap-0.5 mt-1 pl-1 border-l-2 border-indigo-200">
                                                  {[...(t.proj_deliberacoes || [])].sort((a, b) => (a.data || '') < (b.data || '') ? -1 : 1).map(d => (
                                                    <span key={d.id} className="flex items-start gap-1 text-[10px] italic text-slate-500 leading-snug">
                                                      <ScrollText className="h-3 w-3 shrink-0 mt-px text-indigo-400" />
                                                      {d.data ? `${fmtData(d.data)} — ` : ''}{d.texto}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                          {t.sistema_nome && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: sistCor, color: sistTxt }}>{t.sistema_nome}</span>
                                          )}
                                          {(p.departamento_nome || p.area_nome) && (
                                            <div className="text-[10px] text-slate-400 italic mt-0.5 whitespace-nowrap">
                                              {[p.departamento_nome, p.area_nome].filter(Boolean).join(' / ')}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 whitespace-nowrap">
                                          {t.responsavel_nome || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${statusCor}`}>{statusLabel}</span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden min-w-[60px]">
                                              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className={`text-[10px] font-bold whitespace-nowrap ${pct >= 100 ? 'text-teal-600' : pct > 0 ? 'text-slate-600' : 'text-slate-400'}`}>{pct}%</span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                          {t.data_inicio
                                            ? <span className="text-slate-600">{fmtData(t.data_inicio)}</span>
                                            : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                          {t.data_fim
                                            ? <span className={atrasada ? 'text-red-500 font-semibold' : 'text-slate-600'}>{fmtData(t.data_fim)}</span>
                                            : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                          <div className="flex items-center gap-1 justify-center">
                                            {canIniciarTarefa && !verTodos && t.status_kanban === 'programado' && (
                                              <button
                                                onClick={() => handleIniciarTarefa(t)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Iniciar tarefa"
                                              >
                                                <PlayCircle className="h-3.5 w-3.5" />
                                              </button>
                                            )}
                                            {canConcluirTarefa && !verTodos && t.status_kanban === 'em_andamento' && (
                                              <button
                                                onClick={() => setModalConcluir({ tarefa: t, dataFim: hojeISO })}
                                                className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                                title="Concluir tarefa"
                                              >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                              </button>
                                            )}
                                            {canEditarTarefa && !verTodos ? (
                                              <button
                                                onClick={() => setModalEditarTarefa({ ...t, projeto_id: p.id, _tarefasProjeto: p.proj_tarefas || [] })}
                                                className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors"
                                                title="Ver / Editar tarefa"
                                              >
                                                <Edit2 className="h-3.5 w-3.5" />
                                              </button>
                                            ) : (
                                              <button onClick={() => navigate(`/projetos/detalhe/${p.id}/editar`)}
                                                className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors">
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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

      {modalEditarTarefa && (
        <TarefaFormModal
          projetoId={modalEditarTarefa.projeto_id}
          tarefa={modalEditarTarefa}
          initialValues={null}
          tarefas={modalEditarTarefa._tarefasProjeto}
          dependenciasAtuais={[]}
          responsaveis={optsResp}
          sistemas={sistemas.filter(s => s.ativo !== false)}
          fases={fases.filter(f => f.ativo !== false)}
          empresas={optsEmp}
          areas={modalOptsArea}
          onClose={() => setModalEditarTarefa(null)}
          onSaved={() => { recarregarDados(); setModalEditarTarefa(null) }}
          onNavigate={(t) => setModalEditarTarefa({
            ...t,
            projeto_id: modalEditarTarefa.projeto_id,
            _tarefasProjeto: modalEditarTarefa._tarefasProjeto,
          })}
        />
      )}
    </div>
  )
}
