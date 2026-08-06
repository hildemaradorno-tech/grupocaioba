import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ClipboardList, AlertCircle, X, Edit2, CheckCircle2, PlayCircle, RotateCcw, ChevronDown, ChevronRight, ScrollText, Filter } from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais } from '../../context/ProjetosFiltrosContext'
import TarefaFormModal from './TarefaFormModal'

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
const STATUS_KEYS = Object.keys(STATUS_LABEL)

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const hojeISO  = new Date().toISOString().slice(0, 10)
const hojeDate = new Date()
const primeiroDiaMes = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1).toISOString().slice(0, 10)
const ultimoDiaMes   = new Date(hojeDate.getFullYear(), hojeDate.getMonth() + 1, 0).toISOString().slice(0, 10)

const getTextColor = (hex) => {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

const formatarDataLonga = (iso) => {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// Seções de status dentro de cada projeto
const STATUS_SECOES = [
  { key: 'em_andamento', label: 'Em Andamento', statuses: ['em_andamento'],
    divCor: 'bg-amber-500 text-white',   rowBg: 'bg-amber-50/60',  border: 'border-amber-200' },
  { key: 'programado',   label: 'Programado',   statuses: ['programado'],
    divCor: 'bg-blue-600 text-white',    rowBg: 'bg-blue-50/60',   border: 'border-blue-200'  },
  { key: 'mapeado',      label: 'Mapeado',      statuses: ['mapeado'],
    divCor: 'bg-slate-500 text-white',   rowBg: 'bg-slate-50/60',  border: 'border-slate-200' },
  { key: 'concluido',    label: 'Concluído',    statuses: ['concluido'],
    divCor: 'bg-teal-700 text-white',    rowBg: 'bg-teal-50/40',   border: 'border-teal-200'  },
  { key: 'pausado',      label: 'Pausado',      statuses: ['pausado'],
    divCor: 'bg-purple-600 text-white',  rowBg: 'bg-purple-50/40', border: 'border-purple-200' },
]

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

const mediaProgresso = (tarefas) => {
  if (!tarefas?.length) return null
  const total = tarefas.reduce((s, t) =>
    s + (t.status_kanban === 'concluido' ? 100 : Number(t.progresso_pct) || 0), 0)
  return Math.round(total / tarefas.length)
}

export default function AtaReuniao() {
  const navigate = useNavigate()
  const { isAdmin, empresasPermitidas, departamentosPermitidosEfetivos, hasActionOrDefault } = useAuth()
  const canEditarProjeto  = hasActionOrDefault('projetos/pdca', 'editar_projeto')
  const canEditarTarefa   = hasActionOrDefault('projetos/pdca', 'editar_tarefa')
  const canIniciarTarefa  = hasActionOrDefault('projetos/pdca', 'iniciar_tarefa')
  const canConcluirTarefa = hasActionOrDefault('projetos/pdca', 'concluir_tarefa')
  const ctx = useProjetosFiltros()
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dataInicio = ctx.filtroDataIni
  const setDataInicio = ctx.setFiltroDataIni
  const dataAta = ctx.filtroDataFim
  const setDataAta = ctx.setFiltroDataFim
  const filtroDataTipo = ctx.filtroDataTipo
  const setFiltroDataTipo = ctx.setFiltroDataTipo
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [verTodos, setVerTodos] = useState(false)

  const recarregarDados = useCallback(() => {
    const filtrosEmpresa = (isAdmin || verTodos) ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getProjetosParaAta(filtrosEmpresa)
      .then(setProjetos)
      .catch(err => setError(err.message || String(err)))
  }, [isAdmin, empresasPermitidas, verTodos])

  useEffect(() => {
    setLoading(true)
    const filtrosEmpresa = (isAdmin || verTodos) ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getProjetosParaAta(filtrosEmpresa)
      .then(setProjetos)
      .catch(err => setError(err.message || String(err)))
      .finally(() => setLoading(false))
  }, [isAdmin, empresasPermitidas, verTodos])

  const [modalEditarTarefa, setModalEditarTarefa] = useState(null)
  const [modalConcluir, setModalConcluir] = useState(null)
  const [projetosExpandidos, setProjetosExpandidos] = useState(new Set())
  const [delibersAbertos, setDelibersAbertos] = useState(new Set())
  const [deptosExpandidos,   setDeptosExpandidos]   = useState(new Set())

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
  const [optsResp,  setOptsResp]  = useState([])
  const [optsSist,  setOptsSist]  = useState([])
  const [optsFase,  setOptsFase]  = useState([])
  const [optsEmp,   setOptsEmp]   = useState([])
  const [optsArea,  setOptsArea]  = useState([])

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

  const sistemaCorMap = Object.fromEntries(optsSist.map(s => [s.nome, s.cor || '#1e293b']))

  const filtroTarefas         = projetos.flatMap(p => p.proj_tarefas || [])
  const filtroOptsEmpresa     = [...new Set(projetos.map(p => p.empresa_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const filtroOptsDepto       = [...new Set(projetos.map(p => p.departamento_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const filtroOptsArea        = [...new Set(projetos.map(p => p.area_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const filtroOptsFase        = [...new Set(filtroTarefas.map(t => t.fase_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const filtroOptsSistema     = [...new Set(filtroTarefas.map(t => t.sistema_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const filtroOptsRespProjeto = [...new Set(projetos.map(p => p.responsavel_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const filtroOptsRespTarefa  = [...new Set(filtroTarefas.map(t => t.responsavel_nome).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'))
  const numFiltrosAtivos = [ctx.filtroEmpresa, ctx.filtroDepartamento, ctx.filtroArea, ctx.filtroFase, ctx.filtroSistema, ctx.filtroRespProjeto, ctx.filtroRespTarefa, dataInicio, dataAta].filter(Boolean).length
  const selCls = 'text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white w-full'

  // Projetos após filtros globais compartilhados + filtros de status
  const projetosFiltrados = aplicarFiltrosGlobais(projetos, ctx, verTodos ? null : departamentosPermitidosEfetivos)

  const projetosParaRender = projetosFiltrados
    .filter(p => ctx.filtroStatusProjeto.length === 0 || ctx.filtroStatusProjeto.includes(p.status))
    .map(p => ({
      ...p,
      proj_tarefas: (p.proj_tarefas || []).filter(t =>
        (ctx.filtroStatusProjeto.length > 0 || ctx.filtroStatusTarefa.length === 0 || ctx.filtroStatusTarefa.includes(t.status_kanban || 'mapeado')) &&
        (!ctx.filtroRespTarefa || (t.responsavel_nome || '') === ctx.filtroRespTarefa)
      ),
    }))
    .filter(p => p.proj_tarefas.length > 0)

  // Lista de departamentos únicos ordenados alfabeticamente (a partir dos projetos já filtrados)
  const departamentos = [...new Set(projetosParaRender.map(p => p.departamento_nome || 'Sem Departamento'))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const handleSalvarPDF = async () => {
    if (!document.getElementById('ata-documento')) return
    setGerandoPDF(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // A4 landscape
      const MARGIN = 20
      const GAP    = 6
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth()  - 2 * MARGIN  // ~801 pt
      const CH = pdf.internal.pageSize.getHeight() - 2 * MARGIN  // ~555 pt
      const WRAP_W = 1600  // px — jsPDF escala 801/1600=0.5; inline styles no clone aumentam fontes só no PDF

      // Captura um elemento DOM clonado fora do layout clippado
      const capture = async (el) => {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:white;z-index:-1;`
        const clone = el.cloneNode(true)
        // Inline styles aplicados só no clone → não vazam para a tela
        clone.querySelectorAll('table').forEach(t => { t.style.fontSize = '16px' })
        clone.querySelectorAll('table thead th, table thead td').forEach(t => { t.style.fontSize = '14px' })
        clone.querySelectorAll('.no-print').forEach(el => { el.style.display = 'none' })
        clone.querySelectorAll('[data-pdf-badge]').forEach(b => {
          b.style.fontSize = '14px'
          b.style.padding = '4px 24px'
          b.style.letterSpacing = '0.04em'
          b.style.display = 'block'
          b.style.textAlign = 'center'
        })
        wrap.appendChild(clone)
        document.body.appendChild(wrap)
        try {
          return await html2canvas(clone, {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#ffffff', width: WRAP_W,
          })
        } finally {
          document.body.removeChild(wrap)
        }
      }

      const getH  = (c) => (c.height / c.width) * CW
      const place = (c, y) => {
        const h = getH(c)
        pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, y, CW, h)
        return h
      }

      // Fatia um canvas grande em várias páginas
      const placeSliced = (c, startY) => {
        const pageHpx = Math.floor(c.width * CH / CW)
        let srcY = 0; let y = startY
        while (srcY < c.height) {
          if (srcY > 0) { pdf.addPage(); y = MARGIN }
          const sliceH = Math.min(pageHpx, c.height - srcY)
          const slice = document.createElement('canvas')
          slice.width = c.width; slice.height = Math.ceil(sliceH)
          const ctx = slice.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, slice.width, slice.height)
          ctx.drawImage(c, 0, -srcY)
          pdf.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, y, CW, (sliceH / c.width) * CW)
          y += (sliceH / c.width) * CW + 2
          srcY += pageHpx
        }
        return y
      }

      // Captura o cabeçalho do documento (Grupo Caiobá / PDCA / Gestão de Projetos)
      const headerDocEl = document.querySelector('#ata-documento > div:first-child')
      const deptoEls = [...document.querySelectorAll('.pdca-depto')]
      if (!deptoEls.length) { alert('Sem dados para exportar.'); return }

      // Pré-captura do cabeçalho e das barras de departamento
      const headerC = headerDocEl ? await capture(headerDocEl) : null

      let firstProject = true

      for (const deptoEl of deptoEls) {
        const barEl = deptoEl.querySelector(':scope > div:first-child')  // barra escura do depto
        const barC  = barEl ? await capture(barEl) : null
        const projEls = [...deptoEl.querySelectorAll('.pdca-projeto')]

        for (const projEl of projEls) {
          if (!firstProject) { pdf.addPage() }
          let y = MARGIN

          // Primeira página: coloca o cabeçalho do documento
          if (firstProject && headerC) {
            y += place(headerC, y) + GAP
          }
          firstProject = false

          // Barra do departamento no topo de cada projeto
          if (barC) { y += place(barC, y) + GAP }

          // Conteúdo do projeto — fatia se necessário
          const projC = await capture(projEl)
          if (y + getH(projC) <= MARGIN + CH) {
            place(projC, y)
          } else {
            placeSliced(projC, y)
          }
        }
      }

      const nomeArquivo = ['PDCA', dataAta, ctx.filtroDepartamento, ctx.filtroRespTarefa]
        .filter(Boolean).join(' - ')
      pdf.save(`${nomeArquivo}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerandoPDF(false)
    }
  }

  return (
    <div className="p-6 max-w-screen-xl space-y-4">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1cm 1.5cm; }

          /* Mostra apenas o documento PDCA */
          body * { visibility: hidden; }
          #ata-documento, #ata-documento * { visibility: visible; }
          #ata-documento {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          /* Remove restrições de overflow de todos os ancestrais */
          html, body {
            overflow: visible !important;
            height: auto !important;
          }

          /* Cada departamento começa em nova página (exceto o primeiro) */
          .pdca-depto + .pdca-depto {
            break-before: page;
            page-break-before: always;
          }

          /* Não quebra no meio de um card de projeto */
          .pdca-projeto {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Garante que cores de fundo apareçam na impressão */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      {/* Documento */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm" id="ata-documento">

        {/* Cabeçalho do documento */}
        <div className="px-8 pt-6 pb-5 border-b border-slate-100">
          {/* Linha 1: ícone + título + data + botões de ação */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/projetos')} className="no-print p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="p-3 bg-blue-600 rounded-xl shrink-0">
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grupo Caiobá</p>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">PDCA</h2>
                <p className="text-sm text-slate-500 mt-0.5">Gestão de Projetos</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="no-print flex items-center gap-2">
                <button
                  onClick={() => setVerTodos(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${verTodos ? 'bg-amber-50 text-amber-700 border-amber-300' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
                  title={verTodos ? 'Voltar para minha visão' : 'Ver todos os projetos (somente leitura)'}
                >
                  {verTodos ? '← Minha Visão' : 'Ver Todos os Projetos'}
                </button>
                <button
                  onClick={handleSalvarPDF}
                  disabled={gerandoPDF}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  {gerandoPDF ? 'Gerando...' : 'Salvar PDF'}
                </button>
              </div>
              {verTodos && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 text-[11px] text-amber-700 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  Modo visualização — todos os projetos · somente leitura
                </div>
              )}
            </div>
          </div>
          {/* Linha 2 (no-print): nav + botão filtros */}
          <div className="no-print mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <ProjetosNav />
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => ctx.setFiltrosAbertos(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${ctx.filtrosAbertos ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros Avançados
                {numFiltrosAtivos > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold bg-blue-600 text-white px-1">{numFiltrosAtivos}</span>
                )}
              </button>
              {numFiltrosAtivos > 0 && !ctx.filtrosAbertos && (
                <button
                  onClick={() => { ctx.limparFiltros(); setDataInicio(''); setDataAta('') }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Limpar todos os filtros"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Painel de filtros avançados (colapsável) */}
          {ctx.filtrosAbertos && (
            <div className="no-print mt-3 pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Período:</span>
                <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-md p-0.5">
                  {[{ k: 'inicio', l: 'Início' }, { k: 'fim', l: 'Término' }, { k: 'ambos', l: 'Ambos' }].map(({ k, l }) => (
                    <button key={k} onClick={() => setFiltroDataTipo(k)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${filtroDataTipo === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">De</span>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  onClick={e => e.target.showPicker?.()} className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer" />
                <span className="text-[10px] text-slate-400">até</span>
                <input type="date" value={dataAta} onChange={e => setDataAta(e.target.value)}
                  onClick={e => e.target.showPicker?.()} min={dataInicio || undefined}
                  className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer" />
                <button onClick={() => { setDataInicio(''); setDataAta('') }}
                  className={`p-1 rounded transition-colors ${(dataInicio || dataAta) ? 'text-red-400 hover:text-red-600' : 'text-slate-200 cursor-default'}`}
                  title="Limpar datas">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
                  <select value={ctx.filtroEmpresa} onChange={e => ctx.setFiltroEmpresa(e.target.value)} className={selCls}>
                    <option value="">Todas</option>
                    {filtroOptsEmpresa.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
                  <select value={ctx.filtroDepartamento} onChange={e => ctx.setFiltroDepartamento(e.target.value)} className={selCls}>
                    <option value="">Todos</option>
                    {filtroOptsDepto.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Área</label>
                  <select value={ctx.filtroArea} onChange={e => ctx.setFiltroArea(e.target.value)} className={selCls}>
                    <option value="">Todas</option>
                    {filtroOptsArea.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fase</label>
                  <select value={ctx.filtroFase} onChange={e => ctx.setFiltroFase(e.target.value)} className={selCls}>
                    <option value="">Todas</option>
                    {filtroOptsFase.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sistema</label>
                  <select value={ctx.filtroSistema} onChange={e => ctx.setFiltroSistema(e.target.value)} className={selCls}>
                    <option value="">Todos</option>
                    {filtroOptsSistema.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Projeto</label>
                  <select value={ctx.filtroRespProjeto} onChange={e => ctx.setFiltroRespProjeto(e.target.value)} className={selCls}>
                    <option value="">Todos</option>
                    {filtroOptsRespProjeto.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Tarefa</label>
                  <select value={ctx.filtroRespTarefa} onChange={e => ctx.setFiltroRespTarefa(e.target.value)} className={selCls}>
                    <option value="">Todos</option>
                    {filtroOptsRespTarefa.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => { ctx.limparFiltros(); setDataInicio(''); setDataAta('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Limpar Filtros
              </button>
            </div>
          )}
          {/* Linha 4 (no-print): status projeto + status tarefa na mesma linha */}
          <div className="no-print mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            {/* Grupo Projeto */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Projeto:</span>
              {STATUS_KEYS.map(s => {
                const cor = STATUS_COR[s]; const ativo = ctx.filtroStatusProjeto.includes(s)
                return (
                  <button key={s}
                    onClick={() => ctx.setFiltroStatusProjeto(prev => ativo ? prev.filter(x => x !== s) : [...prev, s])}
                    style={{ background: ativo ? cor : cor + '18', color: ativo ? '#fff' : cor, border: `1.5px solid ${cor}40` }}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all"
                  >{STATUS_LABEL[s]}</button>
                )
              })}
              {ctx.filtroStatusProjeto.length > 0 && (
                <button
                  onClick={() => ctx.setFiltroStatusProjeto([])}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title="Limpar filtro de projeto"
                >
                  <X className="h-3 w-3" /> Limpar projeto
                </button>
              )}
            </div>
            <div className="w-px h-5 bg-slate-200 shrink-0" />
            {/* Grupo Tarefa */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Tarefa:</span>
              {STATUS_KEYS.map(s => {
                const cor = STATUS_COR[s]; const ativo = ctx.filtroStatusTarefa.includes(s)
                return (
                  <button key={s}
                    onClick={() => ctx.setFiltroStatusTarefa(prev => ativo ? prev.filter(x => x !== s) : [...prev, s])}
                    style={{ background: ativo ? cor : cor + '18', color: ativo ? '#fff' : cor, border: `1.5px solid ${cor}40` }}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all"
                  >{STATUS_LABEL[s]}</button>
                )
              })}
              {ctx.filtroStatusTarefa.length > 0 && (
                <button
                  onClick={() => ctx.setFiltroStatusTarefa([])}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title="Limpar filtro de tarefa"
                >
                  <X className="h-3 w-3" /> Limpar tarefa
                </button>
              )}
            </div>
            {/* Controles globais */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {(ctx.filtroStatusProjeto.length > 0 || ctx.filtroStatusTarefa.length > 0) && (
                <button
                  onClick={() => { ctx.setFiltroStatusProjeto([]); ctx.setFiltroStatusTarefa([]) }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
                  title="Remove todos os filtros de status"
                >
                  <X className="h-3 w-3" /> Limpar Todos
                </button>
              )}
              <button
                onClick={() => {
                  ctx.setFiltroStatusProjeto([])
                  ctx.setFiltroStatusTarefa([])
                  ctx.limparFiltros()
                  setDataInicio('')
                  setDataAta('')
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Restaura todos os filtros ao estado inicial"
              >
                <RotateCcw className="h-3 w-3" /> Filtro Original
              </button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button
                onClick={() => setProjetosExpandidos(new Set())}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title="Recolher todos"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setProjetosExpandidos(new Set(projetosParaRender.map(p => p.id)))}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title="Expandir todos"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="p-16 text-center text-sm text-slate-400">Carregando...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : (
          <div>
            {departamentos.map((depto, di) => {
              const projsDepto = projetosParaRender
                .filter(p => (p.departamento_nome || 'Sem Departamento') === depto)
                .filter(p => (p.proj_tarefas || []).length > 0)
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
              const totalTarefasDepto = projsDepto.reduce((sum, p) => sum + (p.proj_tarefas || []).length, 0)
              const respDepto = [...new Set(projsDepto.map(p => p.responsavel_nome).filter(Boolean))]
              if (projsDepto.length === 0) return null

              if (dataAta || dataInicio) {
                const algumaTarefaVisivel = projsDepto.some(p =>
                  (p.proj_tarefas || []).some(t => {
                    if (!dataAta && t.status_kanban === 'mapeado' && !t.data_inicio && !t.data_fim) return true
                    return tarefaPassaFiltroData(t, dataInicio, dataAta, filtroDataTipo)
                  })
                )
                if (!algumaTarefaVisivel) return null
              }

              return (
                <div key={depto} className={`pdca-depto${di > 0 ? ' border-t-4 border-slate-100' : ''}`}>
                  {/* Header do Departamento */}
                  <div
                    className="px-8 py-3 flex items-center justify-between bg-slate-700 text-white gap-4 cursor-pointer select-none"
                    onClick={() => setDeptosExpandidos(prev => {
                      const next = new Set(prev)
                      if (next.has(depto)) next.delete(depto); else next.add(depto)
                      return next
                    })}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="no-print opacity-60">
                        {deptosExpandidos.has(depto) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                      <span className="text-sm font-bold uppercase tracking-widest shrink-0">{depto}</span>
                      {respDepto.length > 0 && (
                        <span className="text-xs opacity-75 font-medium">
                          Responsável Geral: <span className="font-semibold opacity-100">{respDepto.join(' · ')}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs opacity-80 font-medium shrink-0">
                      {projsDepto.length} projeto{projsDepto.length !== 1 ? 's' : ''} · {totalTarefasDepto} tarefa{totalTarefasDepto !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {deptosExpandidos.has(depto) && <div>
                    {['concluido', 'em_andamento', 'programado', 'mapeado', 'pausado'].map(statusKey => {
                      const projsStatus = projsDepto.filter(p => p.status === statusKey)
                      if (projsStatus.length === 0) return null

                      const secaoStatus = STATUS_SECOES.find(s => s.key === statusKey)

                      // filtra projetos com ao menos uma tarefa visível no período
                      const projsVisiveis = projsStatus.filter(p => {
                        const ts = p.proj_tarefas || []
                        const tf = (dataAta || dataInicio)
                          ? ts.filter(t => {
                              if (!dataAta && t.status_kanban === 'mapeado' && !t.data_inicio && !t.data_fim) return true
                              return tarefaPassaFiltroData(t, dataInicio, dataAta, filtroDataTipo)
                            })
                          : ts
                        return tf.length > 0
                      })
                      if (projsVisiveis.length === 0) return null

                      return (
                        <div key={statusKey}>
                          {/* Cabeçalho do grupo de status */}
                          <div className={`mx-6 mt-5 mb-3 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${secaoStatus?.divCor || 'bg-slate-500 text-white'}`}>
                            {STATUS_LABEL[statusKey]}
                            <span className="font-normal opacity-75 normal-case tracking-normal">· {projsVisiveis.length} projeto{projsVisiveis.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="px-6 space-y-4 pb-2">
                    {projsVisiveis.map(p => {
                      const todasTarefas = p.proj_tarefas || []
                      const tarefasFiltradas = (dataAta || dataInicio)
                        ? todasTarefas.filter(t => {
                            if (!dataAta && t.status_kanban === 'mapeado' && !t.data_inicio && !t.data_fim) return true
                            return tarefaPassaFiltroData(t, dataInicio, dataAta, filtroDataTipo)
                          })
                        : todasTarefas
                      const pctMedia = mediaProgresso(todasTarefas)

                      return (
                        <div key={p.id} className="pdca-projeto rounded-lg border border-slate-200 overflow-hidden">
                          {/* Cabeçalho do projeto */}
                          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                onClick={() => setProjetosExpandidos(prev => {
                                  const next = new Set(prev)
                                  if (next.has(p.id)) next.delete(p.id); else next.add(p.id)
                                  return next
                                })}
                                className="no-print p-0.5 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                title={projetosExpandidos.has(p.id) ? 'Recolher tarefas' : 'Expandir tarefas'}
                              >
                                {projetosExpandidos.has(p.id)
                                  ? <ChevronDown className="h-4 w-4" />
                                  : <ChevronRight className="h-4 w-4" />}
                              </button>
                              {canEditarProjeto && !verTodos
                                ? <button onClick={() => navigate(`/projetos/${p.id}/editar`)} className="text-sm font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors text-left no-print-inline">{p.nome}</button>
                                : <span className="text-sm font-bold text-slate-900 leading-snug">{p.nome}</span>
                              }
                              {(p.sistemas_nomes || []).map(nome => (
                                <span key={nome} className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                                  style={{ backgroundColor: sistemaCorMap[nome] || '#1e293b', color: getTextColor(sistemaCorMap[nome] || '#1e293b') }}>
                                  {nome}
                                </span>
                              ))}
                              {canEditarProjeto && !verTodos && (
                                <button
                                  onClick={() => navigate(`/projetos/${p.id}/editar`)}
                                  className="no-print p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors shrink-0"
                                  title="Editar projeto"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-[11px] text-slate-500 shrink-0 flex-wrap justify-end">
                              {(() => {
                                const starts = todasTarefas.map(t => t.data_inicio).filter(Boolean).sort()
                                const ends   = todasTarefas.map(t => t.data_fim).filter(Boolean).sort().reverse()
                                const ini = starts[0]
                                const fim = ends[0]
                                return (ini || fim) ? (
                                  <span>Início/Término: {fmtData(ini)} → {fmtData(fim)}</span>
                                ) : null
                              })()}
                              {pctMedia !== null && <span className="font-bold text-slate-700">{pctMedia}% concluído</span>}
                            </div>
                          </div>

                          {/* Tarefas agrupadas por status dentro da tabela */}
                          {projetosExpandidos.has(p.id) && <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse min-w-[750px]">
                            <thead>
                              <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100">
                                <th className="px-3 py-2 text-center w-12">Etapa</th>
                                <th className="px-4 py-2 text-left">Tarefa</th>
                                <th className="px-3 py-2 text-left w-32 leading-tight">Sistema<br/><span className="normal-case font-normal text-slate-400">Depto / Área</span></th>
                                <th className="px-3 py-2 text-left w-28">Resp.Tarefa</th>
                                <th className="px-3 py-2 text-center w-32">Status</th>
                                <th className="px-3 py-2 text-center w-28">% Conclusão</th>
                                <th className="px-3 py-2 text-center w-22">Início</th>
                                <th className="px-3 py-2 text-center w-22">Término</th>
                                <th className="no-print w-8" />
                              </tr>
                            </thead>
                            <tbody>
                              {tarefasFiltradas
                                .slice()
                                .sort((a, b) => {
                                  const ea = a.etapa ?? 9999; const eb = b.etapa ?? 9999
                                  if (ea !== eb) return ea - eb
                                  const da = a.data_inicio || '9999-99-99'; const db = b.data_inicio || '9999-99-99'
                                  return da < db ? -1 : da > db ? 1 : 0
                                })
                                .map(t => {
                                  const secao     = STATUS_SECOES.find(s => s.statuses.includes(t.status_kanban))
                                  const pct       = (t.status_kanban || 'mapeado') === 'concluido' ? 100 : (Number(t.progresso_pct) || 0)
                                  const atrasada  = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
                                  const terminaHoje = t.status_kanban !== 'concluido' && t.data_fim === hojeISO
                                  return (
                                    <tr key={t.id} className={atrasada ? 'bg-red-50/50' : `${secao?.rowBg || ''} hover:brightness-95`}>
                                      <td className="px-3 py-2 text-center font-bold text-slate-500">
                                        {t.etapa ?? '—'}
                                      </td>
                                      <td className="px-4 py-2 text-slate-700 font-medium leading-snug">
                                        <div className="flex items-start gap-1.5">
                                          {atrasada && <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />}
                                          <div className="flex flex-col gap-0.5 w-full">
                                            <div className="flex items-center gap-1.5">
                                              <span>{t.nome}</span>
                                              {(t.proj_deliberacoes || []).length > 0 && (
                                                <button
                                                  onClick={() => setDelibersAbertos(prev => {
                                                    const next = new Set(prev)
                                                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id)
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
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {t.sistema_nome
                                          ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: sistemaCorMap[t.sistema_nome] || '#1e293b', color: getTextColor(sistemaCorMap[t.sistema_nome] || '#1e293b') }}>{t.sistema_nome}</span>
                                          : <span className="text-slate-400">—</span>
                                        }
                                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                                          {[p.departamento_nome, t.area_nome || p.area_nome].filter(Boolean).join(' / ') || '—'}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{t.responsavel_nome || '—'}</td>
                                      <td className="px-3 py-2 text-center">
                                        {secao && (
                                          <span data-pdf-badge className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${secao.divCor}`}>
                                            {secao.label}
                                          </span>
                                        )}
                                        {t.fase_nome && (
                                          <div className="text-[10px] text-slate-400 italic mt-0.5">{t.fase_nome}</div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${pct === 100 ? 'bg-teal-500' : atrasada ? 'bg-red-400' : 'bg-blue-500'}`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span className={`font-bold w-8 text-right ${pct === 100 ? 'text-teal-600' : atrasada ? 'text-red-600' : 'text-slate-600'}`}>
                                            {pct}%
                                          </span>
                                        </div>
                                        {t.empresa_nome && (
                                          <div className="text-[10px] text-slate-400 italic mt-0.5">{t.empresa_nome}</div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">{fmtData(t.data_inicio)}</td>
                                      <td className={`px-3 py-2 text-center whitespace-nowrap font-medium ${atrasada ? 'text-red-600 font-bold' : terminaHoje ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                                        {fmtData(t.data_fim)}
                                      </td>
                                      <td className="px-2 py-2 text-center no-print">
                                        <div className="flex items-center gap-1 justify-center">
                                          {canIniciarTarefa && !verTodos && t.status_kanban === 'programado' && (
                                            <button
                                              onClick={() => handleIniciarTarefa(t)}
                                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                              title="Iniciar tarefa"
                                            >
                                              <PlayCircle className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          {canConcluirTarefa && !verTodos && t.status_kanban === 'em_andamento' && (
                                            <button
                                              onClick={() => setModalConcluir({ tarefa: t, dataFim: hojeISO })}
                                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                              title="Concluir tarefa"
                                            >
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          {canEditarTarefa && !verTodos && (
                                            <button
                                              onClick={() => setModalEditarTarefa({ ...t, projeto_id: p.id, _tarefasProjeto: p.proj_tarefas || [] })}
                                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                              title="Ver / Editar tarefa"
                                            >
                                              <Edit2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })
                              }
                            </tbody>
                          </table>
                          </div>}
                        </div>
                      )
                    })}
                          </div>{/* /px-6 projetos do status */}
                        </div>
                      )
                    })}{/* /statusKey map */}
                    <div className="pb-4" />
                  </div>}
                </div>
              )
            })}

            {/* Rodapé */}
            <div className="border-t border-slate-100 px-8 py-4 flex items-center justify-between text-[10px] text-slate-400">
              <span>Gerado em {formatarDataLonga(dataAta || hojeISO)}</span>
              <span>Grupo Caiobá · Gestão de Projetos</span>
            </div>
          </div>
        )}
      </div>

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
          sistemas={optsSist}
          fases={optsFase}
          empresas={optsEmp}
          areas={optsArea}
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
