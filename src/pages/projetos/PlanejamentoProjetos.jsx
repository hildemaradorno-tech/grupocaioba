import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, RotateCcw, AlertCircle, X, Download, Loader2 } from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import ProjetosFiltrosPanel from './ProjetosFiltrosPanel'
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
  return `${dia}/${m}/${y.slice(2)}`
}

const hojeISO = new Date().toISOString().slice(0, 10)

export default function PlanejamentoProjetos() {
  const navigate = useNavigate()
  const { isAdmin, empresasPermitidas, departamentosPermitidosEfetivos } = useAuth()
  const ctx = useProjetosFiltros()
  const {
    filtroDataIni:  filtroDataTermIni, setFiltroDataIni,
    filtroDataFim:  filtroDataTermFim, setFiltroDataFim,
    filtroDataTipo, setFiltroDataTipo,
    filtroStatusProjeto,  setFiltroStatusProjeto,
    filtroStatusTarefa,   setFiltroStatusTarefa,
    filtrosAbertos,       setFiltrosAbertos,
    limparFiltros,
  } = ctx

  const [projetos, setProjetos]     = useState([])
  const [fases, setFases]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [recolhidos, setRecolhidos] = useState(new Set())
  const [gerandoPDF, setGerandoPDF] = useState(false)

  useEffect(() => {
    const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
    Promise.all([
      apiService.getProjetosParaAta(filtrosEmpresa),
      apiService.getProjFases(),
    ])
      .then(([ps, fs]) => { setProjetos(ps); setFases(fs) })
      .catch(err => setError(err.message || String(err)))
      .finally(() => setLoading(false))
  }, [isAdmin, empresasPermitidas])

  // mapa: nome → posição no array (getProjFases já retorna na ordem correta do cadastro)
  const faseOrdemPorNome = useMemo(() =>
    Object.fromEntries(fases.map((f, i) => [f.nome, i]))
  , [fases])

  const toggleStatus = (arr, setter, val) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const projetosBase = useMemo(() => {
    let base = aplicarFiltrosGlobais(projetos, ctx, departamentosPermitidosEfetivos)
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
          return tarefaPassaFiltroData(t, filtroDataTermIni, filtroDataTermFim, filtroDataTipo)
        }),
      }))
      .filter(p => p.proj_tarefas.length > 0)
    return base.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [projetosBase, filtroDataTermIni, filtroDataTermFim, filtroDataTipo])

  // Calcula as fases com data de um conjunto de tarefas (usado por projeto)
  const fasesComDataDe = (tarefas) => {
    const nomes = new Set(tarefas.map(t => t.fase_nome).filter(Boolean))
    return [...nomes]
      .sort((a, b) => (faseOrdemPorNome[a] ?? 9999) - (faseOrdemPorNome[b] ?? 9999))
      .filter(fase => tarefas.some(t => {
        if (t.fase_nome !== fase) return false
        if (filtroDataTipo === 'inicio') return !!t.data_inicio
        if (filtroDataTipo === 'ambos')  return !!t.data_inicio || !!t.data_fim
        return !!t.data_fim
      }))
  }

  const toggleRecolhido = (id) => setRecolhidos(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

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
          onClick={handleSalvarPDF}
          disabled={gerandoPDF}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors whitespace-nowrap"
        >
          {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {gerandoPDF ? 'Gerando...' : 'Salvar PDF'}
        </button>
      </div>

      {/* Barra de navegação + filtros de data */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ProjetosNav />
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-md p-0.5">
            {[{ k: 'inicio', l: 'Início' }, { k: 'fim', l: 'Término' }, { k: 'ambos', l: 'Ambos' }].map(({ k, l }) => (
              <button key={k} onClick={() => setFiltroDataTipo(k)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${filtroDataTipo === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">De</span>
          <input type="date" value={filtroDataTermIni} onChange={e => setFiltroDataIni(e.target.value)}
            onClick={e => e.target.showPicker?.()}
            className="text-[11px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">até</span>
          <input type="date" value={filtroDataTermFim} onChange={e => setFiltroDataFim(e.target.value)}
            onClick={e => e.target.showPicker?.()}
            min={filtroDataTermIni || undefined}
            className="text-[11px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          <button
            onClick={() => { setFiltroDataIni(''); setFiltroDataFim('') }}
            className={`p-1 rounded transition-colors ${(filtroDataTermIni || filtroDataTermFim) ? 'text-red-400 hover:text-red-600' : 'text-slate-200 cursor-default'}`}
            title="Limpar datas"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Painel de filtros avançados — sempre visível (toggle interno) */}
      <ProjetosFiltrosPanel projetos={projetos} />

      {/* Status chips */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-24">Status Projeto:</span>
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
          <button onClick={() => setFiltroStatusProjeto(STATUS_PROJETO.map(s => s.value))} className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Selecionar Todos</button>
          <button onClick={() => setFiltroStatusProjeto([])} className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Remover Todos</button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-24">Status Tarefa:</span>
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
          <button onClick={() => setFiltroStatusTarefa(STATUS_TAREFA.map(s => s.value))} className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Selecionar Todos</button>
          <button onClick={() => setFiltroStatusTarefa([])} className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Remover Todos</button>
        </div>
        <div className="flex justify-end pt-1.5 border-t border-slate-100">
          <button onClick={() => { setFiltroStatusProjeto([]); setFiltroStatusTarefa([]) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
            <RotateCcw className="h-3 w-3" /> Limpar todos os status
          </button>
        </div>
      </div>

      {/* Botões recolher/expandir */}
      {projetosRender.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRecolhidos(new Set(projetosRender.map(p => p.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" /> Recolher tudo
          </button>
          <button
            onClick={() => setRecolhidos(new Set())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" /> Expandir tudo
          </button>
        </div>
      )}

      {/* Tabelas por projeto */}
      {projetosRender.length === 0 ? (
        <div className="p-16 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">
          Nenhum projeto encontrado com os filtros selecionados.
        </div>
      ) : (
        <div id="planejamento-conteudo" className="space-y-4">
          {projetosRender.map(p => {
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
              <div key={p.id} id={`planejamento-projeto-${p.id}`} className="rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Cabeçalho do projeto */}
                <div className="bg-slate-100 border-b border-slate-200 px-3 py-2">
                  <button onClick={() => toggleRecolhido(p.id)} className="flex items-center gap-2 w-full text-left">
                    {recolhido
                      ? <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    <span className="font-bold text-slate-800 text-[11px]">{p.nome}</span>
                    {p.departamento_nome && (
                      <span className="text-[10px] text-slate-500 font-medium">· {p.departamento_nome}</span>
                    )}
                    {(p.sistemas_nomes || []).map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-white">{s}</span>
                    ))}
                    <span className="ml-auto text-[10px] text-slate-400 font-medium">{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}</span>
                  </button>
                </div>

                {/* Tabela do projeto */}
                {!recolhido && (
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse w-full">
                      <thead>
                        <tr className="bg-slate-600 text-white text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-4 py-2 text-left min-w-[460px] sticky left-0 bg-slate-600 z-10">Tarefa</th>
                          <th className="px-3 py-2 text-center w-32 whitespace-nowrap">Sistema / Depto / Área</th>
                          <th className="px-3 py-2 text-center w-32 whitespace-nowrap">Status / Responsável</th>
                          {fasesProj.map(fase => (
                            <th key={fase} className="px-3 py-2 text-center w-28 whitespace-nowrap">{fase}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tarefas.map(t => {
                          const atrasada = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
                          const statusCor = STATUS_TAREFA_COR[t.status_kanban || 'mapeado'] || 'bg-slate-100 text-slate-600'
                          const statusLabel = STATUS_TAREFA_LABEL[t.status_kanban || 'mapeado'] || t.status_kanban || '—'
                          return (
                            <tr key={t.id}
                              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${atrasada ? 'bg-red-50/40' : 'bg-white'}`}
                              onClick={() => navigate(`/projetos/${p.id}/editar`)}
                            >
                              <td className={`px-4 py-2 sticky left-0 z-10 ${atrasada ? 'bg-red-50/70' : 'bg-white'}`}>
                                <div className="flex items-start gap-1.5">
                                  {atrasada && <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />}
                                  {t.etapa != null && (
                                    <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">{t.etapa}ª</span>
                                  )}
                                  <span className="text-slate-700 font-medium leading-snug">{t.nome}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {t.sistema_nome && <div className="text-[10px] font-semibold text-slate-700 whitespace-nowrap">{t.sistema_nome}</div>}
                                {p.departamento_nome && <div className="text-[10px] italic text-slate-400 whitespace-nowrap">{p.departamento_nome}{p.area_nome ? ` / ${p.area_nome}` : ''}</div>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${statusCor}`}>{statusLabel}</span>
                                {t.responsavel_nome && (
                                  <div className="text-[10px] italic text-slate-400 mt-0.5 whitespace-nowrap">{t.responsavel_nome}</div>
                                )}
                              </td>
                              {fasesProj.map(fase => {
                                if (t.fase_nome !== fase) return <td key={fase} className="px-3 py-2 text-center border-l border-slate-100" />
                                const dataIni = t.data_inicio
                                const dataFim = t.data_fim
                                const atrasadaCell = t.status_kanban !== 'concluido' && dataFim && dataFim < hojeISO
                                let conteudo
                                if (filtroDataTipo === 'inicio') {
                                  conteudo = dataIni
                                    ? <span className={`font-semibold ${atrasadaCell ? 'text-red-600' : 'text-slate-700'}`}>{fmtData(dataIni)}</span>
                                    : <span className="text-slate-300 italic">sem data</span>
                                } else if (filtroDataTipo === 'ambos') {
                                  conteudo = (dataIni || dataFim)
                                    ? <span className={`font-semibold ${atrasadaCell ? 'text-red-600' : 'text-slate-700'}`}>
                                        {dataIni ? fmtData(dataIni) : '—'} → {dataFim ? fmtData(dataFim) : '—'}
                                      </span>
                                    : <span className="text-slate-300 italic">sem data</span>
                                } else {
                                  conteudo = dataFim
                                    ? <span className={`font-semibold ${atrasadaCell ? 'text-red-600' : 'text-slate-700'}`}>{fmtData(dataFim)}</span>
                                    : <span className="text-slate-300 italic">sem data</span>
                                }
                                return <td key={fase} className="px-3 py-2 text-center border-l border-slate-100">{conteudo}</td>
                              })}
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
        </div>
      )}
    </div>
  )
}
