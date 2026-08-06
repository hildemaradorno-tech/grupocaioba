import React, { useEffect, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, AlertTriangle, Search, CopyPlus, Rows, Clock, ClipboardList, RefreshCw, Link2, FileDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'

const DIAS_SEMANA = [
  { n: 1, curto: 'Seg', label: 'Segunda-feira' },
  { n: 2, curto: 'Ter', label: 'Terça-feira' },
  { n: 3, curto: 'Qua', label: 'Quarta-feira' },
  { n: 4, curto: 'Qui', label: 'Quinta-feira' },
  { n: 5, curto: 'Sex', label: 'Sexta-feira' },
  { n: 6, curto: 'Sáb', label: 'Sábado' },
  { n: 7, curto: 'Dom', label: 'Domingo' },
]

const TIPOS = [
  { codigo: 'RPA', nome: 'Robert Automation' },
  { codigo: 'PBI', nome: 'Power BI' },
  { codigo: 'FAB', nome: 'Microsoft Fabric' },
]

const formatHora = (h) => h ? h.slice(0, 5) : '—'

// Relatórios (PBI/FAB): têm preferência na aba Atualização e podem ter RPA vinculado
const ehRelatorio = (tipo) => tipo === 'PBI' || tipo === 'FAB'

// Só o PBI é configurado em horário de Brasília; RPA e FAB são em MS
const ehBrasilia = (tipo) => tipo === 'PBI'

// Cores de badge por tipo: RPA índigo, PBI âmbar, FAB verde-água (teal)
const tipoBadgeClasses = (tipo) =>
  tipo === 'PBI' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : tipo === 'FAB' ? 'bg-teal-50 text-teal-700 border-teal-100'
    : 'bg-indigo-50 text-indigo-700 border-indigo-100'

// Na aba Atualização o RPA usa azul-claro (sky) para casar com as horas
const tipoBadgeAtuClasses = (tipo) =>
  tipo === 'PBI' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : tipo === 'FAB' ? 'bg-teal-50 text-teal-700 border-teal-100'
    : 'bg-sky-50 text-sky-700 border-sky-100'

// PBI/FAB são configurados em horário de Brasília, mas as grades exibem tudo
// em horário de MS (Brasília − 1h, fixo — sem horário de verão desde 2019).
// Horários convertidos ganham "*" e tooltip com o horário real de Brasília.
const horaParaMS = (hora, tipo) => {
  if (!hora || !ehBrasilia(tipo)) return hora
  const [h, m] = hora.split(':')
  return `${String((parseInt(h, 10) + 23) % 24).padStart(2, '0')}:${m}`
}

const tooltipHoraReal = (hora, tipo) =>
  ehBrasilia(tipo) && hora ? `Horário configurado (Brasília): ${formatHora(hora)}` : undefined

// Soma N minutos a uma hora "HH:MM" (passa da meia-noite se necessário)
const somarMinutos = (hora, minutos) => {
  if (!hora) return hora
  const [h, m] = hora.split(':').map(Number)
  const total = (h * 60 + m + (Number.isFinite(minutos) ? minutos : 15)) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Traduz erros do Postgres/Supabase para mensagens amigáveis (ex.: violação
// de UNIQUE vira "já se encontra cadastrado").
const msgErro = (err, entidade = 'registro') => {
  const m = err?.message || String(err)
  if (err?.code === '23505' || m.includes('duplicate key')) return `Este ${entidade} já se encontra cadastrado.`
  return m
}

// Caixa de erro inline dos formulários
function ErroForm({ children }) {
  if (!children) return null
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-2.5 py-2 text-[11px] font-semibold">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </div>
  )
}

const novaOcorrencia = () => ({ hora: '' })

const diasVazios = () => Object.fromEntries(DIAS_SEMANA.map(d => [d.n, { ativo: false, execucoes: [novaOcorrencia()] }]))

const formInicial = () => ({
  processo_id: '', processo: '',
  departamento_id: '', departamento_nome: '',
  tipo: '',
  ativo: true,
  dias: diasVazios(),
})

const cmpTexto = (a, b) => (a || '').localeCompare(b || '')

// Cabeçalho de coluna ordenável: clique alterna A→Z / Z→A; seta indica a
// coluna ativa e a direção.
function ThSort({ label, col, sort, onSort, center, className = '' }) {
  const ativo = sort.col === col
  const Icon = ativo ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={`p-3 whitespace-nowrap ${center ? 'text-center' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        title="Ordenar"
        className={`inline-flex items-center gap-1 uppercase tracking-wider text-[11px] font-semibold transition-colors ${ativo ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {label} <Icon className={`h-3 w-3 shrink-0 ${ativo ? '' : 'opacity-50'}`} />
      </button>
    </th>
  )
}

const _cache = { dados: null, departamentos: null, processos: null }

export default function RpaAgendamentos() {
  const [dados, setDados] = useState(() => _cache.dados ?? [])
  const [departamentos, setDepartamentos] = useState(() => _cache.departamentos ?? [])
  const [processos, setProcessos] = useState(() => _cache.processos ?? [])
  const [loading, setLoading] = useState(() => _cache.dados === null)
  const [error, setError] = useState(null)

  const [filtroDept, setFiltroDept] = useSessionState('rpa_agend_filtro_dept', '')
  const [filtroTipo, setFiltroTipo] = useSessionState('rpa_agend_filtro_tipo', [])
  // Seleção múltipla de tipos; compatível com o valor antigo (string) salvo no navegador
  const tiposFiltro = Array.isArray(filtroTipo) ? filtroTipo : (filtroTipo ? [filtroTipo] : [])
  const tipoPassa = (tipo) => tiposFiltro.length === 0 || tiposFiltro.includes(tipo)
  const toggleFiltroTipo = (codigo) => {
    setFiltroTipo(prev => {
      const arr = Array.isArray(prev) ? prev : (prev ? [prev] : [])
      return arr.includes(codigo) ? arr.filter(c => c !== codigo) : [...arr, codigo]
    })
  }
  const [busca, setBusca] = useSessionState('rpa_agend_busca', '')
  const [visualizacao, setVisualizacao] = useSessionState('rpa_agend_visualizacao', 'rotina')
  const [sortRotina, setSortRotina] = useSessionState('rpa_agend_sort_rotina', { col: 'hora', dir: 'asc' })
  const [sortHorario, setSortHorario] = useSessionState('rpa_agend_sort_horario', { col: 'hora', dir: 'asc' })
  const [sortProc, setSortProc] = useSessionState('rpa_agend_sort_proc', { col: 'nome', dir: 'asc' })
  const [sortAtu, setSortAtu] = useSessionState('rpa_agend_sort_atu', { col: 'hora', dir: 'asc' })

  const toggleSort = (setter) => (col) =>
    setter(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  const toggleSortRotina = toggleSort(setSortRotina)
  const toggleSortHorario = toggleSort(setSortHorario)
  const toggleSortProc = toggleSort(setSortProc)
  const toggleSortAtu = toggleSort(setSortAtu)

  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useState(formInicial())
  const [salvando, setSalvando] = useState(false)
  const [novoProcessoAberto, setNovoProcessoAberto] = useState(false)
  const [novoProcessoNome, setNovoProcessoNome] = useState('')
  const [novoProcessoDeptId, setNovoProcessoDeptId] = useState('')
  const [novoProcessoTipo, setNovoProcessoTipo] = useState('RPA')
  const [novoProcessoRpaVincId, setNovoProcessoRpaVincId] = useState('')
  const [criandoProcesso, setCriandoProcesso] = useState(false)

  const [modalNovoProcessoAberto, setModalNovoProcessoAberto] = useState(false)
  const [novoProcessoNomeHeader, setNovoProcessoNomeHeader] = useState('')
  const [novoProcessoDeptIdHeader, setNovoProcessoDeptIdHeader] = useState('')
  const [novoProcessoTipoHeader, setNovoProcessoTipoHeader] = useState('RPA')
  const [novoProcessoRpaVincIdHeader, setNovoProcessoRpaVincIdHeader] = useState('')
  const [novoProcessoTempoHeader, setNovoProcessoTempoHeader] = useState(15)
  const [novoProcessoAtivoHeader, setNovoProcessoAtivoHeader] = useState(true)
  const [criandoProcessoHeader, setCriandoProcessoHeader] = useState(false)
  const [procEditId, setProcEditId] = useState(null)
  const [modalExcluirProcAberto, setModalExcluirProcAberto] = useState(false)
  const [procExcluir, setProcExcluir] = useState(null)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [erroRotina, setErroRotina] = useState(null)
  const [erroProcesso, setErroProcesso] = useState(null)
  const [erroProcessoHeader, setErroProcessoHeader] = useState(null)

  const [templateHora, setTemplateHora] = useState('')
  const [diasTemplate, setDiasTemplate] = useState(() => new Set())
  const [execSelecionadas, setExecSelecionadas] = useState(() => new Set())

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('rpa/agendamentos')

  useEffect(() => { loadDados(_cache.dados !== null) }, [])
  useEffect(() => { _cache.dados = dados }, [dados])
  useEffect(() => { _cache.departamentos = departamentos }, [departamentos])
  useEffect(() => { _cache.processos = processos }, [processos])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const [rotinas, deps, procs] = await Promise.all([
        apiService.getRpaGradeSemanal(),
        apiService.getDepartamentos(),
        apiService.getRpaProcessos(),
      ])
      setDados(rotinas)
      setDepartamentos(deps.filter(d => d.ativo))
      setProcessos(procs)
    } catch (err) {
      if (!silent) setError(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(formInicial())
    setErroRotina(null)
    setErroProcesso(null)
    setNovoProcessoAberto(false)
    setNovoProcessoNome('')
    setNovoProcessoDeptId('')
    setNovoProcessoTipo('RPA')
    setTemplateHora('')
    setDiasTemplate(new Set())
    setExecSelecionadas(new Set())
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    const proc = processos.find(p => p.id === item.processo_id)
    setForm({
      processo_id: item.processo_id || '',
      processo: item.processo || '',
      departamento_id: item.departamento_id || '',
      departamento_nome: item.departamento_nome || '',
      tipo: proc?.tipo || (item.execucoes || []).find(e => e.tipo)?.tipo || 'RPA',
      ativo: item.ativo,
      dias: Object.fromEntries(DIAS_SEMANA.map(d => {
        const ocorrencias = (item.porDia?.[d.n] || []).slice().sort((a, b) => cmpTexto(a.hora, b.hora))
        return [d.n, {
          ativo: !!ocorrencias.length,
          execucoes: ocorrencias.length ? ocorrencias.map(o => ({ hora: o.hora || '' })) : [novaOcorrencia()],
        }]
      })),
    })
    setErroRotina(null)
    setErroProcesso(null)
    setNovoProcessoAberto(false)
    setNovoProcessoNome('')
    setNovoProcessoDeptId('')
    setNovoProcessoTipo('RPA')
    setTemplateHora('')
    setDiasTemplate(new Set())
    setExecSelecionadas(new Set())
    setModalAberto(true)
  }

  // Abre "Incluir Nova Rotina" com o processo já selecionado (usado nos
  // chips do alerta de processos sem agendamento)
  const abrirIncluirComProcesso = (p) => {
    abrirIncluir()
    setForm({
      ...formInicial(),
      processo_id: p.id,
      processo: p.nome || '',
      departamento_id: p.departamento_id || '',
      departamento_nome: p.departamento_nome || '',
      tipo: p.tipo || 'RPA',
    })
  }

  // Aba Processos: clicar no nome abre a edição dos horários de agendamento
  // (a rotina do processo) — o lápis da coluna Ações continua editando os
  // dados do processo em si (nome/tipo/setor/vínculo).
  const abrirAgendamentoDoProcesso = (proc) => {
    const rotina = dados.find(r => r.processo_id === proc.id)
    if (rotina) abrirEditar(rotina)
    else abrirIncluirComProcesso(proc)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, processo: item.processo }))
    setModalExcluirAberto(true)
  }

  const toggleDia = (n) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ...prev.dias[n], ativo: !prev.dias[n].ativo } } }))
    setExecSelecionadas(prev => new Set([...prev].filter(k => !k.startsWith(`${n}|`))))
  }

  const addOcorrencia = (n) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ...prev.dias[n], execucoes: [...prev.dias[n].execucoes, novaOcorrencia()] } } }))
  }

  const removeOcorrencia = (n, idx) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ...prev.dias[n], execucoes: prev.dias[n].execucoes.filter((_, i) => i !== idx) } } }))
    // índices mudam após a remoção — limpa a seleção desse dia p/ evitar checkbox referenciando a linha errada
    setExecSelecionadas(prev => new Set([...prev].filter(k => !k.startsWith(`${n}|`))))
  }

  const limparDia = (n) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ativo: false, execucoes: [novaOcorrencia()] } } }))
    setExecSelecionadas(prev => new Set([...prev].filter(k => !k.startsWith(`${n}|`))))
  }

  const limparCronograma = () => {
    setForm(prev => ({ ...prev, dias: diasVazios() }))
    setExecSelecionadas(new Set())
  }

  const chaveExec = (n, idx) => `${n}|${idx}`

  const toggleExecSelecionada = (chave) => {
    setExecSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  const todasChavesExec = (dias) =>
    DIAS_SEMANA.flatMap(d => dias[d.n].ativo ? dias[d.n].execucoes.map((_, idx) => chaveExec(d.n, idx)) : [])

  const toggleSelecionarTodasExec = () => {
    const todas = todasChavesExec(form.dias)
    setExecSelecionadas(prev => prev.size === todas.length ? new Set() : new Set(todas))
  }

  const excluirSelecionadas = () => {
    if (execSelecionadas.size === 0) return
    setForm(prev => {
      const dias = { ...prev.dias }
      DIAS_SEMANA.forEach(d => {
        if (!dias[d.n].ativo) return
        const restantes = dias[d.n].execucoes.filter((_, idx) => !execSelecionadas.has(chaveExec(d.n, idx)))
        dias[d.n] = restantes.length
          ? { ativo: true, execucoes: restantes }
          : { ativo: false, execucoes: [novaOcorrencia()] }
      })
      return { ...prev, dias }
    })
    setExecSelecionadas(new Set())
  }

  // Agrupa as execuções preenchidas por hora (HH:MM): chips no topo do
  // cronograma para marcar/desmarcar todos os horários iguais de uma vez
  const horasDoCronograma = (() => {
    const grupos = {}
    DIAS_SEMANA.forEach(d => {
      const dia = form.dias[d.n]
      if (!dia.ativo) return
      dia.execucoes.forEach((oc, idx) => {
        if (!oc.hora) return
        const h = oc.hora.slice(0, 5)
        if (!grupos[h]) grupos[h] = []
        grupos[h].push(chaveExec(d.n, idx))
      })
    })
    return Object.entries(grupos)
      .map(([hora, chaves]) => ({ hora, chaves }))
      .sort((a, b) => cmpTexto(a.hora, b.hora))
  })()

  const toggleGrupoHora = (chaves) => {
    setExecSelecionadas(prev => {
      const todasMarcadas = chaves.every(k => prev.has(k))
      const next = new Set(prev)
      chaves.forEach(k => { if (todasMarcadas) next.delete(k); else next.add(k) })
      return next
    })
  }

  const setOcorrenciaCampo = (n, idx, campo, valor) => {
    setForm(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [n]: {
          ...prev.dias[n],
          execucoes: prev.dias[n].execucoes.map((oc, i) => i === idx ? { ...oc, [campo]: valor } : oc),
        },
      },
    }))
  }

  const toggleDiaTemplate = (n) => {
    setDiasTemplate(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const toggleTodosDiasTemplate = () => {
    setDiasTemplate(prev => prev.size === DIAS_SEMANA.length ? new Set() : new Set(DIAS_SEMANA.map(d => d.n)))
  }

  const aplicarTemplate = () => {
    if (!templateHora || diasTemplate.size === 0) return
    setForm(prev => {
      const dias = { ...prev.dias }
      diasTemplate.forEach(n => {
        const dia = dias[n]
        const semHoraPreenchida = dia.execucoes.length === 1 && !dia.execucoes[0].hora
        dias[n] = {
          ativo: true,
          execucoes: semHoraPreenchida
            ? [{ hora: templateHora }]
            : [...dia.execucoes, { hora: templateHora }],
        }
      })
      return { ...prev, dias }
    })
  }

  const handleProcessoChange = (id) => {
    const proc = processos.find(p => p.id === id)
    setForm(prev => ({
      ...prev,
      processo_id: id,
      processo: proc?.nome || '',
      departamento_id: proc?.departamento_id || '',
      departamento_nome: proc?.departamento_nome || '',
      tipo: proc?.tipo || '',
    }))
  }

  const handleCriarProcesso = async () => {
    const nome = novoProcessoNome.trim()
    if (!nome) return
    setCriandoProcesso(true)
    setErroProcesso(null)
    try {
      const dep = departamentos.find(d => d.id === novoProcessoDeptId)
      const rpaVinc = processos.find(p => p.id === novoProcessoRpaVincId)
      const criado = await apiService.createRpaProcesso({ nome, departamento_id: novoProcessoDeptId, departamento_nome: dep?.nome_departamento, tipo: novoProcessoTipo, rpa_vinculado_id: novoProcessoRpaVincId, rpa_vinculado_nome: rpaVinc?.nome })
      setProcessos(prev => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm(prev => ({
        ...prev,
        processo_id: criado.id,
        processo: criado.nome,
        departamento_id: criado.departamento_id || '',
        departamento_nome: criado.departamento_nome || '',
        tipo: criado.tipo || 'RPA',
      }))
      setNovoProcessoNome('')
      setNovoProcessoDeptId('')
      setNovoProcessoTipo('RPA')
      setNovoProcessoRpaVincId('')
      setNovoProcessoAberto(false)
    } catch (err) {
      setErroProcesso(msgErro(err, 'processo/relatório'))
    } finally {
      setCriandoProcesso(false)
    }
  }

  const abrirNovoProcessoHeader = () => {
    setProcEditId(null)
    setNovoProcessoNomeHeader('')
    setNovoProcessoDeptIdHeader('')
    setNovoProcessoTipoHeader('RPA')
    setNovoProcessoRpaVincIdHeader('')
    setNovoProcessoTempoHeader(15)
    setNovoProcessoAtivoHeader(true)
    setErroProcessoHeader(null)
    setModalNovoProcessoAberto(true)
  }

  const abrirEditarProcesso = (p) => {
    setProcEditId(p.id)
    setNovoProcessoNomeHeader(p.nome || '')
    setNovoProcessoDeptIdHeader(p.departamento_id || '')
    setNovoProcessoTipoHeader(p.tipo || 'RPA')
    setNovoProcessoRpaVincIdHeader(p.rpa_vinculado_id || '')
    setNovoProcessoTempoHeader(p.tempo_atualizacao_min ?? 15)
    setNovoProcessoAtivoHeader(p.ativo)
    setErroProcessoHeader(null)
    setModalNovoProcessoAberto(true)
  }

  const handleCriarProcessoHeader = async (e) => {
    e.preventDefault()
    const nome = novoProcessoNomeHeader.trim()
    if (!nome) return
    setCriandoProcessoHeader(true)
    setErroProcessoHeader(null)
    try {
      const dep = departamentos.find(d => d.id === novoProcessoDeptIdHeader)
      const rpaVinc = processos.find(p => p.id === novoProcessoRpaVincIdHeader)
      const payload = {
        nome,
        departamento_id: novoProcessoDeptIdHeader,
        departamento_nome: dep?.nome_departamento,
        tipo: novoProcessoTipoHeader,
        rpa_vinculado_id: novoProcessoRpaVincIdHeader,
        rpa_vinculado_nome: rpaVinc?.nome,
        tempo_atualizacao_min: novoProcessoTempoHeader,
        ativo: novoProcessoAtivoHeader,
      }
      if (procEditId) {
        await apiService.updateRpaProcesso(procEditId, payload)
        await loadDados(true)
      } else {
        const criado = await apiService.createRpaProcesso(payload)
        setProcessos(prev => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      }
      setNovoProcessoNomeHeader('')
      setNovoProcessoDeptIdHeader('')
      setModalNovoProcessoAberto(false)
    } catch (err) {
      setErroProcessoHeader(msgErro(err, 'processo/relatório'))
    } finally {
      setCriandoProcessoHeader(false)
    }
  }

  const abrirExcluirProcesso = (p) => {
    setProcExcluir(p)
    setModalExcluirProcAberto(true)
  }

  // Baixa a tabela da aba Atualização em PDF (A4 paisagem, html2canvas +
  // jsPDF via import dinâmico — mesmo padrão de AtaReuniao.jsx)
  const handleBaixarPDF = async () => {
    const el = document.getElementById('rpa-atualizacao-tabela')
    if (!el) return
    setGerandoPDF(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const MARGIN = 20
      const TITULO_H = 40
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN
      const CH = pdf.internal.pageSize.getHeight() - 2 * MARGIN

      pdf.setFontSize(14)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text('Atualização — Agendamento de Processos', MARGIN, MARGIN + 10)
      pdf.setFontSize(8)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(120, 120, 120)
      pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGIN, MARGIN + 24)

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
      let sy = 0
      let primeira = true
      while (sy < canvas.height) {
        const alturaDisponivel = primeira ? CH - TITULO_H : CH
        const fatiaPx = Math.min(canvas.height - sy, Math.floor(canvas.width * alturaDisponivel / CW))
        const fatia = document.createElement('canvas')
        fatia.width = canvas.width
        fatia.height = fatiaPx
        fatia.getContext('2d').drawImage(canvas, 0, sy, canvas.width, fatiaPx, 0, 0, canvas.width, fatiaPx)
        if (!primeira) pdf.addPage()
        pdf.addImage(fatia.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, primeira ? MARGIN + TITULO_H : MARGIN, CW, (fatiaPx / canvas.width) * CW)
        sy += fatiaPx
        primeira = false
      }
      pdf.save('atualizacao-rpa-powerbi.pdf')
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  const handleConfirmarExclusaoProcesso = async () => {
    try {
      await apiService.deleteRpaProcesso(procExcluir.id)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir processo: ' + msgErro(err, 'processo/relatório'))
    } finally {
      setModalExcluirProcAberto(false)
    }
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    // Todas as execuções assumem o tipo do processo selecionado
    const execucoes = DIAS_SEMANA
      .filter(d => form.dias[d.n].ativo)
      .flatMap(d => form.dias[d.n].execucoes
        .filter(oc => oc.hora)
        .map(oc => ({ dia_semana: d.n, hora: oc.hora, tipo: form.tipo || 'RPA' })))

    setSalvando(true)
    setErroRotina(null)
    try {
      if (editingId) await apiService.updateRpaRotina(editingId, { ...form, execucoes })
      else await apiService.createRpaRotina({ ...form, execucoes })
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      setErroRotina(msgErro(err, 'rotina'))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteRpaRotina(idExcluir)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir rotina: ' + msgErro(err, 'rotina'))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const rotinasFiltradas = dados.filter(r => {
    if (filtroDept && r.departamento_id !== filtroDept) return false
    if (tiposFiltro.length && !(r.execucoes || []).some(e => tipoPassa(e.tipo))) return false
    if (busca.trim() && !(r.processo || '').toUpperCase().includes(busca.trim().toUpperCase())) return false
    return true
  })

  // Visão "Por Rotina": cada horário distinto vira uma linha separada — um
  // processo com mais de uma hora registrada aparece em várias linhas, cada
  // uma com os dias em que aquela hora roda. A ordenação é aplicada linha a
  // linha (não por rotina), para a classificação por hora valer globalmente.
  const linhasRotina = rotinasFiltradas.flatMap(r => {
    const tempo = processos.find(p => p.id === r.processo_id)?.tempo_atualizacao_min ?? 15
    const porHora = {}
    DIAS_SEMANA.forEach(d => {
      ;(r.porDia[d.n] || [])
        .filter(oc => tipoPassa(oc.tipo))
        .forEach(oc => {
          const key = `${formatHora(horaParaMS(oc.hora, oc.tipo))}|${oc.tipo || ''}`
          if (!porHora[key]) porHora[key] = { rotina: r, hora: oc.hora, tipo: oc.tipo, tempo, dias: {} }
          porHora[key].dias[d.n] = oc
        })
    })
    const linhas = Object.values(porHora)
    return linhas.length ? linhas : [{ rotina: r, hora: null, tipo: null, tempo, dias: {} }]
  }).sort((a, b) => {
    const dir = sortRotina.dir === 'asc' ? 1 : -1
    const horaMS = (l) => l.hora ? formatHora(horaParaMS(l.hora, l.tipo)) : null
    let v
    if (sortRotina.col === 'setor') {
      v = cmpTexto(a.rotina.departamento_nome, b.rotina.departamento_nome)
    } else if (sortRotina.col === 'processo') {
      v = cmpTexto(a.rotina.processo, b.rotina.processo)
    } else if (sortRotina.col === 'tipo') {
      v = cmpTexto(a.tipo, b.tipo)
    } else {
      // ordenação automática por hora exibida; linhas sem hora vão para o fim
      const ha = horaMS(a)
      const hb = horaMS(b)
      if ((ha === null) !== (hb === null)) return ha === null ? 1 : -1
      v = cmpTexto(ha, hb)
    }
    if (v !== 0) return v * dir
    // desempate: processo A–Z e depois hora exibida crescente
    const vp = cmpTexto(a.rotina.processo, b.rotina.processo)
    return vp !== 0 ? vp : cmpTexto(horaMS(a), horaMS(b))
  })

  // Visão "Atualização": hora em que o processo/relatório fica atualizado —
  // hora agendada + tempo médio de atualização do processo (cadastro, default
  // 15 min), preferindo a hora do relatório (PBI/FAB) e, na ausência dele no
  // dia, a hora do RPA.
  // RPAs vinculados a algum PBI ativo — somem da aba Atualização (a
  // atualização que vale é a do relatório) e ganham ícone de vínculo
  const rpasVinculados = new Set(
    processos.filter(p => ehRelatorio(p.tipo) && p.ativo && p.rpa_vinculado_id).map(p => p.rpa_vinculado_id)
  )

  const linhasAtualizacao = (() => {
    const porProcesso = {}
    rotinasFiltradas.forEach(r => {
      if (r.processo_id && rpasVinculados.has(r.processo_id)) return
      const key = r.processo_id || r.processo || r.id
      if (!porProcesso[key]) {
        porProcesso[key] = {
          processo: r.processo, departamento_nome: r.departamento_nome, ativo: false, porDia: {},
          processoId: r.processo_id || null,
          tempo: processos.find(p => p.id === r.processo_id)?.tempo_atualizacao_min ?? 15,
        }
      }
      if (r.ativo) porProcesso[key].ativo = true
      DIAS_SEMANA.forEach(d => {
        ;(r.porDia[d.n] || []).forEach(oc => {
          if (!tipoPassa(oc.tipo)) return
          if (!oc.hora) return
          if (!porProcesso[key].porDia[d.n]) porProcesso[key].porDia[d.n] = []
          porProcesso[key].porDia[d.n].push(oc)
        })
      })
    })
    // Uma linha por processo, com os horários de atualização agrupados:
    // "horas" = lista distinta ordenada; porDiaAtu[n] = horários daquele dia
    const linhas = Object.values(porProcesso).map(p => {
      const porDiaAtu = {}
      const horasMap = new Map()
      DIAS_SEMANA.forEach(d => {
        const ocs = p.porDia[d.n] || []
        const relatorio = ocs.filter(o => ehRelatorio(o.tipo))
        const base = relatorio.length ? relatorio : ocs
        base.forEach(oc => {
          const horaAtu = somarMinutos(formatHora(horaParaMS(oc.hora, oc.tipo)), p.tempo)
          if (!porDiaAtu[d.n]) porDiaAtu[d.n] = []
          if (!porDiaAtu[d.n].some(x => x.horaAtu === horaAtu)) {
            porDiaAtu[d.n].push({ horaAtu, tipo: oc.tipo, horaBase: oc.hora })
          }
          if (!horasMap.has(horaAtu)) horasMap.set(horaAtu, { horaAtu, tipo: oc.tipo, horaBase: oc.hora })
        })
      })
      Object.values(porDiaAtu).forEach(list => list.sort((a, b) => cmpTexto(a.horaAtu, b.horaAtu)))
      const horas = [...horasMap.values()].sort((a, b) => cmpTexto(a.horaAtu, b.horaAtu))
      const tipos = TIPOS.map(t => t.codigo).filter(c => horas.some(h => (h.tipo || 'RPA') === c))
      // Horários do RPA vinculado (por dia) para exibir no tooltip
      const cad = processos.find(pp => pp.id === p.processoId)
      const rpaVincId = cad?.rpa_vinculado_id || null
      const rpaVincNome = rpaVincId ? (cad?.rpa_vinculado_nome || processos.find(x => x.id === rpaVincId)?.nome || null) : null
      const rpaHorasPorDia = {}
      if (rpaVincId) {
        dados.filter(r => r.processo_id === rpaVincId).forEach(r => {
          DIAS_SEMANA.forEach(d => {
            ;(r.porDia[d.n] || []).forEach(oc => {
              if (!oc.hora) return
              const hr = formatHora(oc.hora)
              if (!rpaHorasPorDia[d.n]) rpaHorasPorDia[d.n] = []
              if (!rpaHorasPorDia[d.n].includes(hr)) rpaHorasPorDia[d.n].push(hr)
            })
          })
        })
        Object.values(rpaHorasPorDia).forEach(list => list.sort())
      }
      return { processo: p.processo, processoId: p.processoId, departamento_nome: p.departamento_nome, ativo: p.ativo, porDia: porDiaAtu, horas, tipos, tempo: p.tempo, rpaVincNome, rpaHorasPorDia }
    }).filter(l => l.horas.length)

    return linhas.sort((a, b) => {
      const dir = sortAtu.dir === 'asc' ? 1 : -1
      let v
      if (sortAtu.col === 'processo') v = cmpTexto(a.processo, b.processo)
      else if (sortAtu.col === 'setor') v = cmpTexto(a.departamento_nome, b.departamento_nome)
      else if (sortAtu.col === 'tipo') v = cmpTexto(a.tipos.join(','), b.tipos.join(','))
      else v = cmpTexto(a.horas[0]?.horaAtu, b.horas[0]?.horaAtu)
      if (v !== 0) return v * dir
      return cmpTexto(a.processo, b.processo)
    })
  })()

  // Selects de rotina só mostram processos ativos; ao editar uma rotina cujo
  // processo foi inativado, inclui esse processo para não quebrar a seleção.
  const processosAtivos = processos.filter(p => p.ativo)
  const processosSelect = form.processo_id && !processosAtivos.some(p => p.id === form.processo_id)
    ? [...processosAtivos, ...processos.filter(p => p.id === form.processo_id)].sort((a, b) => a.nome.localeCompare(b.nome))
    : processosAtivos

  const rotinasDoProcesso = (id) => dados.filter(r => r.processo_id === id).length

  // Processos ativos sem nenhum horário agendado (sem rotina ativa com
  // execuções), respeitando os filtros de setor/tipo/busca da tela
  const processosSemAgendamento = processos.filter(p => {
    if (!p.ativo) return false
    if (filtroDept && p.departamento_id !== filtroDept) return false
    if (!tipoPassa(p.tipo || 'RPA')) return false
    if (busca.trim() && !(p.nome || '').toUpperCase().includes(busca.trim().toUpperCase())) return false
    return !dados.some(r => r.processo_id === p.id && r.ativo && (r.execucoes || []).length > 0)
  }).sort((a, b) => cmpTexto(a.nome, b.nome))

  const processosFiltrados = processos.filter(p => {
    if (filtroDept && p.departamento_id !== filtroDept) return false
    if (!tipoPassa(p.tipo || 'RPA')) return false
    if (busca.trim() && !(p.nome || '').toUpperCase().includes(busca.trim().toUpperCase())) return false
    return true
  }).sort((a, b) => {
    const dir = sortProc.dir === 'asc' ? 1 : -1
    let v = 0
    switch (sortProc.col) {
      case 'setor': v = cmpTexto(a.departamento_nome, b.departamento_nome); break
      case 'tipo': v = cmpTexto(a.tipo, b.tipo); break
      case 'rotinas': v = rotinasDoProcesso(a.id) - rotinasDoProcesso(b.id); break
      case 'status': v = (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0); break
      default: v = cmpTexto(a.nome, b.nome)
    }
    return v !== 0 ? v * dir : cmpTexto(a.nome, b.nome)
  })

  // Visão "por horário": uma linha por horário+tipo+processo+setor, com os dias
  // da semana em que aquela combinação roda marcados nas colunas Seg..Dom.
  const gradePorHorario = (() => {
    const grupos = {}
    rotinasFiltradas.forEach(r => {
      DIAS_SEMANA.forEach(d => {
        ;(r.porDia[d.n] || []).forEach(oc => {
          if (!tipoPassa(oc.tipo)) return
          const key = `${oc.hora || ''}|${oc.tipo || ''}|${r.processo || ''}|${r.departamento_id || ''}`
          if (!grupos[key]) {
            grupos[key] = {
              hora: oc.hora, tipo: oc.tipo, processo: r.processo,
              departamento_nome: r.departamento_nome, ativo: r.ativo,
              rotina: r, dias: new Set(),
            }
          }
          grupos[key].dias.add(d.n)
        })
      })
    })
    return Object.values(grupos).sort((a, b) => {
      const dir = sortHorario.dir === 'asc' ? 1 : -1
      // Compara no horário de MS (o que é exibido), não no configurado
      const cmpHora = () => {
        const ha = a.hora ? horaParaMS(a.hora, a.tipo).slice(0, 5) : '99:99'
        const hb = b.hora ? horaParaMS(b.hora, b.tipo).slice(0, 5) : '99:99'
        return ha === hb ? 0 : (ha < hb ? -1 : 1)
      }
      let v
      if (sortHorario.col === 'setor') {
        v = cmpTexto(a.departamento_nome, b.departamento_nome)
      } else {
        v = cmpHora()
      }
      return v !== 0 ? v * dir : cmpTexto(a.processo, b.processo)
    })
  })()

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar agendamentos</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={() => loadDados()} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4">
        <div className="min-w-0 flex-1 basis-96">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agendamento de Processos</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">Grade semanal de rotinas de RPA e atualizações de Power BI por setor. Todos os horários exibidos em horário de MS — <strong className="text-slate-600">*</strong> indica horário convertido de Brasília (Power BI); passe o mouse para ver o horário configurado.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {visualizacao === 'atualizacao' && (
            <button
              type="button"
              onClick={handleBaixarPDF}
              disabled={gerandoPDF}
              className="flex items-center gap-2 whitespace-nowrap bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              <FileDown className="h-4 w-4 shrink-0" /> {gerandoPDF ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
          )}
          {canEdit && (
            <>
              <button onClick={abrirNovoProcessoHeader} className="flex items-center gap-2 whitespace-nowrap bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
                <Plus className="h-4 w-4 shrink-0" /> Novo Processo
              </button>
              <button onClick={abrirIncluir} className="flex items-center gap-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
                <Plus className="h-4 w-4 shrink-0" /> Nova Rotina
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          <button
            type="button"
            onClick={() => setVisualizacao('rotina')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'rotina' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Rows className="h-3.5 w-3.5" /> Por Rotina
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('horario')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'horario' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Por Horário
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('atualizacao')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'atualizacao' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualização
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('processos')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'processos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Processos
          </button>
        </div>
        <select
          value={filtroDept}
          onChange={e => setFiltroDept(e.target.value)}
          className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">Todos os setores</option>
          {departamentos.map(d => (
            <option key={d.id} value={d.id}>{d.nome_departamento}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          <button
            type="button"
            onClick={() => setFiltroTipo([])}
            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              tiposFiltro.length === 0 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Todos
          </button>
          {TIPOS.map(t => (
            <button
              key={t.codigo}
              type="button"
              onClick={() => toggleFiltroTipo(t.codigo)}
              title="Clique para incluir/remover do filtro (aceita mais de um)"
              className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
                tiposFiltro.includes(t.codigo)
                  ? t.codigo === 'PBI'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : t.codigo === 'FAB'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.nome}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-44 max-w-64">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar processo/relatório..."
            className="text-xs pl-8 pr-7 py-2 border border-slate-200 rounded-md font-medium text-slate-700 w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              title="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Alerta: processos/relatórios cadastrados sem agendamento */}
      {processosSemAgendamento.length > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-800">
            <strong className="font-bold">
              {processosSemAgendamento.length === 1
                ? '1 processo/relatório sem agendamento'
                : `${processosSemAgendamento.length} processos/relatórios sem agendamento`}
              {canEdit ? ' — clique para criar a rotina:' : ':'}
            </strong>
            {processosSemAgendamento.map(p => canEdit ? (
              <button
                key={p.id}
                type="button"
                onClick={() => abrirIncluirComProcesso(p)}
                title="Criar rotina para este processo"
                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors"
              >
                {p.nome}
              </button>
            ) : (
              <span key={p.id} className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-amber-200 text-amber-800">
                {p.nome}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grade semanal — por Rotina */}
      {visualizacao === 'rotina' && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[1350px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <ThSort label="Processo / Relatório" col="processo" sort={sortRotina} onSort={toggleSortRotina} className="min-w-[300px]" />
              <ThSort label="Setor" col="setor" sort={sortRotina} onSort={toggleSortRotina} />
              <ThSort label="Tipo" col="tipo" sort={sortRotina} onSort={toggleSortRotina} />
              {DIAS_SEMANA.map(d => (
                <th key={d.n} className="p-3 whitespace-nowrap">{d.curto}</th>
              ))}
              <th className="p-3 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {linhasRotina.length === 0 ? (
              <tr><td colSpan={DIAS_SEMANA.length + 4} className="p-6 text-center text-slate-400">Nenhuma rotina cadastrada.</td></tr>
            ) : linhasRotina.map(linha => {
              const proc = processos.find(p => p.id === linha.rotina.processo_id)
              return (
              <tr key={`${linha.rotina.id}|${linha.hora || ''}|${linha.tipo || ''}`} className={`hover:bg-slate-50/70 transition-colors ${!linha.rotina.ativo ? 'opacity-50' : ''}`}>
                <td className="p-3 align-top font-bold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => abrirEditar(linha.rotina)}
                        title="Editar rotina (horários de agendamento)"
                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                      >
                        {linha.rotina.processo || '—'}
                      </button>
                    ) : (linha.rotina.processo || '—')}
                    {proc && ehRelatorio(proc.tipo) && proc.rpa_vinculado_id && (
                      <span title={`Vinculado ao RPA: ${proc.rpa_vinculado_nome || processos.find(x => x.id === proc.rpa_vinculado_id)?.nome || '—'}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      </span>
                    )}
                    {proc && !ehRelatorio(proc.tipo) && rpasVinculados.has(proc.id) && (
                      <span title={`RPA vinculado a: ${processos.filter(x => x.rpa_vinculado_id === proc.id).map(x => x.nome).join(', ')}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap align-top">{linha.rotina.departamento_nome || '—'}</td>
                <td className="p-3 whitespace-nowrap align-top">
                  {(() => {
                    const t = linha.tipo || processos.find(p => p.id === linha.rotina.processo_id)?.tipo
                    return t ? (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeClasses(t)}`}>
                        {t}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )
                  })()}
                </td>
                {DIAS_SEMANA.map(d => {
                  const oc = linha.dias[d.n]
                  return (
                    <td key={d.n} className="p-2 align-top">
                      {oc ? (() => {
                        const ini = formatHora(horaParaMS(oc.hora, oc.tipo))
                        const fim = oc.hora ? somarMinutos(ini, linha.tempo) : null
                        const ast = ehBrasilia(oc.tipo) && oc.hora ? '*' : ''
                        return (
                          <span
                            title={[
                              `Agendamento ${oc.tipo || '—'}: ${ini} MS${ehBrasilia(oc.tipo) && oc.hora ? ` (Brasília: ${formatHora(oc.hora)})` : ''}`,
                              fim ? `Atualização termina às ${fim} — tempo médio de ${linha.tempo ?? 15} min` : null,
                            ].filter(Boolean).join('\n')}
                            className={`inline-block whitespace-nowrap rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border tabular-nums cursor-help ${tipoBadgeClasses(oc.tipo)}`}
                          >
                            {ini}{ast}{fim ? ` · ${fim}${ast}` : ''}
                          </span>
                        )
                      })() : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="p-3">
                  <PermissionActionButtons menuPath="rpa/agendamentos" onEdit={canEdit && proc ? () => abrirEditarProcesso(proc) : undefined} onDelete={canEdit ? () => abrirExcluir(linha.rotina) : undefined} />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Grade semanal — por Horário: linhas ordenadas por horário (RPA), setor em coluna,
          processos distribuídos nas colunas de dias da semana */}
      {visualizacao === 'horario' && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <ThSort label="RPA" col="hora" sort={sortHorario} onSort={toggleSortHorario} />
              <ThSort label="PBI / FAB" col="hora" sort={sortHorario} onSort={toggleSortHorario} />
              <ThSort label="Setor" col="setor" sort={sortHorario} onSort={toggleSortHorario} />
              {DIAS_SEMANA.map(d => (
                <th key={d.n} className="p-3 whitespace-nowrap">{d.curto}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {gradePorHorario.length === 0 ? (
              <tr><td colSpan={DIAS_SEMANA.length + 3} className="p-6 text-center text-slate-400">Nenhum horário cadastrado.</td></tr>
            ) : gradePorHorario.map((g, i) => (
              <tr key={i} className={`hover:bg-slate-50/70 transition-colors ${!g.ativo ? 'opacity-50' : ''}`}>
                <td className="p-3 whitespace-nowrap align-top">
                  {!ehRelatorio(g.tipo) ? (
                    <span className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold border tabular-nums bg-indigo-50 text-indigo-700 border-indigo-100">
                      {formatHora(g.hora)}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap align-top">
                  {ehRelatorio(g.tipo) ? (
                    <span title={tooltipHoraReal(g.hora, g.tipo)} className={`inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold border tabular-nums ${ehBrasilia(g.tipo) ? 'cursor-help' : ''} ${tipoBadgeClasses(g.tipo)}`}>
                      {formatHora(horaParaMS(g.hora, g.tipo))}{ehBrasilia(g.tipo) && g.hora ? '*' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap align-top">{g.departamento_nome || '—'}</td>
                {DIAS_SEMANA.map(d => (
                  <td key={d.n} className="p-2 align-top">
                    {g.dias.has(d.n) ? (
                      canEdit ? (
                        <button
                          type="button"
                          onClick={() => abrirEditar(g.rotina)}
                          title="Editar rotina (horários de agendamento)"
                          className={`inline-block rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border hover:underline transition-colors ${tipoBadgeClasses(g.tipo)}`}
                        >
                          {g.processo}
                        </button>
                      ) : (
                        <span className={`inline-block rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border ${tipoBadgeClasses(g.tipo)}`}>
                          {g.processo}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Atualização — hora em que cada processo/relatório fica atualizado
          (hora agendada + tempo médio do cadastro; relatório tem preferência sobre RPA) */}
      {visualizacao === 'atualizacao' && (
      <div id="rpa-atualizacao-tabela" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <ThSort label="Processo / Relatório" col="processo" sort={sortAtu} onSort={toggleSortAtu} />
              <ThSort label="Setor" col="setor" sort={sortAtu} onSort={toggleSortAtu} />
              <ThSort label="Tipo" col="tipo" sort={sortAtu} onSort={toggleSortAtu} />
              {DIAS_SEMANA.map(d => (
                <th key={d.n} className="p-3 whitespace-nowrap">{d.curto}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {linhasAtualizacao.length === 0 ? (
              <tr><td colSpan={DIAS_SEMANA.length + 3} className="p-6 text-center text-slate-400">Nenhuma atualização agendada.</td></tr>
            ) : linhasAtualizacao.map((l, i) => (
              <tr key={i} className={`hover:bg-slate-50/70 transition-colors ${!l.ativo ? 'opacity-50' : ''}`}>
                <td className="p-3 align-top font-bold text-slate-800">
                  {(() => {
                    const proc = processos.find(p => p.id === l.processoId)
                    return canEdit && proc ? (
                      <button
                        type="button"
                        onClick={() => abrirAgendamentoDoProcesso(proc)}
                        title="Editar horários de agendamento"
                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                      >
                        {l.processo || '—'}
                      </button>
                    ) : (l.processo || '—')
                  })()}
                </td>
                <td className="p-3 whitespace-nowrap align-top">{l.departamento_nome || '—'}</td>
                <td className="p-3 whitespace-nowrap align-top">
                  <div className="flex items-center gap-1">
                    {l.tipos.map(t => (
                      <span key={t} className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeAtuClasses(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                {DIAS_SEMANA.map(d => (
                  <td key={d.n} className="p-2 align-top">
                    {l.porDia[d.n]?.length ? (
                      <div className="flex flex-col gap-1">
                        {l.porDia[d.n].map(h => (
                          <span
                            key={h.horaAtu}
                            title={[
                              `Pronto às ${h.horaAtu} — ${l.tempo ?? 15} min após o agendamento`,
                              `Agendamento ${h.tipo || '—'}: ${formatHora(horaParaMS(h.horaBase, h.tipo))} MS${ehBrasilia(h.tipo) ? ` (Brasília: ${formatHora(h.horaBase)})` : ''}`,
                              l.rpaVincNome
                                ? `RPA vinculado (${l.rpaVincNome}): ${(l.rpaHorasPorDia[d.n] || []).join(', ') || 'sem horário neste dia'}${(l.rpaHorasPorDia[d.n] || []).length ? ' MS' : ''}`
                                : null,
                            ].filter(Boolean).join('\n')}
                            className={`inline-block w-fit rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border tabular-nums cursor-help ${tipoBadgeAtuClasses(h.tipo)}`}
                          >
                            {h.horaAtu}{ehBrasilia(h.tipo) ? '*' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Cadastro — todos os processos/relatórios (rpa_processos) */}
      {visualizacao === 'processos' && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <ThSort label="Processo / Relatório" col="nome" sort={sortProc} onSort={toggleSortProc} />
              <ThSort label="Setor" col="setor" sort={sortProc} onSort={toggleSortProc} />
              <ThSort label="Tipo" col="tipo" sort={sortProc} onSort={toggleSortProc} />
              <ThSort label="Rotinas" col="rotinas" sort={sortProc} onSort={toggleSortProc} center />
              <ThSort label="Status" col="status" sort={sortProc} onSort={toggleSortProc} />
              <th className="p-3 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {processosFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Nenhum processo/relatório cadastrado.</td></tr>
            ) : processosFiltrados.map(p => (
              <tr key={p.id} className={`hover:bg-slate-50/70 transition-colors ${!p.ativo ? 'opacity-50' : ''}`}>
                <td className="p-3 font-bold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => abrirAgendamentoDoProcesso(p)}
                        title="Editar horários de agendamento"
                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                      >
                        {p.nome}
                      </button>
                    ) : p.nome}
                    {ehRelatorio(p.tipo) && p.rpa_vinculado_id && (
                      <span title={`Vinculado ao RPA: ${p.rpa_vinculado_nome || processos.find(x => x.id === p.rpa_vinculado_id)?.nome || '—'}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      </span>
                    )}
                    {!ehRelatorio(p.tipo) && rpasVinculados.has(p.id) && (
                      <span title={`RPA vinculado a: ${processos.filter(x => x.rpa_vinculado_id === p.id).map(x => x.nome).join(', ')}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">{p.departamento_nome || '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeClasses(p.tipo || 'RPA')}`}>
                    {p.tipo || 'RPA'}
                  </span>
                </td>
                <td className="p-3 text-center tabular-nums">{rotinasDoProcesso(p.id)}</td>
                <td className="p-3">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                    p.ativo
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons menuPath="rpa/agendamentos" onEdit={canEdit ? () => abrirEditarProcesso(p) : undefined} onDelete={canEdit ? () => abrirExcluirProcesso(p) : undefined} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[820px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Rotina' : 'Incluir Nova Rotina'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Processo / Relatório *</label>
                  <div className="flex items-center gap-2">
                    <select
                      required
                      value={form.processo_id}
                      onChange={e => handleProcessoChange(e.target.value)}
                      className="flex-1 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {processosSelect.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNovoProcessoAberto(v => !v)}
                      title="Cadastrar novo processo/relatório"
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {novoProcessoAberto && (
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={novoProcessoNome}
                          onChange={e => setNovoProcessoNome(e.target.value)}
                          placeholder="NOME DO NOVO PROCESSO/RELATÓRIO"
                          className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <select
                          value={novoProcessoDeptId}
                          onChange={e => setNovoProcessoDeptId(e.target.value)}
                          className="w-36 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="">Setor...</option>
                          {departamentos.map(d => (
                            <option key={d.id} value={d.id}>{d.nome_departamento}</option>
                          ))}
                        </select>
                        <select
                          value={novoProcessoTipo}
                          onChange={e => setNovoProcessoTipo(e.target.value)}
                          className="w-36 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {TIPOS.map(t => (
                            <option key={t.codigo} value={t.codigo}>{t.nome}</option>
                          ))}
                        </select>
                      </div>
                      {ehRelatorio(novoProcessoTipo) && (
                        <div className="flex items-center gap-2">
                          <select
                            value={novoProcessoRpaVincId}
                            onChange={e => setNovoProcessoRpaVincId(e.target.value)}
                            className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="">RPA vinculado: nenhum</option>
                            {processos.filter(p => p.tipo === 'RPA' && p.ativo).map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <ErroForm>{erroProcesso}</ErroForm>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => { setNovoProcessoAberto(false); setNovoProcessoNome(''); setNovoProcessoDeptId(''); setNovoProcessoTipo('RPA'); setNovoProcessoRpaVincId(''); setErroProcesso(null) }}
                          className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={criandoProcesso || !novoProcessoNome.trim()} onClick={handleCriarProcesso}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                          {criandoProcesso ? 'Salvando...' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400">Selecionado uma única vez — vale para todos os dias e horários marcados abaixo.</span>
                </div>

                <div className="flex items-start gap-8">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Setor</label>
                    <span className="text-xs font-semibold text-slate-700">
                      {form.departamento_nome || 'Preenchido automaticamente ao selecionar o processo'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                    {form.tipo ? (
                      <span className={`inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeClasses(form.tipo)}`}>
                        {TIPOS.find(t => t.codigo === form.tipo)?.nome || form.tipo}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700">Preenchido automaticamente ao selecionar o processo</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Horário de Agendamento</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="time"
                      value={templateHora}
                      onChange={e => setTemplateHora(e.target.value)}
                      className="w-24 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      {ehBrasilia(form.tipo) ? 'Horário de Brasília' : 'Horário de MS'} — tipo definido no cadastro do processo
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={toggleTodosDiasTemplate}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                        diasTemplate.size === DIAS_SEMANA.length ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Todos
                    </button>
                    {DIAS_SEMANA.map(d => (
                      <button
                        key={d.n}
                        type="button"
                        onClick={() => toggleDiaTemplate(d.n)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                          diasTemplate.has(d.n) ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.curto}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={!templateHora || diasTemplate.size === 0}
                      onClick={aplicarTemplate}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3" /> Adicionar ao Cronograma
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cronograma Semanal</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todasChavesExec(form.dias).length > 0 && execSelecionadas.size === todasChavesExec(form.dias).length}
                          onChange={toggleSelecionarTodasExec}
                          className="w-3.5 h-3.5"
                        />
                        Selecionar Todos
                      </label>
                      <button
                        type="button"
                        disabled={execSelecionadas.size === 0}
                        onClick={excluirSelecionadas}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Excluir Selecionados{execSelecionadas.size > 0 ? ` (${execSelecionadas.size})` : ''}
                      </button>
                      <button type="button" onClick={limparCronograma} className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors">
                        Excluir Todos os Dias e Horários
                      </button>
                    </div>
                  </div>
                  {horasDoCronograma.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 border border-slate-200 rounded-md p-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0">Selecionar por horário:</span>
                      {horasDoCronograma.map(g => {
                        const marcado = g.chaves.every(k => execSelecionadas.has(k))
                        return (
                          <button
                            key={g.hora}
                            type="button"
                            onClick={() => toggleGrupoHora(g.chaves)}
                            title={marcado ? 'Desmarcar todos os horários iguais a este' : 'Selecionar todos os horários iguais a este'}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold tabular-nums border transition-colors ${
                              marcado
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {g.hora} ({g.chaves.length}x)
                          </button>
                        )
                      })}
                      <span className="text-[10px] text-slate-400">clique no horário e depois em "Excluir Selecionados"</span>
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100 overflow-hidden">
                    {DIAS_SEMANA.map(d => {
                      const dia = form.dias[d.n]
                      return (
                        <div key={d.n} className="flex items-start gap-3 p-2 bg-white">
                          <label className="flex items-center gap-2 w-28 shrink-0 text-xs font-semibold text-slate-700 cursor-pointer pt-1.5">
                            <input type="checkbox" checked={dia.ativo} onChange={() => toggleDia(d.n)} className="w-4 h-4" />
                            {d.label}
                          </label>
                          <div className="flex-1 flex flex-col gap-1.5">
                            {dia.ativo && dia.execucoes.map((oc, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={execSelecionadas.has(chaveExec(d.n, idx))}
                                  onChange={() => toggleExecSelecionada(chaveExec(d.n, idx))}
                                  title="Selecionar este horário"
                                  className="w-3.5 h-3.5 shrink-0"
                                />
                                <input
                                  type="time"
                                  value={oc.hora}
                                  onChange={e => setOcorrenciaCampo(d.n, idx, 'hora', e.target.value)}
                                  className="w-24 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                                <span className="text-[9px] text-slate-400 shrink-0">{ehBrasilia(form.tipo) ? 'Brasília' : 'MS'}</span>
                                {dia.execucoes.length > 1 && (
                                  <button type="button" onClick={() => removeOcorrencia(d.n, idx)} className="text-slate-400 hover:text-red-600 transition-colors" title="Remover horário">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {dia.ativo && (
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => addOcorrencia(d.n)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <CopyPlus className="h-3 w-3" /> Repetir {d.curto}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => limparDia(d.n)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                                >
                                  <X className="h-3 w-3" /> Excluir {d.curto}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
                <ErroForm>{erroRotina}</ErroForm>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
                  {salvando ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal novo processo (cabeçalho da página) */}
      {modalNovoProcessoAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{procEditId ? 'Editar Processo / Relatório' : 'Cadastrar Processo / Relatório'}</h3>
              <button onClick={() => setModalNovoProcessoAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCriarProcessoHeader}>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Processo *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={novoProcessoNomeHeader}
                    onChange={e => setNovoProcessoNomeHeader(e.target.value)}
                    placeholder="NOME DO PROCESSO/RELATÓRIO"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Setor</label>
                  <select
                    value={novoProcessoDeptIdHeader}
                    onChange={e => setNovoProcessoDeptIdHeader(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome_departamento}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo *</label>
                  <select
                    value={novoProcessoTipoHeader}
                    onChange={e => setNovoProcessoTipoHeader(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {TIPOS.map(t => (
                      <option key={t.codigo} value={t.codigo}>{t.nome}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">
                    {ehBrasilia(novoProcessoTipoHeader) ? 'Agendamentos em horário de Brasília' : 'Agendamentos em horário de MS'} — as rotinas deste processo assumem este tipo.
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tempo Médio de Atualização (minutos)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={novoProcessoTempoHeader}
                    onChange={e => setNovoProcessoTempoHeader(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    Usado na aba Atualização: hora agendada + este tempo = hora em que fica pronto. Ex.: agendado 13:00 com 30 min → pronto às 13:30.
                  </span>
                </div>
                {ehRelatorio(novoProcessoTipoHeader) && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">RPA Vinculado</label>
                    <select
                      value={novoProcessoRpaVincIdHeader}
                      onChange={e => setNovoProcessoRpaVincIdHeader(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Nenhum</option>
                      {processos.filter(p => p.tipo === 'RPA' && p.ativo && p.id !== procEditId).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400">
                      Qual processo RPA alimenta este relatório. O RPA vinculado não aparece na aba Atualização — vale a hora do Power BI.
                    </span>
                  </div>
                )}
                {procEditId && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={novoProcessoAtivoHeader} onChange={(e) => setNovoProcessoAtivoHeader(e.target.checked)} className="w-4 h-4" />
                    Ativo
                  </label>
                )}
                <ErroForm>{erroProcessoHeader}</ErroForm>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalNovoProcessoAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={criandoProcessoHeader} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
                  {criandoProcessoHeader ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal exclusão de processo */}
      {modalExcluirProcAberto && procExcluir && (() => {
        const emUso = rotinasDoProcesso(procExcluir.id)
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                  {emUso > 0 ? (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O processo <strong className="text-slate-800">"{procExcluir.nome}"</strong> está em uso por <strong className="text-slate-800">{emUso} rotina{emUso > 1 ? 's' : ''}</strong>. Exclua ou altere as rotinas antes, ou apenas inative o processo pela edição.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir o processo <strong className="text-slate-800">"{procExcluir.nome}"</strong> do cadastro?</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setModalExcluirProcAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
                {emUso === 0 && (
                  <button onClick={handleConfirmarExclusaoProcesso} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal exclusão */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir a rotina <strong className="text-slate-800">"{form.processo || '—'}"</strong>? Todos os horários vinculados aos dias da semana também serão removidos.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
