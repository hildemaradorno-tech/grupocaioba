import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, Trash2, Edit2, X, AlertTriangle, ChevronRight, ChevronDown, Target, Loader2, CheckCircle2, Sparkles, Pencil, ClipboardCheck, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Helpers de agregação — retornam array[12] (jan=0 … dez=11)
function aggColabs(colabsMap) {
  const a = Array(12).fill(0)
  Object.values(colabsMap).forEach(c =>
    Object.entries(c.meses).forEach(([m, d]) => { a[+m - 1] += Number(d.meta_faturamento) || 0 })
  )
  return a
}
function aggBox(box)      { const a = Array(12).fill(0); Object.values(box.colabs).forEach(c => aggColabs({ x: c }).forEach((v,i) => { a[i]+=v })); return a }
function aggSetor(setor)  { const a = Array(12).fill(0); Object.values(setor.boxes).forEach(b => aggBox(b).forEach((v,i)   => { a[i]+=v })); return a }
function aggDept(dept)    { const a = Array(12).fill(0); Object.values(dept.setores).forEach(s => aggSetor(s).forEach((v,i)=> { a[i]+=v })); return a }
function aggEmp(emp)      { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d   => aggDept(d).forEach((v,i)  => { a[i]+=v })); return a }
function aggTree(tree)    { const a = Array(12).fill(0); Object.values(tree).forEach(e        => aggEmp(e).forEach((v,i)   => { a[i]+=v })); return a }
function sumArr(arr)      { return arr.reduce((s, v) => s + v, 0) }

// Estado de uma célula em relação à aprovação
// 'new'     → valor existe mas nunca foi aprovado (meta_aprovada === null)
// 'changed' → valor difere do aprovado
// 'ok'      → igual ao aprovado (ou zero sem aprovação)
function cellState(meta_faturamento, meta_aprovada) {
  const cur = Number(meta_faturamento) || 0
  if (cur === 0) return 'ok'
  if (meta_aprovada === null || meta_aprovada === undefined) return 'new'
  if (Math.abs(cur - Number(meta_aprovada)) > 0.001) return 'changed'
  return 'ok'
}

// Conta células pendentes (new ou changed) em toda a sub-árvore de uma empresa
function pendingCountEmp(emp) {
  let n = 0
  Object.values(emp.depts).forEach(d =>
    Object.values(d.setores).forEach(st =>
      Object.values(st.boxes).forEach(bx =>
        Object.values(bx.colabs).forEach(co =>
          Object.values(co.meses).forEach(m => {
            if (cellState(m.meta_faturamento, m.meta_aprovada) !== 'ok') n++
          })
        )
      )
    )
  )
  return n
}

const fmtBRL = (v) => {
  const n = Number(v)
  if (!v && v !== 0) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const calcMedia = (meta, dias) => {
  const m = Number(meta), d = Number(dias)
  return (m > 0 && d > 0) ? m / d : 0
}

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const SEL = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const BTN_DNG = 'inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'

const STATUS_CLS = {
  'AGUARDANDO APROVACAO': 'bg-amber-100 text-amber-700',
  'APROVADO':             'bg-green-100 text-green-700',
  'REPROVADO':            'bg-red-100 text-red-700',
}
const STATUS_DISPLAY = { 'AGUARDANDO APROVACAO': 'Aguard. Aprovação', 'APROVADO': 'Aprovado', 'REPROVADO': 'Reprovado' }

const FORM_VAZIO = {
  empresa_id: '', empresa_nome: '',
  departamento_id: '', departamento_nome: '',
  setor_id: '', setor_nome: '',
  box_id: '', box_nome: '',
  cargo_id: '', cargo_nome: '',
  colaborador_id: '', colaborador_nome: '',
  data_admissao: '',
  ano: anoAtual,
  status: 'AGUARDANDO APROVACAO',
}

const mesesVazios = () =>
  Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, meta_faturamento: '', dias_uteis_reais: '' }))

// Converte string pt-BR para número (aceita "999.999,99" ou "999999.99")
function parseBRL(str) {
  if (!str && str !== 0) return 0
  const s = String(str).trim()
  // se tem vírgula, trata como separador decimal pt-BR
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(s) || 0
}

// Formata número para exibição pt-BR durante edição (sem símbolo R$)
function formatBRL(n) {
  const num = Number(n)
  if (!num && num !== 0) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Input de valor R$ com máscara pt-BR — edita como texto, salva como número
function MetaInput({ value, onChange, className = '' }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  const displayed = focused ? raw : (value || value === 0 ? formatBRL(value) : '')

  const handleFocus = () => {
    setRaw(value || value === 0 ? String(value).replace('.', ',') : '')
    setFocused(true)
  }
  const handleChange = (e) => setRaw(e.target.value)
  const handleBlur = () => {
    setFocused(false)
    onChange(parseBRL(raw))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayed}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="0"
      className={`w-full text-xs text-right outline-none bg-transparent text-slate-800 ${className}`}
    />
  )
}

// Formata dias com 1 casa decimal pt-BR (ex: 24,0)
function formatDias(v) {
  const n = Number(v)
  if (!n && n !== 0) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Input de Dias Úteis com 1 casa decimal pt-BR (para uso no modal)
function DiasInput({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const displayed = focused ? raw : (value || value === 0 ? formatDias(value) : '')
  const handleFocus = () => { setRaw(value != null ? String(value).replace('.', ',') : ''); setFocused(true) }
  const handleBlur = () => { setFocused(false); onChange(parseFloat(String(raw).replace(',', '.')) || 0) }
  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="0,0"
      className="w-full text-xs text-center outline-none bg-transparent text-slate-600"
    />
  )
}

// Célula inline editável (Dias Úteis — 1 casa decimal)
function CellInput({ rowId, field, value, align = 'right', onSave }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  useEffect(() => { if (!focused) setRaw('') }, [value, focused])

  const displayed = focused ? raw : (value || value === 0 ? formatDias(value) : '')
  const handleFocus = () => { setRaw(value != null ? String(value).replace('.', ',') : ''); setFocused(true) }
  const handleBlur = () => { setFocused(false); onSave(rowId, field, parseFloat(String(raw).replace(',', '.')) || 0) }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="0,0"
      className={`w-full text-xs border-0 outline-none bg-transparent text-slate-800 ${align === 'right' ? 'text-right' : 'text-center'}`}
    />
  )
}

// Célula Meta R$ inline editável com máscara pt-BR + indicador de estado
function MetaCellInput({ rowId, value, onSave, estado }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  useEffect(() => { if (!focused) setRaw('') }, [value, focused])

  const displayed = focused ? raw : (value ? formatBRL(value) : '')
  const handleFocus = () => { setRaw(value ? String(value).replace('.', ',') : ''); setFocused(true) }
  const handleBlur = () => { setFocused(false); onSave(rowId, 'meta_faturamento', parseBRL(raw)) }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={displayed}
        onChange={e => setRaw(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="0"
        className="w-full text-xs text-right border-0 outline-none bg-transparent text-slate-800"
      />
      {estado === 'new' && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white" title="Novo valor">
          <Sparkles size={8} />
        </span>
      )}
      {estado === 'changed' && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-white" title="Valor alterado">
          <Pencil size={8} />
        </span>
      )}
    </div>
  )
}

export default function MetasPecas() {
  const navigate = useNavigate()
  const [empresas,     setEmpresas]     = useState([])
  const [departamentos,setDepartamentos]= useState([])
  const [setores,      setSetores]      = useState([])
  const [boxes,        setBoxes]        = useState([])
  const [cargos,       setCargos]       = useState([])
  const [funcionarios, setFuncionarios] = useState([])

  const [dados,   setDados]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/pos-vendas/pecas', 'editar')

  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('mp_empresa', '')
  const [filtroAno,     setFiltroAno]     = useSessionState('mp_ano', anoAtual)

  const [grupoAberto,      setGrupoAberto]      = useState(true)
  const [expandedEmpresas, setExpandedEmpresas] = useState(new Set())
  const [expandedDepts,    setExpandedDepts]    = useState(new Set())
  const [expandedSetores,  setExpandedSetores]  = useState(new Set())
  const [expandedBoxes,    setExpandedBoxes]    = useState(new Set())

  // Modal
  const [modalAberto,       setModalAberto]       = useState(false)
  const [modoModal,         setModoModal]         = useState('incluir')
  const [modalExcluirAberto,setModalExcluirAberto]= useState(false)
  const [form,              setForm]              = useState(FORM_VAZIO)
  const [mesesForm,         setMesesForm]         = useState(mesesVazios())
  const [colabExcluir,      setColabExcluir]      = useState(null)
  const [carregandoDias,    setCarregandoDias]    = useState(false)
  const [salvando,          setSalvando]          = useState(false)
  const [erroModal,         setErroModal]         = useState(null)


  useEffect(() => { loadLookups() }, [])
  useEffect(() => { loadDados() }, [filtroEmpresa, filtroAno])

  const sortNome = (arr, field) =>
    [...arr].sort((a, b) => (a[field] || '').localeCompare(b[field] || ''))

  const loadLookups = async () => {
    try {
      const [emps, depts, sets, bxs, cargs, funcs] = await Promise.all([
        apiService.getEmpresas(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getBox(),
        apiService.getCargos(),
        apiService.getFuncionarios(),
      ])
      setEmpresas(sortNome(emps, 'empresa_fantasia'))
      setDepartamentos(sortNome(depts, 'nome_departamento'))
      setSetores(sortNome(sets, 'nome_setor'))
      setBoxes(sortNome(bxs, 'nome_box'))
      setCargos(sortNome(cargs, 'nome_cargo'))
      setFuncionarios(sortNome(funcs, 'nome_funcionario'))
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const loadDados = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await apiService.getMetasPecas(filtroEmpresa || null, filtroAno)
      setDados(rows)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  // Build tree: empresa > departamento > setor > box > cargo > colaborador > meses
  const tree = useMemo(() => {
    const t = {}
    dados.forEach(row => {
      const eid   = row.empresa_id
      const did   = row.departamento_id
      const sId   = row.setor_id   || row.setor_nome   || '—'
      const bId   = row.box_id     || row.box_nome     || '—'
      const cId   = row.cargo_id   || row.cargo_nome   || '—'
      const colid = row.colaborador_id

      const dNome  = departamentos.find(d => d.id === did)?.nome_departamento   || row.departamento_nome || did
      const sNome  = setores.find(s => s.id === row.setor_id)?.nome_setor        || row.setor_nome        || '—'
      const bNome  = boxes.find(b => b.id === row.box_id)?.nome_box              || row.box_nome          || '—'
      const cNome  = cargos.find(c => c.id === row.cargo_id)?.nome_cargo         || row.cargo_nome        || '—'
      const coNome = funcionarios.find(f => f.id === colid)?.nome_funcionario    || row.colaborador_nome  || colid

      if (!t[eid]) t[eid] = { nome: row.empresa_nome || eid, depts: {} }
      const depts = t[eid].depts
      if (!depts[did]) depts[did] = { nome: dNome, setores: {} }
      depts[did].nome = dNome
      const stMap = depts[did].setores
      if (!stMap[sId]) stMap[sId] = { nome: sNome, boxes: {} }
      const bxMap = stMap[sId].boxes
      if (!bxMap[bId]) bxMap[bId] = { nome: bNome, colabs: {} }
      const coMap = bxMap[bId].colabs
      if (!coMap[colid]) coMap[colid] = { nome: coNome, meses: {} }
      coMap[colid].meses[row.mes] = {
        id: row.id,
        meta_faturamento: row.meta_faturamento,
        meta_aprovada: row.meta_aprovada ?? null,
        dias_uteis_reais: row.dias_uteis_reais,
        media_diaria_venda: row.media_diaria_venda,
      }
    })
    return t
  }, [dados, departamentos, setores, boxes, cargos, funcionarios])

  const toggle = (set, setter, key) =>
    setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const tudoExpandido = grupoAberto && Object.keys(tree).length > 0 &&
    Object.keys(tree).every(eid => expandedEmpresas.has(eid))

  const expandirTudo = () => {
    setGrupoAberto(true)
    const emps = new Set(), depts = new Set(), sets = new Set(), bxs = new Set(), cars = new Set()
    Object.entries(tree).forEach(([eid, emp]) => {
      emps.add(eid)
      Object.entries(emp.depts).forEach(([did, dept]) => {
        const dKey = `${eid}§${did}`; depts.add(dKey)
        Object.entries(dept.setores).forEach(([sid, setor]) => {
          const sKey = `${dKey}§${sid}`; sets.add(sKey)
          Object.entries(setor.boxes).forEach(([bid, box]) => {
            const bKey = `${sKey}§${bid}`; bxs.add(bKey)
          })
        })
      })
    })
    setExpandedEmpresas(emps); setExpandedDepts(depts); setExpandedSetores(sets)
    setExpandedBoxes(bxs)
  }

  const recolherTudo = () => {
    setGrupoAberto(false)
    setExpandedEmpresas(new Set()); setExpandedDepts(new Set()); setExpandedSetores(new Set())
    setExpandedBoxes(new Set())
  }

  // Save cell on blur
  const salvarCelula = useCallback(async (rowId, field, newVal) => {
    const row = dados.find(r => r.id === rowId)
    if (!row) return
    const meta = field === 'meta_faturamento' ? Number(newVal) || 0 : Number(row.meta_faturamento) || 0
    const dias  = field === 'dias_uteis_reais' ? Number(newVal) || 0 : Number(row.dias_uteis_reais) || 0
    const media = calcMedia(meta, dias)
    try {
      await apiService.updateMetaPecas(rowId, { meta_faturamento: meta, dias_uteis_reais: dias, media_diaria_venda: media })
      setDados(prev => prev.map(r => r.id === rowId ? { ...r, meta_faturamento: meta, dias_uteis_reais: dias, media_diaria_venda: media } : r))
    } catch (err) {
      setError(err.message || String(err))
    }
  }, [dados])

  // Cascading selects
  const setoresDoDepto = useMemo(() =>
    setores.filter(s => s.departamento_id === form.departamento_id), [setores, form.departamento_id])

  const boxesDoSetor = useMemo(() =>
    boxes.filter(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(form.setor_id)),
    [boxes, form.setor_id])

  const cargosDoDepto = useMemo(() =>
    !form.departamento_id ? cargos : cargos.filter(c => (c.departamento_ids || []).includes(form.departamento_id)),
    [cargos, form.departamento_id])

  const funcsEmp = useMemo(() => {
    let lista = funcionarios
    if (form.empresa_id)      lista = lista.filter(f => f.empresa_id === form.empresa_id)
    if (form.departamento_id) lista = lista.filter(f => Array.isArray(f.departamento_ids) ? f.departamento_ids.includes(form.departamento_id) : f.departamento_id === form.departamento_id)
    if (form.setor_id)        lista = lista.filter(f => Array.isArray(f.setor_ids) ? f.setor_ids.includes(form.setor_id) : f.setor_id === form.setor_id)
    return lista
  }, [funcionarios, form.empresa_id, form.departamento_id, form.setor_id])

  const mesAdmissao = useMemo(() => {
    if (!form.data_admissao) return 0
    const [admAno, admMes] = form.data_admissao.split('-').map(Number)
    if (admAno > Number(form.ano)) return 12
    if (admAno < Number(form.ano)) return 0
    return admMes - 1
  }, [form.data_admissao, form.ano])

  const isMesLocked = (i) => i < mesAdmissao

  const handleFormChange = async (e) => {
    const { name, value } = e.target
    const up = { [name]: value }
    if (name === 'empresa_id') {
      const emp = empresas.find(x => x.id === value)
      up.empresa_nome = emp ? (emp.empresa_fantasia || emp.nome_empresa) : ''
      up.colaborador_id = ''; up.colaborador_nome = ''
    }
    if (name === 'departamento_id') {
      const dep = departamentos.find(x => x.id === value)
      up.departamento_nome = dep?.nome_departamento || ''
      up.setor_id = ''; up.setor_nome = ''; up.box_id = ''; up.box_nome = ''
      up.cargo_id = ''; up.cargo_nome = ''
    }
    if (name === 'setor_id') {
      const s = setores.find(x => x.id === value)
      up.setor_nome = s?.nome_setor || ''
      up.box_id = ''; up.box_nome = ''
      up.colaborador_id = ''; up.colaborador_nome = ''
    }
    if (name === 'box_id') { up.box_nome = boxes.find(x => x.id === value)?.nome_box || '' }
    if (name === 'cargo_id') { up.cargo_nome = cargos.find(x => x.id === value)?.nome_cargo || '' }
    if (name === 'colaborador_id') {
      if (value === 'A_CONTRATAR') {
        up.colaborador_nome = 'A contratar'
        up.data_admissao = ''
      } else {
        const func = funcionarios.find(x => x.id === value)
        up.colaborador_nome = func?.nome_funcionario || ''
        up.data_admissao = func?.data_admissao || ''
        if (func) {
          const deptId = Array.isArray(func.departamento_ids) ? func.departamento_ids[0] : (func.departamento_id || '')
          const setorId = Array.isArray(func.setor_ids) ? func.setor_ids[0] : (func.setor_id || '')
          const dept = departamentos.find(d => d.id === deptId)
          const setor = setores.find(s => s.id === setorId)
          const box = boxes.find(b => b.id === func.box_id)
          const cargo = cargos.find(c => c.id === func.cargo_id)
          up.departamento_id   = deptId
          up.departamento_nome = dept?.nome_departamento || func.departamento_nome || ''
          up.setor_id          = setorId
          up.setor_nome        = setor?.nome_setor || func.setor_nome || ''
          up.box_id            = func.box_id || ''
          up.box_nome          = box?.nome_box || func.box_nome || ''
          up.cargo_id          = func.cargo_id || ''
          up.cargo_nome        = cargo?.nome_cargo || func.cargo_nome || ''
        }
      }
    }

    const newForm = { ...form, ...up }
    setForm(newForm)

    // Carrega dias úteis do calendário quando empresa + ano estão definidos
    const empId = name === 'empresa_id' ? value : newForm.empresa_id
    const ano   = name === 'ano' ? Number(value) : newForm.ano
    if ((name === 'empresa_id' || name === 'ano') && empId && ano) {
      setCarregandoDias(true)
      try {
        const diasMap = await apiService.getDiasUteisPorMes(empId, ano)
        setMesesForm(prev => prev.map(m => ({ ...m, dias_uteis_reais: diasMap[m.mes] != null ? String(diasMap[m.mes]) : '' })))
      } catch { /* non-fatal */ } finally { setCarregandoDias(false) }
    }
  }

  const _abrirModal = (empId, colabId, modo) => {
    const rows = dados.filter(r =>
      String(r.colaborador_id) === String(colabId) &&
      String(r.empresa_id) === String(empId) &&
      Number(r.ano) === Number(filtroAno)
    )
    if (!rows.length) return
    const r0 = rows[0]
    const func = funcionarios.find(f => f.id === colabId) || funcionarios.find(f => f.nome_funcionario === r0.colaborador_nome)
    setForm({
      ...FORM_VAZIO,
      empresa_id:       r0.empresa_id,
      empresa_nome:     r0.empresa_nome || '',
      departamento_id:  r0.departamento_id  || '',
      departamento_nome:r0.departamento_nome || '',
      setor_id:         r0.setor_id         || '',
      setor_nome:       r0.setor_nome        || '',
      box_id:           r0.box_id            || '',
      box_nome:         r0.box_nome          || '',
      cargo_id:         r0.cargo_id          || '',
      cargo_nome:       r0.cargo_nome        || '',
      colaborador_id:   colabId,
      colaborador_nome: r0.colaborador_nome  || '',
      data_admissao:    func?.data_admissao  || '',
      ano:              filtroAno,
    })
    setMesesForm(Array.from({ length: 12 }, (_, i) => {
      const row = rows.find(r => Number(r.mes) === i + 1)
      return { mes: i + 1, meta_faturamento: row?.meta_faturamento ?? '', dias_uteis_reais: row?.dias_uteis_reais ?? '' }
    }))
    setErroModal(null)
    setModoModal(modo)
    setModalAberto(true)
  }

  const abrirVisualizar = (empId, colabId) => _abrirModal(empId, colabId, 'visualizar')
  const abrirEditar     = (empId, colabId) => _abrirModal(empId, colabId, 'editar')

  const abrirIncluir = () => {
    setModoModal('incluir')
    const emp = empresas.find(e => e.id === filtroEmpresa)
    const deptPecas = departamentos.find(d => d.nome_departamento.toLowerCase().includes('bal') && d.nome_departamento.toLowerCase().includes('pe'))
      || departamentos.find(d => d.nome_departamento.toLowerCase().includes('pe'))
    setForm({
      ...FORM_VAZIO,
      ano: filtroAno,
      empresa_id: filtroEmpresa,
      empresa_nome: emp ? (emp.empresa_fantasia || emp.nome_empresa) : '',
      departamento_id: deptPecas?.id || '',
      departamento_nome: deptPecas?.nome_departamento || '',
    })
    setMesesForm(mesesVazios())
    setErroModal(null)
    setModalAberto(true)
    if (filtroEmpresa && filtroAno) {
      setCarregandoDias(true)
      apiService.getDiasUteisPorMes(filtroEmpresa, filtroAno)
        .then(diasMap => setMesesForm(prev => prev.map(m => ({ ...m, dias_uteis_reais: String(diasMap[m.mes] || '') }))))
        .catch(() => {})
        .finally(() => setCarregandoDias(false))
    }
  }

  const handleSalvarModal = async () => {
    if (!form.empresa_id)      { setErroModal('Selecione a Empresa.'); return }
    if (!form.departamento_id) { setErroModal('Selecione o Departamento.'); return }
    if (!form.colaborador_id)  { setErroModal('Selecione o Colaborador.'); return }
    setSalvando(true); setErroModal(null)
    try {
      const { data_admissao: _da, ...formPayload } = form
      for (const m of mesesForm) {
        if (isMesLocked(m.mes - 1)) continue
        const meta  = Number(m.meta_faturamento) || 0
        const dias  = Number(m.dias_uteis_reais) || 0
        await apiService.upsertMetaPecas({
          ...formPayload,
          colaborador_id: form.colaborador_id === 'A_CONTRATAR' ? '00000000-0000-0000-0000-000000000000' : form.colaborador_id,
          mes: m.mes, ano: Number(form.ano),
          meta_faturamento: meta, dias_uteis_reais: dias,
          media_diaria_venda: calcMedia(meta, dias),
        })
      }
      setModalAberto(false)
      await loadDados()
    } catch (err) { setErroModal(err.message || String(err))
    } finally { setSalvando(false) }
  }

  const handleExcluirColab = async () => {
    try {
      await apiService.deleteMetasPecasColab(colabExcluir.colaborador_id, colabExcluir.empresa_id, filtroAno)
      setModalExcluirAberto(false)
      await loadDados()
    } catch (err) {
      setError(err.message || String(err))
      setModalExcluirAberto(false)
    }
  }

  const totalColabs = useMemo(() =>
    Object.values(tree).reduce((s, emp) =>
      s + Object.values(emp.depts).reduce((sd, d) =>
        sd + Object.values(d.setores).reduce((ss, st) =>
          ss + Object.values(st.boxes).reduce((sb, bx) =>
            sb + Object.keys(bx.colabs).length, 0), 0), 0), 0),
    [tree])

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Metas - Peças</h1>
            <p className="text-xs text-slate-400">Pós-Vendas · Rascunho editável antes da aprovação</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
            <ClipboardCheck size={16} /> Gestão de Aprovação
          </button>
          {canEdit && (
            <button onClick={abrirIncluir} className={BTN_PRI}>
              <Plus size={16} /> Adicionar Colaborador
            </button>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex-1 max-w-xs">
          <label className={LBL}>Empresa</label>
          <select className={SEL} value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
          </select>
        </div>
        <div className="w-28">
          <label className={LBL}>Ano</label>
          <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="ml-auto self-end text-sm text-slate-500">
          {Object.keys(tree).length} empresa(s) · {totalColabs} colaborador(es)
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {/* TREE TABLE */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="text-xs border-separate border-spacing-0" style={{ minWidth: '1700px' }}>
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 w-60 sticky left-0 bg-slate-50 z-10">
                  <div className="flex items-center gap-2">
                    <span>Colaborador / Nível</span>
                    {Object.keys(tree).length > 0 && (
                      <button
                        onClick={tudoExpandido ? recolherTudo : expandirTudo}
                        title={tudoExpandido ? 'Recolher tudo' : 'Expandir tudo'}
                        className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 text-slate-500 transition-colors whitespace-nowrap"
                      >
                        {tudoExpandido ? '− Recolher' : '+ Expandir'}
                      </button>
                    )}
                  </div>
                </th>
                {MESES_ABR.map(m => (
                  <th key={m} className="px-1 py-2.5 text-center font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 w-24">{m}</th>
                ))}
                <th className="px-2 py-2.5 text-center font-semibold text-indigo-700 uppercase tracking-wide border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 w-36" colSpan="2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="16" className="text-center py-16 text-slate-400">
                  <div className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" />Carregando...</div>
                </td></tr>
              ) : Object.keys(tree).length === 0 ? (
                <tr><td colSpan="16" className="text-center py-16 text-slate-400">
                  Nenhuma meta cadastrada. Clique em "Adicionar Colaborador" para começar.
                </td></tr>
              ) : (() => {
                const grupoMeses = aggTree(tree)
                const grupoTotal = sumArr(grupoMeses)
                return (
                  <>
                    {/* ── GRUPO CAIOBÁ ── */}
                    <tr className="cursor-pointer bg-blue-950 hover:bg-blue-900 transition-colors sticky top-[41px] z-10"
                        onClick={() => setGrupoAberto(v => !v)}>
                      <td className="px-3 py-2.5 text-white font-bold text-sm sticky left-0 bg-blue-950 z-10 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {grupoAberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          🏢 Grupo Caiobá
                        </div>
                      </td>
                      {grupoMeses.map((v, i) => (
                        <td key={i} className="px-1 py-2.5 text-right text-xs font-bold text-blue-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>
                      ))}
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-amber-300 bg-blue-900 whitespace-nowrap">{grupoTotal > 0 ? fmtBRL(grupoTotal) : '—'}</td>
                      <td />
                    </tr>

                    {grupoAberto && Object.entries(tree).map(([empId, emp]) => {
                      const empMeses = aggEmp(emp)
                      const empTotal = sumArr(empMeses)
                      return (
                        <React.Fragment key={empId}>
                          {/* ── EMPRESA ── */}
                          <tr className="cursor-pointer bg-indigo-700 hover:bg-indigo-600 transition-colors"
                              onClick={() => toggle(expandedEmpresas, setExpandedEmpresas, empId)}>
                            <td className="px-3 py-2 text-white font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-4">
                                {expandedEmpresas.has(empId) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {emp.nome}
                              </div>
                            </td>
                            {empMeses.map((v, i) => (
                              <td key={i} className="px-1 py-2 text-right text-xs font-semibold text-indigo-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>
                            ))}
                            <td className="px-2 py-2 text-right text-xs font-bold text-amber-300 bg-indigo-800 whitespace-nowrap">{empTotal > 0 ? fmtBRL(empTotal) : '—'}</td>
                            <td />
                          </tr>

                          {expandedEmpresas.has(empId) && Object.entries(emp.depts).map(([deptId, dept]) => {
                            const deptKey = `${empId}§${deptId}`
                            const deptMeses = aggDept(dept)
                            const deptTotal = sumArr(deptMeses)
                            return (
                              <React.Fragment key={deptId}>
                                {/* ── DEPARTAMENTO ── */}
                                <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors"
                                    onClick={() => toggle(expandedDepts, setExpandedDepts, deptKey)}>
                                  <td className="px-3 py-1.5 text-slate-800 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap">
                                    <div className="flex items-center gap-2 pl-8">
                                      {expandedDepts.has(deptKey) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                      <span className="text-slate-500 font-normal mr-0.5">Departamento:</span>
                                      <span className="font-bold">{dept.nome}</span>
                                    </div>
                                  </td>
                                  {deptMeses.map((v, i) => (
                                    <td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>
                                  ))}
                                  <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{deptTotal > 0 ? fmtBRL(deptTotal) : '—'}</td>
                                  <td />
                                </tr>

                                {expandedDepts.has(deptKey) && Object.entries(dept.setores).map(([sId, setor]) => {
                                  const setKey = `${deptKey}§${sId}`
                                  const setMeses = aggSetor(setor)
                                  const setTotal = sumArr(setMeses)
                                  return (
                                    <React.Fragment key={sId}>
                                      {/* ── SETOR ── */}
                                      <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
                                          onClick={() => toggle(expandedSetores, setExpandedSetores, setKey)}>
                                        <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap">
                                          <div className="flex items-center gap-2 pl-12">
                                            {expandedSetores.has(setKey) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                            <span className="text-slate-400 mr-0.5">Setor:</span>
                                            <span className="font-semibold text-slate-700">{setor.nome}</span>
                                          </div>
                                        </td>
                                        {setMeses.map((v, i) => (
                                          <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-600 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>
                                        ))}
                                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{setTotal > 0 ? fmtBRL(setTotal) : '—'}</td>
                                        <td />
                                      </tr>

                                      {expandedSetores.has(setKey) && Object.entries(setor.boxes).map(([bId, box]) => {
                                        const boxKey = `${setKey}§${bId}`
                                        const boxMeses = aggBox(box)
                                        const boxTotal = sumArr(boxMeses)
                                        return (
                                          <React.Fragment key={bId}>
                                            {/* ── BOX ── */}
                                            <tr className="cursor-pointer bg-white hover:bg-amber-50/30 transition-colors border-b border-slate-100"
                                                onClick={() => toggle(expandedBoxes, setExpandedBoxes, boxKey)}>
                                              <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                                                <div className="flex items-center gap-2 pl-16">
                                                  {expandedBoxes.has(boxKey) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                                  <span className="text-slate-400 mr-0.5">Box:</span>
                                                  <span className="font-semibold text-slate-600">{box.nome}</span>
                                                </div>
                                              </td>
                                              {boxMeses.map((v, i) => (
                                                <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-500 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>
                                              ))}
                                              <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{boxTotal > 0 ? fmtBRL(boxTotal) : '—'}</td>
                                              <td />
                                            </tr>

                                            {expandedBoxes.has(boxKey) && Object.entries(box.colabs).map(([colabId, colab]) => {
                                              const colMeses = aggColabs({ [colabId]: colab })
                                              const colTotal = sumArr(colMeses)
                                              return (
                                                <tr key={colabId} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                                                    <div
                                                      className="pl-20 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap cursor-pointer select-none"
                                                      onClick={() => abrirVisualizar(empId, colabId)}
                                                    >{colab.nome}</div>
                                                  </td>
                                                  {Array.from({ length: 12 }, (_, i) => {
                                                    const md = colab.meses[i + 1]
                                                    const estado = md ? cellState(md.meta_faturamento, md.meta_aprovada) : 'ok'
                                                    return (
                                                      <td key={i} className={`p-1 border-l border-slate-100 relative ${md ? '' : 'bg-slate-50'}`}>
                                                        {md
                                                          ? <MetaCellInput rowId={md.id} value={md.meta_faturamento} onSave={salvarCelula} estado={estado} />
                                                          : <span className="flex justify-center text-slate-300">—</span>}
                                                      </td>
                                                    )
                                                  })}
                                                  <td className="px-2 py-2 text-right text-xs font-bold text-indigo-700 bg-indigo-50 border-l border-indigo-100 whitespace-nowrap">
                                                    {colTotal > 0 ? fmtBRL(colTotal) : '—'}
                                                  </td>
                                                  <td className="px-2 py-2 text-center whitespace-nowrap" colSpan="2">
                                                    {(() => {
                                                      const mesesComValor = Object.values(colab.meses).filter(m => Number(m.meta_faturamento) > 0)
                                                      const aprovado = mesesComValor.length > 0 && mesesComValor.every(m => cellState(m.meta_faturamento, m.meta_aprovada) === 'ok')
                                                      const label = aprovado ? 'APROVADO' : 'AGUARDANDO APROVACAO'
                                                      return (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[label] || 'bg-slate-100 text-slate-500'}`}>
                                                          {STATUS_DISPLAY[label] || label}
                                                        </span>
                                                      )
                                                    })()}
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </React.Fragment>
                                        )
                                      })}
                                    </React.Fragment>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ADICIONAR COLABORADOR ── */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{modoModal === 'visualizar' ? 'Visualizar Colaborador — Metas Peças' : modoModal === 'editar' ? 'Editar Colaborador — Metas Peças' : 'Adicionar Colaborador — Metas Peças'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="overflow-auto flex-1 p-6 space-y-4">
              {/* Empresa + Ano */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className={LBL}>Empresa *</label>
                  <select name="empresa_id" className={SEL} value={form.empresa_id} onChange={handleFormChange} disabled={modoModal !== 'incluir'}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Ano *</label>
                  <select name="ano" className={SEL} value={form.ano} onChange={handleFormChange}>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Departamento + Setor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Departamento</label>
                  <select name="departamento_id" className={SEL} value={form.departamento_id} onChange={handleFormChange} disabled>
                    <option value="">Selecione...</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome_departamento}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Setor</label>
                  <select name="setor_id" className={SEL} value={form.setor_id} onChange={handleFormChange}
                          disabled={!form.departamento_id}>
                    <option value="">Selecione...</option>
                    {setoresDoDepto.map(s => <option key={s.id} value={s.id}>{s.nome_setor}</option>)}
                  </select>
                </div>
              </div>

              {/* Box (condicional) + Cargo */}
              <div className="grid grid-cols-2 gap-4">
                <div className={!form.setor_id ? 'opacity-40 pointer-events-none' : ''}>
                  <label className={LBL}>Box {!form.setor_id && <span className="font-normal text-slate-400">(selecione o setor)</span>}</label>
                  <select name="box_id" className={SEL} value={form.box_id} onChange={handleFormChange}
                          disabled={!form.setor_id}>
                    <option value="">Nenhum</option>
                    {boxesDoSetor.map(b => <option key={b.id} value={b.id}>{b.nome_box}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Cargo</label>
                  <select name="cargo_id" className={SEL} value={form.cargo_id} onChange={handleFormChange}
                          disabled={!form.departamento_id}>
                    <option value="">Selecione...</option>
                    {cargosDoDepto.map(c => <option key={c.id} value={c.id}>{c.nome_cargo}</option>)}
                  </select>
                </div>
              </div>

              {/* Colaborador + Data Admissão */}
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="col-span-2">
                  <label className={LBL}>Colaborador *</label>
                  <select name="colaborador_id" className={SEL} value={form.colaborador_id} onChange={handleFormChange}
                          disabled={!form.empresa_id || modoModal !== 'incluir'}>
                    <option value="">Selecione...</option>
                    <option value="A_CONTRATAR">A contratar</option>
                    {funcsEmp.map(f => <option key={f.id} value={f.id}>{f.nome_funcionario}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Data Admissão</label>
                  <div className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 ${form.data_admissao ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                    {form.data_admissao
                      ? (() => { const [y,m,d] = form.data_admissao.split('-'); return `${d}/${m}/${y}` })()
                      : 'Selecione o colaborador'}
                  </div>
                </div>
              </div>

              {/* Grade 12 meses */}
              {!form.colaborador_id ? (
                <div className="flex items-center justify-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                  Selecione um colaborador para habilitar o preenchimento de metas
                </div>
              ) : <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Metas por Mês</span>
                  {carregandoDias && (
                    <span className="flex items-center gap-1 text-xs text-indigo-600">
                      <Loader2 size={12} className="animate-spin" /> Carregando dias úteis do calendário...
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="border-separate border-spacing-1 p-1" style={{ minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th className="w-24 text-left text-xs text-slate-500 font-semibold px-1">Campo</th>
                        {MESES_ABR.map((m, i) => (
                          <th key={i} className="w-24 text-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1 py-1">
                            {m}
                          </th>
                        ))}
                        <th className="w-28 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-1">Total Ano</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Meta */}
                      <tr>
                        <td className="text-xs font-semibold text-slate-500 px-1">Meta R$</td>
                        {mesesForm.map((m, i) => (
                          isMesLocked(i)
                            ? <td key={i} className="bg-slate-100 border border-slate-200 rounded p-1 text-right text-xs text-slate-400 select-none px-2">—</td>
                            : modoModal === 'visualizar'
                              ? <td key={i} className="bg-slate-100 border border-slate-200 rounded p-1 text-right text-xs text-slate-600 font-mono select-none px-2">
                                  {parseBRL(m.meta_faturamento) > 0 ? formatBRL(m.meta_faturamento) : '—'}
                                </td>
                              : <td key={i} className="bg-white border border-slate-200 rounded p-1">
                                  <MetaInput
                                    value={m.meta_faturamento}
                                    onChange={val => setMesesForm(prev => prev.map((x, xi) => xi === i ? { ...x, meta_faturamento: val } : x))}
                                  />
                                </td>
                        ))}
                        <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-700 font-mono">
                          {formatBRL(mesesForm.reduce((s, m) => s + (parseBRL(m.meta_faturamento) || 0), 0))}
                        </td>
                      </tr>
                      {/* Dias */}
                      <tr>
                        <td className="text-xs font-semibold text-slate-500 px-1">Dias Úteis</td>
                        {mesesForm.map((m, i) => (
                          isMesLocked(i)
                            ? <td key={i} className="bg-slate-100 border border-slate-200 rounded p-1 text-center text-xs text-slate-400 select-none">—</td>
                            : modoModal === 'visualizar'
                              ? <td key={i} className="bg-slate-100 border border-slate-200 rounded p-1 text-center text-xs text-slate-600 select-none">
                                  {Number(m.dias_uteis_reais) > 0 ? formatDias(m.dias_uteis_reais) : '—'}
                                </td>
                              : <td key={i} className="bg-white border border-slate-200 rounded p-1">
                                  <DiasInput
                                    value={m.dias_uteis_reais}
                                    onChange={val => setMesesForm(prev => prev.map((x, xi) => xi === i ? { ...x, dias_uteis_reais: val } : x))}
                                  />
                                </td>
                        ))}
                        {(() => {
                          const totalDias = mesesForm.reduce((s, m) => s + (Number(m.dias_uteis_reais) || 0), 0)
                          return (
                            <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-center text-xs font-bold text-indigo-700">
                              {totalDias > 0 ? formatDias(totalDias) : '—'}
                            </td>
                          )
                        })()}
                      </tr>
                      {/* Média (calculado) */}
                      <tr>
                        <td className="text-xs font-semibold text-slate-500 px-1">Méd. Diária</td>
                        {mesesForm.map((m, i) => {
                          const media = calcMedia(m.meta_faturamento, m.dias_uteis_reais)
                          return (
                            <td key={i} className="bg-slate-50 border border-slate-100 rounded p-1 text-center text-xs font-mono">
                              {media > 0
                                ? <span className="text-emerald-700">{fmtBRL(media)}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                          )
                        })}
                        {(() => {
                          const totalMeta = mesesForm.reduce((s, m) => s + (parseBRL(m.meta_faturamento) || 0), 0)
                          const totalDias = mesesForm.reduce((s, m) => s + (Number(m.dias_uteis_reais) || 0), 0)
                          const mediaTotal = calcMedia(totalMeta, totalDias)
                          return (
                            <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-700 font-mono">
                              {mediaTotal > 0 ? <span className="text-emerald-700">{fmtBRL(mediaTotal)}</span> : '—'}
                            </td>
                          )
                        })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>}
            </div>

            {erroModal && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                <AlertTriangle size={15} /> {erroModal}
              </div>
            )}

            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-200">
              {modoModal === 'visualizar' ? (
                <>
                  <div className="flex gap-2">
                    {canEdit && (
                      <button onClick={() => setModoModal('editar')} className={BTN_SEC}>
                        <Edit2 size={14}/> Editar
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => {
                        setModalAberto(false)
                        setColabExcluir({ colaborador_id: form.colaborador_id, empresa_id: form.empresa_id, nome: form.colaborador_nome })
                        setModalExcluirAberto(true)
                      }} className={BTN_DNG}>
                        <Trash2 size={14}/> Excluir
                      </button>
                    )}
                  </div>
                  <button onClick={() => setModalAberto(false)} className={BTN_SEC}>Fechar</button>
                </>
              ) : (
                <div className="flex gap-3 ml-auto">
                  <button onClick={() => setModalAberto(false)} className={BTN_SEC} disabled={salvando}>Cancelar</button>
                  <button onClick={handleSalvarModal} className={BTN_PRI} disabled={salvando}>
                    {salvando ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : modoModal === 'editar' ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EXCLUIR ── */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Excluir Colaborador</h2>
              <p className="text-sm text-slate-500">
                Todos os 12 meses de metas de <strong>{colabExcluir?.nome}</strong> para <strong>{filtroAno}</strong> serão excluídos.
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalExcluirAberto(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleExcluirColab} className={`${BTN_DNG} flex-1 justify-center`}>
                <Trash2 size={15} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
