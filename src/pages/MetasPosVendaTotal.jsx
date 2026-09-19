import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { TrendingUp, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { apiService } from '../services/api'
import { EmpresaMultiFilter, empresaParam, filtrarPorEmpresas, empresasDasMetas } from '../components/EmpresaMultiFilter'
import { valoresMetaMecanico, resolverPosicaoMecanico } from '../utils/metasMecanico'
import { agruparPorSegmento } from '../utils/segmentoMarca'
import { LogoGrupo, LogoSegmento } from '../components/LogosMarca'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Moeda contábil: R$ na frente, negativo entre parênteses, 2 casas (mesmo padrão das demais abas).
const fmtBRL = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  const s = Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}
const sumArr = (a) => a.reduce((s, v) => s + v, 0)

const STATUS_CLS = { 'AGUARDANDO APROVACAO': 'bg-amber-100 text-amber-700', 'APROVADO': 'bg-green-100 text-green-700' }
const STATUS_DISPLAY = { 'AGUARDANDO APROVACAO': 'Aguard. Aprovação', 'APROVADO': 'Aprovado' }

// Mesmo critério da Gestão de Aprovação: mês com valor gravado é pendente se nunca foi aprovado ou mudou depois.
const linhaPendente = (grav, aprovada) => {
  if (!grav) return false
  if (aprovada === null || aprovada === undefined) return true
  return Math.abs(grav - Number(aprovada)) > 0.001
}

// Unified tree: empresa → dept → setor → box → colaborador
// Nenhuma linha é descartada por box/setor que não existam mais no cadastro: cai no nome gravado.
function buildUnifiedTree(allRows, deptMap, setorMap, boxMap, funcMap) {
  const tree = {}
  allRows.forEach(r => {
    const eId   = r.empresa_id || '—'
    const eNome = r.empresa_nome || eId
    const dId   = r.departamento_id || r.departamento_nome || '—'
    const sId   = r.setor_id   || r.setor_nome   || '—'
    const bId   = r.box_id     || r.box_nome     || '—'
    const coId  = r.colaborador_id || r.colaborador_nome || '—'

    const dNome  = deptMap[r.departamento_id]  || r.departamento_nome  || '—'
    const sNome  = setorMap[r.setor_id]         || r.setor_nome         || '—'
    const bNome  = boxMap[r.box_id]             || r.box_nome           || '—'
    const coNome = funcMap[r.colaborador_id]    || r.colaborador_nome   || '—'

    const val = Number(r.meta_faturamento) || 0

    if (!tree[eId]) tree[eId] = { nome: eNome, depts: {} }
    const emp = tree[eId]
    if (!emp.depts[dId]) emp.depts[dId] = { nome: dNome, setores: {} }
    const dept = emp.depts[dId]
    if (!dept.setores[sId]) dept.setores[sId] = { nome: sNome, boxes: {} }
    const setor = dept.setores[sId]
    if (!setor.boxes[bId]) setor.boxes[bId] = { nome: bNome, colabs: {} }
    const box = setor.boxes[bId]
    if (!box.colabs[coId]) box.colabs[coId] = { nome: coNome, meses: Array(12).fill(0), tem: false, pend: false }
    const colab = box.colabs[coId]
    colab.meses[r.mes - 1] += val
    const grav = Number(r._grav ?? r.meta_faturamento) || 0
    if (grav) {
      colab.tem = true
      if (linhaPendente(grav, r.meta_aprovada)) colab.pend = true
    }
  })
  return tree
}

// Situação do Setor: pendente se qualquer mês com valor de qualquer colaborador dele não estiver aprovado.
const statusSetor = (setor) => {
  let tem = false, pend = false
  Object.values(setor.boxes).forEach(b => Object.values(b.colabs).forEach(co => {
    if (co.tem) tem = true
    if (co.pend) pend = true
  }))
  return { tem, label: pend ? 'AGUARDANDO APROVACAO' : 'APROVADO' }
}

const aggColabs = (colabs) => { const a = Array(12).fill(0); Object.values(colabs).forEach(c => c.meses.forEach((v,i)=>{ a[i]+=v })); return a }
const aggBox    = (box)    => aggColabs(box.colabs)
const aggSetor  = (setor)  => { const a = Array(12).fill(0); Object.values(setor.boxes).forEach(b => aggBox(b).forEach((v,i)=>{a[i]+=v})); return a }
const aggDept   = (dept)   => { const a = Array(12).fill(0); Object.values(dept.setores).forEach(s => aggSetor(s).forEach((v,i)=>{a[i]+=v})); return a }
const aggEmp    = (emp)    => { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d => aggDept(d).forEach((v,i)=>{a[i]+=v})); return a }

// O setor Consultores é só a distribuição de Mecânica + Funilaria (+ Terceiros) entre os consultores; somar
// junto com eles contaria tudo duas vezes. O total do departamento exclui Consultores (que continua
// aparecendo na árvore, para consulta).
const ehConsultores = (s) => (s.nome || '').toLowerCase().includes('consultor')
const aggDeptDedup = (dept) => {
  const a = Array(12).fill(0)
  Object.values(dept.setores).filter(s => !ehConsultores(s)).forEach(s => aggSetor(s).forEach((v,i) => { a[i] += v }))
  return a
}
const aggEmpDedup = (emp) => { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d => aggDeptDedup(d).forEach((v,i)=>{a[i]+=v})); return a }

const SEL = 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function MetasPosVendaTotal() {
  const [empresas,      setEmpresas]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [rowsPecas,     setRowsPecas]     = useState([])
  const [rowsMecanico,  setRowsMecanico]  = useState([])
  const [rowsConsultor, setRowsConsultor] = useState([])
  const [rowsTerceiros, setRowsTerceiros] = useState([])
  const [filtroAno,     setFiltroAno]     = useSessionState('mpvs_servicos_ano', anoAtual)
  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('mpvs_servicos_empresas', [])
  const [filtroVisu,    setFiltroVisu]    = useSessionState('mpvs_servicos_visu', 'total')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [expanded,      setExpanded]      = useState(new Set())
  const [segAbertos,   setSegAbertos]   = useState(new Set())
  const [grupoAberto,  setGrupoAberto]  = useState(true)

  const tog    = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const isOpen = (key) => expanded.has(key)

  const loadAll = async () => {
    setLoading(true); setError(null)
    try {
      const empId = empresaParam(filtroEmpresa)
      const [emps, depts, sets, bxs, cargs, funcs, pecas, mecanico, consultor, terceiros] = await Promise.all([
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
      ])
      const sortedEmps = [...empresasDasMetas(emps)].sort((a,b) => (a.empresa_fantasia||'').localeCompare(b.empresa_fantasia||''))
      setEmpresas(sortedEmps)
      setDepartamentos(depts)
      setSetores(sets)
      setBoxes(bxs)
      setCargos(cargs)
      setFuncionarios(funcs)
      setRowsPecas(filtrarPorEmpresas(pecas, filtroEmpresa))
      setRowsMecanico(filtrarPorEmpresas(mecanico, filtroEmpresa))
      setRowsConsultor(filtrarPorEmpresas(consultor, filtroEmpresa))
      setRowsTerceiros(filtrarPorEmpresas(terceiros, filtroEmpresa))
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [filtroEmpresa, filtroAno])

  const deptMap  = useMemo(() => Object.fromEntries(departamentos.map(d => [d.id, d.nome_departamento])),  [departamentos])
  const setorMap = useMemo(() => Object.fromEntries(setores.map(s => [s.id, s.nome_setor])),               [setores])
  const boxMap   = useMemo(() => Object.fromEntries(boxes.map(b => [b.id, b.nome_box])),                   [boxes])
  const funcMap  = useMemo(() => Object.fromEntries(funcionarios.map(f => [f.id, f.nome_funcionario])),    [funcionarios])

  // Mecânico: mesma posição (departamento/setor/box/cargo pelo cadastro do funcionário) e mesmo cálculo da
  // aba Metas - Mecânico, para os valores baterem exatamente.
  const mecRowsNormalized = useMemo(() => {
    const ctx = { funcionarios, cargos, boxes, setores, departamentos }
    return rowsMecanico.map(r => {
      const p = resolverPosicaoMecanico(r, ctx)
      const { meta_servicos: ms, meta_pecas: mp } = valoresMetaMecanico(r)
      const val = filtroVisu === 'servicos' ? ms : filtroVisu === 'pecas' ? mp : ms + mp
      return {
        ...r,
        departamento_id: p.did, setor_id: p.sId, box_id: p.bId, cargo_id: p.cId,
        meta_faturamento: val, _grav: ms + mp,
      }
    })
  }, [rowsMecanico, filtroVisu, funcionarios, cargos, boxes, setores, departamentos])

  // Consultor: as linhas novas ficam ligadas direto a Mecânica/Funilaria; aqui elas voltam ao setor
  // "Consultores" (distribuição), que aparece na árvore mas não entra no total (ver aggDeptDedup).
  const consultoriaSetor = useMemo(() => setores.find(s => s.tipo_setor === 'consultoria') || null, [setores])
  const consRowsNormalized = useMemo(() => {
    if (!consultoriaSetor) return rowsConsultor
    return rowsConsultor.map(r => {
      const boxOrig = r.box_id ? boxes.find(b => b.id === r.box_id)
        : boxes.find(b => (Array.isArray(b.setor_ids) ? b.setor_ids : [b.setor_id]).includes(r.setor_id))
      return {
        ...r,
        departamento_id: consultoriaSetor.departamento_id || r.departamento_id,
        setor_id: consultoriaSetor.id, setor_nome: consultoriaSetor.nome_setor,
        box_id: boxOrig?.id || '', box_nome: boxOrig?.nome_box || r.box_nome || r.setor_nome || '—',
      }
    })
  }, [rowsConsultor, consultoriaSetor, boxes])

  // Funilaria setor da tabela de dimensão
  const funSetorInfo = useMemo(() => {
    const s = setores.find(s => (s.nome_setor || '').toLowerCase().includes('funilaria'))
    if (!s) return null
    return { id: s.id, nome: s.nome_setor, departamento_id: s.departamento_id }
  }, [setores])

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
        _grav: Number(r.meta_faturamento) || val,
        meta_aprovada: r.meta_aprovada,
      }]
    })
  }, [rowsTerceiros, terSetorInfo, funSetorInfo, filtroVisu, deptMap])

  // Árvore unificada: Peças + Consultor + Mecânico (inclui Produtivo Não Associado Funilaria) + Terceiros
  const tree = useMemo(
    () => buildUnifiedTree(
      [...rowsPecas, ...consRowsNormalized, ...mecRowsNormalized, ...terRowsNormalized],
      deptMap, setorMap, boxMap, funcMap
    ),
    [rowsPecas, consRowsNormalized, mecRowsNormalized, terRowsNormalized, deptMap, setorMap, boxMap, funcMap]
  )

  const expandirTudo = () => {
    const keys = new Set()
    Object.entries(tree).forEach(([eId, emp]) => {
      const eKey = `emp-${eId}`; keys.add(eKey)
      Object.entries(emp.depts || {}).forEach(([dId, dept]) => {
        const dKey = `${eKey}-d-${dId}`; keys.add(dKey)
        Object.entries(dept.setores || {}).forEach(([sId, setor]) => {
          const sKey = `${dKey}-s-${sId}`; keys.add(sKey)
          Object.keys(setor.boxes || {}).forEach(bId => keys.add(`${sKey}-b-${bId}`))
        })
      })
    })
    setExpanded(keys)
    setGrupoAberto(true)
    setSegAbertos(new Set(agruparPorSegmento(Object.entries(tree), empresas).map(([l]) => l)))
  }

  const recolherTudo = () => { setExpanded(new Set()); setSegAbertos(new Set()); setGrupoAberto(false) }
  const tudoExpandido = expanded.size > 0 && Object.keys(tree).every(eId => expanded.has(`emp-${eId}`))

  useEffect(() => {
    if (filtroEmpresa.length) {
      setExpanded(prev => {
        const n = new Set(prev)
        filtroEmpresa.forEach(id => n.add(`emp-${id}`))
        return n
      })
    }
  }, [filtroEmpresa])

  const mCells = (vals, prefix, emphTotal = false, situacao = null) => [
    ...vals.map((v, i) => (
      <td key={`${prefix}-m${i}`} className="px-2 py-1 text-right text-xs whitespace-nowrap text-slate-700">
        {v > 0 ? fmtBRL(v) : <span className="text-slate-300">—</span>}
      </td>
    )),
    <td key={`${prefix}-tot`} className={`px-2 py-1 text-right text-xs font-semibold whitespace-nowrap ${emphTotal ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-700'}`}>
      {sumArr(vals) > 0 ? fmtBRL(sumArr(vals)) : <span className="text-slate-300">—</span>}
    </td>,
    <td key={`${prefix}-sit`} className="px-2 py-1 text-center whitespace-nowrap">{situacao}</td>,
  ]

  // Só entram empresas com algum valor lançado em Mecânico, Consultor ou Peças.
  const empresasComValor = useMemo(() => {
    const ids = new Set()
    rowsPecas.forEach(r => { if (Number(r.meta_faturamento) > 0) ids.add(r.empresa_id) })
    rowsConsultor.forEach(r => { if (Number(r.meta_faturamento) > 0 || Number(r.percentual) > 0) ids.add(r.empresa_id) })
    rowsMecanico.forEach(r => { const v = valoresMetaMecanico(r); if (v.meta_servicos + v.meta_pecas > 0) ids.add(r.empresa_id) })
    return ids
  }, [rowsPecas, rowsConsultor, rowsMecanico])

  const empList = empresas
    .filter(e => empresasComValor.has(e.id))
    .filter(e => !filtroEmpresa.length || filtroEmpresa.includes(e.id))

  const empBlocos = empList.map(emp => {
    const eId   = emp.id
    const eNome = emp.empresa_fantasia || emp.empresa_nome || eId
    const eKey  = `emp-${eId}`

    const empNode = tree[eId]
    const vTotal  = empNode ? aggEmpDedup(empNode) : Array(12).fill(0)

    const empOpen = isOpen(eKey)
    const childRows = []

    if (empOpen && empNode) {
      Object.entries(empNode.depts).forEach(([dId, dept]) => {
        const dVals = aggDeptDedup(dept)
        if (sumArr(dVals) === 0) return
        const dKey = `${eKey}-d-${dId}`
        childRows.push(
          <tr key={dKey} className="bg-emerald-50 hover:bg-emerald-100 cursor-pointer" onClick={e => { e.stopPropagation(); tog(dKey) }}>
            <td className="pl-8 pr-2 py-1.5 text-xs font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-emerald-50">
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
          const sSit = statusSetor(setor)
          const sSituacao = sSit.tem
            ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_CLS[sSit.label]}`}>{STATUS_DISPLAY[sSit.label]}</span>
            : null
          childRows.push(
            <tr key={sKey} className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={e => { e.stopPropagation(); tog(sKey) }}>
              <td className="pl-14 pr-2 py-1 text-xs text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50">
                <span className="flex items-center gap-1">
                  {isOpen(sKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                  <span className="text-slate-400 mr-0.5">Setor:</span>
                  <span className="font-semibold">{setor.nome}</span>
                </span>
              </td>
              {mCells(sVals, sKey, false, sSituacao)}
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

            Object.entries(box.colabs).forEach(([coId, colab]) => {
              if (sumArr(colab.meses) === 0) return
              const coKey = `${bKey}-co-${coId}`
              childRows.push(
                <tr key={coKey} className="border-b border-slate-100 hover:bg-indigo-50/30">
                  <td className="pl-20 pr-2 py-1 text-xs text-slate-800 whitespace-nowrap font-semibold sticky left-0 bg-white">
                    {colab.nome}
                  </td>
                  {mCells(colab.meses, coKey)}
                </tr>
              )
            })
          })
        })
      })
    }

    const linhas = [
      <tr key={eKey}
        className="cursor-pointer hover:bg-emerald-200 border-t border-emerald-200 bg-emerald-100"
        onClick={() => tog(eKey)}>
        <td className="pl-6 pr-2 py-2 text-sm font-bold text-emerald-950 whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            {empOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
            {eNome}
          </span>
        </td>
        {vTotal.map((v,i) => (
          <td key={i} className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap text-emerald-900">
            {v > 0 ? fmtBRL(v) : <span className="text-slate-300">—</span>}
          </td>
        ))}
        <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-emerald-900 bg-emerald-200">
          {fmtBRL(sumArr(vTotal))}
        </td>
        <td />
      </tr>,
      ...childRows,
    ]
    return { emp, vTotal, linhas }
  })

  // Nível acima da Empresa: SEGMENTO - MARCA (ex.: MOTOS - HONDA).
  const segRows = agruparPorSegmento(empBlocos.map(b => [b.emp.id, b]), empresas).flatMap(([segLabel, blocos]) => {
    const segMeses = Array(12).fill(0)
    blocos.forEach(([, b]) => b.vTotal.forEach((v, i) => { segMeses[i] += v }))
    const segAberto = segAbertos.has(segLabel)
    return [
      <tr key={`seg-${segLabel}`} className="cursor-pointer bg-sky-100 hover:bg-sky-50 border-t-2 border-sky-300"
          onClick={() => setSegAbertos(prev => { const n = new Set(prev); n.has(segLabel) ? n.delete(segLabel) : n.add(segLabel); return n })}>
        <td className="pl-3 pr-2 py-2 text-sm font-bold text-sky-950 whitespace-nowrap">
          <span className="flex items-center gap-1.5">{segAberto ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}{segLabel}<LogoSegmento rotulo={segLabel} /></span>
        </td>
        {segMeses.map((v, i) => (
          <td key={i} className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap text-sky-900">{v > 0 ? fmtBRL(v) : '—'}</td>
        ))}
        <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-sky-900 bg-sky-200">{fmtBRL(sumArr(segMeses))}</td>
        <td />
      </tr>,
      ...(segAberto ? blocos.flatMap(([, b]) => b.linhas) : []),
    ]
  })

  // Primeiro nível: Grupo Caiobá (soma das empresas exibidas), igual às outras abas.
  const grupoMeses = Array(12).fill(0)
  empBlocos.forEach(b => b.vTotal.forEach((v, i) => { grupoMeses[i] += v }))
  const empRows = segRows.length === 0 ? [] : [
    <tr key="grupo" className="cursor-pointer bg-slate-300 hover:bg-slate-200 transition-colors" onClick={() => setGrupoAberto(v => !v)}>
      <td className="pl-3 pr-2 py-2.5 text-sm font-bold text-slate-900 whitespace-nowrap">
        <span className="flex items-center gap-2">{grupoAberto ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}Grupo Caiobá<LogoGrupo /></span>
      </td>
      {grupoMeses.map((v, i) => (
        <td key={i} className="px-2 py-2.5 text-right text-xs font-bold whitespace-nowrap text-slate-800">{v > 0 ? fmtBRL(v) : '—'}</td>
      ))}
      <td className="px-2 py-2.5 text-right text-xs font-bold whitespace-nowrap text-indigo-900 bg-slate-400">{fmtBRL(sumArr(grupoMeses))}</td>
      <td />
    </tr>,
    ...(grupoAberto ? segRows : []),
  ]

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Total Pós-Vendas</h1>
            <p className="text-xs text-slate-400">Consolidado de Peças · Consultores · Mecânicos · Terceiros</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className={SEL}>
          {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="w-64"><EmpresaMultiFilter value={filtroEmpresa} onChange={setFiltroEmpresa} empresas={empresas} /></div>
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
                  <span>Empresa</span>
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
              <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && empRows.length === 0 && (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-400 text-sm">
                  Nenhum dado encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {empRows}
          </tbody>
        </table>
      </div>
    </div>
  )
}
