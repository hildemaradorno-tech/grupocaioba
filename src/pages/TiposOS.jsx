import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, Wrench, ShieldAlert, Eye, ArrowUp, ArrowDown, ArrowUpDown, FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'
import * as XLSX from 'xlsx'

const CLASSIFICACOES_OPTS = ['Atacado/Varejo','Cliente','Departamento','Garantia','Internas','Outros','Reclamação','Revisão de Entrega','Revisão Gratuita','Seguradora']
const TIPOS_INTERNO_OPTS = ['Atacado/Varejo','Box Express','Cliente','Funilaria/Pintura','Garantia','Horas Auxiliares','Interna','Interna Administração','Interna Novos','Interna Pós Vendas','Interna Usados','Interna/Despesa','Interno Administração','Planos Caiobá','Planos DMS','Revisão de Entrega','Revisão Gratuita','Seguradora','TruckPag']

const _stripAccents = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '')

const normHeader = (h) => _stripAccents(h)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const matchHeader = (raw) => {
  const h = normHeader(raw)
  if (h === 'agrupamento' || h.startsWith('agrupamento ') || h === 'agrup') return 'agrupamento_nome'
  if (h === 'departamento' || h.startsWith('departamento ') || h === 'depto') return 'departamento_nome'
  if (h.startsWith('codigo') || h === 'cod') return 'codigo'
  if (h.startsWith('tipo de o') || (h.includes('tipo') && h.includes('descri'))) return 'tipo_os'
  if (h === 'sigla') return 'sigla'
  if (h.includes('classifica')) return 'classificacao'
  if (h === 'tipo os' || h === 'tipo interno') return 'tipo_interno'
  if (h.includes('setor') && h.includes('servi')) return 'setor_servico'
  if (h === 'box' || h.includes('tipo setor')) return 'tipo_setor_servico'
  return null
}

const normForMatch = (s) => _stripAccents(s).toLowerCase().trim()

const FORM_VAZIO = {
  agrupamento_empresa_id: '', agrupamento_nome: '',
  departamento_id: '', departamento_nome: '',
  codigo: '', tipo_os: '', sigla: '',
  classificacao: '', setor_servico: '', tipo_setor_servico: '',
  tipo_interno: '',
  natureza_operacao: '', moeda: '', preco_faturamento: '',
  ativo: true
}

export default function TiposOS() {
  const [agrupamentos, setAgrupamentos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [boxes, setBoxes] = useState([])
  const [naturezaOperacoes, setNaturezaOperacoes] = useState([])
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalImportAberto, setModalImportAberto] = useState(false)
  const [importRows, setImportRows] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importFilter, setImportFilter] = useState([])
  const [importSelected, setImportSelected] = useState(new Set())
  const [importAdvOpen, setImportAdvOpen] = useState(false)
  const [importAdvFilters, setImportAdvFilters] = useState({ classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' })
  const fileInputRef = useRef(null)

  const [modalAberto, setModalAberto] = useSessionState('tos_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('tos_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('tos_editid', null)
  const [form, setForm] = useSessionState('tos_form', FORM_VAZIO)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('tipos-os', 'editar')
  const canDelete = hasPermission('tipos-os', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tiposData, agrupamentosData, departamentosData, setoresData, boxesData, naturezasData] = await Promise.all([
        apiService.getTiposOS(),
        apiService.getAgrupamentoEmpresas(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getBox(),
        apiService.getNaturezaOperacoes()
      ])
      setDados(tiposData)
      setAgrupamentos(agrupamentosData)
      setDepartamentos(departamentosData)
      setSetores([...setoresData].sort((a, b) => (a.nome_setor || '').localeCompare(b.nome_setor || '', 'pt-BR')))
      setBoxes([...boxesData].filter(b => b.ativo !== false).sort((a, b) => (a.nome_box || '').localeCompare(b.nome_box || '', 'pt-BR')))
      setNaturezaOperacoes(naturezasData)
    } catch (err) {
      console.error('Erro ao carregar dados', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const upperFields = ['tipo_os', 'sigla']
    const finalValue = type === 'checkbox' ? checked : upperFields.includes(name) ? value.toUpperCase() : value
    setForm(prev => ({ ...prev, [name]: finalValue }))
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setForm({ ...FORM_VAZIO })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setForm({ ...item })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setForm({ ...item })
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const agObj = agrupamentos.find(g => g.id === form.agrupamento_empresa_id)
      const depObj = departamentos.find(d => d.id === form.departamento_id)
      const payload = {
        ...form,
        codigo: parseInt(form.codigo),
        agrupamento_nome: agObj?.nome_agrupamento || '',
        departamento_nome: depObj?.nome_departamento || ''
      }
      if (modo === 'incluir') {
        await apiService.createTipoOS(payload)
      } else {
        await apiService.updateTipoOS(idSelecionado, payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      console.error('Erro ao salvar tipo OS', err)
      alert('Erro ao salvar: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteTipoOS(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir tipo OS', err)
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  // ---- IMPORT EXCEL ----
  const getFinal = (row) => ({ ...row.resolved, ...row.overrides })

  const rowHasError = (row) => {
    const f = getFinal(row)
    if (!f.agrupamento_empresa_id || !f.departamento_id || !f.codigo || !f.tipo_os || !f.sigla) return true
    if (!f.classificacao || !CLASSIFICACOES_OPTS.includes(f.classificacao)) return true
    if (!f.tipo_interno || !TIPOS_INTERNO_OPTS.includes(f.tipo_interno)) return true
    if (!f.setor_servico || !setores.some(s => s.nome_setor === f.setor_servico)) return true
    return false
  }

  const getChangedFields = (row) => {
    if (!row.existingRecord) return []
    const f = getFinal(row)
    const e = row.existingRecord
    const labels = [
      ['agrupamento_empresa_id', 'Agrupamento'],
      ['departamento_id', 'Departamento'],
      ['tipo_os', 'Tipo de O.S.'],
      ['sigla', 'Sigla'],
      ['classificacao', 'Classificação'],
      ['tipo_interno', 'Tipo OS'],
      ['setor_servico', 'Setor de Serviço'],
      ['tipo_setor_servico', 'Box'],
    ]
    return labels
      .filter(([field]) => String(f[field] || '') !== String(e[field] || ''))
      .map(([, label]) => label)
  }

  const getRowStatus = (row) => {
    if (rowHasError(row)) return 'error'
    if (!row.existingRecord) return 'new'
    return getChangedFields(row).length > 0 ? 'update' : 'same'
  }

  const parseImportRow = (rawRow) => {
    const agrupNome = String(rawRow.agrupamento_nome || '').trim()
    const deptNome  = String(rawRow.departamento_nome || '').trim()
    const codigoRaw = String(rawRow.codigo || '').trim()
    const codigo    = parseInt(codigoRaw) || 0
    const tipoOs    = String(rawRow.tipo_os || '').trim().toUpperCase()
    const sigla     = String(rawRow.sigla || '').trim().toUpperCase()
    const classRaw  = String(rawRow.classificacao || '').trim()
    const tipoRaw   = String(rawRow.tipo_interno || '').trim()
    const setorRaw  = String(rawRow.setor_servico || '').trim()
    const boxRaw    = String(rawRow.tipo_setor_servico || '').trim()

    const agrupObj  = agrupamentos.find(a => normForMatch(a.nome_agrupamento) === normForMatch(agrupNome))
    const deptObj   = departamentos.find(d => normForMatch(d.nome_departamento) === normForMatch(deptNome))
    const setorObj  = setores.find(s => normForMatch(s.nome_setor) === normForMatch(setorRaw))
    const boxObj    = boxes.find(b => normForMatch(b.nome_box) === normForMatch(boxRaw))
    const classMatch = CLASSIFICACOES_OPTS.find(c => normForMatch(c) === normForMatch(classRaw))
    const tipoMatch  = TIPOS_INTERNO_OPTS.find(t => normForMatch(t) === normForMatch(tipoRaw))
    // Match por código numérico E tipo_os.
    // Se o tipo_os do Excel está preenchido, exige que ambos coincidam —
    // evita confundir OSes diferentes que compartilham o mesmo número de código.
    // Se tipo_os está em branco no Excel, usa só o código (fallback de banco).
    const normalizedTipoOs = normForMatch(tipoOs)
    const existing = codigo > 0
      ? dados.find(d => {
          if (Number(d.codigo) !== codigo) return false
          if (normalizedTipoOs) return normForMatch(d.tipo_os) === normalizedTipoOs
          return true
        })
      : null

    // Para campos em branco no Excel, usa o valor do banco se existir o registro
    const blankFields = new Set()
    const dbFill = (rawVal, resolvedVal, existingVal, fieldKey) => {
      if (!rawVal && existing && existingVal) { blankFields.add(fieldKey); return existingVal }
      return resolvedVal
    }

    const finalAgrupId   = agrupObj?.id || (!agrupNome && existing?.agrupamento_empresa_id ? (blankFields.add('agrupamento_empresa_id'), existing.agrupamento_empresa_id) : '')
    const finalAgrupNome = agrupObj?.nome_agrupamento || (!agrupNome && existing?.agrupamento_nome ? existing.agrupamento_nome : agrupNome)
    const finalDeptId    = deptObj?.id || (!deptNome && existing?.departamento_id ? (blankFields.add('departamento_id'), existing.departamento_id) : '')
    const finalDeptNome  = deptObj?.nome_departamento || (!deptNome && existing?.departamento_nome ? existing.departamento_nome : deptNome)
    const finalTipoOs    = dbFill(tipoOs, tipoOs, existing?.tipo_os, 'tipo_os')
    const finalSigla     = dbFill(sigla, sigla, existing?.sigla, 'sigla')
    const finalClass     = dbFill(classRaw, classMatch || classRaw, existing?.classificacao, 'classificacao')
    const finalTipo      = dbFill(tipoRaw, tipoMatch || tipoRaw, existing?.tipo_interno, 'tipo_interno')
    const finalSetor     = dbFill(setorRaw, setorObj?.nome_setor || setorRaw, existing?.setor_servico, 'setor_servico')
    const finalBox       = dbFill(boxRaw, boxObj?.nome_box || boxRaw, existing?.tipo_setor_servico, 'tipo_setor_servico')

    return {
      _key: Math.random().toString(36).slice(2),
      rawValues: {
        agrupamento_nome: agrupNome,
        departamento_nome: deptNome,
        codigo: codigoRaw,
        tipo_os: tipoOs,
        sigla,
        classificacao: classRaw,
        tipo_interno: tipoRaw,
        setor_servico: setorRaw,
        tipo_setor_servico: boxRaw,
      },
      blankFields,
      resolved: {
        agrupamento_empresa_id: finalAgrupId,
        agrupamento_nome: finalAgrupNome,
        departamento_id: finalDeptId,
        departamento_nome: finalDeptNome,
        codigo, tipo_os: finalTipoOs, sigla: finalSigla,
        classificacao: finalClass,
        tipo_interno: finalTipo,
        setor_servico: finalSetor,
        tipo_setor_servico: finalBox,
      },
      overrides: {},
      existingId: existing?.id || null,
      existingRecord: existing || null,
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (!raw.length) return
        const headers = raw[0].map(h => String(h).trim())
        const colMap = headers.map(h => matchHeader(h))
        const parsed = raw.slice(1)
          .filter(row => row.some(c => String(c).trim()))
          .map(row => {
            const obj = {}
            colMap.forEach((field, i) => { if (field) obj[field] = row[i] })
            return parseImportRow(obj)
          })
        setImportRows(parsed)
        setImportFilter([])
        setImportSelected(new Set())
        setImportAdvOpen(false)
        setImportAdvFilters({ classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' })
        setModalImportAberto(true)
      } catch { alert('Erro ao ler o arquivo Excel.') }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const updateOverride = (idx, field, val) => {
    setImportRows(prev => prev.map((row, i) => {
      if (i !== idx) return row
      const ov = { ...row.overrides, [field]: val }
      if (field === 'agrupamento_empresa_id') {
        const a = agrupamentos.find(x => x.id === val)
        ov.agrupamento_nome = a?.nome_agrupamento || ''
      }
      if (field === 'departamento_id') {
        const d = departamentos.find(x => x.id === val)
        ov.departamento_nome = d?.nome_departamento || ''
      }
      return { ...row, overrides: ov }
    }))
  }

  const handleDoImport = async () => {
    setImportLoading(true)
    try {
      const toProcess = importRows.filter(r => {
        const s = getRowStatus(r)
        return importSelected.has(r._key) && (s === 'new' || s === 'update')
      })
      for (const row of toProcess) {
        const f = getFinal(row)
        const payload = { ...f, codigo: parseInt(f.codigo), ativo: true }
        if (row.existingId) await apiService.updateTipoOS(row.existingId, payload)
        else await apiService.createTipoOS(payload)
      }
      await loadData()
      setModalImportAberto(false)
      setImportRows([])
      setImportSelected(new Set())
      setImportFilter([])
      setImportAdvFilters({ classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' })
    } catch (err) { alert('Erro ao importar: ' + (err.message || String(err))) }
    finally { setImportLoading(false) }
  }

  const [sortCol, setSortCol] = useState('codigo')
  const [sortDir, setSortDir] = useState('asc')
  const [advOpen, setAdvOpen] = useState(false)
  const [advFilters, setAdvFilters] = useState({ tipo_os: '', classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' })

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />
  }

  const dadosOrdenados = useMemo(() => {
    return [...dados].sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (sortCol === 'codigo') { va = Number(va); vb = Number(vb) }
      const cmp = typeof va === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [dados, sortCol, sortDir])

  const dadosFiltrados = useMemo(() => {
    const anyActive = Object.values(advFilters).some(v => v)
    if (!anyActive) return dadosOrdenados
    return dadosOrdenados.filter(item => {
      if (advFilters.tipo_os && !normForMatch(item.tipo_os || '').includes(normForMatch(advFilters.tipo_os))) return false
      if (advFilters.classificacao && item.classificacao !== advFilters.classificacao) return false
      if (advFilters.tipo_interno && item.tipo_interno !== advFilters.tipo_interno) return false
      if (advFilters.setor_servico && item.setor_servico !== advFilters.setor_servico) return false
      if (advFilters.tipo_setor_servico && item.tipo_setor_servico !== advFilters.tipo_setor_servico) return false
      return true
    })
  }, [dadosOrdenados, advFilters])

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tipos de O.S. (Ordem de Serviço)</h1>
          <p className="text-xs text-slate-500">Parametrizador mestre de fluxos operacionais, regras fiscais e tabelas de faturamento de serviços.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
          {canEdit && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-md transition-colors shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar Excel
            </button>
          )}
          {canEdit && (
            <button
              onClick={abrirIncluir}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              Incluir Tipo O.S.
            </button>
          )}
        </div>
      </div>

      {/* FILTROS AVANÇADOS */}
      {(() => {
        const advActive = Object.values(advFilters).some(v => v)
        const activeCount = Object.values(advFilters).filter(v => v).length
        const selectCls = 'text-xs border border-slate-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 bg-white w-full'
        // Opções dinâmicas: aplica todos os filtros exceto o do próprio campo
        const optionsFor = (field) => {
          const base = dadosOrdenados.filter(item => {
            if (field !== 'tipo_os'          && advFilters.tipo_os          && !normForMatch(item.tipo_os || '').includes(normForMatch(advFilters.tipo_os))) return false
            if (field !== 'classificacao'    && advFilters.classificacao    && item.classificacao    !== advFilters.classificacao)    return false
            if (field !== 'tipo_interno'     && advFilters.tipo_interno     && item.tipo_interno     !== advFilters.tipo_interno)     return false
            if (field !== 'setor_servico'    && advFilters.setor_servico    && item.setor_servico    !== advFilters.setor_servico)    return false
            if (field !== 'tipo_setor_servico' && advFilters.tipo_setor_servico && item.tipo_setor_servico !== advFilters.tipo_setor_servico) return false
            return true
          })
          return [...new Set(base.map(d => d[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'))
        }
        return (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <button
              onClick={() => setAdvOpen(p => !p)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors rounded-lg ${advActive ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros avançados
                {advActive && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{activeCount}</span>
                )}
              </span>
              <span className="text-slate-400 text-[10px]">{advOpen ? '▲' : '▼'}</span>
            </button>
            {advOpen && (
              <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-4 gap-x-4 gap-y-3">
                <div className="col-span-4 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de O.S. (Descrição)</label>
                  <input type="text" placeholder="Digite qualquer trecho da descrição..." value={advFilters.tipo_os} onChange={e => setAdvFilters(p => ({ ...p, tipo_os: e.target.value }))} className={selectCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Classificação</label>
                  <select value={advFilters.classificacao} onChange={e => setAdvFilters(p => ({ ...p, classificacao: e.target.value }))} className={selectCls}>
                    <option value="">Todas</option>
                    {optionsFor('classificacao').map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo OS</label>
                  <select value={advFilters.tipo_interno} onChange={e => setAdvFilters(p => ({ ...p, tipo_interno: e.target.value }))} className={selectCls}>
                    <option value="">Todos</option>
                    {optionsFor('tipo_interno').map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Setor de Serviço</label>
                  <select value={advFilters.setor_servico} onChange={e => setAdvFilters(p => ({ ...p, setor_servico: e.target.value }))} className={selectCls}>
                    <option value="">Todos</option>
                    {optionsFor('setor_servico').map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Box</label>
                  <select value={advFilters.tipo_setor_servico} onChange={e => setAdvFilters(p => ({ ...p, tipo_setor_servico: e.target.value }))} className={selectCls}>
                    <option value="">Todos</option>
                    {optionsFor('tipo_setor_servico').map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                {advActive && (
                  <div className="col-span-4 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">{dadosFiltrados.length} de {dados.length} registro(s)</span>
                    <button onClick={() => setAdvFilters({ tipo_os: '', classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' })} className="text-[11px] text-slate-500 hover:text-red-600 transition-colors font-medium">
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* TABELA COMPACTA — rolagem horizontal, sem quebra de linha */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              {[['codigo','Cód','text-center'],['tipo_os','Tipo de O.S. (Descrição)',''],['sigla','Sigla',''],['agrupamento_nome','Empresa',''],['departamento_nome','Depto.',''],['classificacao','Classif.',''],['tipo_interno','Tipo OS',''],['setor_servico','Setor',''],['tipo_setor_servico','Box',''],['natureza_operacao','Natureza Op.',''],['moeda','Moeda','']].map(([col, label, cls]) => (
                <th key={col} className={`px-2 py-2 ${cls} cursor-pointer select-none hover:text-slate-600 whitespace-nowrap overflow-hidden`} onClick={() => toggleSort(col)}>
                  <span className="flex items-center gap-0.5">{label}<SortIcon col={col} /></span>
                </th>
              ))}
              <th className="px-2 py-2 text-center sticky right-0 bg-slate-50 border-l border-slate-200 whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="12" className="p-6 text-center text-slate-400">Nenhum tipo de O.S. cadastrado.</td>
              </tr>
            ) : dadosFiltrados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-2 py-1.5 text-center text-slate-900 font-mono font-bold whitespace-nowrap">{item.codigo}</td>
                <td className="px-2 py-1.5 text-slate-900 font-semibold whitespace-nowrap">{item.tipo_os}</td>
                <td className="px-2 py-1.5 font-mono text-blue-700 whitespace-nowrap">{item.sigla}</td>
                <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={item.agrupamento_nome}>{item.agrupamento_nome || '-'}</td>
                <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={item.departamento_nome}>{item.departamento_nome || '-'}</td>
                <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis" title={item.classificacao}>{item.classificacao || '-'}</td>
                <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis" title={item.tipo_interno}>{item.tipo_interno || '-'}</td>
                <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={item.setor_servico}>{item.setor_servico || '-'}</td>
                <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis" title={item.tipo_setor_servico}>{item.tipo_setor_servico || '-'}</td>
                <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis" title={item.natureza_operacao}>{item.natureza_operacao || '-'}</td>
                <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis" title={item.moeda}>{item.moeda || '-'}</td>
                <td className="px-2 py-1.5 text-center sticky right-0 bg-white border-l border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">
                  <PermissionActionButtons
                    menuPath="tipos-os"
                    onView={() => abrirVisualizar(item)}
                    onEdit={() => abrirEditar(item)}
                    onDelete={() => abrirExcluir(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[950px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Configurar Novo Tipo de O.S.' : 'Editar Parametrização de O.S.'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="p-5 grid grid-cols-3 gap-x-4 gap-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">

                <div className="col-span-3 border-b border-slate-100 pb-1 mt-1">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">1. Estrutura & Vínculos</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Agrupamento Empresa *</label>
                  <select name="agrupamento_empresa_id" value={form.agrupamento_empresa_id} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Selecione</option>
                    {agrupamentos.map(g => <option key={g.id} value={g.id}>{g.nome_agrupamento}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Departamento *</label>
                  <select name="departamento_id" value={form.departamento_id} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Selecione</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome_departamento}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código O.S. *</label>
                  <input type="number" required name="codigo" value={form.codigo} onChange={handleInputChange} placeholder="Ex: 101" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de O.S. (Descrição) *</label>
                  <input type="text" required name="tipo_os" value={form.tipo_os} onChange={handleInputChange} placeholder="Ex: Revisão Geral Preventiva" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Sigla *</label>
                  <input type="text" required name="sigla" value={form.sigla} onChange={handleInputChange} placeholder="Ex: REV01" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20" />
                </div>

                <div className="col-span-3 border-b border-slate-100 pb-1 mt-2">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">2. Regras Operacionais</span>
                </div>

                <div className="col-span-3 grid grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Classificação</label>
                    <select name="classificacao" value={form.classificacao} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Selecione</option>
                      {CLASSIFICACOES_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo OS</label>
                    <select name="tipo_interno" value={form.tipo_interno} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Selecione</option>
                      <option value="Atacado/Varejo">Atacado/Varejo</option>
                      <option value="Box Express">Box Express</option>
                      <option value="Cliente">Cliente</option>
                      <option value="Funilaria/Pintura">Funilaria/Pintura</option>
                      <option value="Garantia">Garantia</option>
                      <option value="Horas Auxiliares">Horas Auxiliares</option>
                      <option value="Interna">Interna</option>
                      <option value="Interna Administração">Interna Administração</option>
                      <option value="Interna Novos">Interna Novos</option>
                      <option value="Interna Pós Vendas">Interna Pós Vendas</option>
                      <option value="Interna Usados">Interna Usados</option>
                      <option value="Interna/Despesa">Interna/Despesa</option>
                      <option value="Interno Administração">Interno Administração</option>
                      <option value="Planos Caiobá">Planos Caiobá</option>
                      <option value="Planos DMS">Planos DMS</option>
                      <option value="Revisão de Entrega">Revisão de Entrega</option>
                      <option value="Revisão Gratuita">Revisão Gratuita</option>
                      <option value="Seguradora">Seguradora</option>
                      <option value="TruckPag">TruckPag</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Setor de Serviço</label>
                    <select name="setor_servico" value={form.setor_servico} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Selecione</option>
                      {setores.map(s => (
                        <option key={s.id} value={s.nome_setor}>{s.nome_setor}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Box</label>
                    <select name="tipo_setor_servico" value={form.tipo_setor_servico} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Selecione</option>
                      {boxes.map(b => (
                        <option key={b.id} value={b.nome_box}>{b.nome_box}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-span-3 border-b border-slate-100 pb-1 mt-2">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">3. Faturamento & Custos</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Natureza de Operação</label>
                  <select name="natureza_operacao" value={form.natureza_operacao} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Selecione</option>
                    {naturezaOperacoes.map(n => (
                      <option key={n.id} value={n.natureza_operacao}>
                        {n.codigo} — {n.natureza_operacao}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Moeda (Mão de Obra Hora)</label>
                  <select name="moeda" value={form.moeda} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Selecione</option>
                    <option value="HORA AÇÃO DE CAMPO">HORA AÇÃO DE CAMPO</option>
                    <option value="HORA FUNILARIA">HORA FUNILARIA</option>
                    <option value="HORA GARANTIA">HORA GARANTIA</option>
                    <option value="HORA GARANTIA IMPLEMENTO">HORA GARANTIA IMPLEMENTO</option>
                    <option value="HORA INTERNA">HORA INTERNA</option>
                    <option value="HORA PÚBLICO">HORA PÚBLICO</option>
                    <option value="HORA SEGURADORA">HORA SEGURADORA</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Preço Faturamento (Valor de Peças)</label>
                  <select name="preco_faturamento" value={form.preco_faturamento} onChange={handleInputChange} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Selecione</option>
                    <option value="Preço Custo">Preço Custo</option>
                    <option value="Preço Garantia">Preço Garantia</option>
                    <option value="Preço Público">Preço Público</option>
                    <option value="Preço Sugerido">Preço Sugerido</option>
                  </select>
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Salvar Dados</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[700px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Tipo de O.S. — <span className="font-mono text-blue-700">#{itemVisualizado.codigo}</span></h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Estrutura & Vínculos</p>
                <div className="grid grid-cols-3 gap-3">
                  {[['Agrupamento Empresa', itemVisualizado.agrupamento_nome],['Departamento', itemVisualizado.departamento_nome],['Código', itemVisualizado.codigo],['Tipo de O.S.', itemVisualizado.tipo_os],['Sigla', itemVisualizado.sigla]].map(([label, val]) => (
                    <div key={label} className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span><span className="text-xs font-semibold text-slate-800">{val || '-'}</span></div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Regras Operacionais</p>
                <div className="grid grid-cols-3 gap-3">
                  {[['Classificação', itemVisualizado.classificacao],['Tipo OS', itemVisualizado.tipo_interno],['Setor de Serviço', itemVisualizado.setor_servico],['Box', itemVisualizado.tipo_setor_servico]].map(([label, val]) => (
                    <div key={label} className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span><span className="text-xs font-semibold text-slate-800">{val || '-'}</span></div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Faturamento & Custos</p>
                <div className="grid grid-cols-3 gap-3">
                  {[['Natureza de Operação', itemVisualizado.natureza_operacao],['Moeda (M.O. Hora)', itemVisualizado.moeda],['Preço Faturamento', itemVisualizado.preco_faturamento]].map(([label, val]) => (
                    <div key={label} className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span><span className="text-xs font-semibold text-slate-800">{val || '-'}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remover Tipo de O.S.</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirma a exclusão permanente do Tipo de O.S. <strong className="text-slate-800">"{form.tipo_os}"</strong> (Cód. {form.codigo})? Isso quebrará os mapeamentos históricos no BI.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR EXCEL */}
      {modalImportAberto && (() => {
        const advActive = Object.values(importAdvFilters).some(v => v)
        const setAdv = (field, val) => setImportAdvFilters(p => ({ ...p, [field]: val }))
        const clearAdv = () => setImportAdvFilters({ classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' })

        // Opções únicas dos registros NOVOS (para os dropdowns de filtro avançado)
        const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
        const newRows = importRows.filter(r => getRowStatus(r) === 'new' || Object.keys(r.overrides).length > 0)
        const advOpts = {
          classificacao:      uniq(newRows.map(r => getFinal(r).classificacao)),
          tipo_interno:       uniq(newRows.map(r => getFinal(r).tipo_interno)),
          setor_servico:      uniq(newRows.map(r => getFinal(r).setor_servico)),
          tipo_setor_servico: uniq(newRows.map(r => getFinal(r).tipo_setor_servico)),
        }

        const visibleRows = importRows
          .filter(r => {
            // Linha editada manualmente: nunca some
            if (Object.keys(r.overrides).length > 0) return true
            // Mostra apenas novos
            return getRowStatus(r) === 'new'
          })
          .filter(r => {
            // Linha editada: não aplica filtro avançado para não sumir durante edição
            if (!advActive || Object.keys(r.overrides).length > 0) return true
            const f = getFinal(r)
            if (importAdvFilters.classificacao      && f.classificacao      !== importAdvFilters.classificacao)      return false
            if (importAdvFilters.tipo_interno       && f.tipo_interno       !== importAdvFilters.tipo_interno)       return false
            if (importAdvFilters.setor_servico      && f.setor_servico      !== importAdvFilters.setor_servico)      return false
            if (importAdvFilters.tipo_setor_servico && f.tipo_setor_servico !== importAdvFilters.tipo_setor_servico) return false
            return true
          })

        const selectableKeys = visibleRows.filter(r => getRowStatus(r) !== 'error').map(r => r._key)
        const allVisibleSelected = selectableKeys.length > 0 && selectableKeys.every(k => importSelected.has(k))
        const someVisibleSelected = !allVisibleSelected && selectableKeys.some(k => importSelected.has(k))
        const toggleSelectAll = () => setImportSelected(prev => {
          const next = new Set(prev)
          if (allVisibleSelected) selectableKeys.forEach(k => next.delete(k))
          else selectableKeys.forEach(k => next.add(k))
          return next
        })
        const toggleRow = (key) => setImportSelected(prev => {
          const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
        })
        const selectedCount = importRows.filter(r => importSelected.has(r._key) && getRowStatus(r) !== 'error').length
        const canImport = selectedCount > 0

        const SEL_CLS = 'w-full text-[10px] p-1 border rounded bg-white'
        const SEL_ERR = `${SEL_CLS} border-red-400 bg-red-50`
        const SEL_CHG = `${SEL_CLS} border-amber-400 bg-amber-50 text-amber-800 font-semibold`
        const SEL_DB  = `${SEL_CLS} border-amber-300 bg-amber-50/40 text-slate-700`
        const SEL_OK  = `${SEL_CLS} border-slate-200`

        const cellStatus = (row, field) => {
          const f = getFinal(row)
          const val = f[field]
          if (!val && val !== 0) return 'error'
          if (field === 'classificacao' && !CLASSIFICACOES_OPTS.includes(val)) return 'error'
          if (field === 'tipo_interno' && !TIPOS_INTERNO_OPTS.includes(val)) return 'error'
          if (field === 'setor_servico' && !setores.some(s => s.nome_setor === val)) return 'error'
          if (field === 'tipo_setor_servico' && val && !boxes.some(b => b.nome_box === val)) return 'error'
          // Campo em branco no Excel, preenchido pelo banco
          if (!row.overrides[field] && row.blankFields?.has(field)) return 'db_filled'
          if (row.existingRecord && String(val) !== String(row.existingRecord[field] ?? '')) return 'changed'
          return 'ok'
        }

        const renderSelect = (row, idx, field, opts, valKey, labelKey) => {
          const f = getFinal(row)
          const st = cellStatus(row, field)
          const rawNameField = field === 'agrupamento_empresa_id' ? 'agrupamento_nome'
            : field === 'departamento_id' ? 'departamento_nome' : field
          const rawVal = row.rawValues?.[rawNameField] || ''
          const currentVal = f[field] || ''
          const isInOpts = opts.some(o => (valKey ? o[valKey] : o) === currentVal)
          const selCls = st === 'error' ? SEL_ERR : st === 'changed' ? SEL_CHG : st === 'db_filled' ? SEL_DB : SEL_OK
          return (
            <div>
              <select value={isInOpts ? currentVal : ''} onChange={e => updateOverride(idx, field, e.target.value)}
                className={selCls}>
                <option value="">Selecione...</option>
                {opts.map(o => <option key={valKey ? o[valKey] : o} value={valKey ? o[valKey] : o}>{labelKey ? o[labelKey] : o}</option>)}
              </select>
              {st === 'error' && rawVal && !isInOpts && (
                <div className="text-[9px] text-red-500 truncate mt-0.5" title={`Excel: "${rawVal}"`}>
                  Excel: &quot;{rawVal}&quot;
                </div>
              )}
              {st === 'db_filled' && (
                <div className="text-[9px] text-amber-600 mt-0.5 flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Excel em branco — valor do banco
                </div>
              )}
            </div>
          )
        }

        const renderText = (row, idx, field) => {
          const f = getFinal(row)
          const st = cellStatus(row, field)
          const isDbFilled = st === 'db_filled'
          return (
            <div>
              <input type="text" value={f[field] || ''} onChange={e => updateOverride(idx, field, e.target.value.toUpperCase())}
                className={`w-full text-[10px] p-1 border rounded font-mono ${
                  st === 'error' ? 'border-red-400 bg-red-50'
                  : st === 'changed' ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : isDbFilled ? 'border-amber-300 bg-amber-50/40'
                  : 'border-slate-200'}`} />
              {isDbFilled && (
                <div className="text-[9px] text-amber-600 mt-0.5 flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Excel em branco — valor do banco
                </div>
              )}
            </div>
          )
        }

        const renderNum = (row, idx) => {
          const f = getFinal(row)
          const st = cellStatus(row, 'codigo')
          const dbTipoOs = row.existingRecord?.tipo_os
          return (
            <div>
              <input type="number" value={f.codigo || ''} onChange={e => updateOverride(idx, 'codigo', parseInt(e.target.value) || '')}
                className={`w-16 text-[10px] p-1 border rounded font-mono ${st === 'error' ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
              {dbTipoOs && (
                <div className="text-[8px] text-slate-400 mt-0.5 truncate max-w-[64px]" title={`Banco: ${dbTipoOs}`}>
                  DB: {dbTipoOs}
                </div>
              )}
            </div>
          )
        }

        const statusBadge = (status, row) => {
          const map = {
            new:    'bg-blue-50 text-blue-700 border-blue-200',
            update: 'bg-amber-50 text-amber-700 border-amber-200',
            same:   'bg-slate-100 text-slate-500 border-slate-200',
            error:  'bg-red-50 text-red-700 border-red-200',
          }
          const labels = { new: 'Novo', update: 'Atualizar', same: 'Igual', error: 'Erro' }
          const changed = status === 'update' && row ? getChangedFields(row) : []
          const tip = changed.length > 0 ? `Campos alterados: ${changed.join(', ')}` : undefined
          return (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap cursor-default ${map[status]}`} title={tip}>
              {labels[status]}
              {changed.length > 0 && <span className="ml-1 opacity-60">({changed.length})</span>}
            </span>
          )
        }

        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[96vw] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Importar Tipos de O.S. via Excel
                </h3>
                <button onClick={() => { setModalImportAberto(false); setImportRows([]); setImportSelected(new Set()); setImportFilter([]); setImportAdvFilters({ classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' }) }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Barra de resumo — counts informativos + filtros avançados */}
              <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 shrink-0">
                <button
                  onClick={() => setImportAdvOpen(p => !p)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold transition-all select-none shrink-0
                    ${importAdvOpen || advActive
                      ? 'bg-violet-50 text-violet-700 border-violet-300' + (advActive ? ' ring-2 ring-offset-1 ring-violet-400' : '')
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}>
                  <svg className={`h-3 w-3 transition-transform ${importAdvOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Filtros avançados
                  {advActive && <span className="bg-violet-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{Object.values(importAdvFilters).filter(Boolean).length}</span>}
                </button>
                <span className="ml-auto text-[11px] shrink-0">
                  {selectedCount > 0
                    ? <span className="text-emerald-600 font-bold">{selectedCount} selecionado(s)</span>
                    : <span className="text-slate-400">Selecione as linhas para importar</span>}
                </span>
              </div>

              {/* Filtros avançados retrátil */}
              {importAdvOpen && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-violet-50/60 border-b border-violet-100 shrink-0">
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider shrink-0">Filtrar por:</span>

                  {[
                    ['classificacao',      'Classificação',   advOpts.classificacao],
                    ['tipo_interno',       'Tipo OS',         advOpts.tipo_interno],
                    ['setor_servico',      'Setor de Serviço',advOpts.setor_servico],
                    ['tipo_setor_servico', 'Box',             advOpts.tipo_setor_servico],
                  ].map(([field, label, opts]) => (
                    <div key={field} className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">{label}</label>
                      <select
                        value={importAdvFilters[field]}
                        onChange={e => setAdv(field, e.target.value)}
                        className={`text-[10px] p-1 pr-5 border rounded bg-white min-w-[130px] max-w-[180px]
                          ${importAdvFilters[field]
                            ? 'border-violet-400 text-violet-800 font-semibold bg-violet-50'
                            : 'border-slate-200 text-slate-600'}`}>
                        <option value="">Todos</option>
                        {opts.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {advActive && (
                    <button onClick={clearAdv}
                      className="self-end text-[10px] text-violet-500 hover:text-violet-700 underline font-semibold pb-1">
                      Limpar filtros
                    </button>
                  )}

                  <div className="self-end ml-auto text-[10px] text-violet-500 pb-1 shrink-0">
                    {visibleRows.length} de {importRows.length} registro(s) visíveis
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse" style={{ minWidth: '1460px' }}>
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 w-10 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <input type="checkbox"
                            checked={allVisibleSelected}
                            ref={el => { if (el) el.indeterminate = someVisibleSelected }}
                            onChange={toggleSelectAll}
                            className="cursor-pointer accent-emerald-600" />
                          <span className="text-[8px] normal-case text-slate-400 leading-none">
                            {allVisibleSelected ? 'Limpar' : 'Todos'}
                          </span>
                        </div>
                      </th>
                      <th className="px-2 py-2 w-20">Status</th>
                      <th className="px-2 py-2 w-14">Cód</th>
                      <th className="px-2 py-2 w-64">Tipo de O.S.</th>
                      <th className="px-2 py-2 w-20">Sigla</th>
                      <th className="px-2 py-2 w-44">Agrupamento</th>
                      <th className="px-2 py-2 w-36">Departamento</th>
                      <th className="px-2 py-2 w-32">Classificação</th>
                      <th className="px-2 py-2 w-40">Tipo OS</th>
                      <th className="px-2 py-2 w-36">Setor de Serviço</th>
                      <th className="px-2 py-2 w-36">Box</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.map((row) => {
                      const status = getRowStatus(row)
                      const isError = status === 'error'
                      const isChecked = importSelected.has(row._key)
                      const realIdx = importRows.indexOf(row)
                      return (
                        <tr key={row._key}
                          onClick={() => !isError && toggleRow(row._key)}
                          className={`cursor-pointer transition-colors
                            ${isChecked ? 'bg-emerald-50/70' : isError ? 'bg-red-50/30' : status === 'same' ? 'opacity-60' : ''}
                            hover:brightness-[0.97]`}>
                          <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isChecked} disabled={isError}
                              onChange={() => !isError && toggleRow(row._key)}
                              className="cursor-pointer accent-emerald-600 disabled:opacity-30" />
                          </td>
                          <td className="px-2 py-1.5">{statusBadge(status, row)}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderNum(row, realIdx)}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderText(row, realIdx, 'tipo_os')}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderText(row, realIdx, 'sigla')}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderSelect(row, realIdx, 'agrupamento_empresa_id', agrupamentos, 'id', 'nome_agrupamento')}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderSelect(row, realIdx, 'departamento_id', departamentos, 'id', 'nome_departamento')}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderSelect(row, realIdx, 'classificacao', CLASSIFICACOES_OPTS, null, null)}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderSelect(row, realIdx, 'tipo_interno', TIPOS_INTERNO_OPTS, null, null)}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderSelect(row, realIdx, 'setor_servico', setores.map(s => s.nome_setor), null, null)}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>{renderSelect(row, realIdx, 'tipo_setor_servico', boxes.map(b => b.nome_box), null, null)}</td>
                        </tr>
                      )
                    })}
                    {visibleRows.length === 0 && (
                      <tr><td colSpan={11} className="px-4 py-6 text-center text-[11px] text-slate-400">Nenhum registro com este filtro.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <p className="text-[11px] text-slate-500">
                  {selectedCount === 0
                    ? 'Clique em uma linha ou use o checkbox para selecionar. Linhas com erro não podem ser importadas.'
                    : `${selectedCount} registro(s) selecionado(s) serão processados.`}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setModalImportAberto(false); setImportRows([]); setImportSelected(new Set()); setImportFilter([]); setImportAdvFilters({ classificacao: '', tipo_interno: '', setor_servico: '', tipo_setor_servico: '' }) }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleDoImport} disabled={!canImport || importLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors">
                    {importLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {importLoading ? 'Importando...' : `Importar / Atualizar (${selectedCount})`}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
      })()}

    </div>
  )
}
