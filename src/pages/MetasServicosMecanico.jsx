import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, Trash2, X, AlertTriangle, ChevronRight, ChevronDown, Wrench, Loader2, CheckCircle2, Sparkles, Pencil, Edit2, Eye, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { SearchCombobox } from '../components/SearchCombobox'
import { EmpresaMultiFilter, empresaParam, filtrarPorEmpresas, empresaUnica } from '../components/EmpresaMultiFilter'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Moeda contábil: R$ na frente, negativo entre parênteses em vez de sinal de menos — o CLDR do
// pt-BR não tem um padrão "accounting" próprio (currencySign:'accounting' cai pro mesmo "-R$"),
// então o parêntese é montado manualmente aqui.
const fmtBRL = (v) => {
  const n = Number(v)
  if (!v && v !== 0) return '—'
  const s = Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}

function parseBRL(s) { if (!s && s !== 0) return 0; const str = String(s).trim(); if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0; return parseFloat(str) || 0 }
function formatBRL(n) {
  const num = Number(n)
  if (!num && num !== 0) return ''
  const s = Math.abs(num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return num < 0 ? `(${s})` : s
}

const STATUS_CLS     = { 'AGUARDANDO': 'bg-amber-100 text-amber-700', 'DISTRIBUIDO': 'bg-green-100 text-green-700' }
const STATUS_DISPLAY = { 'AGUARDANDO': 'Aguard. Distribuição',       'DISTRIBUIDO': 'Valor Distribuído' }

function cellState(cur, apr) { const c = Number(cur) || 0; if (c === 0) return 'ok'; if (apr === null || apr === undefined) return 'new'; if (Math.abs(c - Number(apr)) > 0.001) return 'changed'; return 'ok' }
function pendingCountEmp(emp) {
  let n = 0
  Object.values(emp.depts).forEach(d => Object.values(d.setores).forEach(st => Object.values(st.boxes).forEach(bx => Object.values(bx.colabs).forEach(co => Object.values(co.meses).forEach(m => { if (cellState(m.meta_faturamento, m.meta_aprovada) !== 'ok') n++ })))))
  return n
}

function aggColabs(cm, f='meta_faturamento') { const a = Array(12).fill(0); Object.values(cm).forEach(c => Object.entries(c.meses).forEach(([m, d]) => { a[+m-1] += Number(d[f])||0 })); return a }
function aggBox(bx, f)    { const a = Array(12).fill(0); Object.values(bx.colabs).forEach(c => aggColabs({x:c},f).forEach((v,i)=>{a[i]+=v})); return a }
function aggSetor(st, f)  { const a = Array(12).fill(0); Object.values(st.boxes).forEach(b => aggBox(b,f).forEach((v,i)=>{a[i]+=v})); return a }
function aggDept(d, f)    { const a = Array(12).fill(0); Object.values(d.setores).forEach(s => aggSetor(s,f).forEach((v,i)=>{a[i]+=v})); return a }
function aggEmp(e, f)     { const a = Array(12).fill(0); Object.values(e.depts).forEach(d => aggDept(d,f).forEach((v,i)=>{a[i]+=v})); return a }
function aggTree(t, f)    { const a = Array(12).fill(0); Object.values(t).forEach(e => aggEmp(e,f).forEach((v,i)=>{a[i]+=v})); return a }
function sumArr(a) { return a.reduce((s,v)=>s+v,0) }

// Calcula meta do mês a partir dos campos do mecânico
function calcMetaMes(m) {
  const hm = Number(m.horas_meta) || 0
  const vh = parseBRL(m.valor_hora)
  const cp = Number(m.coef_pecas) || 0
  const meta_servicos = Math.round(hm * vh)
  const meta_pecas = Math.round(meta_servicos * cp)
  return { meta_servicos, meta_pecas, meta_faturamento: meta_servicos + meta_pecas }
}

function NumInput({ value, onChange, placeholder = '0', decimais = 2 }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const fmt = (v) => { const n = Number(v); if (!n && n !== 0) return ''; return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais }) }
  const displayed = focused ? raw : (value || value === 0 ? fmt(value) : '')
  return (
    <input type="text" inputMode="decimal" value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { setRaw(value != null ? String(value).replace('.', ',') : ''); setFocused(true) }}
      onBlur={() => { setFocused(false); onChange(parseFloat(String(raw).replace(',', '.')) || 0) }}
      placeholder={placeholder}
      className="w-full text-xs text-right outline-none bg-transparent text-slate-800" />
  )
}

function BRLInput({ value, onChange, placeholder = '0', decimais = 0 }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const displayed = focused ? raw : (value ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais }) : '')
  return (
    <input type="text" inputMode="decimal" value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { setRaw(value ? String(value).replace('.', ',') : ''); setFocused(true) }}
      onBlur={() => { setFocused(false); onChange(parseBRL(raw)) }}
      placeholder={placeholder}
      className="w-full text-xs text-right outline-none bg-transparent text-slate-800" />
  )
}

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const SEL = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'

const FORM_VAZIO = { empresa_id:'', empresa_nome:'', departamento_id:'', departamento_nome:'', setor_id:'', setor_nome:'', box_id:'', box_nome:'', cargo_id:'', cargo_nome:'', colaborador_id:'', colaborador_nome:'', data_admissao:'', ano: anoAtual }

function calcHorasMeta(horas, produtividade) {
  const h = Number(horas) || 0; const p = Number(produtividade) || 0
  return h > 0 && p > 0 ? h * (p / 100) : ''
}

const mesesVazios = (diasUteis = {}) => Array.from({ length: 12 }, (_, i) => {
  const du = diasUteis[i+1] ?? ''
  const dat = du !== '' ? Number(du) : 0
  const horas = dat > 0 ? dat * 8 : ''
  return { mes: i+1, dias_uteis: du, dias_a_trabalhar: dat > 0 ? dat : '', horas_disponiveis: horas, produtividade: '', horas_meta: '', valor_hora: '', coef_servicos: '', coef_pecas: '', dias_uteis_reais: '' }
})

export default function MetasServicosMecanico({ onDistribuir } = {}) {
  const [empresas,      setEmpresas]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [dados,         setDados]         = useState([])
  const [dadosConsultor, setDadosConsultor] = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/pos-vendas/servicos', 'editar')
  const canDelete = hasPermission('/metas/pos-vendas/servicos', 'excluir')
  const [filtroEmpresa,  setFiltroEmpresa]  = useSessionState('mpvs_servicos_empresas', [])
  const [filtroAno,      setFiltroAno]      = useSessionState('mpvs_servicos_ano', anoAtual)
  const [filtroMecanico, setFiltroMecanico] = useSessionState('msm_mecanico', '')
  const [filtroSetor,    setFiltroSetor]    = useSessionState('msm_setor', '')
  const [filtroBox,      setFiltroBox]      = useSessionState('msm_box', '')
  const [filtroVisu,     setFiltroVisu]     = useSessionState('msm_visu', 'total')

  const [grupoAberto,        setGrupoAberto]        = useState(true)
  const [expandedEmpresas,   setExpandedEmpresas]   = useState(new Set())
  const [expandedDepts,      setExpandedDepts]      = useState(new Set())
  const [expandedSetores,    setExpandedSetores]    = useState(new Set())
  const [expandedBoxes,      setExpandedBoxes]      = useState(new Set())

  const [modalAberto,        setModalAberto]        = useState(false)
  const [modoModal,          setModoModal]          = useState('incluir') // 'incluir' | 'editar'
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [form,               setForm]               = useState(FORM_VAZIO)
  const [mesesForm,          setMesesForm]          = useState(mesesVazios())
  const [colabExcluir,       setColabExcluir]       = useState(null)
  const [salvando,           setSalvando]           = useState(false)
  const [erroModal,          setErroModal]          = useState(null)
  const [diasUteisMes,       setDiasUteisMes]       = useState({})
  const [copyProdOpen,       setCopyProdOpen]       = useState(false)
  const [copyProdSel,        setCopyProdSel]        = useState(new Set(Array.from({length:12},(_,i)=>i)))
  const [copyProdVal,        setCopyProdVal]        = useState('')
  const [copyVHOpen,         setCopyVHOpen]         = useState(false)
  const [copyVHSel,          setCopyVHSel]          = useState(new Set(Array.from({length:12},(_,i)=>i)))
  const [copyVHVal,          setCopyVHVal]          = useState('')
  const [copyCPOpen,         setCopyCPOpen]         = useState(false)
  const [copyCPSel,          setCopyCPSel]          = useState(new Set(Array.from({length:12},(_,i)=>i)))
  const [copyCPVal,          setCopyCPVal]          = useState('')
  useEffect(() => { loadLookups() }, [])
  useEffect(() => { setFiltroMecanico(''); setFiltroSetor(''); setFiltroBox(''); loadDados() }, [filtroEmpresa, filtroAno])

  const sortNome = (arr, f) => [...arr].sort((a,b) => (a[f]||'').localeCompare(b[f]||''))

  // Resolve cargo/depto/setor/box de uma linha da meta: pelo cadastro atual do funcionário
  // quando ele ainda existe em /funcionarios; senão pelo que foi gravado na própria linha
  // (colaborador "fantasma" ou excluído do cadastro). Usado tanto pra montar a árvore quanto
  // pros filtros de Setor/Box.
  const resolverPosicao = useCallback((row) => {
    const func = funcionarios.find(f => f.id === row.colaborador_id)
    let cId, bId, sId, did
    if (func) {
      cId = func.cargo_id || '—'
      const cargoTmp = cargos.find(c => c.id === cId)
      bId = func.box_id || '—'
      const boxTmp = boxes.find(b => b.id === bId)
      const boxSetorIds   = boxTmp ? (Array.isArray(boxTmp.setor_ids) ? boxTmp.setor_ids : [boxTmp.setor_id]).filter(Boolean) : []
      const cargoSetorIds = cargoTmp?.setor_ids || func.setor_ids || []
      sId = boxSetorIds.find(sid => cargoSetorIds.includes(sid)) || boxSetorIds[0] || cargoSetorIds[0] || '—'
      const setorTmp = setores.find(s => s.id === sId)
      did = setorTmp?.departamento_id || cargoTmp?.departamento_ids?.[0] || func.departamento_ids?.[0] || '—'
    } else {
      cId = row.cargo_id || '—'
      bId = row.box_id   || '—'
      sId = row.setor_id || '—'
      did = row.departamento_id || '—'
    }
    const cargo = cargos.find(c => c.id === cId)
    const box   = boxes.find(b => b.id === bId)
    const setor = setores.find(s => s.id === sId)
    const dept  = departamentos.find(d => d.id === did)
    return {
      func, cId, bId, sId, did,
      dNome: dept?.nome_departamento || row.departamento_nome || did,
      sNome: setor?.nome_setor       || row.setor_nome        || '—',
      bNome: box?.nome_box           || row.box_nome          || '—',
      cNome: cargo?.nome_cargo       || row.cargo_nome        || '—',
      coNome: func?.nome_funcionario || row.colaborador_nome  || row.colaborador_id,
    }
  }, [funcionarios, cargos, boxes, setores, departamentos])

  const mecanicosDisponiveis = useMemo(() => {
    const seen = new Set()
    return dados
      .filter(r => { if (seen.has(r.colaborador_id)) return false; seen.add(r.colaborador_id); return true })
      .map(r => ({ id: r.colaborador_id, nome: r.colaborador_nome || r.colaborador_id }))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  }, [dados])

  const setoresDisponiveis = useMemo(() => {
    const seen = new Map()
    dados.forEach(r => { const { sId, sNome } = resolverPosicao(r); if (sId !== '—' && !seen.has(sId)) seen.set(sId, sNome) })
    return [...seen.entries()].map(([id, nome]) => ({ id, nome })).sort((a,b) => a.nome.localeCompare(b.nome))
  }, [dados, resolverPosicao])

  const boxesDisponiveis = useMemo(() => {
    const seen = new Map()
    dados.forEach(r => {
      const { sId, bId, bNome } = resolverPosicao(r)
      if (filtroSetor && sId !== filtroSetor) return
      if (bId !== '—' && !seen.has(bId)) seen.set(bId, bNome)
    })
    return [...seen.entries()].map(([id, nome]) => ({ id, nome })).sort((a,b) => a.nome.localeCompare(b.nome))
  }, [dados, resolverPosicao, filtroSetor])

  const dadosFiltrados = useMemo(() => dados.filter(r => {
    if (filtroMecanico && r.colaborador_id !== filtroMecanico) return false
    if (filtroSetor || filtroBox) {
      const { sId, bId } = resolverPosicao(r)
      if (filtroSetor && sId !== filtroSetor) return false
      if (filtroBox   && bId !== filtroBox)   return false
    }
    return true
  }), [dados, filtroMecanico, filtroSetor, filtroBox, resolverPosicao])

  // Mapa box_id → setor_id atual (via dim_box.setor_ids), pra saber a qual setor cada consultor
  // pertence (a distribuição pra consultores é por Box/Setor, não por mecânico individual).
  const boxToSetorMap = useMemo(() => {
    const m = {}
    boxes.forEach(bx => {
      const ids = Array.isArray(bx.setor_ids) ? bx.setor_ids : (bx.setor_id ? [bx.setor_id] : [])
      const validSetor = ids.find(sid => setores.some(s => s.id === sid))
      if (validSetor) m[bx.id] = validSetor
    })
    return m
  }, [boxes, setores])

  // Soma de % distribuído aos consultores por empresa|setor|mês — chave pra saber se o setor
  // (não o mecânico individual) já teve sua meta 100% distribuída entre os consultores.
  const distribuidoPctPorSetorMes = useMemo(() => {
    const m = {}
    dadosConsultor.forEach(r => {
      const func = funcionarios.find(f => f.id === r.colaborador_id)
      const bId  = func?.box_id || r.box_id
      const sId  = (bId && boxToSetorMap[bId]) || r.setor_id || null
      if (!sId) return
      const key = `${r.empresa_id}|${sId}|${r.mes}`
      m[key] = (m[key] || 0) + (Number(r.percentual) || 0)
    })
    return m
  }, [dadosConsultor, funcionarios, boxToSetorMap])

  const loadLookups = async () => {
    try {
      const [emps, depts, sets, bxs, cargs, funcs] = await Promise.all([
        apiService.getEmpresas(), apiService.getDepartamentos(), apiService.getSetores(),
        apiService.getBox(), apiService.getCargos(), apiService.getFuncionarios(),
      ])
      setEmpresas(sortNome(emps.filter(e => ['Caiobá Trucks', 'Caiobá Motos'].includes(e.agrupamento_nome)), 'empresa_fantasia'))
      setDepartamentos(sortNome(depts, 'nome_departamento'))
      setSetores(sortNome(sets, 'nome_setor'))
      setBoxes(sortNome(bxs, 'nome_box'))
      setCargos(sortNome(cargs, 'nome_cargo'))
      setFuncionarios(sortNome(funcs, 'nome_funcionario'))
    } catch (err) { setError(err.message || String(err)) }
  }

  const loadDados = async () => {
    setLoading(true); setError(null)
    try {
      const [mec, cons] = await Promise.all([
        apiService.getMetasMecanico(empresaParam(filtroEmpresa), filtroAno),
        apiService.getMetasConsultor(empresaParam(filtroEmpresa), filtroAno),
      ])
      setDados(filtrarPorEmpresas(mec, filtroEmpresa))
      setDadosConsultor(filtrarPorEmpresas(cons, filtroEmpresa))
    }
    catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  const tree = useMemo(() => {
    const t = {}
    dadosFiltrados.forEach(row => {
      const eid   = row.empresa_id
      const colid = row.colaborador_id
      const { cId, bId, sId, did, dNome, sNome, bNome, coNome } = resolverPosicao(row)

      if (!t[eid]) t[eid] = { nome: row.empresa_nome || eid, depts: {} }
      const depts = t[eid].depts
      if (!depts[did]) depts[did] = { nome: dNome, setores: {} }
      depts[did].nome = dNome
      const stMap = depts[did].setores
      if (!stMap[sId]) stMap[sId] = { nome: sNome, boxes: {} }
      if (!stMap[sId].boxes[bId]) stMap[sId].boxes[bId] = { nome: bNome, colabs: {} }
      const coMap = stMap[sId].boxes[bId].colabs
      if (!coMap[colid]) coMap[colid] = { nome: coNome, meses: {} }
      const _hd = Number(row.horas_disponiveis) || 0
      const _prod = Number(row.produtividade) || 0
      const _vh = Number(row.valor_hora) || 0
      const _cp = Number(row.coef_pecas) || 0
      const _hm = _hd * (_prod / 100)
      const isProdNaoAssocRow = colid === '00000000-0000-0000-0000-000000000001'
      const _ms = isProdNaoAssocRow ? (Number(row.meta_servicos) || 0) : Math.round(_hm * _vh)
      const _mp = isProdNaoAssocRow ? (Number(row.meta_pecas)    || 0) : Math.round(_ms * _cp)
      coMap[colid].meses[row.mes] = {
        id: row.id,
        horas_disponiveis: row.horas_disponiveis,
        valor_hora: row.valor_hora,
        produtividade: row.produtividade,
        coef_servicos: row.coef_servicos,
        coef_pecas: row.coef_pecas,
        meta_servicos: _ms,
        meta_pecas: _mp,
        meta_faturamento: _ms + _mp,
        meta_aprovada: row.meta_aprovada ?? null,
        dias_uteis_reais: row.dias_uteis_reais,
      }
    })
    return t
  }, [dadosFiltrados, resolverPosicao])

  const toggle = (set, setter, key) => setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const recolherTudo = () => {
    setGrupoAberto(false)
    setExpandedEmpresas(new Set()); setExpandedDepts(new Set()); setExpandedSetores(new Set())
    setExpandedBoxes(new Set())
  }

  // Índice 0-based do primeiro mês habilitado para preenchimento (baseado na data de admissão vs ano do form)
  const mesAdmissao = useMemo(() => {
    if (!form.data_admissao) return 0
    const [admAno, admMes] = form.data_admissao.split('-').map(Number)
    if (admAno > Number(form.ano)) return 12  // todos travados
    if (admAno < Number(form.ano)) return 0   // todos liberados
    return admMes - 1                          // 0-based
  }, [form.data_admissao, form.ano])

  const isMesLocked    = (i) => i < mesAdmissao
  const isCellReadOnly = (i) => isMesLocked(i) || modoModal === 'visualizar'

  const setoresDoDepto = useMemo(() => setores.filter(s => s.departamento_id === form.departamento_id && s.tipo_setor === 'manutencao_reparo'), [setores, form.departamento_id])
  const boxesDoSetor   = useMemo(() => boxes.filter(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(form.setor_id)), [boxes, form.setor_id])
  const setoresManutencao = useMemo(() => new Set(setores.filter(s => s.tipo_setor === 'manutencao_reparo').map(s => s.id)), [setores])
  const cargosDoDepto  = useMemo(() => {
    let lista = !form.departamento_id ? cargos : cargos.filter(c => (c.departamento_ids||[]).includes(form.departamento_id))
    lista = lista.filter(c => (c.setores_rel||[]).some(r => setoresManutencao.has(r.setor_id)))
    if (form.setor_id) {
      lista = lista.filter(c =>
        (c.setor_ids||[]).includes(form.setor_id) ||
        (c.setores_rel||[]).some(r => r.setor_id === form.setor_id)
      )
    }
    if (form.box_id) {
      const box = boxes.find(b => b.id === form.box_id)
      if (box?.setor_ids?.length) {
        lista = lista.filter(c =>
          (c.setor_ids||[]).some(sid => box.setor_ids.includes(sid)) ||
          (c.setores_rel||[]).some(r => box.setor_ids.includes(r.setor_id))
        )
      }
    }
    return lista
  }, [cargos, form.departamento_id, form.setor_id, form.box_id, setoresManutencao, boxes])

  const funcsEmp = useMemo(() => {
    let l = funcionarios
    if (form.empresa_id)      l = l.filter(f => f.empresa_id === form.empresa_id)
    if (form.departamento_id) l = l.filter(f => Array.isArray(f.departamento_ids) ? f.departamento_ids.includes(form.departamento_id) : f.departamento_id === form.departamento_id)
    if (form.setor_id)        l = l.filter(f => Array.isArray(f.setor_ids) ? f.setor_ids.includes(form.setor_id) : f.setor_id === form.setor_id)
    if (form.box_id)          l = l.filter(f => f.box_id === form.box_id)
    return l
  }, [funcionarios, form.empresa_id, form.departamento_id, form.setor_id, form.box_id])

  const cargosPorId = useMemo(() => Object.fromEntries(cargos.map(c => [c.id, c])), [cargos])

  const handleFormChange = async (e) => {
    const { name, value } = e.target
    const up = { [name]: value }
    if (name === 'empresa_id') {
      const emp = empresas.find(x => x.id === value)
      up.empresa_nome = emp ? (emp.empresa_fantasia||emp.nome_empresa) : ''
      up.colaborador_id = ''; up.colaborador_nome = ''
      let du = {}
      try { if (value) du = await apiService.getDiasUteisPorMes(value, form.ano) } catch { /* non-fatal */ }
      setDiasUteisMes(du)
      setMesesForm(mesesVazios(du))
    }
    if (name === 'departamento_id') { const dep = departamentos.find(x => x.id === value); up.departamento_nome = dep?.nome_departamento||''; up.setor_id=''; up.setor_nome=''; up.box_id=''; up.box_nome=''; up.cargo_id=''; up.cargo_nome='' }
    if (name === 'setor_id')  { const s = setores.find(x => x.id === value); up.setor_nome = s?.nome_setor||''; up.box_id=''; up.box_nome=''; up.colaborador_id=''; up.colaborador_nome='' }
    if (name === 'box_id')    { up.box_nome = boxes.find(x => x.id === value)?.nome_box||'' }
    if (name === 'cargo_id')  { up.cargo_nome = cargos.find(x => x.id === value)?.nome_cargo||'' }
    if (name === 'colaborador_id') {
      if (value === 'A_CONTRATAR') {
        up.colaborador_nome = 'A contratar'
        up.data_admissao = ''
      } else if (value === 'PROD_NAO_ASSOC_FUN') {
        up.colaborador_nome = 'Produtivo Não Associado Funilaria'
        up.data_admissao = ''
        const setorFun = setores.find(s => s.nome_setor?.toLowerCase().includes('funilaria'))
        if (setorFun) {
          const deptFun = departamentos.find(d => d.id === setorFun.departamento_id)
          const boxFun  = boxes.find(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(setorFun.id))
          up.departamento_id   = deptFun?.id                  || ''
          up.departamento_nome = deptFun?.nome_departamento   || ''
          up.setor_id          = setorFun.id
          up.setor_nome        = setorFun.nome_setor
          up.box_id            = boxFun?.id       || ''
          up.box_nome          = boxFun?.nome_box || ''
        }
        setMesesForm(Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, meta_pecas: 0, meta_servicos: 0 })))
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
    setForm(prev => ({ ...prev, ...up }))
  }

  const abrirIncluir = async () => {
    setModoModal('incluir')
    const empIdUnica = empresaUnica(filtroEmpresa)
    const emp = empresas.find(e => e.id === empIdUnica)
    const depOficina = departamentos.find(d => d.nome_departamento?.toLowerCase().includes('oficina'))
    setForm({
      ...FORM_VAZIO,
      ano: filtroAno,
      empresa_id: empIdUnica,
      empresa_nome: emp ? (emp.empresa_fantasia||emp.nome_empresa) : '',
      departamento_id: depOficina?.id || '',
      departamento_nome: depOficina?.nome_departamento || '',
    })
    setErroModal(null)
    let du = {}
    try {
      if (empIdUnica) du = await apiService.getDiasUteisPorMes(empIdUnica, filtroAno)
    } catch { /* non-fatal */ }
    setDiasUteisMes(du)
    setMesesForm(mesesVazios(du))
    setCopyProdVal('')
    setCopyProdSel(new Set(Array.from({length:12},(_,i)=>i)))
    setCopyProdOpen(false)
    setCopyVHVal('')
    setCopyVHSel(new Set(Array.from({length:12},(_,i)=>i)))
    setCopyVHOpen(false)
    setCopyCPVal('')
    setCopyCPSel(new Set(Array.from({length:12},(_,i)=>i)))
    setCopyCPOpen(false)
    setModalAberto(true)
  }

  const abrirVisualizar = (empId, colabId) => abrirEditar(empId, colabId, 'visualizar')

  const abrirEditar = async (empId, colabId, modo = 'editar') => {
    const rows = dados.filter(r =>
      String(r.empresa_id) === String(empId) &&
      String(r.colaborador_id) === String(colabId) &&
      Number(r.ano) === Number(filtroAno)
    )
    if (!rows.length) return
    const r0 = rows[0]
    const isProdNaoAssoc = colabId === '00000000-0000-0000-0000-000000000001'
    const funcAdm = !isProdNaoAssoc && colabId && colabId !== '00000000-0000-0000-0000-000000000000'
      ? (funcionarios.find(f => f.id === colabId) || funcionarios.find(f => f.nome_funcionario === r0.colaborador_nome))
      : null
    setModoModal(modo)
    setForm({
      empresa_id:       r0.empresa_id,
      empresa_nome:     r0.empresa_nome,
      departamento_id:  r0.departamento_id  || '',
      departamento_nome:r0.departamento_nome || '',
      setor_id:         r0.setor_id         || '',
      setor_nome:       r0.setor_nome        || '',
      box_id:           r0.box_id            || '',
      box_nome:         r0.box_nome          || '',
      cargo_id:         r0.cargo_id          || '',
      cargo_nome:       r0.cargo_nome        || '',
      colaborador_id:   isProdNaoAssoc ? 'PROD_NAO_ASSOC_FUN' : r0.colaborador_id,
      colaborador_nome: r0.colaborador_nome,
      data_admissao:    funcAdm?.data_admissao || '',
      ano:              filtroAno,
    })
    setErroModal(null)
    let du = {}
    try { if (empId) du = await apiService.getDiasUteisPorMes(empId, filtroAno) } catch { /* non-fatal */ }
    setDiasUteisMes(du)
    let meses
    if (isProdNaoAssoc) {
      meses = Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1
        const row = rows.find(r => Number(r.mes) === mes)
        return { mes, meta_pecas: Number(row?.meta_pecas) || 0, meta_servicos: Number(row?.meta_servicos) || 0 }
      })
    } else {
      meses = Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1
        const row = rows.find(r => Number(r.mes) === mes)
        const duVal = du[mes] ?? ''
        if (!row) return { mes, dias_uteis: duVal, dias_a_trabalhar: '', horas_disponiveis: '', produtividade: 100, horas_meta: '', valor_hora: '', coef_servicos: '', coef_pecas: '', dias_uteis_reais: '' }
        const hd = Number(row.horas_disponiveis) || 0
        const prod = (row.produtividade != null && row.produtividade !== '') ? Number(row.produtividade) : 100
        const dat = hd > 0 ? hd / 8 : ''
        return {
          mes,
          dias_uteis:        duVal,
          dias_a_trabalhar:  dat,
          horas_disponiveis: hd || '',
          produtividade:     prod,
          horas_meta:        row.horas_meta != null ? Number(row.horas_meta) : (hd > 0 ? hd * (prod / 100) : ''),
          valor_hora:        row.valor_hora ?? '',
          coef_servicos:     row.coef_servicos ?? '',
          coef_pecas:        row.coef_pecas ?? '',
          dias_uteis_reais:  row.dias_uteis_reais ?? '',
        }
      })
    }
    setMesesForm(meses)
    setCopyProdVal(''); setCopyProdSel(new Set(Array.from({length:12},(_,i)=>i))); setCopyProdOpen(false)
    setCopyVHVal('');      setCopyVHSel(new Set(Array.from({length:12},(_,i)=>i)));  setCopyVHOpen(false)
    setCopyCPVal('');      setCopyCPSel(new Set(Array.from({length:12},(_,i)=>i)));  setCopyCPOpen(false)
    setModalAberto(true)
  }

  const setMesCampo = (idx, campo, valor) =>
    setMesesForm(prev => prev.map((x, xi) => {
      if (xi !== idx) return x
      const up = { ...x, [campo]: valor }
      if (campo === 'dias_a_trabalhar') {
        const d = parseFloat(String(valor).replace(',', '.')) || 0
        up.horas_disponiveis = d > 0 ? d * 8 : ''
        up.horas_meta = calcHorasMeta(up.horas_disponiveis, up.produtividade)
      }
      if (campo === 'produtividade') {
        up.horas_meta = calcHorasMeta(x.horas_disponiveis, valor)
      }
      return up
    }))

  const handleSalvar = async () => {
    if (!form.empresa_id)     { setErroModal('Selecione a Empresa.'); return }
    if (!form.colaborador_id) { setErroModal('Selecione o Colaborador.'); return }
    setSalvando(true); setErroModal(null)
    try {
      const { data_admissao: _da, ...formPayload } = form
      const isProdNaoAssoc = form.colaborador_id === 'PROD_NAO_ASSOC_FUN'
      const cleanPayload = {
        ...formPayload,
        departamento_id: formPayload.departamento_id || null,
        setor_id:        formPayload.setor_id        || null,
        box_id:          formPayload.box_id          || null,
        cargo_id:        formPayload.cargo_id        || null,
      }
      for (const m of mesesForm) {
        if (!isProdNaoAssoc && isMesLocked(m.mes - 1)) continue
        const meta_servicos = isProdNaoAssoc ? (Number(m.meta_servicos) || 0) : calcMetaMes(m).meta_servicos
        const meta_pecas    = isProdNaoAssoc ? (Number(m.meta_pecas)    || 0) : calcMetaMes(m).meta_pecas
        const meta_faturamento = meta_servicos + meta_pecas
        const dias = Number(m.dias_a_trabalhar) || 0
        await apiService.upsertMetaMecanico({
          ...cleanPayload,
          colaborador_id: form.colaborador_id === 'A_CONTRATAR' ? '00000000-0000-0000-0000-000000000000'
            : isProdNaoAssoc ? '00000000-0000-0000-0000-000000000001'
            : form.colaborador_id,
          mes: m.mes, ano: Number(form.ano),
          horas_disponiveis: isProdNaoAssoc ? 0 : (Number(m.horas_disponiveis) || 0),
          valor_hora:        isProdNaoAssoc ? 0 : parseBRL(m.valor_hora),
          produtividade:     isProdNaoAssoc ? 0 : (Number(m.produtividade) || 0),
          coef_servicos:     isProdNaoAssoc ? 0 : (Number(m.coef_servicos) || 0),
          coef_pecas:        isProdNaoAssoc ? 0 : (Number(m.coef_pecas) || 0),
          meta_servicos, meta_pecas, meta_faturamento,
          dias_uteis_reais: dias,
          media_diaria_venda: meta_faturamento > 0 && dias > 0 ? meta_faturamento / dias : 0,
          status: 'AGUARDANDO APROVACAO',
        })
      }
      setModalAberto(false)
      await loadDados()
    } catch (err) { setErroModal(err.message || String(err)) }
    finally { setSalvando(false) }
  }

  const handleExcluir = async () => {
    try { await apiService.deleteMetasMecanicoColab(colabExcluir.colaborador_id, colabExcluir.empresa_id, filtroAno); setModalExcluirAberto(false); await loadDados() }
    catch (err) { setError(err.message || String(err)); setModalExcluirAberto(false) }
  }

  // ── RENDER ROWS ──
  const fmt1 = (v) => { const n = Number(v); if (!n && n !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }

  const renderMesRows = (calc) => {
    const editableRows = [
      { label: 'Valor Hora (R$)', field: 'valor_hora',    isBRL: true },
      { label: 'Coef. Peças',     field: 'coef_pecas',    decimais: 1 },
    ]
    const locked = (val, dec = 1, prefix = '') => (
      <td className="bg-slate-100 border border-slate-200 rounded p-1 text-center text-xs text-slate-600 font-mono select-none">
        {val !== '' && val !== 0 ? prefix + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—'}
      </td>
    )
    return (
      <>
        {/* Dias Úteis — bloqueado */}
        <tr>
          <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">Dias Úteis</td>
          {mesesForm.map((m, i) => <React.Fragment key={i}>{locked(m.dias_uteis)}</React.Fragment>)}
          <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-semibold text-slate-600">{(() => { const t = mesesForm.reduce((s,m) => s + (Number(m.dias_uteis)||0), 0); return t > 0 ? fmt1(t) : '—' })()}</td>
        </tr>

        {/* Dias a Trabalhar — editável, 1 decimal */}
        <tr>
          <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">Dias a Trabalhar</td>
          {mesesForm.map((m, i) => (
            isMesLocked(i)
              ? <React.Fragment key={i}>{locked('')}</React.Fragment>
              : modoModal === 'visualizar'
                ? <React.Fragment key={i}>{locked(m.dias_a_trabalhar)}</React.Fragment>
                : <td key={i} className="bg-white border border-slate-200 rounded p-1">
                    <NumInput value={m.dias_a_trabalhar} onChange={v => setMesCampo(i, 'dias_a_trabalhar', v)} decimais={1} placeholder="0,0" />
                  </td>
          ))}
          <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-semibold text-slate-600">{(() => { const t = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : (Number(m.dias_a_trabalhar)||0)), 0); return t > 0 ? fmt1(t) : '—' })()}</td>
        </tr>

        {/* Horas Disponíveis — bloqueado, Dias a Trabalhar × 8 */}
        <tr>
          <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">Horas Disponíveis</td>
          {mesesForm.map((m, i) => <React.Fragment key={i}>{isMesLocked(i) ? locked('') : locked(m.horas_disponiveis)}</React.Fragment>)}
          <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-semibold text-slate-600">{(() => { const t = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : (Number(m.horas_disponiveis)||0)), 0); return t > 0 ? fmt1(t) : '—' })()}</td>
        </tr>

        {/* Produtividade — editável, 2 decimais, pré-preenchida 100%, com botão copiar */}
        <tr>
          <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">
            <div className="flex items-center gap-1 relative">
              <span>Produtividade (%)</span>
              {modoModal !== 'visualizar' && <button
                type="button"
                title="Copiar para meses"
                onClick={() => setCopyProdOpen(o => !o)}
                className="ml-1 p-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>}
              {copyProdOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCopyProdOpen(false)} />
                  <div className="absolute top-6 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-56">
                    <p className="text-[11px] font-semibold text-slate-600 mb-2">Valor a copiar (%)</p>
                    <input
                      type="text" inputMode="decimal"
                      value={copyProdVal}
                      onChange={e => setCopyProdVal(e.target.value)}
                      className="w-full border border-indigo-300 rounded-lg px-2 py-1 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                      placeholder="0,00"
                    />
                    <p className="text-[11px] font-semibold text-slate-600 mb-1">Copiar para:</p>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      {MESES_ABR.map((m, i) => (
                        <label key={i} className="flex items-center gap-1 text-[11px] cursor-pointer">
                          <input type="checkbox" checked={copyProdSel.has(i)} onChange={() => {
                            setCopyProdSel(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
                          }} className="accent-indigo-600" />
                          {m}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-1 justify-between mb-2">
                      <button type="button" className="text-[10px] text-indigo-600 hover:underline" onClick={() => setCopyProdSel(new Set(Array.from({length:12},(_,i)=>i)))}>Todos</button>
                      <button type="button" className="text-[10px] text-slate-400 hover:underline" onClick={() => setCopyProdSel(new Set())}>Nenhum</button>
                    </div>
                    <button
                      type="button"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold py-1.5 rounded-lg transition-colors"
                      onClick={() => {
                        const valorRef = parseFloat(String(copyProdVal).replace(',', '.')) || 0
                        setMesesForm(prev => prev.map((x, xi) => {
                          if (!copyProdSel.has(xi)) return x
                          const up = { ...x, produtividade: valorRef }
                          up.horas_meta = calcHorasMeta(x.horas_disponiveis, valorRef)
                          return up
                        }))
                        setCopyProdOpen(false)
                      }}
                    >Aplicar</button>
                  </div>
                </>
              )}
            </div>
          </td>
          {mesesForm.map((m, i) => (
            isMesLocked(i)
              ? <React.Fragment key={i}>{locked('')}</React.Fragment>
              : modoModal === 'visualizar'
                ? <React.Fragment key={i}>{locked(m.produtividade, 2)}</React.Fragment>
                : <td key={i} className="bg-white border border-slate-200 rounded p-1">
                    <NumInput value={m.produtividade} onChange={v => setMesCampo(i, 'produtividade', v)} decimais={2} placeholder="0,00" />
                  </td>
          ))}
          <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-semibold text-slate-600">{(() => { const hd = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : (Number(m.horas_disponiveis)||0)), 0); const hm = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : (Number(m.horas_meta)||0)), 0); return hd > 0 ? (hm / hd * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '—' })()}</td>
        </tr>

        {/* Horas Meta — bloqueado, Horas Disponíveis × Produtividade/100 */}
        <tr>
          <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">Horas Meta</td>
          {mesesForm.map((m, i) => <React.Fragment key={i}>{isMesLocked(i) ? locked('', 2) : locked(m.horas_meta, 2)}</React.Fragment>)}
          <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-semibold text-slate-600">{(() => { const t = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : (Number(m.horas_meta)||0)), 0); return t > 0 ? t.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' })()}</td>
        </tr>

        {editableRows.map(r => (
          <tr key={r.field}>
            <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">
              {r.field === 'valor_hora' ? (
                <div className="flex items-center gap-1 relative">
                  <span>{r.label}</span>
                  {modoModal !== 'visualizar' && <button
                    type="button"
                    title="Copiar para meses"
                    onClick={() => setCopyVHOpen(o => !o)}
                    className="ml-1 p-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>}
                  {copyVHOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCopyVHOpen(false)} />
                      <div className="absolute top-6 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-56">
                        <p className="text-[11px] font-semibold text-slate-600 mb-2">Valor a copiar (R$)</p>
                        <input
                          type="text" inputMode="decimal"
                          value={copyVHVal}
                          onChange={e => setCopyVHVal(e.target.value)}
                          className="w-full border border-indigo-300 rounded-lg px-2 py-1 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                          placeholder="0,00"
                        />
                        <p className="text-[11px] font-semibold text-slate-600 mb-1">Copiar para:</p>
                        <div className="grid grid-cols-3 gap-1 mb-2">
                          {MESES_ABR.map((m, i) => (
                            <label key={i} className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input type="checkbox" checked={copyVHSel.has(i)} onChange={() => {
                                setCopyVHSel(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
                              }} className="accent-indigo-600" />
                              {m}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-1 justify-between mb-2">
                          <button type="button" className="text-[10px] text-indigo-600 hover:underline" onClick={() => setCopyVHSel(new Set(Array.from({length:12},(_,i)=>i)))}>Todos</button>
                          <button type="button" className="text-[10px] text-slate-400 hover:underline" onClick={() => setCopyVHSel(new Set())}>Nenhum</button>
                        </div>
                        <button
                          type="button"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold py-1.5 rounded-lg transition-colors"
                          onClick={() => {
                            const valorRef = parseBRL(copyVHVal)
                            setMesesForm(prev => prev.map((x, xi) => {
                              if (!copyVHSel.has(xi)) return x
                              return { ...x, valor_hora: valorRef }
                            }))
                            setCopyVHOpen(false)
                          }}
                        >Aplicar</button>
                      </div>
                    </>
                  )}
                </div>
              ) : r.field === 'coef_pecas' ? (
                <div className="flex items-center gap-1 relative">
                  <span>{r.label}</span>
                  {modoModal !== 'visualizar' && <button
                    type="button"
                    title="Copiar para meses"
                    onClick={() => setCopyCPOpen(o => !o)}
                    className="ml-1 p-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>}
                  {copyCPOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCopyCPOpen(false)} />
                      <div className="absolute top-6 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-56">
                        <p className="text-[11px] font-semibold text-slate-600 mb-2">Valor a copiar</p>
                        <input
                          type="text" inputMode="decimal"
                          value={copyCPVal}
                          onChange={e => setCopyCPVal(e.target.value)}
                          className="w-full border border-indigo-300 rounded-lg px-2 py-1 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                          placeholder="0,0"
                        />
                        <p className="text-[11px] font-semibold text-slate-600 mb-1">Copiar para:</p>
                        <div className="grid grid-cols-3 gap-1 mb-2">
                          {MESES_ABR.map((m, i) => (
                            <label key={i} className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input type="checkbox" checked={copyCPSel.has(i)} onChange={() => {
                                setCopyCPSel(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
                              }} className="accent-indigo-600" />
                              {m}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-1 justify-between mb-2">
                          <button type="button" className="text-[10px] text-indigo-600 hover:underline" onClick={() => setCopyCPSel(new Set(Array.from({length:12},(_,i)=>i)))}>Todos</button>
                          <button type="button" className="text-[10px] text-slate-400 hover:underline" onClick={() => setCopyCPSel(new Set())}>Nenhum</button>
                        </div>
                        <button
                          type="button"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold py-1.5 rounded-lg transition-colors"
                          onClick={() => {
                            const valorRef = parseFloat(String(copyCPVal).replace(',', '.')) || 0
                            setMesesForm(prev => prev.map((x, xi) => {
                              if (!copyCPSel.has(xi)) return x
                              return { ...x, coef_pecas: valorRef }
                            }))
                            setCopyCPOpen(false)
                          }}
                        >Aplicar</button>
                      </div>
                    </>
                  )}
                </div>
              ) : r.label}
            </td>
            {mesesForm.map((m, i) => (
              isCellReadOnly(i)
                ? <React.Fragment key={i}>{locked(isMesLocked(i) ? '' : m[r.field], r.isBRL ? 2 : 1, r.isBRL ? 'R$ ' : '')}</React.Fragment>
                : <td key={i} className="bg-white border border-slate-200 rounded p-1">
                    {r.isBRL
                      ? <BRLInput value={m[r.field]} onChange={v => setMesCampo(i, r.field, v)} decimais={2} />
                      : <NumInput value={m[r.field]} onChange={v => setMesCampo(i, r.field, v)} decimais={r.decimais} placeholder="0,0" />}
                  </td>
            ))}
            <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-semibold text-slate-600">{(() => {
              if (r.field === 'valor_hora') {
                const hm = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : (Number(m.horas_meta)||0)), 0)
                const ms = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : calcMetaMes(m).meta_servicos), 0)
                return hm > 0 ? formatBRL(ms / hm) : '—'
              }
              if (r.field === 'coef_pecas') {
                const ms = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : calcMetaMes(m).meta_servicos), 0)
                const mp = mesesForm.reduce((s,m,i) => s + (isMesLocked(i) ? 0 : calcMetaMes(m).meta_pecas), 0)
                return ms > 0 ? (mp / ms).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'
              }
              return '—'
            })()}</td>
          </tr>
        ))}
      </>
    )
  }

  const vField = filtroVisu === 'pecas' ? 'meta_pecas' : filtroVisu === 'servicos' ? 'meta_servicos' : 'meta_faturamento'
  const grupoMeses = aggTree(tree, vField)
  const NCOLS = 15 // nome + 12 meses + total + situação

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Metas - Mecânico</h1>
            <p className="text-xs text-slate-400">Pós-Vendas · Rascunho editável antes da aprovação</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs font-semibold">
            {[
              { key: 'total',    label: 'Total' },
              { key: 'pecas',    label: 'Peças' },
              { key: 'servicos', label: 'Serviços' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFiltroVisu(key)}
                className={`px-3 py-2 transition-colors ${filtroVisu === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
          {canEdit && <button onClick={abrirIncluir} className={BTN_PRI}><Plus size={16} /> Adicionar Mecânico</button>}
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Empresa</label>
            <EmpresaMultiFilter value={filtroEmpresa} onChange={setFiltroEmpresa} empresas={empresas} />
          </div>
          <div className="w-28">
            <label className={LBL}>Ano</label>
            <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Setor</label>
            <select className={SEL} value={filtroSetor} onChange={e => { setFiltroSetor(e.target.value); setFiltroBox('') }}>
              <option value="">Todos os setores</option>
              {setoresDisponiveis.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Box</label>
            <select className={SEL} value={filtroBox} onChange={e => setFiltroBox(e.target.value)}>
              <option value="">Todos os boxes</option>
              {boxesDisponiveis.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Mecânico</label>
            <select className={SEL} value={filtroMecanico} onChange={e => setFiltroMecanico(e.target.value)}>
              <option value="">Todos os mecânicos</option>
              {mecanicosDisponiveis.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"><AlertTriangle size={15}/> {error} <button onClick={() => setError(null)} className="ml-auto"><X size={14}/></button></div>}

      {/* TABELA TREE */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="text-xs border-separate border-spacing-0" style={{ minWidth: '1700px' }}>
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 w-60 sticky left-0 bg-slate-50 z-10">
                  <div className="flex items-center gap-2">
                    {Object.keys(tree).length > 0 && (
                      <button
                        onClick={recolherTudo}
                        title="Recolher tudo"
                        className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 text-slate-500 transition-colors whitespace-nowrap"
                      >
                        − Recolher tudo
                      </button>
                    )}
                  </div>
                </th>
                {MESES_ABR.map(m => <th key={m} className="px-1 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-24">{m}</th>)}
                <th className="px-2 py-2.5 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-40 whitespace-nowrap">Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400"><div className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin"/>Carregando...</div></td></tr>
              ) : Object.keys(tree).length === 0 ? (
                <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400">Nenhuma meta cadastrada.</td></tr>
              ) : (() => {
                const grupoTotal = sumArr(grupoMeses)
                return (
                  <>
                    {/* GRUPO */}
                    <tr className="cursor-pointer bg-blue-950 hover:bg-blue-900 transition-colors" onClick={() => setGrupoAberto(v => !v)}>
                      <td className="px-3 py-2.5 text-white font-bold sticky left-0 bg-blue-950 z-10 whitespace-nowrap">
                        <div className="flex items-center gap-2">{grupoAberto ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}🏢 Grupo Caiobá</div>
                      </td>
                      {grupoMeses.map((v,i) => <td key={i} className="px-1 py-2.5 text-right text-xs font-bold text-blue-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-amber-300 bg-blue-900 whitespace-nowrap">{grupoTotal > 0 ? fmtBRL(grupoTotal) : '—'}</td>
                      <td/>
                    </tr>

                    {grupoAberto && Object.entries(tree).map(([empId, emp]) => {
                      const empMeses = aggEmp(emp, vField); const empTotal = sumArr(empMeses)
                      return (
                        <React.Fragment key={empId}>
                          <tr className="cursor-pointer bg-indigo-700 hover:bg-indigo-600 transition-colors" onClick={() => toggle(expandedEmpresas, setExpandedEmpresas, empId)}>
                            <td className="px-3 py-2 text-white font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-4">
                                {expandedEmpresas.has(empId) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                {emp.nome}
                              </div>
                            </td>
                            {empMeses.map((v,i) => <td key={i} className="px-1 py-2 text-right text-xs font-semibold text-indigo-200 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                            <td className="px-2 py-2 text-right text-xs font-bold text-amber-300 bg-indigo-800 whitespace-nowrap">{empTotal>0?fmtBRL(empTotal):'—'}</td>
                            <td/>
                          </tr>

                          {expandedEmpresas.has(empId) && Object.entries(emp.depts).map(([deptId, dept]) => {
                            const dKey = `${empId}§${deptId}`; const dMeses = aggDept(dept, vField); const dTotal = sumArr(dMeses)
                            return (
                              <React.Fragment key={deptId}>
                                <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors" onClick={() => toggle(expandedDepts, setExpandedDepts, dKey)}>
                                  <td className="px-3 py-1.5 text-slate-800 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-8">{expandedDepts.has(dKey)?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<span className="text-slate-500 font-normal mr-0.5">Departamento:</span><span className="font-bold">{dept.nome}</span></div></td>
                                  {dMeses.map((v,i) => <td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                  <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{dTotal>0?fmtBRL(dTotal):'—'}</td>
                                  <td/>
                                </tr>

                                {expandedDepts.has(dKey) && Object.entries(dept.setores).map(([sId, setor]) => {
                                  const sKey = `${dKey}§${sId}`; const sMeses = aggSetor(setor, vField); const sTotal = sumArr(sMeses)
                                  const sMesesFat = aggSetor(setor, 'meta_faturamento')
                                  const setorTemValor = sMesesFat.some(v => v > 0)
                                  const setorDistribuido = setorTemValor && sMesesFat.every((v, i) => {
                                    if (v <= 0) return true
                                    const pct = distribuidoPctPorSetorMes[`${empId}|${sId}|${i+1}`] || 0
                                    return pct >= 99.9
                                  })
                                  return (
                                    <React.Fragment key={sId}>
                                      <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => toggle(expandedSetores, setExpandedSetores, sKey)}>
                                        <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap">
                                          <div className="flex items-center gap-2 pl-12">
                                            {expandedSetores.has(sKey)?<ChevronDown size={12}/>:<ChevronRight size={12}/>}
                                            <span className="text-slate-400 mr-0.5">Setor:</span>
                                            <span className="font-semibold text-slate-700">{setor.nome}</span>
                                          </div>
                                        </td>
                                        {sMeses.map((v,i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-600 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{sTotal>0?fmtBRL(sTotal):'—'}</td>
                                        <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                          {setorTemValor && (() => {
                                            const statusLabel = setorDistribuido ? 'DISTRIBUIDO' : 'AGUARDANDO'
                                            return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_CLS[statusLabel]||'bg-slate-100 text-slate-500'}`}>{STATUS_DISPLAY[statusLabel] || statusLabel}</span>
                                          })()}
                                        </td>
                                      </tr>

                                      {expandedSetores.has(sKey) && Object.entries(setor.boxes).map(([bId, box]) => {
                                        const bKey = `${sKey}§${bId}`; const bMeses = aggBox(box, vField); const bTotal = sumArr(bMeses)
                                        return (
                                          <React.Fragment key={bId}>
                                            <tr className="cursor-pointer bg-white hover:bg-amber-50/30 border-b border-slate-100 transition-colors" onClick={() => toggle(expandedBoxes, setExpandedBoxes, bKey)}>
                                              <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-16">{expandedBoxes.has(bKey)?<ChevronDown size={11}/>:<ChevronRight size={11}/>}<span className="text-slate-400 mr-0.5">Box:</span><span className="font-semibold text-slate-600">{box.nome}</span></div></td>
                                              {bMeses.map((v,i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-500 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                              <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{bTotal>0?fmtBRL(bTotal):'—'}</td>
                                              <td/>
                                            </tr>

                                            {expandedBoxes.has(bKey) && Object.entries(box.colabs).map(([colabId, colab]) => {
                                              const colMeses = aggColabs({x:colab}, vField); const colTotal = sumArr(colMeses)
                                              return (
                                                <tr key={colabId} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                                                    <div className="pl-20 font-semibold text-indigo-600 whitespace-nowrap cursor-pointer hover:text-indigo-800 hover:underline select-none"
                                                      onClick={() => abrirVisualizar(empId, colabId)}>
                                                      {colab.nome}
                                                    </div>
                                                  </td>
                                                  {Array.from({ length: 12 }, (_, i) => {
                                                    const md = colab.meses[i+1]
                                                    return (
                                                      <td key={i} className={`p-1 border-l border-slate-100 text-right text-xs font-mono ${md ? '' : 'bg-slate-50'}`}>
                                                        {md
                                                          ? <div className="relative"><span className={Number(md[vField])>0 ? 'text-slate-800' : 'text-slate-300'}>{Number(md[vField])>0 ? fmtBRL(md[vField]) : '—'}</span>
                                                              {cellState(md.meta_faturamento, md.meta_aprovada)==='new' && <span className="absolute -top-1.5 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white"><Sparkles size={8}/></span>}
                                                              {cellState(md.meta_faturamento, md.meta_aprovada)==='changed' && <span className="absolute -top-1.5 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-white"><Pencil size={8}/></span>}
                                                            </div>
                                                          : <span className="text-slate-300">—</span>}
                                                      </td>
                                                    )
                                                  })}
                                                  <td className="px-2 py-2 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{colTotal>0?fmtBRL(colTotal):'—'}</td>
                                                  <td/>
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

      {/* MODAL ADICIONAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{modoModal === 'editar' ? 'Editar Mecânico — Metas Serviços' : modoModal === 'visualizar' ? 'Visualizar Mecânico — Metas Serviços' : 'Adicionar Mecânico — Metas Serviços'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="overflow-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3"><label className={LBL}>Empresa *</label>
                  <select name="empresa_id" className={SEL} value={form.empresa_id} onChange={handleFormChange} disabled={modoModal === 'editar' || modoModal === 'visualizar'}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia||e.nome_empresa}</option>)}
                  </select></div>
                <div><label className={LBL}>Ano *</label>
                  <select name="ano" className={SEL} value={form.ano} onChange={handleFormChange} disabled={modoModal === 'editar' || modoModal === 'visualizar'}>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={LBL}>Departamento</label>
                  <select name="departamento_id" className={SEL} value={form.departamento_id} onChange={handleFormChange} disabled>
                    <option value="">Selecione...</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome_departamento}</option>)}
                  </select></div>
                <div><label className={LBL}>Setor</label>
                  <select name="setor_id" className={SEL} value={form.setor_id} onChange={handleFormChange} disabled={!form.departamento_id || modoModal === 'visualizar'}>
                    <option value="">Selecione...</option>
                    {setoresDoDepto.map(s => <option key={s.id} value={s.id}>{s.nome_setor}</option>)}
                  </select></div>
                <div><label className={LBL}>Box</label>
                  <select name="box_id" className={SEL} value={form.box_id} onChange={handleFormChange} disabled={!form.setor_id || modoModal === 'visualizar'}>
                    <option value="">Nenhum</option>
                    {boxesDoSetor.map(b => <option key={b.id} value={b.id}>{b.nome_box}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="col-span-2"><label className={LBL}>Colaborador *</label>
                  {(!form.empresa_id || modoModal === 'editar' || modoModal === 'visualizar') ? (
                    <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{form.colaborador_nome || '—'}</div>
                  ) : (
                    <SearchCombobox
                      value={form.colaborador_id}
                      onChange={(id) => handleFormChange({ target: { name: 'colaborador_id', value: id } })}
                      placeholder="Selecione..."
                      emptyOptionLabel="Selecione..."
                      searchPlaceholder="Buscar pelo nome ou cargo..."
                      notFoundLabel="Nenhum colaborador encontrado."
                      opcoes={[
                        { id: 'A_CONTRATAR', nome_funcionario: 'A contratar' },
                        { id: 'PROD_NAO_ASSOC_FUN', nome_funcionario: 'Produtivo Não Associado Funilaria' },
                        ...funcsEmp,
                      ]}
                      getLabel={(o) => {
                        if (o.id === 'A_CONTRATAR' || o.id === 'PROD_NAO_ASSOC_FUN') return o.nome_funcionario
                        const cargoNome = cargosPorId[o.cargo_id]?.nome_cargo
                        return (
                          <>
                            {o.nome_funcionario}
                            {cargoNome ? <span className="text-slate-400"> — {cargoNome}</span> : ''}
                            {o.ativo === false && <span className="text-red-500 font-semibold"> (Inativo)</span>}
                          </>
                        )
                      }}
                      getSearchText={(o) => `${o.nome_funcionario} ${cargosPorId[o.cargo_id]?.nome_cargo || ''}`}
                    />
                  )}
                </div>
                <div>
                  <label className={LBL}>Data Admissão</label>
                  <div className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 ${!form.data_admissao ? 'text-slate-400 italic' : ''}`}>
                    {form.data_admissao
                      ? (() => { const [y,m,d] = form.data_admissao.split('-'); return `${d}/${m}/${y}` })()
                      : 'Selecione o colaborador'}
                  </div>
                </div>
              </div>

              {/* GRADE DE MESES */}
              {!form.colaborador_id ? (
                <div className="flex items-center justify-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                  Selecione um colaborador para habilitar o preenchimento de metas
                </div>
              ) : form.colaborador_id === 'PROD_NAO_ASSOC_FUN' ? (
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Metas por Mês</span>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="border-separate border-spacing-1 p-1" style={{ minWidth: '1400px' }}>
                      <thead>
                        <tr>
                          <th className="w-36 text-left text-xs text-slate-500 font-semibold px-1">Campo</th>
                          {MESES_ABR.map((m,i) => <th key={i} className="w-24 text-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1 py-1">{m}</th>)}
                          <th className="w-28 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-1">Total Ano</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-xs font-semibold text-emerald-700 px-1 whitespace-nowrap">Meta Serviços (R$)</td>
                          {mesesForm.map((m, i) => (
                            <td key={i} className={`border rounded p-1 ${modoModal === 'editar' ? 'bg-white border-emerald-300' : 'bg-emerald-50 border-emerald-100'}`}>
                              {modoModal === 'editar'
                                ? <BRLInput value={m.meta_servicos} onChange={v => setMesesForm(prev => prev.map((x,xi) => xi===i ? {...x, meta_servicos: v} : x))} />
                                : <span className="text-xs text-right block text-emerald-700 font-mono">{m.meta_servicos > 0 ? fmtBRL(m.meta_servicos) : '—'}</span>
                              }
                            </td>
                          ))}
                          <td className="bg-emerald-50 border border-emerald-200 rounded p-1 text-right text-xs font-bold text-emerald-700">{fmtBRL(mesesForm.reduce((s,m)=>s+(Number(m.meta_servicos)||0),0))}</td>
                        </tr>
                        <tr>
                          <td className="text-xs font-semibold text-blue-700 px-1 whitespace-nowrap">Meta Peças (R$)</td>
                          {mesesForm.map((m, i) => (
                            <td key={i} className={`border rounded p-1 ${modoModal === 'editar' ? 'bg-white border-blue-300' : 'bg-blue-50 border-blue-100'}`}>
                              {modoModal === 'editar'
                                ? <BRLInput value={m.meta_pecas} onChange={v => setMesesForm(prev => prev.map((x,xi) => xi===i ? {...x, meta_pecas: v} : x))} />
                                : <span className="text-xs text-right block text-blue-700 font-mono">{m.meta_pecas > 0 ? fmtBRL(m.meta_pecas) : '—'}</span>
                              }
                            </td>
                          ))}
                          <td className="bg-blue-50 border border-blue-200 rounded p-1 text-right text-xs font-bold text-blue-700">{fmtBRL(mesesForm.reduce((s,m)=>s+(Number(m.meta_pecas)||0),0))}</td>
                        </tr>
                        <tr>
                          <td className="text-xs font-bold text-indigo-700 px-1 whitespace-nowrap">Meta Total (R$)</td>
                          {mesesForm.map((m, i) => {
                            const v = (Number(m.meta_servicos)||0) + (Number(m.meta_pecas)||0)
                            return <td key={i} className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                          })}
                          <td className="bg-indigo-100 border border-indigo-300 rounded p-1 text-right text-xs font-bold text-indigo-800">{fmtBRL(mesesForm.reduce((s,m)=>s+(Number(m.meta_servicos)||0)+(Number(m.meta_pecas)||0),0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Dados por Mês</span>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="border-separate border-spacing-1 p-1" style={{ minWidth: '1400px' }}>
                    <thead>
                      <tr>
                        <th className="w-36 text-left text-xs text-slate-500 font-semibold px-1">Campo</th>
                        {MESES_ABR.map((m,i) => <th key={i} className="w-24 text-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1 py-1">{m}</th>)}
                        <th className="w-28 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-1">Total Ano</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderMesRows()}
                      {/* Meta Serviços calculada */}
                      <tr>
                        <td className="text-xs font-semibold text-emerald-700 px-1 whitespace-nowrap">Meta Serviços (R$)</td>
                        {mesesForm.map((m, i) => {
                          const v = isMesLocked(i) ? 0 : calcMetaMes(m).meta_servicos
                          return <td key={i} className="bg-emerald-50 border border-emerald-100 rounded p-1 text-right text-xs font-mono text-emerald-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-emerald-50 border border-emerald-200 rounded p-1 text-right text-xs font-bold text-emerald-700">{fmtBRL(mesesForm.reduce((s,m,i)=>s+(isMesLocked(i)?0:calcMetaMes(m).meta_servicos),0))}</td>
                      </tr>
                      <tr>
                        <td className="text-xs font-semibold text-blue-700 px-1 whitespace-nowrap">Meta Peças (R$)</td>
                        {mesesForm.map((m, i) => {
                          const v = isMesLocked(i) ? 0 : calcMetaMes(m).meta_pecas
                          return <td key={i} className="bg-blue-50 border border-blue-100 rounded p-1 text-right text-xs font-mono text-blue-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-blue-50 border border-blue-200 rounded p-1 text-right text-xs font-bold text-blue-700">{fmtBRL(mesesForm.reduce((s,m,i)=>s+(isMesLocked(i)?0:calcMetaMes(m).meta_pecas),0))}</td>
                      </tr>
                      <tr>
                        <td className="text-xs font-bold text-indigo-700 px-1 whitespace-nowrap">Meta Total (R$)</td>
                        {mesesForm.map((m, i) => {
                          const v = isMesLocked(i) ? 0 : calcMetaMes(m).meta_faturamento
                          return <td key={i} className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-indigo-100 border border-indigo-300 rounded p-1 text-right text-xs font-bold text-indigo-800">{fmtBRL(mesesForm.reduce((s,m,i)=>s+(isMesLocked(i)?0:calcMetaMes(m).meta_faturamento),0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>}
            </div>
            {erroModal && <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"><AlertTriangle size={15}/> {erroModal}</div>}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-200">
              {modoModal === 'visualizar' ? (
                <>
                  <div className="flex gap-2">
                    {canEdit && (
                      <button onClick={() => setModoModal('editar')} className={BTN_SEC}>
                        <Edit2 size={14}/> Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => { setModalAberto(false); setColabExcluir({ colaborador_id: form.colaborador_id, empresa_id: form.empresa_id, nome: form.colaborador_nome }); setModalExcluirAberto(true) }}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                        <Trash2 size={14}/> Excluir
                      </button>
                    )}
                  </div>
                  <button onClick={() => setModalAberto(false)} className={BTN_SEC}>Fechar</button>
                </>
              ) : (
                <>
                  <div/>
                  <div className="flex gap-3">
                    <button onClick={() => setModalAberto(false)} className={BTN_SEC} disabled={salvando}>Cancelar</button>
                    <button onClick={handleSalvar} className={BTN_PRI} disabled={salvando}>{salvando ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : modoModal === 'editar' ? 'Salvar Alterações' : 'Adicionar'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={28} className="text-red-600"/></div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Excluir Mecânico</h2>
              <p className="text-sm text-slate-500">Todos os meses de <strong>{colabExcluir?.nome}</strong> para <strong>{filtroAno}</strong> serão excluídos.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalExcluirAberto(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleExcluir} className="inline-flex items-center justify-center gap-2 flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"><Trash2 size={15}/> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
