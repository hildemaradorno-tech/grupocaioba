import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, Plus, Trash2, ShieldAlert, ArrowRight, Copy, MessageSquare, AlertCircle, CheckCircle2, CalendarCheck, FolderInput, PlayCircle, Download, Loader2, PartyPopper, RotateCcw } from 'lucide-react'
import { apiService } from '../../services/api'
import { clearProjetosCache } from '../../services/projetosCache'
import TarefaFormModal from './TarefaFormModal'
import DeliberacoesModal from './DeliberacoesModal'

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


const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const getTextColor = (hex) => {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.5 ? '#1e293b' : '#ffffff'
}

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [projeto, setProjeto] = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [dependencias, setDependencias] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [sistemas, setSistemas] = useState([])
  const [fases, setFases] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalTarefa, setModalTarefa] = useState(null) // { tarefa: null|obj }
  const [modalDelib, setModalDelib] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [sortConfig, setSortConfig] = useState({ campo: 'etapa', dir: 'asc' })
  const [filtroAtrasadas, setFiltroAtrasadas] = useState(false)
  const [filtroHoje, setFiltroHoje] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState([])
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

  const loadData = useCallback(async () => {
    clearProjetosCache()
    setLoading(true); setError(null)
    try {
      const [proj, tfs, deps] = await Promise.all([
        apiService.getProjetoById(id),
        apiService.getTarefas(id),
        apiService.getDependencias(id),
      ])
      setProjeto(proj)
      setTarefas(tfs)
      setDependencias(deps)
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
    ]).then(([respData, sistData, faseData, empData, areaData]) => {
      setResponsaveis(respData.filter(r => r.ativo !== false))
      setSistemas(sistData.filter(s => s.ativo !== false))
      setFases(faseData.filter(f => f.ativo !== false))
      setEmpresas(empData.filter(e => e.ativo !== false))
      setAreas(areaData.filter(a => a.ativo !== false))
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
      navigate(`/projetos/${novo.id}`)
    } catch (err) {
      alert('Erro: ' + (err.message || String(err)))
      setModalNovoProjeto(prev => ({ ...prev, salvando: false }))
    }
  }

  const tarefasOrdenadas = (() => {
    let base = filtroAtrasadas ? tarefas.filter(isAtrasada) : filtroHoje ? tarefas.filter(isHoje) : tarefas
    if (filtroStatus.length > 0) base = base.filter(t => filtroStatus.includes(t.status_kanban))
    if (filtroResponsavel) base = base.filter(t => t.responsavel_nome === filtroResponsavel)
    if (filtroArea)        base = base.filter(t => t.area_nome === filtroArea)
    if (filtroSistema)     base = base.filter(t => t.sistema_nome === filtroSistema)
    if (filtroFase)        base = base.filter(t => t.fase_nome === filtroFase)
    if (filtroUnidade)     base = base.filter(t => t.empresa_nome === filtroUnidade)
    if (filtroDataTermIni) base = base.filter(t => t.data_fim && t.data_fim >= filtroDataTermIni)
    if (filtroDataTermFim) base = base.filter(t => t.data_fim && t.data_fim <= filtroDataTermFim)
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
                </p>
              )
            })()}
          </div>
        </div>
        <div className="no-print flex items-center gap-2 shrink-0">
          <button
            onClick={handleSalvarPDF}
            disabled={gerandoPDF}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors whitespace-nowrap"
          >
            {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {gerandoPDF ? 'Gerando...' : 'Salvar PDF'}
          </button>
          <button
            onClick={() => navigate(`/projetos/${id}/editar`)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors whitespace-nowrap"
          >
            <Edit2 className="h-3.5 w-3.5" /> Editar Projeto
          </button>
        </div>
      </div>

      {/* BARRA DE AÇÕES */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2 mr-2">
          <span className="text-xs font-semibold text-slate-500">Término:</span>
          <input
            type="date"
            value={filtroDataTermIni}
            onChange={e => setFiltroDataTermIni(e.target.value)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-400/30"
          />
          <span className="text-xs text-slate-400">até</span>
          <input
            type="date"
            value={filtroDataTermFim}
            onChange={e => setFiltroDataTermFim(e.target.value)}
            min={filtroDataTermIni || undefined}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-400/30"
          />
          <button
            onClick={() => { setFiltroDataTermIni(''); setFiltroDataTermFim('') }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors whitespace-nowrap"
          >
            Limpar filtro
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => { setFiltroAtrasadas(p => !p); setFiltroHoje(false) }}
          className={`flex items-center gap-1.5 mb-1 text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm border transition-colors ${
            filtroAtrasadas
              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
              : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
          }`}
          title="Filtrar tarefas atrasadas"
        >
          <AlertCircle className="h-3.5 w-3.5" /> Atrasadas
        </button>
        <button
          onClick={() => { setFiltroHoje(p => !p); setFiltroAtrasadas(false) }}
          className={`flex items-center gap-1.5 mb-1 text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm border transition-colors ${
            filtroHoje
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
          }`}
          title="Filtrar tarefas com término hoje"
        >
          <CalendarCheck className="h-3.5 w-3.5" /> Hoje
        </button>
        <button
          onClick={() => setModalTarefa({ tarefa: null, prefill: { area_nome: projeto.area_nome || '' } })}
          className="flex items-center gap-2 mb-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Tarefa
        </button>
      </div>

      {/* LISTA DE TAREFAS */}
      <div className="space-y-3">
        {/* Filtros de tarefas */}
        {(() => {
          const optsResp    = [...new Set(tarefas.map(t => t.responsavel_nome).filter(Boolean))].sort()
          const optsArea    = [...new Set(tarefas.map(t => t.area_nome).filter(Boolean))].sort()
          const optsSistema = [...new Set(tarefas.map(t => t.sistema_nome).filter(Boolean))].sort()
          const optsFase    = [...new Set(tarefas.map(t => t.fase_nome).filter(Boolean))].sort()
          const optsUnidade = [...new Set(tarefas.map(t => t.empresa_nome).filter(Boolean))].sort()
          const selectCls = "text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 max-w-[140px]"
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
                  {value && (
                    <button onClick={() => set('')} className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors" title="Limpar">✕</button>
                  )}
                </div>
              ))}
            </div>
          )
        })()}

        {/* Filtro de status multi-select */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Status:</span>
          {Object.entries(STATUS_MAP).map(([s, { label }]) => {
            const cor = STATUS_COR[s]
            const ativo = filtroStatus.includes(s)
            return (
              <button key={s}
                onClick={() => setFiltroStatus(prev =>
                  ativo ? prev.filter(x => x !== s) : [...prev, s]
                )}
                style={{
                  background: ativo ? cor : cor + '18',
                  color: ativo ? '#fff' : cor,
                  border: `1.5px solid ${cor}40`,
                }}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
              >
                {label}
              </button>
            )
          })}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
            <button
              onClick={() => setFiltroStatus(Object.keys(STATUS_MAP))}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Selecionar Todos
            </button>
            <button
              onClick={() => setFiltroStatus([])}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Remover Todos
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {tarefasSelecionadas.size > 0 && (
              <>
                <button
                  onClick={abrirModalMoverSelecionadas}
                  className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-semibold rounded transition-colors"
                >
                  <FolderInput className="h-3 w-3" />
                  Mover {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => setModalNovoProjeto({ fase: 'pergunta', nomeProjeto: '', salvando: false })}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Novo Projeto com {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={duplicarTarefasSelecionadas}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Duplicar {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={resetarTarefasSelecionadas}
                  className="flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold rounded transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Resetar {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={excluirTarefasSelecionadas}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir {tarefasSelecionadas.size} selecionada{tarefasSelecionadas.size !== 1 ? 's' : ''}
                </button>
              </>
            )}
            <span className="text-[10px] text-slate-400">
              {tarefasOrdenadas.length} tarefa{tarefasOrdenadas.length !== 1 ? 's' : ''}
              {filtroStatus.length === 0 && !filtroAtrasadas && !filtroHoje ? '' : ` de ${tarefas.length} total`}
            </span>
          </div>
        </div>
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
                  { campo: 'sistema_nome',  label: 'Sistema',     cls: 'w-24' },
                  { campo: 'area_nome',     label: 'Depto/Área',  cls: 'w-36' },
                  { campo: 'responsavel',   label: 'Responsável', cls: 'w-32' },
                  { campo: 'data_inicio',   label: 'Início',      cls: 'w-16' },
                  { campo: 'data_fim',      label: 'Fim',         cls: 'w-16' },
                  { campo: 'status_kanban', label: 'Status',      cls: 'w-28' },
                  { campo: 'progresso_pct', label: 'Progresso',   cls: 'w-28' },
                  { campo: 'empresa_nome',  label: 'Unidade',     cls: 'w-28' },
                ].map(({ campo, label, cls = '' }) => (
                  <th key={campo} className={`p-3 ${cls}`}>
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
                      <button
                        onClick={() => setEditandoEtapa(t.id)}
                        title="Clique para alterar a etapa"
                        className="group inline-flex items-center justify-center w-9 h-9"
                      >
                        {t.etapa != null
                          ? <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold transition-colors shadow-sm ${t.etapa === etapaAtual ? 'bg-orange-500 text-white group-hover:bg-orange-600' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'}`}>{t.etapa}ª</span>
                          : <span className="text-slate-300 group-hover:text-indigo-400 text-lg transition-colors">+</span>}
                      </button>
                    )}
                  </td>
                  <td className="p-3 leading-snug" style={{ whiteSpace: 'normal' }}>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-slate-900 flex-1">{t.nome}</span>
                      <button onClick={() => setModalDelib(t)} className="shrink-0 mt-0.5 p-0.5 text-slate-300 hover:text-amber-500 transition-colors" title="Deliberações">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {t.sistema_nome
                      ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: sistemaCorMap[t.sistema_nome] || '#1e293b', color: sistemaCorTextoMap[t.sistema_nome] || getTextColor(sistemaCorMap[t.sistema_nome] || '#1e293b') }}>{t.sistema_nome}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      {projeto.departamento_nome
                        ? <span className="text-[10px] font-bold text-slate-700">{projeto.departamento_nome}</span>
                        : <span className="text-slate-400">—</span>}
                      {(t.area_nome || projeto.area_nome) && (
                        <span className="text-[10px] text-slate-400 italic pl-0.5">{t.area_nome || projeto.area_nome}</span>
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
                      {t.status_kanban === 'programado' && (
                        <button
                          onClick={() => handleIniciarTarefa(t)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Iniciar tarefa"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {t.status_kanban === 'em_andamento' && (
                        <button
                          onClick={() => setModalConcluir({ tarefa: t, dataFim: hojeISO })}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          title="Concluir tarefa"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleProximaEtapa(t)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Próxima Etapa">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDuplicar(t)} className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Duplicar">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setModalTarefa({ tarefa: t })} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => abrirModalMover(t)} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors" title="Mover para outro projeto">
                        <FolderInput className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setModalExcluir(t)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
