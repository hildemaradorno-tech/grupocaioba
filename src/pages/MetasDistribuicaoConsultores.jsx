import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, Trash2, X, AlertTriangle, ChevronRight, ChevronDown, Users, Loader2, CheckCircle2, Sparkles, Pencil, Info, Cog, Paintbrush, FileText, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtBRL = (v) => { const n = Number(v); if (!v && v !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
const fmtPct = (v) => { const n = Number(v); if (!n && n !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%' }

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const SEL = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const STATUS_CLS = { 'AGUARDANDO APROVACAO': 'bg-amber-100 text-amber-700', 'APROVADO': 'bg-green-100 text-green-700' }
const STATUS_DISPLAY = { 'AGUARDANDO APROVACAO': 'Aguard. Aprovação', 'APROVADO': 'Aprovado', 'REPROVADO': 'Reprovado' }

const FORM_VAZIO     = { empresa_id: '', empresa_nome: '', departamento_id: '', departamento_nome: '', setor_id: '', setor_nome: '', cargo_id: '', cargo_nome: '', colaborador_id: '', colaborador_nome: '', ano: anoAtual }
const FORM_DMS_VAZIO = { empresa_id: '', empresa_nome: '', colaborador_id: '', colaborador_nome: '', cargo_id: '', cargo_nome: '', box_id: '', box_nome: '', departamento_id: '', departamento_nome: '', setor_id: '', setor_nome: '', ano: anoAtual }
const mesesVazios    = () => Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, percentual: '' }))
const mesesDmsVazios = () => Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, meta_faturamento: '' }))

const TABS = [
  { key: 'servicos',  label: 'Consultor de Serviços',       icon: Cog,       desc: 'Mecânica + Terceiros' },
  { key: 'funilaria', label: 'Consultor Funilaria/Pintura',  icon: Paintbrush, desc: 'Funilaria e Pintura' },
  { key: 'dms',       label: 'Consultor Plano DMS',          icon: FileText,   desc: 'Planos DMS' },
]

function ValorInput({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw]         = useState('')
  const fmt = (v) => { const n = Number(v); if (!n && n !== 0) return ''; return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
  const displayed = focused ? raw : (value || value === 0 ? fmt(value) : '')
  return (
    <input type="text" inputMode="decimal" value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { setRaw(value != null ? String(value).replace('.', ',') : ''); setFocused(true) }}
      onBlur={() => { setFocused(false); onChange(parseFloat(String(raw).replace(',', '.')) || 0) }}
      placeholder="0"
      className="w-full text-xs text-right outline-none bg-transparent text-slate-800" />
  )
}

function PctInput({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const fmt = (v) => { const n = Number(v); if (!n && n !== 0) return ''; return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) }
  const displayed = focused ? raw : (value || value === 0 ? fmt(value) : '')
  return (
    <input type="text" inputMode="decimal" value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { setRaw(value != null ? String(value).replace('.', ',') : ''); setFocused(true) }}
      onBlur={() => { setFocused(false); onChange(parseFloat(String(raw).replace(',', '.')) || 0) }}
      placeholder="0,0"
      className="w-full text-xs text-center outline-none bg-transparent text-slate-800" />
  )
}

export default function MetasDistribuicaoConsultores() {
  const navigate = useNavigate()
  const [empresas,     setEmpresas]     = useState([])
  const [departamentos,setDepartamentos]= useState([])
  const [setores,      setSetores]      = useState([])
  const [boxes,        setBoxes]        = useState([])
  const [cargos,       setCargos]       = useState([])
  const [funcionarios, setFuncionarios] = useState([])

  const [dados,      setDados]      = useState([])
  const [totaisMec,  setTotaisMec]  = useState({})
  const [totaisTer,  setTotaisTer]  = useState({})
  const [totaisFun,  setTotaisFun]  = useState({})

  const [abaAtiva,        setAbaAtiva]        = useSessionState('mdc_aba', 'servicos')
  const [filtroVisu,      setFiltroVisu]      = useSessionState('mdc_visu', 'total')
  const [filtroEmpresa,   setFiltroEmpresa]   = useSessionState('mdc_empresa', '')
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/pos-vendas/distribuicao-consultores', 'editar')
  const canDelete = hasPermission('/metas/pos-vendas/distribuicao-consultores', 'excluir')
  const [filtroAno,       setFiltroAno]       = useSessionState('mdc_ano', anoAtual)
  const [filtroDepto,     setFiltroDepto]     = useState('')
  const [filtroSetor,     setFiltroSetor]     = useState('')
  const [filtroBox,       setFiltroBox]       = useState('')
  const [filtroCargo,     setFiltroCargo]     = useState('')
  const [filtroProdutivo, setFiltroProdutivo] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)

  const [grupoAberto,       setGrupoAberto]       = useState(true)
  const [expandedEmpresas,  setExpandedEmpresas]  = useState(new Set())
  const [expandedDepts,     setExpandedDepts]     = useState(new Set())
  const [expandedSetores,   setExpandedSetores]   = useState(new Set())
  const [expandedBoxes,     setExpandedBoxes]     = useState(new Set())
  const [expandedCargos,    setExpandedCargos]    = useState(new Set())

  const [modalAberto,        setModalAberto]        = useState(false)
  const [modalDmsAberto,     setModalDmsAberto]     = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalAprovar,       setModalAprovar]       = useState(null)
  const [form,               setForm]               = useState(FORM_VAZIO)
  const [formDms,            setFormDms]            = useState(FORM_DMS_VAZIO)
  const [mesesForm,          setMesesForm]          = useState(mesesVazios())
  const [mesesDmsForm,       setMesesDmsForm]       = useState(mesesDmsVazios())
  const [mecTotaisModal,     setMecTotaisModal]     = useState({})
  const [colabExcluir,       setColabExcluir]       = useState(null)
  const [salvando,           setSalvando]           = useState(false)
  const [erroModal,          setErroModal]          = useState(null)
  const [aprovandoEmpId,     setAprovandoEmpId]     = useState(null)

  useEffect(() => { loadLookups() }, [])
  useEffect(() => { loadDados() }, [filtroEmpresa, filtroAno])

  const sortNome = (arr, f) => [...arr].sort((a, b) => (a[f] || '').localeCompare(b[f] || ''))

  const loadLookups = async () => {
    try {
      const [emps, depts, sets, bxs, cargs, funcs] = await Promise.all([
        apiService.getEmpresas(), apiService.getDepartamentos(), apiService.getSetores(),
        apiService.getBox(), apiService.getCargos(), apiService.getFuncionarios(),
      ])
      setEmpresas(sortNome(emps, 'empresa_fantasia'))
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
      const [rows, todasEmpresas, terRows, funRows] = await Promise.all([
        apiService.getMetasConsultor(filtroEmpresa || null, filtroAno),
        apiService.getEmpresas(),
        apiService.getMetasTerceiros(filtroEmpresa || null, filtroAno),
        apiService.getMetasFunilaria(filtroEmpresa || null, filtroAno),
      ])
      setDados(rows)
      const empIds = filtroEmpresa ? [filtroEmpresa] : todasEmpresas.map(e => e.id)
      const mecMap = {}
      await Promise.all(empIds.map(async eid => {
        mecMap[eid] = await apiService.getMetasMecanicoTotaisPorMes(eid, filtroAno)
      }))
      setTotaisMec(mecMap)
      const terMap = {}
      terRows.forEach(r => {
        if (!terMap[r.empresa_id]) terMap[r.empresa_id] = {}
        terMap[r.empresa_id][r.mes] = (terMap[r.empresa_id][r.mes] || 0) + (Number(r.meta_servicos) || 0)
      })
      setTotaisTer(terMap)
      const funMap = {}
      funRows.forEach(r => {
        if (!funMap[r.empresa_id]) funMap[r.empresa_id] = {}
        if (!funMap[r.empresa_id][r.mes]) funMap[r.empresa_id][r.mes] = { servicos: 0, pecas: 0 }
        funMap[r.empresa_id][r.mes].servicos += Number(r.meta_servicos) || 0
        funMap[r.empresa_id][r.mes].pecas    += Number(r.meta_pecas)    || 0
      })
      setTotaisFun(funMap)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  const toggle = (set, setter, key) => setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const tudoExpandido = grupoAberto &&
    [...new Set([...empresasComRef, ...Object.keys(tree)])].length > 0 &&
    [...new Set([...empresasComRef, ...Object.keys(tree)])].every(eid => expandedEmpresas.has(eid))

  const expandirTudo = () => {
    setGrupoAberto(true)
    const emps = new Set(), depts = new Set(), sets = new Set(), bxs = new Set(), cars = new Set()
    const empIds = [...new Set([...empresasComRef, ...Object.keys(tree)])]
    empIds.forEach(empId => {
      emps.add(empId)
      const emp = tree[empId]
      if (!emp || Object.keys(emp.depts || {}).length === 0) {
        // virtual keys
        depts.add(`${empId}§vdept`)
        sets.add(`${empId}§vsetor`)
        bxs.add(`${empId}§vbox`)
      } else {
        Object.entries(emp.depts).forEach(([deptId, dept]) => {
          const dKey = `${empId}§${deptId}`; depts.add(dKey)
          Object.entries(dept.setores || {}).forEach(([sId, setor]) => {
            const sKey = `${dKey}§${sId}`; sets.add(sKey)
            Object.entries(setor.boxes || {}).forEach(([bId, box]) => {
              const bKey = `${sKey}§${bId}`; bxs.add(bKey)
              Object.values(box.cargos || {}).forEach(cargo => cars.add(`${empId}§cargo§${cargo.nome}`))
            })
          })
        })
      }
    })
    setExpandedEmpresas(emps); setExpandedDepts(depts); setExpandedSetores(sets)
    setExpandedBoxes(bxs); setExpandedCargos(cars)
  }

  const recolherTudo = () => {
    setGrupoAberto(false)
    setExpandedEmpresas(new Set()); setExpandedDepts(new Set()); setExpandedSetores(new Set())
    setExpandedBoxes(new Set()); setExpandedCargos(new Set())
  }

  // Mapa box_id → nome_box atual (dim_box), para classificar linhas mesmo quando box_nome armazenado está desatualizado
  const boxNomeMap = useMemo(() => Object.fromEntries(boxes.map(b => [b.id, (b.nome_box || '').toLowerCase()])), [boxes])

  const isFunRow = (r) => {
    const stored = (r.box_nome || '').toLowerCase()
    if (stored.includes('funilaria') || stored.includes('pintura')) return true
    const current = boxNomeMap[r.box_id] || ''
    return current.includes('funilaria') || current.includes('pintura')
  }
  const isDmsRow = (r) => {
    const stored = `${r.setor_nome || ''} ${r.box_nome || ''}`.toLowerCase()
    if (stored.includes('plano') || stored.includes('dms')) return true
    const current = boxNomeMap[r.box_id] || ''
    return current.includes('plano') || current.includes('dms')
  }

  const dadosDms      = useMemo(() => dados.filter(r => isDmsRow(r)),                  [dados, boxNomeMap])
  const dadosServicos = useMemo(() => dados.filter(r => !isFunRow(r) && !isDmsRow(r)), [dados, boxNomeMap])
  const dadosFunilaria= useMemo(() => dados.filter(r => isFunRow(r)),                  [dados, boxNomeMap])

  const dadosAbaAtiva = abaAtiva === 'funilaria' ? dadosFunilaria : abaAtiva === 'dms' ? dadosDms : dadosServicos

  const dadosAtivos = useMemo(() => dadosAbaAtiva.filter(r => {
    if (filtroDepto     && r.departamento_nome !== filtroDepto) return false
    if (filtroSetor     && r.setor_nome        !== filtroSetor) return false
    if (filtroBox       && r.box_nome          !== filtroBox)   return false
    if (filtroCargo     && r.cargo_nome        !== filtroCargo) return false
    if (filtroProdutivo === 'sim' && !r.colaborador_nome) return false
    return true
  }), [dadosAbaAtiva, filtroDepto, filtroSetor, filtroBox, filtroCargo, filtroProdutivo])

  const optsDepto  = useMemo(() => [...new Set(dadosAbaAtiva.map(r => r.departamento_nome).filter(Boolean))].sort(), [dadosAbaAtiva])
  const optsSetor  = useMemo(() => [...new Set(dadosAbaAtiva.map(r => r.setor_nome).filter(Boolean))].sort(),        [dadosAbaAtiva])
  const optsBox    = useMemo(() => [...new Set(dadosAbaAtiva.map(r => r.box_nome).filter(Boolean))].sort(),          [dadosAbaAtiva])
  const optsCargo  = useMemo(() => [...new Set(dadosAbaAtiva.map(r => r.cargo_nome).filter(Boolean))].sort(),        [dadosAbaAtiva])

  const tree = useMemo(() => {
    // Lookup maps from dimension tables — nomes sempre atualizados
    const deptMap  = Object.fromEntries(departamentos.map(d => [d.id, d.nome_departamento]))
    const setorMap = Object.fromEntries(setores.map(s => [s.id, s.nome_setor]))
    const boxMap   = Object.fromEntries(boxes.map(b => [b.id, b.nome_box]))
    const cargoMap = Object.fromEntries(cargos.map(c => [c.id, c.nome_cargo]))
    const funcMap  = Object.fromEntries(funcionarios.map(f => [f.id, f.nome_funcionario]))

    // Mapa box_id → setor_id atual (via dim_box.setor_ids), para re-roteamento de setores orphaned
    const boxToSetorMap = {}
    boxes.forEach(bx => {
      const ids = Array.isArray(bx.setor_ids) ? bx.setor_ids : (bx.setor_id ? [bx.setor_id] : [])
      const validSetor = ids.find(sid => setorMap[sid])
      if (validSetor) boxToSetorMap[bx.id] = validSetor
    })
    const t = {}
    dadosAtivos.forEach(row => {
      // Box ou cargo deletado — descarta a linha
      if (row.box_id   && !boxMap[row.box_id])     return
      if (row.cargo_id && !cargoMap[row.cargo_id]) return

      const eid  = row.empresa_id
      const did  = row.departamento_id || '—'
      const bId  = row.box_id   || '—'
      const cId  = row.cargo_id || '—'
      const colid = row.colaborador_id

      // Setor: SEMPRE resolve pelo vínculo atual do box em dim_box (ignora setor_id armazenado na linha)
      const sId = (row.box_id && boxToSetorMap[row.box_id])
        || (row.setor_id && setorMap[row.setor_id] ? row.setor_id : null)
        || '—'
      if (!setorMap[sId]) return

      const dNome  = deptMap[did]   || '—'
      const sNome  = setorMap[sId]  || '—'
      const bNome  = boxMap[bId]    || '—'
      const cNome  = cargoMap[cId]  || '—'
      const coNome = funcMap[colid] || row.colaborador_nome || colid

      if (!t[eid]) t[eid] = { nome: row.empresa_nome || eid, depts: {} }
      const depts = t[eid].depts
      if (!depts[did]) depts[did] = { nome: dNome, setores: {} }
      depts[did].nome = dNome
      const stMap = depts[did].setores
      if (!stMap[sId]) stMap[sId] = { nome: sNome, boxes: {} }
      if (!stMap[sId].boxes[bId]) stMap[sId].boxes[bId] = { nome: bNome, cargos: {} }
      if (!stMap[sId].boxes[bId].cargos[cId]) stMap[sId].boxes[bId].cargos[cId] = { nome: cNome, colabs: {} }
      const coMap = stMap[sId].boxes[bId].cargos[cId].colabs
      if (!coMap[colid]) coMap[colid] = { nome: coNome, meses: {} }
      let _metaCalc = row.meta_faturamento
      if (abaAtiva !== 'dms') {
        const _mec = totaisMec[eid]?.[row.mes] || {}
        const _ter = Number(totaisTer[eid]?.[row.mes]) || 0
        const _fun = totaisFun[eid]?.[row.mes] || {}
        const _ref = abaAtiva === 'funilaria'
          ? (_fun.servicos || 0) + (_fun.pecas || 0)
          : (_mec.servicos || 0) + (_mec.pecas || 0) + _ter
        _metaCalc = _ref * ((Number(row.percentual) || 0) / 100)
      }
      coMap[colid].meses[row.mes] = {
        id: row.id, percentual: row.percentual,
        meta_faturamento: _metaCalc, meta_aprovada: row.meta_aprovada ?? null,
      }
    })
    return t
  }, [dadosAtivos, abaAtiva, totaisMec, totaisTer, totaisFun, departamentos, setores, boxes, cargos, funcionarios])

  const getRef = (empId, mes) => {
    if (abaAtiva === 'dms') {
      return dadosDms
        .filter(r => r.empresa_id === empId && r.mes === mes && r.ano === Number(filtroAno))
        .reduce((s, r) => s + (Number(r.meta_faturamento) || 0), 0)
    }
    if (abaAtiva === 'funilaria') {
      const f = totaisFun[empId]?.[mes] || {}
      if (filtroVisu === 'servicos') return f.servicos || 0
      if (filtroVisu === 'pecas')    return f.pecas    || 0
      return (f.servicos || 0) + (f.pecas || 0)
    }
    const mec = totaisMec[empId]?.[mes] || {}
    const ter = Number(totaisTer[empId]?.[mes]) || 0
    if (filtroVisu === 'servicos') return (mec.servicos || 0) + ter
    if (filtroVisu === 'pecas')    return  mec.pecas    || 0
    return (mec.servicos || 0) + (mec.pecas || 0) + ter
  }

  const getDistribuido = (empId, mes) => {
    const rows = abaAtiva === 'funilaria' ? dadosFunilaria : abaAtiva === 'dms' ? dadosDms : dadosServicos
    return rows
      .filter(r => r.empresa_id === empId && r.mes === mes && r.ano === Number(filtroAno))
      .reduce((s, r) => s + (Number(r.meta_faturamento) || 0), 0)
  }

  const sumArr = (a) => a.reduce((s, v) => s + v, 0)

  const aggColabsMeses = (colabsMap) => {
    const a = Array(12).fill(0)
    Object.values(colabsMap).forEach(c => Object.entries(c.meses).forEach(([m, d]) => { a[+m - 1] += Number(d.meta_faturamento) || 0 }))
    return a
  }
  const aggCargo = (ca) => aggColabsMeses(ca.colabs)
  const aggBox   = (bx) => { const a = Array(12).fill(0); Object.values(bx.cargos).forEach(c => aggCargo(c).forEach((v, i) => { a[i] += v })); return a }
  const aggSetor = (st) => { const a = Array(12).fill(0); Object.values(st.boxes).forEach(b => aggBox(b).forEach((v, i) => { a[i] += v })); return a }
  const aggDept  = (d)  => { const a = Array(12).fill(0); Object.values(d.setores).forEach(s => aggSetor(s).forEach((v, i) => { a[i] += v })); return a }

  const empresasComRef = useMemo(() => {
    const all = new Set()
    if (abaAtiva === 'funilaria') Object.keys(totaisFun).forEach(eid => all.add(eid))
    else if (abaAtiva !== 'dms') { Object.keys(totaisMec).forEach(eid => all.add(eid)); Object.keys(totaisTer).forEach(eid => all.add(eid)) }
    Object.keys(tree).forEach(eid => all.add(eid))
    return [...all]
  }, [tree, totaisMec, totaisTer, totaisFun, abaAtiva])

  const grupoRefMeses = useMemo(() => {
    const a = Array(12).fill(0)
    empresasComRef.forEach(eid => { for (let m = 1; m <= 12; m++) { a[m - 1] += getRef(eid, m) } })
    return a
  }, [empresasComRef, totaisMec, totaisTer, totaisFun, abaAtiva, filtroVisu])

  const boxesDoSetor = useMemo(() => boxes.filter(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(form.setor_id)), [boxes, form.setor_id])

  const isFunNome = (nome) => {
    const n = (nome || '').toLowerCase()
    return n.includes('funilaria') || n.includes('pintura')
  }

  const funcsEmp = useMemo(() => {
    let lista = funcionarios
    if (form.empresa_id) lista = lista.filter(f => f.empresa_id === form.empresa_id)
    if (form.setor_id) {
      lista = lista.filter(f => (f.setor_ids || [f.setor_id]).includes(form.setor_id))
    } else if (abaAtiva === 'funilaria') {
      lista = lista.filter(f => {
        const sNomes = (f.setor_ids || []).map(sid => setores.find(s => s.id === sid)?.nome_setor || '')
        return sNomes.some(isFunNome)
      })
    }
    if (form.cargo_id) {
      lista = lista.filter(f => f.cargo_id === form.cargo_id)
    } else if (abaAtiva === 'funilaria') {
      lista = lista.filter(f => isFunNome(cargos.find(c => c.id === f.cargo_id)?.nome_cargo))
    }
    if (form.box_id) {
      lista = lista.filter(f => f.box_id === form.box_id)
    } else if (abaAtiva === 'funilaria') {
      lista = lista.filter(f => isFunNome(boxes.find(b => b.id === f.box_id)?.nome_box))
    }
    return lista
  }, [funcionarios, form.empresa_id, form.setor_id, form.cargo_id, form.box_id, abaAtiva, setores, cargos, boxes])

  const refModalPorMes = useMemo(() => {
    const result = {}
    for (let m = 1; m <= 12; m++) {
      if (abaAtiva === 'funilaria') {
        const f = totaisFun[form.empresa_id]?.[m] || {}
        const pecas    = Number(f.pecas)    || 0
        const servicos = Number(f.servicos) || 0
        result[m] = { pecas, servicos, total: pecas + servicos }
      } else {
        const mec      = mecTotaisModal[m] || {}
        const ter      = Number(totaisTer[form.empresa_id]?.[m]) || 0
        const pecas    = Number(mec.pecas)    || 0
        const servicos = (Number(mec.servicos) || 0) + ter
        result[m] = { pecas, servicos, total: pecas + servicos }
      }
    }
    return result
  }, [mecTotaisModal, totaisTer, totaisFun, form.empresa_id, abaAtiva])

  const calcMeta = (mes, pct) => ((refModalPorMes[mes]?.total) || 0) * ((Number(pct) || 0) / 100)
  const calcMetaPecas    = (mes, pct) => ((refModalPorMes[mes]?.pecas)    || 0) * ((Number(pct) || 0) / 100)
  const calcMetaServicos = (mes, pct) => ((refModalPorMes[mes]?.servicos) || 0) * ((Number(pct) || 0) / 100)

  const pctSomadoNoMes = useMemo(() => {
    if (!form.empresa_id) return {}
    const rows = abaAtiva === 'funilaria' ? dadosFunilaria : dadosServicos
    const map = {}
    rows
      .filter(r => r.empresa_id === form.empresa_id && r.ano === Number(form.ano) && r.colaborador_id !== form.colaborador_id)
      .forEach(r => { map[r.mes] = (map[r.mes] || 0) + (Number(r.percentual) || 0) })
    return map
  }, [dadosServicos, dadosFunilaria, form.empresa_id, form.ano, form.colaborador_id, abaAtiva])

  const handleFormChange = async (e) => {
    const { name, value } = e.target
    const up = { [name]: value }
    if (name === 'empresa_id') {
      const emp = empresas.find(x => x.id === value)
      up.empresa_nome    = emp ? (emp.empresa_fantasia || emp.nome_empresa) : ''
      up.colaborador_id  = ''; up.colaborador_nome = ''
      if (value && abaAtiva !== 'funilaria') {
        try { const t = await apiService.getMetasMecanicoTotaisPorMes(value, filtroAno); setMecTotaisModal(t) } catch {}
      } else { setMecTotaisModal({}) }
    }
    if (name === 'departamento_id') {
      const dept = departamentos.find(x => x.id === value)
      up.departamento_nome = dept?.nome_departamento || ''
      up.setor_id = ''; up.setor_nome = ''; up.box_id = ''; up.box_nome = ''
      up.cargo_id = ''; up.cargo_nome = ''
    }
    if (name === 'setor_id') {
      const set = setores.find(x => x.id === value)
      up.setor_nome = set?.nome_setor || ''
      up.box_id = ''; up.box_nome = ''; up.cargo_id = ''; up.cargo_nome = ''
    }
    if (name === 'box_id')         up.box_nome         = boxes.find(x => x.id === value)?.nome_box || ''
    if (name === 'colaborador_id') up.colaborador_nome = value === 'A_CONTRATAR' ? 'A contratar' : (funcionarios.find(x => x.id === value)?.nome_funcionario || '')
    if (name === 'cargo_id')       up.cargo_nome       = cargos.find(x => x.id === value)?.nome_cargo || ''
    setForm(prev => ({ ...prev, ...up }))
  }

  const abrirIncluir = async () => {
    const emp = empresas.find(e => e.id === filtroEmpresa)
    const empBase = { ano: filtroAno, empresa_id: filtroEmpresa, empresa_nome: emp ? (emp.empresa_fantasia || emp.nome_empresa) : '' }
    setErroModal(null)
    if (abaAtiva === 'dms') {
      const deptOficina  = departamentos.find(d => (d.nome_departamento || '').toUpperCase().includes('OFICINA'))
      const setorDms     = deptOficina
        ? setores.find(s => s.departamento_id === deptOficina.id && (s.nome_setor || '').toLowerCase().includes('plano'))
        : null
      const boxDms       = boxes.find(b => (b.nome_box || '').toLowerCase().includes('plano') || (b.nome_box || '').toLowerCase().includes('dms'))
      const cargoServico = cargos.find(c => (c.nome_cargo || '').toLowerCase().includes('plano') || (c.nome_cargo || '').toLowerCase().includes('dms'))
      setFormDms({
        ...FORM_DMS_VAZIO, ...empBase,
        departamento_id:   deptOficina?.id                || '',
        departamento_nome: deptOficina?.nome_departamento || 'OFICINA',
        setor_id:          setorDms?.id                   || '',
        setor_nome:        setorDms?.nome_setor           || 'Planos DMS',
        box_id:            boxDms?.id                     || '',
        box_nome:          boxDms?.nome_box               || 'Consultor Planos DMS',
        cargo_id:          cargoServico?.id               || '',
        cargo_nome:        cargoServico?.nome_cargo       || 'Consultor Planos DMS',
      })
      setMesesDmsForm(mesesDmsVazios())
      setModalDmsAberto(true)
    } else {
      const deptOficina = departamentos.find(d => (d.nome_departamento || '').toUpperCase().includes('OFICINA'))
      let setorAlvo, boxAlvo, cargoAlvo
      if (abaAtiva === 'funilaria') {
        setorAlvo = deptOficina
          ? setores.find(s => s.departamento_id === deptOficina.id &&
              ((s.nome_setor || '').toLowerCase().includes('funilaria') || (s.nome_setor || '').toLowerCase().includes('pintura')))
          : null
        boxAlvo = setorAlvo
          ? boxes.find(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(setorAlvo.id) &&
              ((b.nome_box || '').toLowerCase().includes('funilaria') || (b.nome_box || '').toLowerCase().includes('pintura') || (b.nome_box || '').toLowerCase().includes('consultor')))
          : null
        cargoAlvo = setorAlvo
          ? cargos.find(c => (c.setor_ids || []).includes(setorAlvo.id) &&
              ((c.nome_cargo || '').toLowerCase().includes('funilaria') || (c.nome_cargo || '').toLowerCase().includes('pintura') || (c.nome_cargo || '').toLowerCase().includes('consultor')))
          : null
      } else {
        setorAlvo = deptOficina
          ? setores.find(s => s.departamento_id === deptOficina.id && s.tipo_setor === 'consultoria')
            || setores.find(s => s.departamento_id === deptOficina.id &&
                ((s.nome_setor || '').toLowerCase().includes('consultor') || (s.nome_setor || '').toLowerCase().includes('assist')))
          : null
        boxAlvo = setorAlvo
          ? boxes.find(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(setorAlvo.id) && (b.nome_box || '').toLowerCase().includes('consultor'))
          : null
        cargoAlvo = setorAlvo
          ? cargos.find(c => (c.setor_ids || []).includes(setorAlvo.id) && (c.nome_cargo || '').toLowerCase().includes('consultor'))
          : null
      }
      setForm({
        ...FORM_VAZIO, ...empBase,
        departamento_id:   deptOficina?.id                || '',
        departamento_nome: deptOficina?.nome_departamento || '',
        setor_id:          setorAlvo?.id                  || '',
        setor_nome:        setorAlvo?.nome_setor          || '',
        box_id:            boxAlvo?.id                    || '',
        box_nome:          boxAlvo?.nome_box              || '',
        cargo_id:          cargoAlvo?.id                  || '',
        cargo_nome:        cargoAlvo?.nome_cargo          || '',
      })
      setMesesForm(mesesVazios())
      if (filtroEmpresa && abaAtiva !== 'funilaria') {
        try { const t = await apiService.getMetasMecanicoTotaisPorMes(filtroEmpresa, filtroAno); setMecTotaisModal(t) } catch {}
      } else { setMecTotaisModal({}) }
      setModalAberto(true)
    }

  }

  const handleFormDmsChange = (e) => {
    const { name, value } = e.target
    const up = { [name]: value }
    if (name === 'empresa_id') {
      const emp = empresas.find(x => x.id === value)
      up.empresa_nome   = emp ? (emp.empresa_fantasia || emp.nome_empresa) : ''
      up.colaborador_id = ''; up.colaborador_nome = ''
    }
    if (name === 'colaborador_id') up.colaborador_nome = value === 'A_CONTRATAR' ? 'A contratar' : (funcionarios.find(x => x.id === value)?.nome_funcionario || '')
    if (name === 'cargo_id')       up.cargo_nome       = cargos.find(x => x.id === value)?.nome_cargo || ''
    if (name === 'box_id')         up.box_nome         = boxes.find(x => x.id === value)?.nome_box || ''
    setFormDms(prev => ({ ...prev, ...up }))
  }

  const handleSalvarDms = async () => {
    if (!formDms.empresa_id)     { setErroModal('Selecione a Empresa.'); return }
    if (!formDms.colaborador_id) { setErroModal('Selecione o Consultor.'); return }
    setSalvando(true); setErroModal(null)
    try {
      for (const m of mesesDmsForm) {
        const meta = Number(m.meta_faturamento) || 0
        await apiService.upsertMetaConsultor({
          empresa_id:        formDms.empresa_id,
          empresa_nome:      formDms.empresa_nome,
          departamento_id:   formDms.departamento_id   || '',
          departamento_nome: formDms.departamento_nome || 'OFICINA',
          setor_id:          formDms.setor_id   || '',
          setor_nome:        formDms.setor_nome || 'Planos DMS',
          box_id:            formDms.box_id   || '',
          box_nome:          formDms.box_nome || 'Plano DMS',
          cargo_id:          formDms.cargo_id   || '',
          cargo_nome:        formDms.cargo_nome || 'Consultor Planos DMS',
          colaborador_id:    formDms.colaborador_id === 'A_CONTRATAR' ? '00000000-0000-0000-0000-000000000000' : formDms.colaborador_id,
          colaborador_nome:  formDms.colaborador_nome,
          mes: m.mes, ano: Number(formDms.ano),
          percentual: 0, meta_faturamento: meta,
          dias_uteis_reais: 0, media_diaria_venda: 0,
          status: 'AGUARDANDO APROVACAO',
        })
      }
      setModalDmsAberto(false)
      await loadDados()
    } catch (err) { setErroModal(err.message || String(err)) }
    finally { setSalvando(false) }
  }

  const handleSalvar = async () => {
    if (!form.empresa_id)     { setErroModal('Selecione a Empresa.'); return }
    if (!form.colaborador_id) { setErroModal('Selecione o Consultor.'); return }
    setSalvando(true); setErroModal(null)
    try {
      for (const m of mesesForm) {
        const pct  = Number(m.percentual) || 0
        const meta = calcMeta(m.mes, pct)
        await apiService.upsertMetaConsultor({
          empresa_id:        form.empresa_id,
          empresa_nome:      form.empresa_nome,
          departamento_id:   form.departamento_id,
          departamento_nome: form.departamento_nome,
          setor_id:          form.setor_id,
          setor_nome:        form.setor_nome,
          box_id:            form.box_id   || '',
          box_nome:          form.box_nome || '',
          cargo_id:          form.cargo_id   || '',
          cargo_nome:        form.cargo_nome || 'Consultor de Serviços',
          colaborador_id:    form.colaborador_id === 'A_CONTRATAR' ? '00000000-0000-0000-0000-000000000000' : form.colaborador_id,
          colaborador_nome:  form.colaborador_nome,
          mes: m.mes, ano: Number(form.ano),
          percentual: pct, meta_faturamento: meta,
          dias_uteis_reais: 0, media_diaria_venda: 0,
          status: 'AGUARDANDO APROVACAO',
        })
      }
      setModalAberto(false)
      await loadDados()
    } catch (err) { setErroModal(err.message || String(err)) }
    finally { setSalvando(false) }
  }

  const handleExcluir = async () => {
    try {
      await apiService.deleteMetasConsultorColab(colabExcluir.colaborador_id, colabExcluir.empresa_id, filtroAno)
      setModalExcluirAberto(false)
      await loadDados()
    } catch (err) { setError(err.message || String(err)); setModalExcluirAberto(false) }
  }

  const handleAprovar = async () => {
    if (!modalAprovar) return
    setAprovandoEmpId(modalAprovar.empId); setModalAprovar(null)
    try { await apiService.approveMetasConsultorEmpresa(modalAprovar.empId, filtroAno); await loadDados() }
    catch (err) { setError(err.message || String(err)) }
    finally { setAprovandoEmpId(null) }
  }

  const NCOLS = 16

  const renderTree = () => {
    const grupoTotal   = sumArr(grupoRefMeses)
    const empIds       = [...new Set([...empresasComRef, ...Object.keys(tree)])]

    if (!loading && empIds.length === 0) {
      return (
        <tr>
          <td colSpan={NCOLS} className="text-center py-16 text-slate-400">
            Nenhum dado encontrado para {abaAtiva === 'funilaria' ? 'Funilaria/Pintura' : abaAtiva === 'dms' ? 'Plano DMS' : 'Mecânica + Terceiros'}.
          </td>
        </tr>
      )
    }

    return (
      <>
        {/* Grupo */}
        <tr className="cursor-pointer bg-blue-950 hover:bg-blue-900 transition-colors sticky top-[41px] z-10"
            onClick={() => setGrupoAberto(v => !v)}>
          <td className="px-3 py-2.5 text-white font-bold sticky left-0 bg-blue-950 z-10 whitespace-nowrap">
            <div className="flex items-center gap-2">{grupoAberto ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}🏢 Grupo Caiobá</div>
          </td>
          {grupoRefMeses.map((v, i) => <td key={i} className="px-1 py-2.5 text-right text-xs font-bold text-blue-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
          <td className="px-2 py-2.5 text-right text-xs font-bold text-amber-300 bg-blue-900 whitespace-nowrap">{grupoTotal > 0 ? fmtBRL(grupoTotal) : '—'}</td>
          <td colSpan="2"/>
        </tr>

        {grupoAberto && empIds.map(empId => {
          const emp      = tree[empId]
          const empObj   = empresas.find(e => e.id === empId)
          const empNome  = emp?.nome || empObj?.empresa_fantasia || empObj?.nome_empresa || empId
          const refMeses = Array.from({ length: 12 }, (_, i) => getRef(empId, i + 1))
          const refTotal = sumArr(refMeses)
          const disMeses = Array.from({ length: 12 }, (_, i) => getDistribuido(empId, i + 1))
          const naoMeses = refMeses.map((r, i) => Math.max(0, r - disMeses[i]))

          const pending = emp ? (() => {
            let n = 0
            Object.values(emp.depts || {}).forEach(d => Object.values(d.setores || {}).forEach(st =>
              Object.values(st.boxes || {}).forEach(bx => Object.values(bx.cargos || {}).forEach(ca => Object.values(ca.colabs || {}).forEach(co =>
                Object.values(co.meses || {}).forEach(m => {
                  const c = Number(m.meta_faturamento) || 0
                  if (c === 0) return
                  if (m.meta_aprovada === null || m.meta_aprovada === undefined || Math.abs(c - Number(m.meta_aprovada)) > 0.001) n++
                })
              )))
            ))
            return n
          })() : 0
          const aprovando = aprovandoEmpId === empId

          const renderCargoSection = (cNome, colabs, empId, naoMeses, deptNome) => {
            const carKey   = `${empId}§cargo§${cNome}`
            const carTotal = sumArr(refMeses)
            return (
              <React.Fragment key={cNome}>
                <tr className="cursor-pointer bg-white hover:bg-indigo-50/20 border-b border-slate-100 transition-colors"
                    onClick={() => toggle(expandedCargos, setExpandedCargos, carKey)}>
                  <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                    <div className="flex items-center gap-2 pl-20">
                      {expandedCargos.has(carKey) ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                      <span className="text-slate-400 mr-0.5">Cargo:</span>
                      <span className="font-semibold text-slate-600">{cNome}</span>
                    </div>
                  </td>
                  {refMeses.map((v, i) => <td key={i} className="px-1 py-1 text-right text-xs text-slate-500 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                  <td className="px-2 py-1 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{carTotal > 0 ? fmtBRL(carTotal) : '—'}</td>
                  <td colSpan="2"/>
                </tr>

                {expandedCargos.has(carKey) && (
                  <>
                    {/* Linha "Consultor não associado" */}
                    {(() => {
                      const naoTotal      = sumArr(naoMeses)
                      const totalDistrib  = sumArr(refMeses)
                      const allDone       = naoTotal <= 0.01 && totalDistrib > 0
                      return (
                        <tr className={`border-b border-slate-100 ${allDone ? 'bg-green-50/40' : 'bg-amber-50/60'}`}>
                          <td className="px-3 py-2 sticky left-0 z-10 whitespace-nowrap" style={{ background: 'inherit' }}>
                            <div className="pl-24 flex items-center gap-2">
                              {allDone
                                ? <CheckCircle2 size={12} className="text-green-500"/>
                                : <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block flex-shrink-0"/>
                              }
                              <span className={`font-semibold text-xs italic ${allDone ? 'text-green-600' : 'text-amber-700'}`}>
                                {allDone ? 'Totalmente distribuído' : 'Consultor não associado'}
                              </span>
                            </div>
                          </td>
                          {naoMeses.map((v, i) => (
                            <td key={i} className={`px-1 py-2 text-right text-xs font-semibold whitespace-nowrap ${allDone ? 'text-green-500' : 'text-amber-600'}`}>
                              {v > 0.01 ? fmtBRL(v) : '—'}
                            </td>
                          ))}
                          <td className={`px-2 py-2 text-right text-xs font-bold whitespace-nowrap ${allDone ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700'}`}>
                            {naoTotal > 0.01 ? fmtBRL(naoTotal) : '✓ Distribuído'}
                          </td>
                          <td colSpan="2"/>
                        </tr>
                      )
                    })()}

                    {/* Consultores cadastrados */}
                    {Object.entries(colabs).map(([colabId, colab]) => {
                      const colMeses     = Array.from({ length: 12 }, (_, i) => Number(colab.meses[i + 1]?.meta_faturamento) || 0)
                      const colTotal     = sumArr(colMeses)
                      const mesesComVal  = Object.values(colab.meses).filter(m => Number(m.meta_faturamento) > 0)
                      const aprovado     = mesesComVal.length > 0 && mesesComVal.every(m => {
                        const c = Number(m.meta_faturamento) || 0
                        return c === 0 || (m.meta_aprovada !== null && m.meta_aprovada !== undefined && Math.abs(c - Number(m.meta_aprovada)) <= 0.001)
                      })
                      const statusLabel  = aprovado ? 'APROVADO' : 'AGUARDANDO APROVACAO'
                      return (
                        <tr key={colabId} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                          <td className="px-3 py-2 sticky left-0 bg-white z-10">
                            <div className="pl-24 font-semibold text-slate-800 whitespace-nowrap">{colab.nome}</div>
                          </td>
                          {Array.from({ length: 12 }, (_, i) => {
                            const md = colab.meses[i + 1]
                            return (
                              <td key={i} className={`p-1 border-l border-slate-100 ${md ? '' : 'bg-slate-50'}`}>
                                {md ? (
                                  <div className="relative text-right">
                                    <div className={`text-xs font-mono ${Number(md.meta_faturamento) > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                      {Number(md.meta_faturamento) > 0 ? fmtBRL(md.meta_faturamento) : '—'}
                                    </div>
                                    {Number(md.percentual) > 0 && <div className="text-[10px] text-emerald-600 font-semibold">{fmtPct(md.percentual)}</div>}
                                    {(md.meta_aprovada === null || md.meta_aprovada === undefined) && Number(md.meta_faturamento) > 0 &&
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white"><Sparkles size={8}/></span>}
                                    {md.meta_aprovada !== null && md.meta_aprovada !== undefined && Math.abs(Number(md.meta_faturamento) - Number(md.meta_aprovada)) > 0.001 &&
                                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-white"><Pencil size={8}/></span>}
                                  </div>
                                ) : <span className="flex justify-center text-slate-300">—</span>}
                              </td>
                            )
                          })}
                          <td className="px-2 py-2 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{colTotal > 0 ? fmtBRL(colTotal) : '—'}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[statusLabel] || 'bg-slate-100 text-slate-500'}`}>{STATUS_DISPLAY[statusLabel] || statusLabel}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => { setColabExcluir({ colaborador_id: colabId, empresa_id: empId, nome: colab.nome }); setModalExcluirAberto(true) }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )}
              </React.Fragment>
            )
          }

          return (
            <React.Fragment key={empId}>
              {/* Empresa */}
              <tr className="cursor-pointer bg-indigo-700 hover:bg-indigo-600 transition-colors"
                  onClick={() => toggle(expandedEmpresas, setExpandedEmpresas, empId)}>
                <td className="px-3 py-2 text-white font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                  <div className="flex items-center gap-2 pl-4">
                    {expandedEmpresas.has(empId) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    {empNome}
                    {pending > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-blue-950 text-[10px] font-bold">{pending} pendente{pending > 1 ? 's' : ''}</span>}
                  </div>
                </td>
                {refMeses.map((v, i) => <td key={i} className="px-1 py-2 text-right text-xs font-semibold text-indigo-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                <td className="px-2 py-2 text-right text-xs font-bold text-amber-300 bg-indigo-800 whitespace-nowrap">{refTotal > 0 ? fmtBRL(refTotal) : '—'}</td>
                <td className="px-2 py-2 text-center" colSpan="2">
                  {pending > 0 && (
                    <button onClick={e => { e.stopPropagation(); setModalAprovar({ empId, empNome, pending }) }} disabled={aprovando}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500 hover:bg-green-400 text-white text-xs font-bold disabled:opacity-50">
                      {aprovando ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Aprovar
                    </button>
                  )}
                </td>
              </tr>

              {expandedEmpresas.has(empId) && (() => {
                const depts   = emp?.depts || {}
                const hasDepts = Object.keys(depts).length > 0

                if (!hasDepts) {
                  /* Empresa com referência mas sem consultores cadastrados: mostra estrutura virtual */
                  const cargoNome = abaAtiva === 'funilaria' ? 'Consultor Funilaria/Pintura' : 'Consultor de Serviços'
                  const dKey = `${empId}§vdept`
                  const sKey = `${empId}§vsetor`
                  const bKey = `${empId}§vbox`
                  // Setor virtual: usa nome real da tabela dim_setores conforme aba
                  const deptOficina = departamentos.find(d => (d.nome_departamento || '').toUpperCase().includes('OFICINA'))
                  let setorVirtual
                  if (abaAtiva === 'funilaria') {
                    setorVirtual = deptOficina
                      ? setores.find(s => s.departamento_id === deptOficina.id &&
                          ((s.nome_setor || '').toLowerCase().includes('funilaria') || (s.nome_setor || '').toLowerCase().includes('pintura')))
                      : null
                  } else if (abaAtiva === 'dms') {
                    setorVirtual = deptOficina
                      ? setores.find(s => s.departamento_id === deptOficina.id &&
                          ((s.nome_setor || '').toLowerCase().includes('plano') || (s.nome_setor || '').toLowerCase().includes('dms')))
                      : null
                  } else {
                    setorVirtual = deptOficina
                      ? setores.find(s => s.departamento_id === deptOficina.id && s.tipo_setor === 'consultoria')
                        || setores.find(s => s.departamento_id === deptOficina.id &&
                          ((s.nome_setor || '').toLowerCase().includes('consultor') || (s.nome_setor || '').toLowerCase().includes('assist')))
                      : null
                  }
                  const setorVirtualNome = setorVirtual?.nome_setor || (abaAtiva === 'funilaria' ? 'Funilaria/Pintura' : abaAtiva === 'dms' ? 'Planos DMS' : 'Consultores')
                  const deptNomeVirtual  = deptOficina?.nome_departamento || 'OFICINA'
                  return (
                    <React.Fragment key={`${empId}-v`}>
                      {/* Departamento: OFICINA */}
                      <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors"
                          onClick={() => toggle(expandedDepts, setExpandedDepts, dKey)}>
                        <td className="px-3 py-1.5 text-slate-800 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap">
                          <div className="flex items-center gap-2 pl-8">{expandedDepts.has(dKey) ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}{deptNomeVirtual}</div>
                        </td>
                        {refMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                        <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{refTotal > 0 ? fmtBRL(refTotal) : '—'}</td>
                        <td colSpan="2"/>
                      </tr>
                      {expandedDepts.has(dKey) && (
                        <>
                          <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
                              onClick={() => toggle(expandedSetores, setExpandedSetores, sKey)}>
                            <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-12">{expandedSetores.has(sKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                <span className="text-slate-400 mr-0.5">Setor:</span><span className="font-semibold text-slate-700">{setorVirtualNome}</span>
                              </div>
                            </td>
                            {refMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-600 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                            <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{refTotal > 0 ? fmtBRL(refTotal) : '—'}</td>
                            <td colSpan="2"/>
                          </tr>
                          {expandedSetores.has(sKey) && (
                            <>
                              {/* Box */}
                              <tr className="cursor-pointer border-b border-slate-100 bg-white hover:bg-amber-50/30 transition-colors"
                                  onClick={() => toggle(expandedBoxes, setExpandedBoxes, bKey)}>
                                <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                                  <div className="flex items-center gap-2 pl-16">{expandedBoxes.has(bKey) ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                                    <span className="text-slate-400 mr-0.5">Box:</span><span className="font-semibold text-slate-600">{cargoNome}</span>
                                  </div>
                                </td>
                                {refMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-500 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                                <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{refTotal > 0 ? fmtBRL(refTotal) : '—'}</td>
                                <td colSpan="2"/>
                              </tr>
                              {expandedBoxes.has(bKey) && renderCargoSection(cargoNome, {}, empId, naoMeses, 'OFICINA')}
                            </>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  )
                }

                return Object.entries(depts).map(([deptId, dept]) => {
                  const dKey   = `${empId}§${deptId}`
                  const dTotal = sumArr(refMeses)
                  return (
                    <React.Fragment key={deptId}>
                      <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors"
                          onClick={() => toggle(expandedDepts, setExpandedDepts, dKey)}>
                        <td className="px-3 py-1.5 text-slate-800 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap">
                          <div className="flex items-center gap-2 pl-8">{expandedDepts.has(dKey) ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}<span className="text-slate-500 font-normal mr-0.5">Departamento:</span><span className="font-bold">{dept.nome}</span></div>
                        </td>
                        {refMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                        <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{dTotal > 0 ? fmtBRL(dTotal) : '—'}</td>
                        <td colSpan="2"/>
                      </tr>

                      {expandedDepts.has(dKey) && Object.entries(dept.setores).map(([sId, setor]) => {
                        const sKey   = `${dKey}§${sId}`
                        const sTotal = sumArr(refMeses)
                        return (
                          <React.Fragment key={sId}>
                            <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
                                onClick={() => toggle(expandedSetores, setExpandedSetores, sKey)}>
                              <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap">
                                <div className="flex items-center gap-2 pl-12">
                                  {expandedSetores.has(sKey) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                  <span className="text-slate-400 mr-0.5">Setor:</span>
                                  <span className="font-semibold text-slate-700">{setor.nome}</span>
                                </div>
                              </td>
                              {refMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-600 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                              <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{sTotal > 0 ? fmtBRL(sTotal) : '—'}</td>
                              <td colSpan="2"/>
                            </tr>

                            {expandedSetores.has(sKey) && Object.entries(setor.boxes).map(([bId, box]) => {
                              const bKey = `${sKey}§${bId}`
                              return (
                                <React.Fragment key={bId}>
                                  <tr className="cursor-pointer border-b border-slate-100 bg-white hover:bg-amber-50/30 transition-colors"
                                      onClick={() => toggle(expandedBoxes, setExpandedBoxes, bKey)}>
                                    <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                                      <div className="flex items-center gap-2 pl-16">
                                        {expandedBoxes.has(bKey) ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                                        <span className="text-slate-400 mr-0.5">Box:</span>
                                        <span className="font-semibold text-slate-600">{box.nome}</span>
                                      </div>
                                    </td>
                                    {refMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-500 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                                    <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{sumArr(refMeses) > 0 ? fmtBRL(sumArr(refMeses)) : '—'}</td>
                                    <td colSpan="2"/>
                                  </tr>
                                  {expandedBoxes.has(bKey) && Object.entries(box.cargos).map(([cId, cargo]) =>
                                    renderCargoSection(cargo.nome, cargo.colabs, empId, naoMeses, dept.nome)
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })
              })()}
            </React.Fragment>
          )
        })}
      </>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-indigo-600"/>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Metas - Consultores</h1>
            <p className="text-xs text-slate-400">Distribua os valores da oficina entre os consultores por empresa e mês</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {abaAtiva !== 'dms' && (
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
          )}
          <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
            <ClipboardCheck size={16} /> Gestão de Aprovação
          </button>
          {canEdit && <button onClick={abrirIncluir} className={BTN_PRI}><Plus size={16}/> Adicionar Consultor</button>}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {/* Linha 1: Empresa + Ano */}
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Empresa</label>
            <select className={SEL} value={filtroEmpresa} onChange={e => { setFiltroEmpresa(e.target.value); setFiltroDepto(''); setFiltroSetor(''); setFiltroBox(''); setFiltroCargo('') }}>
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
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1.5">
        {TABS.map(tab => {
          const Icon     = tab.icon
          const isActive = abaAtiva === tab.key
          return (
            <button key={tab.key}
              onClick={() => { setAbaAtiva(tab.key); setFiltroVisu('total'); setFiltroDepto(''); setFiltroSetor(''); setFiltroBox(''); setFiltroCargo(''); setFiltroProdutivo('') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1 justify-center
                ${isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
              <Icon size={15}/>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={15}/> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}

      {(
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="overflow-auto flex-1">
            <table className="text-xs border-separate border-spacing-0" style={{ minWidth: '1700px' }}>
              <thead className="bg-slate-50 sticky top-0 z-20">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase border-b border-slate-200 w-64 sticky left-0 bg-slate-50 z-10">
                    <div className="flex items-center gap-2">
                      <span>Consultor / Nível</span>
                      {[...new Set([...empresasComRef, ...Object.keys(tree)])].length > 0 && (
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
                  {MESES_ABR.map(m => <th key={m} className="px-1 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-24">{m}</th>)}
                  <th className="px-2 py-2.5 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                  <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-36">Situação</th>
                  <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-14">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400"><div className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin"/>Carregando...</div></td></tr>
                  : renderTree()
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                Adicionar Consultor de {abaAtiva === 'funilaria' ? 'Funilaria/Pintura' : 'Serviços'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="overflow-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className={LBL}>Empresa *</label>
                  <select name="empresa_id" className={SEL} value={form.empresa_id} onChange={handleFormChange}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Ano</label>
                  <select name="ano" className={SEL} value={form.ano} onChange={handleFormChange}>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Departamento</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{form.departamento_nome || 'OFICINA'}</div>
                </div>
                <div>
                  <label className={LBL}>Setor</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{form.setor_nome || (abaAtiva === 'funilaria' ? 'Funilaria/Pintura' : abaAtiva === 'dms' ? 'Planos DMS' : 'Consultores')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Box</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{form.box_nome || (abaAtiva === 'funilaria' ? 'Consultor Funilaria/Pintura' : 'Consultor de Serviços')}</div>
                </div>
                <div>
                  <label className={LBL}>Cargo</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{form.cargo_nome || (abaAtiva === 'funilaria' ? 'Consultor Funilaria/Pintura' : 'Consultor de Serviços')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={LBL}>Consultor *</label>
                  <select name="colaborador_id" className={SEL} value={form.colaborador_id} onChange={handleFormChange} disabled={!form.empresa_id}>
                    <option value="">Selecione...</option>
                    <option value="A_CONTRATAR">A contratar</option>
                    {funcsEmp.map(f => <option key={f.id} value={f.id}>{f.nome_funcionario}</option>)}
                  </select>
                </div>
              </div>

              {/* Grade de % por mês */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Distribuição % por Mês</span>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="border-separate border-spacing-1 p-1" style={{ minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th className="w-36 text-left text-xs text-slate-500 font-semibold px-1">Campo</th>
                        {MESES_ABR.map((m, i) => <th key={i} className="w-24 text-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1 py-1">{m}</th>)}
                        <th className="w-28 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-1">Total Ano</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Ref. Peças */}
                      <tr>
                        <td className="text-xs font-semibold text-emerald-600 px-1 whitespace-nowrap">Ref. Peças (R$)</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const v = refModalPorMes[i + 1]?.pecas || 0
                          return <td key={i} className="bg-emerald-50 border border-emerald-100 rounded p-1 text-right text-xs font-mono text-emerald-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-emerald-50 border border-emerald-200 rounded p-1 text-right text-xs font-bold text-emerald-700">
                          {fmtBRL(Object.values(refModalPorMes).reduce((s, v) => s + (v?.pecas || 0), 0))}
                        </td>
                      </tr>
                      {/* Ref. Serviços */}
                      <tr>
                        <td className="text-xs font-semibold text-blue-600 px-1 whitespace-nowrap">Ref. Serviços (R$)</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const v = refModalPorMes[i + 1]?.servicos || 0
                          return <td key={i} className="bg-blue-50 border border-blue-100 rounded p-1 text-right text-xs font-mono text-blue-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-blue-50 border border-blue-200 rounded p-1 text-right text-xs font-bold text-blue-700">
                          {fmtBRL(Object.values(refModalPorMes).reduce((s, v) => s + (v?.servicos || 0), 0))}
                        </td>
                      </tr>
                      {/* Ref. Total */}
                      <tr>
                        <td className="text-xs font-semibold text-slate-600 px-1 whitespace-nowrap">Ref. Total (R$)</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const v = refModalPorMes[i + 1]?.total || 0
                          return <td key={i} className="bg-slate-50 border border-slate-200 rounded p-1 text-right text-xs font-mono text-slate-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-slate-100 border border-slate-200 rounded p-1 text-right text-xs font-bold text-slate-700">
                          {fmtBRL(Object.values(refModalPorMes).reduce((s, v) => s + (v?.total || 0), 0))}
                        </td>
                      </tr>
                      {/* % já distribuído */}
                      <tr>
                        <td className="text-xs font-semibold text-orange-600 px-1 whitespace-nowrap">% já distribuído</td>
                        {mesesForm.map((m, i) => {
                          const jaUsado = pctSomadoNoMes[m.mes] || 0
                          return (
                            <td key={i} className="bg-orange-50 border border-orange-100 rounded p-1 text-right text-xs font-mono text-orange-600">
                              {jaUsado > 0 ? fmtPct(jaUsado) : '—'}
                            </td>
                          )
                        })}
                        <td className="bg-orange-50 border border-orange-200 rounded p-1 text-right text-xs font-bold text-orange-600">
                          {fmtPct(mesesForm.reduce((s, m) => s + (pctSomadoNoMes[m.mes] || 0), 0) / 12)}
                        </td>
                      </tr>
                      {/* % disponível */}
                      <tr>
                        <td className="text-xs font-semibold text-green-600 px-1 whitespace-nowrap">% disponível</td>
                        {mesesForm.map((m, i) => {
                          const disponivel = Math.max(0, 100 - (pctSomadoNoMes[m.mes] || 0))
                          return (
                            <td key={i} className={`border rounded p-1 text-right text-xs font-mono ${disponivel <= 0 ? 'bg-red-50 border-red-200 text-red-500' : 'bg-green-50 border-green-100 text-green-700'}`}>
                              {fmtPct(disponivel)}
                            </td>
                          )
                        })}
                        <td className="bg-green-50 border border-green-200 rounded p-1 text-right text-xs font-bold text-green-700">
                          {fmtPct(mesesForm.reduce((s, m) => s + Math.max(0, 100 - (pctSomadoNoMes[m.mes] || 0)), 0) / 12)}
                        </td>
                      </tr>
                      {/* % deste consultor */}
                      <tr>
                        <td className="text-xs font-semibold text-slate-500 px-1">% deste consultor</td>
                        {mesesForm.map((m, i) => {
                          const disponivel = Math.max(0, 100 - (pctSomadoNoMes[m.mes] || 0))
                          const pctAtual   = Number(m.percentual) || 0
                          const over       = pctAtual > disponivel + 0.01
                          return (
                            <td key={i} className={`border rounded p-1 ${over ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                              <PctInput value={m.percentual} onChange={v => setMesesForm(prev => prev.map((x, xi) => xi === i ? { ...x, percentual: v } : x))}/>
                              {over && <div className="text-[9px] text-center text-red-500 font-semibold">excede!</div>}
                            </td>
                          )
                        })}
                        <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-center text-xs font-bold text-indigo-700">
                          {fmtPct(mesesForm.reduce((s, m) => s + (Number(m.percentual) || 0), 0) / 12)}
                        </td>
                      </tr>
                      {/* Meta Peças */}
                      <tr>
                        <td className="text-xs font-bold text-emerald-700 px-1 whitespace-nowrap">Meta Peças R$</td>
                        {mesesForm.map((m, i) => {
                          const v = calcMetaPecas(m.mes, m.percentual)
                          return <td key={i} className="bg-emerald-50 border border-emerald-200 rounded p-1 text-right text-xs font-bold text-emerald-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-emerald-100 border border-emerald-300 rounded p-1 text-right text-xs font-bold text-emerald-800">
                          {fmtBRL(mesesForm.reduce((s, m) => s + calcMetaPecas(m.mes, m.percentual), 0))}
                        </td>
                      </tr>
                      {/* Meta Serviços */}
                      <tr>
                        <td className="text-xs font-bold text-blue-700 px-1 whitespace-nowrap">Meta Serviços R$</td>
                        {mesesForm.map((m, i) => {
                          const v = calcMetaServicos(m.mes, m.percentual)
                          return <td key={i} className="bg-blue-50 border border-blue-200 rounded p-1 text-right text-xs font-bold text-blue-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-blue-100 border border-blue-300 rounded p-1 text-right text-xs font-bold text-blue-800">
                          {fmtBRL(mesesForm.reduce((s, m) => s + calcMetaServicos(m.mes, m.percentual), 0))}
                        </td>
                      </tr>
                      {/* Meta Total */}
                      <tr>
                        <td className="text-xs font-bold text-indigo-700 px-1 whitespace-nowrap">Meta Total R$</td>
                        {mesesForm.map((m, i) => {
                          const v = calcMeta(m.mes, m.percentual)
                          return <td key={i} className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-700">{v > 0 ? fmtBRL(v) : '—'}</td>
                        })}
                        <td className="bg-indigo-100 border border-indigo-300 rounded p-1 text-right text-xs font-bold text-indigo-800">
                          {fmtBRL(mesesForm.reduce((s, m) => s + calcMeta(m.mes, m.percentual), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {!form.empresa_id && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Info size={12}/> Selecione a empresa para ver os totais de referência.
                  </p>
                )}
              </div>
            </div>
            {erroModal && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                <AlertTriangle size={15}/> {erroModal}
              </div>
            )}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setModalAberto(false)} className={BTN_SEC} disabled={salvando}>Cancelar</button>
              <button onClick={handleSalvar} className={BTN_PRI} disabled={salvando}>
                {salvando ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR DMS */}
      {modalDmsAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-indigo-500"/>
                <h2 className="text-lg font-bold text-slate-800">Adicionar Consultor Plano DMS</h2>
              </div>
              <button onClick={() => setModalDmsAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="overflow-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className={LBL}>Empresa *</label>
                  <select name="empresa_id" className={SEL} value={formDms.empresa_id} onChange={handleFormDmsChange}>
                    <option value="">Selecione...</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Ano</label>
                  <select name="ano" className={SEL} value={formDms.ano} onChange={handleFormDmsChange}>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Departamento</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{formDms.departamento_nome || 'OFICINA'}</div>
                </div>
                <div>
                  <label className={LBL}>Setor</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{formDms.setor_nome || 'Planos DMS'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Box</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{formDms.box_nome || 'Consultor Planos DMS'}</div>
                </div>
                <div>
                  <label className={LBL}>Cargo</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{formDms.cargo_nome || 'Consultor Planos DMS'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={LBL}>Consultor *</label>
                  {(() => {
                    const funcsDms = funcionarios.filter(f => {
                      if (formDms.empresa_id && f.empresa_id !== formDms.empresa_id) return false
                      if (formDms.box_id   && f.box_id   !== formDms.box_id)   return false
                      if (formDms.cargo_id && f.cargo_id !== formDms.cargo_id) return false
                      return true
                    })
                    return (
                      <select name="colaborador_id" className={SEL} value={formDms.colaborador_id} onChange={handleFormDmsChange} disabled={!formDms.empresa_id}>
                        <option value="">Selecione...</option>
                        <option value="A_CONTRATAR">A contratar</option>
                        {funcsDms.map(f => <option key={f.id} value={f.id}>{f.nome_funcionario}</option>)}
                      </select>
                    )
                  })()}
                </div>
              </div>

              {/* Grade de Meta R$ por mês */}
              {!formDms.colaborador_id && (
                <p className="text-xs text-slate-400 flex items-center gap-1"><Info size={12}/> Selecione o consultor para lançar as metas mensais.</p>
              )}
              {formDms.colaborador_id && <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Meta R$ por Mês — Plano DMS</span>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="border-separate border-spacing-1 p-1" style={{ minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th className="w-36 text-left text-xs text-slate-500 font-semibold px-1">Campo</th>
                        {MESES_ABR.map((m, i) => <th key={i} className="w-24 text-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1 py-1">{m}</th>)}
                        <th className="w-28 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-1">Total Ano</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-xs font-bold text-indigo-700 px-1 whitespace-nowrap">Meta R$ (Plano DMS)</td>
                        {mesesDmsForm.map((m, i) => (
                          <td key={i} className="bg-white border border-indigo-300 rounded p-1 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-300">
                            <ValorInput
                              value={m.meta_faturamento}
                              onChange={v => setMesesDmsForm(prev => prev.map((x, xi) => xi === i ? { ...x, meta_faturamento: v } : x))}
                            />
                          </td>
                        ))}
                        <td className="bg-indigo-100 border border-indigo-300 rounded p-1 text-right text-xs font-bold text-indigo-800">
                          {fmtBRL(mesesDmsForm.reduce((s, m) => s + (Number(m.meta_faturamento) || 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>}
            </div>
            {erroModal && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                <AlertTriangle size={15}/> {erroModal}
              </div>
            )}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setModalDmsAberto(false)} className={BTN_SEC} disabled={salvando}>Cancelar</button>
              <button onClick={handleSalvarDms} className={BTN_PRI} disabled={salvando}>
                {salvando ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APROVAR */}
      {modalAprovar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} className="text-green-600"/></div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Aprovar Empresa</h2>
              <p className="text-sm text-slate-500 mb-1">Aprovando <strong>{modalAprovar.pending} valor{modalAprovar.pending > 1 ? 'es' : ''}</strong> de:</p>
              <p className="text-sm font-bold text-indigo-700">{modalAprovar.empNome}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalAprovar(null)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleAprovar} className="inline-flex items-center justify-center gap-2 flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <CheckCircle2 size={15}/> Aprovar
              </button>
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
              <h2 className="text-lg font-bold text-slate-800 mb-2">Excluir Consultor</h2>
              <p className="text-sm text-slate-500">Todos os meses de <strong>{colabExcluir?.nome}</strong> para <strong>{filtroAno}</strong> serão excluídos.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalExcluirAberto(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleExcluir} className="inline-flex items-center justify-center gap-2 flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <Trash2 size={15}/> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
