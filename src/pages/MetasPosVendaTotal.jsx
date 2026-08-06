import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { TrendingUp, ChevronRight, ChevronDown, Loader2, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtBRL = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const sumArr = (a) => a.reduce((s, v) => s + v, 0)

// Unified tree: empresa → dept → setor → box → cargo → colaborador
function buildUnifiedTree(allRows, deptMap, setorMap, boxMap, cargoMap, funcMap) {
  const tree = {}
  allRows.forEach(r => {
    if (r.setor_id && !r.setor_id.startsWith('__') && !setorMap[r.setor_id]) return
    if (r.box_id   && !r.box_id.startsWith('__')   && !boxMap[r.box_id])     return
    if (r.cargo_id && !r.cargo_id.startsWith('__') && !cargoMap[r.cargo_id]) return

    const eId   = r.empresa_id || '—'
    const eNome = r.empresa_nome || eId
    const dId   = r.departamento_id || r.departamento_nome || '—'
    const sId   = r.setor_id   || r.setor_nome   || '—'
    const bId   = r.box_id     || r.box_nome     || '—'
    const cId   = r.cargo_id   || r.cargo_nome   || '—'
    const coId  = r.colaborador_id || r.colaborador_nome || '—'

    const dNome  = deptMap[r.departamento_id]  || r.departamento_nome  || '—'
    const sNome  = setorMap[r.setor_id]         || r.setor_nome         || '—'
    const bNome  = boxMap[r.box_id]             || r.box_nome           || '—'
    const cNome  = cargoMap[r.cargo_id]         || r.cargo_nome         || '—'
    const coNome = funcMap[r.colaborador_id]    || r.colaborador_nome   || '—'

    const val = Number(r.meta_faturamento) || 0

    if (!tree[eId]) tree[eId] = { nome: eNome, depts: {} }
    const emp = tree[eId]
    if (!emp.depts[dId]) emp.depts[dId] = { nome: dNome, setores: {} }
    const dept = emp.depts[dId]
    if (!dept.setores[sId]) dept.setores[sId] = { nome: sNome, boxes: {} }
    const setor = dept.setores[sId]
    if (!setor.boxes[bId]) setor.boxes[bId] = { nome: bNome, cargos: {} }
    const box = setor.boxes[bId]
    if (!box.cargos[cId]) box.cargos[cId] = { nome: cNome, colabs: {} }
    const cargo = box.cargos[cId]
    if (!cargo.colabs[coId]) cargo.colabs[coId] = { nome: coNome, meses: Array(12).fill(0) }
    cargo.colabs[coId].meses[r.mes - 1] += val
  })
  return tree
}

const aggColabs = (colabs) => { const a = Array(12).fill(0); Object.values(colabs).forEach(c => c.meses.forEach((v,i)=>{ a[i]+=v })); return a }
const aggCargo  = (cargo)  => aggColabs(cargo.colabs)
const aggBox    = (box)    => { const a = Array(12).fill(0); Object.values(box.cargos).forEach(c => aggCargo(c).forEach((v,i)=>{a[i]+=v})); return a }
const aggSetor  = (setor)  => { const a = Array(12).fill(0); Object.values(setor.boxes).forEach(b => aggBox(b).forEach((v,i)=>{a[i]+=v})); return a }
const aggDept   = (dept)   => { const a = Array(12).fill(0); Object.values(dept.setores).forEach(s => aggSetor(s).forEach((v,i)=>{a[i]+=v})); return a }
const aggEmp    = (emp)    => { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d => aggDept(d).forEach((v,i)=>{a[i]+=v})); return a }

// Quando o dept tem setor Consultores (= Mecânica + Funilaria), usar só ele para o total
// evita dupla contagem: Consultores + Mecânica + Funilaria = 2× o real
const aggDeptDedup = (dept) => {
  const entries = Object.entries(dept.setores)
  const consulEntries = entries.filter(([,s]) => (s.nome || '').toLowerCase().includes('consultor'))
  if (consulEntries.length > 0) {
    const a = Array(12).fill(0)
    consulEntries.forEach(([,s]) => aggSetor(s).forEach((v,i) => { a[i] += v }))
    return a
  }
  return aggDept(dept)
}
const aggEmpDedup = (emp) => { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d => aggDeptDedup(d).forEach((v,i)=>{a[i]+=v})); return a }

const SEL = 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function MetasPosVendaTotal() {
  const navigate = useNavigate()
  const [empresas,      setEmpresas]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [rowsPecas,     setRowsPecas]     = useState([])
  const [rowsMecanico,  setRowsMecanico]  = useState([])
  const [rowsConsultor, setRowsConsultor] = useState([])
  const [rowsFunilaria, setRowsFunilaria] = useState([])
  const [rowsTerceiros, setRowsTerceiros] = useState([])
  const [filtroAno,     setFiltroAno]     = useSessionState('mpvt_ano', anoAtual)
  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('mpvt_empresa', '')
  const [filtroVisu,    setFiltroVisu]    = useSessionState('mpvt_visu', 'total')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [expanded,      setExpanded]      = useState(new Set())

  const tog    = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const isOpen = (key) => expanded.has(key)

  const loadAll = async () => {
    setLoading(true); setError(null)
    try {
      const empId = filtroEmpresa || null
      const [emps, depts, sets, bxs, cargs, funcs, pecas, mecanico, consultor, terceiros, funilaria] = await Promise.all([
        apiService.getEmpresas(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getBox(),
        apiService.getCargos(),
        apiService.getFuncionarios(),
        apiService.getMetasPecas(empId, filtroAno),
        apiService.getMetasMecanico(empId, filtroAno),
        apiService.getMetasConsultor(empId, filtroAno),
        apiService.getMetasTerceiros(empId, filtroAno),
        apiService.getMetasFunilaria(empId, filtroAno),
      ])
      const sortedEmps = [...emps].sort((a,b) => (a.empresa_fantasia||'').localeCompare(b.empresa_fantasia||''))
      setEmpresas(sortedEmps)
      setDepartamentos(depts)
      setSetores(sets)
      setBoxes(bxs)
      setCargos(cargs)
      setFuncionarios(funcs)
      setRowsPecas(pecas)
      setRowsMecanico(mecanico)
      setRowsConsultor(consultor)
      setRowsTerceiros(terceiros)
      setRowsFunilaria(funilaria)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [filtroEmpresa, filtroAno])

  const deptMap  = useMemo(() => Object.fromEntries(departamentos.map(d => [d.id, d.nome_departamento])),  [departamentos])
  const setorMap = useMemo(() => Object.fromEntries(setores.map(s => [s.id, s.nome_setor])),               [setores])
  const boxMap   = useMemo(() => Object.fromEntries(boxes.map(b => [b.id, b.nome_box])),                   [boxes])
  const cargoMap = useMemo(() => Object.fromEntries(cargos.map(c => [c.id, c.nome_cargo])),                [cargos])
  const funcMap  = useMemo(() => Object.fromEntries(funcionarios.map(f => [f.id, f.nome_funcionario])),    [funcionarios])

  // Mecânico: computa meta_faturamento a partir dos campos raw (mesma fórmula do Total Oficina)
  const mecRowsNormalized = useMemo(() => {
    return rowsMecanico.map(r => {
      const hd   = Number(r.horas_disponiveis) || 0
      const prod = Number(r.produtividade)     || 0
      const vh   = Number(r.valor_hora)        || 0
      const cp   = Number(r.coef_pecas)        || 0
      const ms   = hd * (prod / 100) * vh
      const mp   = ms * cp
      const val  = filtroVisu === 'servicos' ? ms : filtroVisu === 'pecas' ? mp : ms + mp
      return { ...r, meta_faturamento: val }
    })
  }, [rowsMecanico, filtroVisu])

  // Funilaria setor da tabela de dimensão
  const funSetorInfo = useMemo(() => {
    const s = setores.find(s => (s.nome_setor || '').toLowerCase().includes('funilaria'))
    if (!s) return null
    return { id: s.id, nome: s.nome_setor, departamento_id: s.departamento_id }
  }, [setores])

  const funBoxInfo = useMemo(() => {
    if (!funSetorInfo) return null
    return boxes.find(b => (Array.isArray(b.setor_ids) ? b.setor_ids : (b.setor_id ? [b.setor_id] : [])).includes(funSetorInfo.id)) || null
  }, [boxes, funSetorInfo])

  const funRowsNormalized = useMemo(() => {
    if (!funSetorInfo) return []
    const bId   = funBoxInfo?.id       || '__funilaria__'
    const bNome = funBoxInfo?.nome_box || 'Funilaria e Pintura'
    return rowsFunilaria.map(r => {
      const mp = Number(r.meta_pecas)    || 0
      const ms = Number(r.meta_servicos) || 0
      let val  = filtroVisu === 'servicos' ? ms : filtroVisu === 'pecas' ? mp : ms + mp
      if (val === 0) val = Number(r.meta_faturamento) || 0
      return {
        empresa_id: r.empresa_id, empresa_nome: r.empresa_nome,
        departamento_id:   funSetorInfo.departamento_id,
        departamento_nome: deptMap[funSetorInfo.departamento_id] || '—',
        setor_id: funSetorInfo.id, setor_nome: funSetorInfo.nome,
        box_id: bId, box_nome: bNome,
        cargo_id: '__funilaria__', cargo_nome: 'Funilaria e Pintura',
        colaborador_id: '__funilaria__', colaborador_nome: 'Meta Funilaria',
        mes: r.mes, meta_faturamento: val,
      }
    })
  }, [rowsFunilaria, funSetorInfo, funBoxInfo, filtroVisu, deptMap])

  // Terceiros setor da tabela de dimensão
  const terSetorInfo = useMemo(() => {
    const s = setores.find(s => (s.nome_setor || '').toLowerCase().includes('terceiro'))
    if (!s) return null
    return { id: s.id, nome: s.nome_setor, departamento_id: s.departamento_id }
  }, [setores])

  const terRowsNormalized = useMemo(() => {
    if (filtroVisu === 'pecas') return []
    const sId   = terSetorInfo?.id   || '__terceiros__'
    const sNome = terSetorInfo?.nome || 'Terceiros'
    const dId   = terSetorInfo?.departamento_id || funSetorInfo?.departamento_id || '—'
    const dNome = deptMap[dId] || '—'
    return rowsTerceiros.flatMap(r => {
      const val = Number(r.meta_servicos) || 0
      if (val === 0) return []
      return [{
        empresa_id: r.empresa_id, empresa_nome: r.empresa_nome,
        departamento_id: dId, departamento_nome: dNome,
        setor_id: sId, setor_nome: sNome,
        box_id: '__terceiros__', box_nome: 'Terceiros',
        cargo_id: '__terceiros__', cargo_nome: 'Terceiros',
        colaborador_id: `__ter__${r.empresa_id}__${r.mes}`, colaborador_nome: r.empresa_nome || 'Meta Terceiros',
        mes: r.mes, meta_faturamento: val,
      }]
    })
  }, [rowsTerceiros, terSetorInfo, funSetorInfo, filtroVisu, deptMap])

  // Árvore unificada: Peças + Consultor + Mecânico + Funilaria + Terceiros
  const tree = useMemo(
    () => buildUnifiedTree(
      [...rowsPecas, ...rowsConsultor, ...mecRowsNormalized, ...funRowsNormalized, ...terRowsNormalized],
      deptMap, setorMap, boxMap, cargoMap, funcMap
    ),
    [rowsPecas, rowsConsultor, mecRowsNormalized, funRowsNormalized, terRowsNormalized, deptMap, setorMap, boxMap, cargoMap, funcMap]
  )

  const expandirTudo = () => {
    const keys = new Set()
    Object.entries(tree).forEach(([eId, emp]) => {
      const eKey = `emp-${eId}`; keys.add(eKey)
      Object.entries(emp.depts || {}).forEach(([dId, dept]) => {
        const dKey = `${eKey}-d-${dId}`; keys.add(dKey)
        Object.entries(dept.setores || {}).forEach(([sId, setor]) => {
          const sKey = `${dKey}-s-${sId}`; keys.add(sKey)
          Object.entries(setor.boxes || {}).forEach(([bId, box]) => {
            const bKey = `${sKey}-b-${bId}`; keys.add(bKey)
            Object.keys(box.cargos || {}).forEach(cId => keys.add(`${bKey}-c-${cId}`))
          })
        })
      })
    })
    setExpanded(keys)
  }

  const recolherTudo = () => setExpanded(new Set())
  const tudoExpandido = expanded.size > 0 && Object.keys(tree).every(eId => expanded.has(`emp-${eId}`))

  useEffect(() => {
    if (filtroEmpresa) {
      setExpanded(prev => {
        const n = new Set(prev)
        n.add(`emp-${filtroEmpresa}`)
        return n
      })
    }
  }, [filtroEmpresa])

  const totalGeral = useMemo(() => {
    const a = Array(12).fill(0)
    Object.values(tree).forEach(emp => aggEmpDedup(emp).forEach((v, i) => { a[i] += v }))
    return a
  }, [tree])

  const mCells = (vals, prefix, emphTotal = false) => [
    ...vals.map((v, i) => (
      <td key={`${prefix}-m${i}`} className="px-2 py-1 text-right text-xs whitespace-nowrap text-slate-700">
        {v > 0 ? fmtBRL(v) : <span className="text-slate-300">—</span>}
      </td>
    )),
    <td key={`${prefix}-tot`} className={`px-2 py-1 text-right text-xs font-semibold whitespace-nowrap ${emphTotal ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-700'}`}>
      {sumArr(vals) > 0 ? fmtBRL(sumArr(vals)) : <span className="text-slate-300">—</span>}
    </td>,
  ]

  const empList = filtroEmpresa
    ? empresas.filter(e => e.id === filtroEmpresa)
    : empresas

  const empRows = empList.flatMap(emp => {
    const eId   = emp.id
    const eNome = emp.empresa_fantasia || emp.empresa_nome || eId
    const eKey  = `emp-${eId}`

    const empNode = tree[eId]
    const vTotal  = empNode ? aggEmpDedup(empNode) : Array(12).fill(0)

    if (sumArr(vTotal) === 0) return []

    const empOpen = isOpen(eKey)
    const childRows = []

    if (empOpen && empNode) {
      Object.entries(empNode.depts).forEach(([dId, dept]) => {
        const dVals = aggDeptDedup(dept)
        if (sumArr(dVals) === 0) return
        const dKey = `${eKey}-d-${dId}`
        childRows.push(
          <tr key={dKey} className="bg-slate-200 hover:bg-slate-300 cursor-pointer" onClick={e => { e.stopPropagation(); tog(dKey) }}>
            <td className="pl-8 pr-2 py-1.5 text-xs font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-slate-200">
              <span className="flex items-center gap-1">
                {isOpen(dKey) ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                <span className="text-slate-500 font-normal mr-0.5">Departamento:</span>
                {dept.nome}
              </span>
            </td>
            {mCells(dVals, dKey)}
          </tr>
        )
        if (!isOpen(dKey)) return

        const setorEntries = Object.entries(dept.setores).sort(([,a],[,b]) => {
          const aFun = (a.nome || '').toLowerCase().includes('funilaria') ? 1 : 0
          const bFun = (b.nome || '').toLowerCase().includes('funilaria') ? 1 : 0
          if (aFun !== bFun) return aFun - bFun
          return (a.nome || '').localeCompare(b.nome || '')
        })
        setorEntries.forEach(([sId, setor]) => {
          const sVals = aggSetor(setor)
          if (sumArr(sVals) === 0) return
          const sKey = `${dKey}-s-${sId}`
          childRows.push(
            <tr key={sKey} className="bg-slate-100 hover:bg-slate-200 cursor-pointer" onClick={e => { e.stopPropagation(); tog(sKey) }}>
              <td className="pl-14 pr-2 py-1 text-xs text-slate-700 whitespace-nowrap sticky left-0 bg-slate-100">
                <span className="flex items-center gap-1">
                  {isOpen(sKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                  <span className="text-slate-400 mr-0.5">Setor:</span>
                  <span className="font-semibold">{setor.nome}</span>
                </span>
              </td>
              {mCells(sVals, sKey)}
            </tr>
          )
          if (!isOpen(sKey)) return

          Object.entries(setor.boxes).forEach(([bId, box]) => {
            const bVals = aggBox(box)
            if (sumArr(bVals) === 0) return
            const bKey = `${sKey}-b-${bId}`
            childRows.push(
              <tr key={bKey} className="bg-white hover:bg-amber-50/30 cursor-pointer border-b border-slate-100" onClick={e => { e.stopPropagation(); tog(bKey) }}>
                <td className="pl-[4.5rem] pr-2 py-1 text-xs text-slate-600 whitespace-nowrap sticky left-0 bg-white">
                  <span className="flex items-center gap-1">
                    {isOpen(bKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                    <span className="text-slate-400 mr-0.5">Box:</span>
                    <span className="font-semibold">{box.nome}</span>
                  </span>
                </td>
                {mCells(bVals, bKey)}
              </tr>
            )
            if (!isOpen(bKey)) return

            Object.entries(box.cargos).forEach(([cId, cargo]) => {
              const caVals = aggCargo(cargo)
              if (sumArr(caVals) === 0) return
              const caKey = `${bKey}-c-${cId}`
              childRows.push(
                <tr key={caKey} className="bg-white hover:bg-indigo-50/20 cursor-pointer border-b border-slate-100" onClick={e => { e.stopPropagation(); tog(caKey) }}>
                  <td className="pl-20 pr-2 py-1 text-xs text-slate-600 whitespace-nowrap sticky left-0 bg-white">
                    <span className="flex items-center gap-1">
                      {isOpen(caKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                      <span className="text-slate-400 mr-0.5">Cargo:</span>
                      <span className="font-semibold">{cargo.nome}</span>
                    </span>
                  </td>
                  {mCells(caVals, caKey)}
                </tr>
              )
              if (!isOpen(caKey)) return

              Object.entries(cargo.colabs).forEach(([coId, colab]) => {
                if (sumArr(colab.meses) === 0) return
                const coKey = `${caKey}-co-${coId}`
                childRows.push(
                  <tr key={coKey} className="border-b border-slate-100 hover:bg-indigo-50/30">
                    <td className="pl-24 pr-2 py-1 text-xs text-slate-800 whitespace-nowrap font-semibold sticky left-0 bg-white">
                      {colab.nome}
                    </td>
                    {mCells(colab.meses, coKey)}
                  </tr>
                )
              })
            })
          })
        })
      })
    }

    return [
      <tr key={eKey}
        className="cursor-pointer hover:bg-slate-100 border-t-2 border-slate-300 bg-slate-50"
        onClick={() => tog(eKey)}>
        <td className="pl-3 pr-2 py-2 text-sm font-bold text-slate-800 whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            {empOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
            {eNome}
          </span>
        </td>
        {vTotal.map((v,i) => (
          <td key={i} className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap text-slate-800">
            {v > 0 ? fmtBRL(v) : <span className="text-slate-300">—</span>}
          </td>
        ))}
        <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-indigo-700 bg-indigo-50">
          {fmtBRL(sumArr(vTotal))}
        </td>
      </tr>,
      ...childRows,
    ]
  })

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Total Pós-Vendas</h1>
            <p className="text-xs text-slate-400">Consolidado de Peças · Consultores · Mecânicos · Funilaria e Pintura · Terceiros</p>
          </div>
        </div>
        <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
          <ClipboardCheck size={16} /> Gestão de Aprovação
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className={SEL}>
          {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={SEL}>
          <option value="">Todas as empresas</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.empresa_nome}</option>)}
        </select>
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
        {loading && <Loader2 size={18} className="animate-spin text-indigo-500" />}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse min-w-[1400px]">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap min-w-[260px]">
                <div className="flex items-center gap-2">
                  <span>Empresa / Departamento / Setor / Box / Cargo / Funcionário</span>
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
                <th key={m} className="px-2 py-2 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {m}
                </th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-semibold text-slate-600 whitespace-nowrap bg-slate-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && empRows.length === 0 && (
              <tr>
                <td colSpan={14} className="py-16 text-center text-slate-400 text-sm">
                  Nenhum dado encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {empRows}
            {empRows.length > 0 && (
              <tr className="bg-indigo-800 text-white border-t-2 border-indigo-500">
                <td className="pl-3 pr-2 py-2.5 text-sm font-bold whitespace-nowrap">Total Geral</td>
                {totalGeral.map((v,i) => (
                  <td key={i} className="px-2 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                    {v > 0 ? fmtBRL(v) : '—'}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-right text-xs font-bold whitespace-nowrap bg-indigo-900">
                  {fmtBRL(sumArr(totalGeral))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
