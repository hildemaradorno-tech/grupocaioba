import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, Trash2, X, AlertTriangle, ChevronRight, ChevronDown, Cog, Loader2, CheckCircle2, Sparkles, Pencil, Info, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtBRL = (v) => { const n = Number(v); if (!v && v !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
const fmtPct = (v) => { const n = Number(v); if (!n && n !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%' }
function parseBRL(s) { if (!s && s !== 0) return 0; const str = String(s).trim(); if (str.includes(',')) return parseFloat(str.replace(/\./g,'').replace(',','.')) || 0; return parseFloat(str) || 0 }

function cellState(cur, apr) { const c = Number(cur)||0; if(c===0) return 'ok'; if(apr===null||apr===undefined) return 'new'; if(Math.abs(c-Number(apr))>0.001) return 'changed'; return 'ok' }
function pendingCountEmp(emp) {
  let n = 0
  Object.values(emp.depts).forEach(d => Object.values(d.setores).forEach(st => Object.values(st.boxes).forEach(bx => Object.values(bx.cargos).forEach(ca => Object.values(ca.colabs).forEach(co => Object.values(co.meses).forEach(m => { if(cellState(m.meta_faturamento,m.meta_aprovada)!=='ok') n++ }))))))
  return n
}

function aggColabs(cm) { const a=Array(12).fill(0); Object.values(cm).forEach(c=>Object.entries(c.meses).forEach(([m,d])=>{a[+m-1]+=Number(d.meta_faturamento)||0})); return a }
function aggCargo(ca)  { const a=Array(12).fill(0); Object.values(ca.colabs).forEach(c=>aggColabs({x:c}).forEach((v,i)=>{a[i]+=v})); return a }
function aggBox(bx)    { const a=Array(12).fill(0); Object.values(bx.cargos).forEach(c=>aggCargo(c).forEach((v,i)=>{a[i]+=v})); return a }
function aggSetor(st)  { const a=Array(12).fill(0); Object.values(st.boxes).forEach(b=>aggBox(b).forEach((v,i)=>{a[i]+=v})); return a }
function aggDept(d)    { const a=Array(12).fill(0); Object.values(d.setores).forEach(s=>aggSetor(s).forEach((v,i)=>{a[i]+=v})); return a }
function aggEmp(e)     { const a=Array(12).fill(0); Object.values(e.depts).forEach(d=>aggDept(d).forEach((v,i)=>{a[i]+=v})); return a }
function aggTree(t)    { const a=Array(12).fill(0); Object.values(t).forEach(e=>aggEmp(e).forEach((v,i)=>{a[i]+=v})); return a }
function sumArr(a)     { return a.reduce((s,v)=>s+v,0) }

// Soma % por mês de todos colaboradores de uma empresa
function sumPctPorMes(colabsMap) {
  const a = Array(12).fill(0)
  Object.values(colabsMap).forEach(co =>
    Object.entries(co.meses).forEach(([m, d]) => { a[+m-1] += Number(d.percentual)||0 })
  )
  return a
}

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const SEL = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const STATUS_CLS = { 'AGUARDANDO APROVACAO': 'bg-amber-100 text-amber-700', 'APROVADO': 'bg-green-100 text-green-700' }
const STATUS_DISPLAY = { 'AGUARDANDO APROVACAO': 'Aguard. Aprovação', 'APROVADO': 'Aprovado', 'REPROVADO': 'Reprovado' }

const FORM_VAZIO = { empresa_id:'', empresa_nome:'', departamento_id:'', departamento_nome:'', setor_id:'', setor_nome:'', box_id:'', box_nome:'', cargo_id:'', cargo_nome:'', colaborador_id:'', colaborador_nome:'', ano: anoAtual }
const mesesVazios = () => Array.from({ length: 12 }, (_, i) => ({ mes: i+1, percentual: '' }))

function PctInput({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const fmt = (v) => { const n=Number(v); if(!n&&n!==0) return ''; return n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}) }
  const displayed = focused ? raw : (value||value===0 ? fmt(value) : '')
  return (
    <input type="text" inputMode="decimal" value={displayed}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { setRaw(value!=null?String(value).replace('.',','):''); setFocused(true) }}
      onBlur={() => { setFocused(false); onChange(parseFloat(String(raw).replace(',','.'))||0) }}
      placeholder="0,0"
      className="w-full text-xs text-center outline-none bg-transparent text-slate-800" />
  )
}

export default function MetasServicosConsultor() {
  const navigate = useNavigate()
  const [empresas,      setEmpresas]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [dados,         setDados]         = useState([])
  const [totaisMec,     setTotaisMec]     = useState({}) // { empresaId: { mes: { servicos, pecas } } }
  const [totaisTer,     setTotaisTer]     = useState({}) // { empresaId: { mes: servicos } }
  const [totaisFun,     setTotaisFun]     = useState({}) // { empresaId: { mes: { servicos, pecas } } }
  const [filtroVisu,    setFiltroVisu]    = useSessionState('msc_visu', 'total')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('msc_empresa', '')
  const [filtroAno,     setFiltroAno]     = useSessionState('msc_ano', anoAtual)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/pos-vendas/servicos', 'editar')
  const canDelete = hasPermission('/metas/pos-vendas/servicos', 'excluir')

  const [grupoAberto,      setGrupoAberto]      = useState(true)
  const [expandedEmpresas, setExpandedEmpresas] = useState(new Set())
  const [expandedDepts,    setExpandedDepts]    = useState(new Set())
  const [expandedSetores,  setExpandedSetores]  = useState(new Set())
  const [expandedBoxes,    setExpandedBoxes]    = useState(new Set())
  const [expandedCargos,   setExpandedCargos]   = useState(new Set())

  const [modalAberto,        setModalAberto]        = useState(false)
  const [modoModal,          setModoModal]          = useState('incluir')
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [form,               setForm]               = useState(FORM_VAZIO)
  const [mesesForm,          setMesesForm]          = useState(mesesVazios())
  const [mecTotaisModal,     setMecTotaisModal]     = useState({})
  const [colabExcluir,       setColabExcluir]       = useState(null)
  const [salvando,           setSalvando]           = useState(false)
  const [erroModal,          setErroModal]          = useState(null)
  useEffect(() => { loadLookups() }, [])
  useEffect(() => { loadDados() }, [filtroEmpresa, filtroAno])

  const sortNome = (arr, f) => [...arr].sort((a,b)=>(a[f]||'').localeCompare(b[f]||''))

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
      // Carrega totais do mecânico para todas as empresas (ou só a filtrada)
      const empIds = filtroEmpresa
        ? [filtroEmpresa]
        : todasEmpresas.map(e => e.id)
      const map = {}
      await Promise.all(empIds.map(async eid => {
        map[eid] = await apiService.getMetasMecanicoTotaisPorMes(eid, filtroAno)
      }))
      setTotaisMec(map)
      // Terceiros: { empId: { mes: meta_servicos } }
      const terMap = {}
      terRows.forEach(r => {
        if (!terMap[r.empresa_id]) terMap[r.empresa_id] = {}
        terMap[r.empresa_id][r.mes] = (terMap[r.empresa_id][r.mes] || 0) + (Number(r.meta_servicos) || 0)
      })
      setTotaisTer(terMap)
      // Funilaria: { empId: { mes: { servicos, pecas } } }
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

  const toggle = (set, setter, key) => setter(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n })

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
            Object.keys(box.cargos).forEach(cid => cars.add(`${bKey}§${cid}`))
          })
        })
      })
    })
    setExpandedEmpresas(emps); setExpandedDepts(depts); setExpandedSetores(sets)
    setExpandedBoxes(bxs); setExpandedCargos(cars)
  }

  const recolherTudo = () => {
    setGrupoAberto(false)
    setExpandedEmpresas(new Set()); setExpandedDepts(new Set()); setExpandedSetores(new Set())
    setExpandedBoxes(new Set()); setExpandedCargos(new Set())
  }

  const setoresConsultoria = useMemo(()=>new Set(setores.filter(s=>s.tipo_setor==='consultoria').map(s=>s.id)),[setores])
  const boxesConsultoria   = useMemo(()=>boxes.filter(b=>(Array.isArray(b.setor_ids)?b.setor_ids:[b.setor_id]).some(sid=>setoresConsultoria.has(sid))).sort((a,b)=>(b.nome_box||'').localeCompare(a.nome_box||'')),[boxes,setoresConsultoria])

  const tree = useMemo(() => {
    // Lookup maps for O(1) resolution from dimension tables
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
    dados.forEach(row => {
      // Box ou cargo deletado — descarta a linha
      if (row.box_id   && !boxMap[row.box_id])     return
      if (row.cargo_id && !cargoMap[row.cargo_id]) return

      const eid   = row.empresa_id
      const did   = row.departamento_id || '—'
      const bId   = row.box_id   || '—'
      const cId   = row.cargo_id || '—'
      const colid = row.colaborador_id

      // Setor: SEMPRE resolve pelo vínculo atual do box em dim_box (ignora setor_id armazenado na linha)
      const sId = (row.box_id && boxToSetorMap[row.box_id])
        || (row.setor_id && setorMap[row.setor_id] ? row.setor_id : null)
        || '—'
      if (!setorMap[sId]) return

      const dNome  = deptMap[did]        || '—'
      const sNome  = setorMap[sId]       || '—'
      const bNome  = boxMap[bId]         || '—'
      const cNome  = cargoMap[cId]       || '—'
      const coNome = funcMap[colid]      || row.colaborador_nome || colid

      if(!t[eid]) t[eid]={ nome:row.empresa_nome||eid, depts:{} }
      const depts=t[eid].depts
      if(!depts[did]) depts[did]={ nome:dNome, setores:{} }
      depts[did].nome = dNome
      const stMap=depts[did].setores
      if(!stMap[sId]) stMap[sId]={ nome:sNome, boxes:{} }
      if(!stMap[sId].boxes[bId]) stMap[sId].boxes[bId]={ nome:bNome, cargos:{}, auto:false }
      if(!stMap[sId].boxes[bId].cargos[cId]) stMap[sId].boxes[bId].cargos[cId]={ nome:cNome, colabs:{} }
      const coMap=stMap[sId].boxes[bId].cargos[cId].colabs
      if(!coMap[colid]) coMap[colid]={ nome:coNome, meses:{} }
      const _isFun = bNome.toLowerCase().includes('funilaria') || bNome.toLowerCase().includes('pintura')
      const _mec  = totaisMec[eid]?.[row.mes] || {}
      const _ter  = Number(totaisTer[eid]?.[row.mes]) || 0
      const _fun  = totaisFun[eid]?.[row.mes] || {}
      const _ref  = _isFun ? (_fun.servicos || 0) + (_fun.pecas || 0) : (_mec.servicos || 0) + _ter
      const _metaCalc = _ref * ((Number(row.percentual) || 0) / 100)
      coMap[colid].meses[row.mes]={
        id:row.id, percentual:row.percentual,
        meta_faturamento:_metaCalc, meta_aprovada:row.meta_aprovada??null,
        dias_uteis_reais:row.dias_uteis_reais,
      }
    })

    // Injeta boxes de consultoria automaticamente para empresas com totais de mecânico
    Object.keys(totaisMec).forEach(eid => {
      const mecMap = totaisMec[eid] || {}
      const temMec = Object.values(mecMap).some(v => Number(v) > 0)
      if (!temMec) return
      if (!t[eid]) {
        const empLkp = empresas.find(e => e.id === eid)
        const empNome = empLkp?.empresa_fantasia || empLkp?.nome_empresa || eid
        t[eid] = { nome: empNome, depts: {} }
      }
      boxesConsultoria.forEach(bx => {
        const bId   = bx.id
        const bNome = boxMap[bId] || bx.nome_box || '—'
        const setorId = (Array.isArray(bx.setor_ids) ? bx.setor_ids : [bx.setor_id]).find(sid => setoresConsultoria.has(sid))
        if (!setorId || !setorMap[setorId]) return
        const sNome = setorMap[setorId]
        const setor = setores.find(s => s.id === setorId)
        if (!setor) return
        const dId = setor.departamento_id
        if (!deptMap[dId]) return
        const dNome = deptMap[dId]
        const depts = t[eid].depts
        if (!depts[dId]) depts[dId] = { nome: dNome, setores: {} }
        if (!depts[dId].setores[setorId]) depts[dId].setores[setorId] = { nome: sNome, boxes: {} }
        if (!depts[dId].setores[setorId].boxes[bId]) {
          depts[dId].setores[setorId].boxes[bId] = { nome: bNome, cargos: {}, auto: true }
        }
      })
    })
    return t
  }, [dados, totaisMec, totaisTer, totaisFun, boxesConsultoria, setoresConsultoria, setores, departamentos, empresas, boxes, cargos, funcionarios])

  const totalColabs = useMemo(() =>
    Object.values(tree).reduce((s,e)=>s+Object.values(e.depts).reduce((sd,d)=>sd+Object.values(d.setores).reduce((ss,st)=>ss+Object.values(st.boxes).reduce((sb,bx)=>sb+Object.values(bx.cargos).reduce((sc,ca)=>sc+Object.keys(ca.colabs).length,0),0),0),0),0),
    [tree])

  const setoresDoDepto = useMemo(()=>setores.filter(s=>s.departamento_id===form.departamento_id && s.tipo_setor==='consultoria'),[setores,form.departamento_id])
  const boxesDoSetor   = useMemo(()=>boxes.filter(b=>(Array.isArray(b.setor_ids)?b.setor_ids:[b.setor_id]).includes(form.setor_id)),[boxes,form.setor_id])
  const cargosDoDepto  = useMemo(()=>cargos.filter(c=>(c.setor_ids||[]).some(sid=>setoresConsultoria.has(sid))),[cargos,setoresConsultoria])
  const funcsEmp = useMemo(() => {
    let l=funcionarios
    if(form.empresa_id) l=l.filter(f=>f.empresa_id===form.empresa_id)
    if(form.departamento_id) l=l.filter(f=>Array.isArray(f.departamento_ids)?f.departamento_ids.includes(form.departamento_id):f.departamento_id===form.departamento_id)
    if(form.setor_id) l=l.filter(f=>Array.isArray(f.setor_ids)?f.setor_ids.includes(form.setor_id):f.setor_id===form.setor_id)
    return l
  },[funcionarios,form.empresa_id,form.departamento_id,form.setor_id])

  const handleFormChange = async (e) => {
    const { name, value } = e.target
    const up = { [name]: value }
    if(name==='empresa_id') {
      const emp=empresas.find(x=>x.id===value)
      up.empresa_nome=emp?(emp.empresa_fantasia||emp.nome_empresa):''; up.colaborador_id=''; up.colaborador_nome=''
      // Carrega totais mecânico para esta empresa
      if(value && filtroAno) {
        try { const t = await apiService.getMetasMecanicoTotaisPorMes(value, filtroAno); setMecTotaisModal(t) } catch {}
      } else { setMecTotaisModal({}) }
    }
    if(name==='departamento_id') { const dep=departamentos.find(x=>x.id===value); up.departamento_nome=dep?.nome_departamento||''; up.setor_id=''; up.setor_nome=''; up.box_id=''; up.box_nome=''; up.cargo_id=''; up.cargo_nome='' }
    if(name==='setor_id') { const s=setores.find(x=>x.id===value); up.setor_nome=s?.nome_setor||''; up.box_id=''; up.box_nome=''; up.colaborador_id=''; up.colaborador_nome='' }
    if(name==='box_id') { up.box_nome=boxes.find(x=>x.id===value)?.nome_box||'' }
    if(name==='cargo_id') { up.cargo_nome=cargos.find(x=>x.id===value)?.nome_cargo||'' }
    if(name==='colaborador_id') { up.colaborador_nome = value === 'A_CONTRATAR' ? 'A contratar' : (funcionarios.find(x=>x.id===value)?.nome_funcionario||'') }
    setForm(prev=>({...prev,...up}))
  }

  const abrirIncluir = async () => {
    const emp=empresas.find(e=>e.id===filtroEmpresa)
    const deptOficina=departamentos.find(d=>(d.nome_departamento||'').toUpperCase().includes('OFICINA'))
    setForm({...FORM_VAZIO, ano:filtroAno, empresa_id:filtroEmpresa, empresa_nome:emp?(emp.empresa_fantasia||emp.nome_empresa):'', departamento_id:deptOficina?.id||'', departamento_nome:deptOficina?.nome_departamento||''})
    setMesesForm(mesesVazios())
    setErroModal(null)
    if(filtroEmpresa) {
      try { const t=await apiService.getMetasMecanicoTotaisPorMes(filtroEmpresa,filtroAno); setMecTotaisModal(t) } catch {}
    } else { setMecTotaisModal({}) }
    setModoModal('incluir')
    setModalAberto(true)
  }

  const _abrirModalConsultor = async (empId, colabId, modo) => {
    const rows = dados.filter(r =>
      String(r.empresa_id) === String(empId) &&
      String(r.colaborador_id) === String(colabId) &&
      Number(r.ano) === Number(filtroAno)
    )
    if (!rows.length) return
    const r0 = rows[0]
    setForm({
      ...FORM_VAZIO,
      empresa_id:       r0.empresa_id,
      empresa_nome:     r0.empresa_nome     || '',
      departamento_id:  r0.departamento_id  || '',
      departamento_nome:r0.departamento_nome|| '',
      setor_id:         r0.setor_id         || '',
      setor_nome:       r0.setor_nome        || '',
      box_id:           r0.box_id            || '',
      box_nome:         r0.box_nome          || '',
      cargo_id:         r0.cargo_id          || '',
      cargo_nome:       r0.cargo_nome        || '',
      colaborador_id:   r0.colaborador_id,
      colaborador_nome: r0.colaborador_nome  || '',
      ano:              filtroAno,
    })
    setMesesForm(Array.from({ length: 12 }, (_, i) => {
      const row = rows.find(r => Number(r.mes) === i + 1)
      return { mes: i + 1, percentual: row?.percentual ?? '' }
    }))
    setErroModal(null)
    if (empId) {
      try { const t = await apiService.getMetasMecanicoTotaisPorMes(empId, filtroAno); setMecTotaisModal(t) } catch {}
    } else { setMecTotaisModal({}) }
    setModoModal(modo)
    setModalAberto(true)
  }

  const abrirEditar     = (empId, colabId) => _abrirModalConsultor(empId, colabId, 'editar')
  const abrirVisualizar = (empId, colabId) => _abrirModalConsultor(empId, colabId, 'visualizar')

  const boxSelecionadoNome = boxes.find(b => b.id === form.box_id)?.nome_box || ''
  const isFunBoxModal = boxSelecionadoNome.toLowerCase().includes('funilaria') || boxSelecionadoNome.toLowerCase().includes('pintura')

  // Referência do modal: Funilaria/Pintura se box for funilaria, senão Mecânica + Terceiros
  const refModalPorMes = useMemo(() => {
    const result = {}
    if (isFunBoxModal) {
      const fun = totaisFun[form.empresa_id] || {}
      for (let m = 1; m <= 12; m++) {
        result[m] = (fun[m]?.servicos || 0) + (fun[m]?.pecas || 0)
      }
    } else {
      const ter = totaisTer[form.empresa_id] || {}
      for (let m = 1; m <= 12; m++) {
        result[m] = (mecTotaisModal[m]?.servicos || 0) + (Number(ter[m]) || 0)
      }
    }
    return result
  }, [mecTotaisModal, totaisTer, totaisFun, form.empresa_id, isFunBoxModal])

  // Valor de referência por empresa/mês conforme filtroVisu
  const getRefVal = (empId, mes) => {
    const mec = totaisMec[empId]?.[mes] || {}
    const ter = Number(totaisTer[empId]?.[mes]) || 0
    const fun = totaisFun[empId]?.[mes] || {}
    if (filtroVisu === 'servicos') return (mec.servicos || 0) + ter
    if (filtroVisu === 'pecas')    return (mec.pecas    || 0) + (fun.pecas    || 0)
    return (mec.servicos || 0) + (mec.pecas || 0) + ter + (fun.servicos || 0) + (fun.pecas || 0)
  }

  // Calcula meta = (mecânico serviços + terceiros) do mês × percentual/100
  const calcMetaConsultor = (mes, percentual) => {
    const ref = Number(refModalPorMes[mes]) || 0
    return ref * ((Number(percentual)||0) / 100)
  }

  // Soma % já cadastrada para o mesmo Setor+Box+Empresa no mês (excluindo o consultor atual)
  const pctSomadoNoMes = useMemo(() => {
    if (!form.empresa_id) return {}
    const sNome = setores.find(s => s.id === form.setor_id)?.nome_setor ?? null
    const bNome = boxes.find(b => b.id === form.box_id)?.nome_box ?? null
    const map = {}
    dados.filter(r =>
      r.empresa_id    === form.empresa_id &&
      r.ano           === Number(form.ano) &&
      r.colaborador_id !== form.colaborador_id &&
      (!sNome || r.setor_nome === sNome) &&
      (!bNome || r.box_nome   === bNome)
    ).forEach(r => { map[r.mes] = (map[r.mes]||0) + (Number(r.percentual)||0) })
    return map
  }, [dados, form.empresa_id, form.ano, form.colaborador_id, form.setor_id, form.box_id, setores, boxes])

  const handleSalvar = async () => {
    if(!form.empresa_id)     { setErroModal('Selecione a Empresa.'); return }
    if(!form.colaborador_id) { setErroModal('Selecione o Colaborador.'); return }
    setSalvando(true); setErroModal(null)
    try {
      for (const m of mesesForm) {
        const pct  = Number(m.percentual) || 0
        const meta = calcMetaConsultor(m.mes, pct)
        await apiService.upsertMetaConsultor({
          ...form,
          colaborador_id: form.colaborador_id === 'A_CONTRATAR' ? '00000000-0000-0000-0000-000000000000' : form.colaborador_id,
          mes: m.mes, ano: Number(form.ano),
          percentual: pct, meta_faturamento: meta,
          dias_uteis_reais: 0, media_diaria_venda: 0,
          status: 'AGUARDANDO APROVACAO',
        })
      }
      setModalAberto(false)
      await loadDados()
    } catch(err) { setErroModal(err.message||String(err)) }
    finally { setSalvando(false) }
  }

  const handleExcluir = async () => {
    try { await apiService.deleteMetasConsultorColab(colabExcluir.colaborador_id, colabExcluir.empresa_id, filtroAno); setModalExcluirAberto(false); await loadDados() }
    catch(err) { setError(err.message||String(err)); setModalExcluirAberto(false) }
  }

  const grupoMeses = aggTree(tree)
  const NCOLS = 16

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cog size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Metas - Consultor Serviços</h1>
            <p className="text-xs text-slate-400">Distribuição percentual sobre Mecânica + Terceiros</p>
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
          <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
            <ClipboardCheck size={16} /> Gestão de Aprovação
          </button>
          {canEdit && <button onClick={abrirIncluir} className={BTN_PRI}><Plus size={16}/> Adicionar Consultor</button>}
        </div>
      </div>

      <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex-1 max-w-xs"><label className={LBL}>Empresa</label>
          <select className={SEL} value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia||e.nome_empresa}</option>)}
          </select></div>
        <div className="w-28"><label className={LBL}>Ano</label>
          <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select></div>
        <div className="ml-auto text-sm text-slate-500">{Object.keys(tree).length} empresa(s) · {totalColabs} consultor(es)</div>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"><AlertTriangle size={15}/> {error} <button onClick={()=>setError(null)} className="ml-auto"><X size={14}/></button></div>}

      {/* TABELA TREE */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="text-xs border-separate border-spacing-0" style={{ minWidth: '1700px' }}>
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase border-b border-slate-200 w-60 sticky left-0 bg-slate-50 z-10">
                  <div className="flex items-center gap-2">
                    <span>Consultor / Nível</span>
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
                {MESES_ABR.map(m => <th key={m} className="px-1 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-24">{m}</th>)}
                <th className="px-2 py-2.5 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-36">Situação</th>
                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-14">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400"><div className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin"/>Carregando...</div></td></tr>
              ) : Object.keys(tree).length === 0 ? (
                <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400">Nenhum consultor cadastrado.</td></tr>
              ) : (() => {
                const grupoTotal = sumArr(grupoMeses)
                return (
                  <>
                    <tr className="cursor-pointer bg-blue-950 hover:bg-blue-900 transition-colors sticky top-[41px] z-10" onClick={() => setGrupoAberto(v=>!v)}>
                      <td className="px-3 py-2.5 text-white font-bold sticky left-0 bg-blue-950 z-10 whitespace-nowrap"><div className="flex items-center gap-2">{grupoAberto?<ChevronDown size={15}/>:<ChevronRight size={15}/>}🏢 Grupo Caiobá</div></td>
                      {grupoMeses.map((v,i)=><td key={i} className="px-1 py-2.5 text-right text-xs font-bold text-blue-200 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-amber-300 bg-blue-900 whitespace-nowrap">{grupoTotal>0?fmtBRL(grupoTotal):'—'}</td>
                      <td colSpan="2"/>
                    </tr>

                    {grupoAberto && Object.entries(tree).map(([empId, emp]) => {
                      const empMeses=aggEmp(emp); const empTotal=sumArr(empMeses)
                      const mecEmp=totaisMec[empId]||{}
                      // Todos os colabs desta empresa para calcular soma %
                      const allColabs = {}
                      Object.values(emp.depts).forEach(d=>Object.values(d.setores).forEach(st=>Object.values(st.boxes).forEach(bx=>Object.values(bx.cargos).forEach(ca=>Object.entries(ca.colabs).forEach(([id,co])=>{allColabs[id]=co})))))
                      const pctSoma = sumPctPorMes(allColabs)

                      return (
                        <React.Fragment key={empId}>
                          <tr className="cursor-pointer bg-indigo-700 hover:bg-indigo-600 transition-colors" onClick={() => toggle(expandedEmpresas,setExpandedEmpresas,empId)}>
                            <td className="px-3 py-2 text-white font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-4">{expandedEmpresas.has(empId)?<ChevronDown size={14}/>:<ChevronRight size={14}/>}{emp.nome}</div>
                            </td>
                            {Array.from({length:12},(_,i)=>{const v=getRefVal(empId,i+1); return <td key={i} className="px-1 py-2 text-right text-xs font-semibold text-indigo-200 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>})}
                            <td className="px-2 py-2 text-right text-xs font-bold text-amber-300 bg-indigo-800 whitespace-nowrap">{fmtBRL(Array.from({length:12},(_,i)=>getRefVal(empId,i+1)).reduce((s,v)=>s+v,0))}</td>
                            <td colSpan="2"/>
                          </tr>



                          {expandedEmpresas.has(empId) && Object.entries(emp.depts).map(([deptId, dept]) => {
                            const dKey=`${empId}§${deptId}`; const dMeses=aggDept(dept); const dTotal=sumArr(dMeses)
                            return (
                              <React.Fragment key={deptId}>
                                <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors" onClick={()=>toggle(expandedDepts,setExpandedDepts,dKey)}>
                                  <td className="px-3 py-1.5 text-slate-800 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-8">{expandedDepts.has(dKey)?<ChevronDown size={13}/>:<ChevronRight size={13}/>}{dept.nome}</div></td>
                                  {dMeses.map((v,i)=><td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                  <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{dTotal>0?fmtBRL(dTotal):'—'}</td>
                                  <td colSpan="2"/>
                                </tr>

                                {expandedDepts.has(dKey) && Object.entries(dept.setores).map(([sId, setor]) => {
                                  const sKey=`${dKey}§${sId}`; const sMeses=aggSetor(setor); const sTotal=sumArr(sMeses)
                                  return (
                                    <React.Fragment key={sId}>
                                      <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors" onClick={()=>toggle(expandedSetores,setExpandedSetores,sKey)}>
                                        <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-12">{expandedSetores.has(sKey)?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<span className="text-slate-400 mr-0.5">Setor:</span><span className="font-semibold text-slate-700">{setor.nome}</span></div></td>
                                        {sMeses.map((v,i)=><td key={i} className="px-1 py-1.5 text-right text-xs text-slate-600 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{sTotal>0?fmtBRL(sTotal):'—'}</td>
                                        <td colSpan="2"/>
                                      </tr>

                                      {expandedSetores.has(sKey) && Object.entries(setor.boxes).map(([bId, box]) => {
                                        const bKey=`${sKey}§${bId}`; const bMeses=aggBox(box); const bTotal=sumArr(bMeses)
                                        const isAuto = box.auto && Object.keys(box.cargos).length === 0
                                        const mecRef = mecEmp || {}
                                        const terRef = totaisTer[empId] || {}
                                        const funRef = totaisFun[empId] || {}
                                        const isFunBox = box.nome.toLowerCase().includes('funilaria')
                                        const getAutoVal = (mes) => {
                                          if (isFunBox) {
                                            const f = funRef[mes] || {}
                                            if (filtroVisu === 'servicos') return f.servicos || 0
                                            if (filtroVisu === 'pecas')    return f.pecas    || 0
                                            return (f.servicos || 0) + (f.pecas || 0)
                                          }
                                          const m = mecRef[mes] || {}
                                          const t = Number(terRef[mes]) || 0
                                          if (filtroVisu === 'servicos') return (m.servicos || 0) + t
                                          if (filtroVisu === 'pecas')    return  m.pecas    || 0
                                          return (m.servicos || 0) + (m.pecas || 0) + t
                                        }
                                        const autoTotal = Array.from({length:12},(_,i)=>getAutoVal(i+1)).reduce((s,v)=>s+v,0)
                                        return (
                                          <React.Fragment key={bId}>
                                            <tr className={`cursor-pointer border-b border-slate-100 transition-colors ${isAuto?'bg-emerald-50/40 hover:bg-emerald-50':'bg-white hover:bg-amber-50/30'}`} onClick={()=>toggle(expandedBoxes,setExpandedBoxes,bKey)}>
                                              <td className="px-3 py-1.5 sticky left-0 z-10 whitespace-nowrap" style={{background:'inherit'}}><div className="flex items-center gap-2 pl-16">{expandedBoxes.has(bKey)?<ChevronDown size={11}/>:<ChevronRight size={11}/>}<span className="text-slate-400 mr-0.5">Box:</span><span className={`font-semibold ${isAuto?'text-emerald-700':'text-slate-600'}`}>{box.nome}</span>{isAuto&&<span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 rounded">auto</span>}</div></td>
                                              {isAuto
                                                ? Array.from({length:12},(_,i)=>{const v=getAutoVal(i+1); return <td key={i} className="px-1 py-1.5 text-right text-xs text-emerald-600 font-mono whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>})
                                                : bMeses.map((v,i)=><td key={i} className="px-1 py-1.5 text-right text-xs text-slate-500 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)
                                              }
                                              <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{isAuto?fmtBRL(autoTotal):bTotal>0?fmtBRL(bTotal):'—'}</td>
                                              <td colSpan="2"/>
                                            </tr>

                                            {expandedBoxes.has(bKey) && Object.entries(box.cargos).map(([cId, cargo]) => {
                                              const carKey=`${bKey}§${cId}`; const carMeses=aggCargo(cargo); const carTotal=sumArr(carMeses)
                                              return (
                                                <React.Fragment key={cId}>
                                                  <tr className="cursor-pointer bg-white hover:bg-indigo-50/20 border-b border-slate-100 transition-colors" onClick={()=>toggle(expandedCargos,setExpandedCargos,carKey)}>
                                                    <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-20">{expandedCargos.has(carKey)?<ChevronDown size={11}/>:<ChevronRight size={11}/>}<span className="text-slate-400 mr-0.5">Cargo:</span><span className="font-semibold text-slate-600">{cargo.nome}</span></div></td>
                                                    {carMeses.map((v,i)=><td key={i} className="px-1 py-1 text-right text-xs text-slate-500 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                                    <td className="px-2 py-1 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{carTotal>0?fmtBRL(carTotal):'—'}</td>
                                                    <td colSpan="2"/>
                                                  </tr>

                                                  {expandedCargos.has(carKey) && Object.entries(cargo.colabs).map(([colabId, colab]) => {
                                                    const colMeses=aggColabs({x:colab}); const colTotal=sumArr(colMeses)
                                                    const mesesComValor=Object.values(colab.meses).filter(m=>Number(m.meta_faturamento)>0)
                                                    const aprovado=mesesComValor.length>0&&mesesComValor.every(m=>cellState(m.meta_faturamento,m.meta_aprovada)==='ok')
                                                    const statusLabel=aprovado?'APROVADO':'AGUARDANDO APROVACAO'
                                                    return (
                                                      <tr key={colabId} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                                        <td className="px-3 py-2 sticky left-0 bg-white z-10"><div className="pl-24 font-semibold text-slate-800 whitespace-nowrap">{colab.nome}</div></td>
                                                        {Array.from({length:12},(_,i)=>{
                                                          const md=colab.meses[i+1]
                                                          return (
                                                            <td key={i} className={`p-1 border-l border-slate-100 ${md?'':'bg-slate-50'}`}>
                                                              {md ? (
                                                                <div className="relative text-right">
                                                                  <div className={`text-xs font-mono ${Number(md.meta_faturamento)>0?'text-slate-800':'text-slate-300'}`}>{Number(md.meta_faturamento)>0?fmtBRL(md.meta_faturamento):'—'}</div>
                                                                  {Number(md.percentual)>0 && <div className="text-[10px] text-emerald-600 font-semibold">{fmtPct(md.percentual)}</div>}
                                                                  {cellState(md.meta_faturamento,md.meta_aprovada)==='new'&&<span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white"><Sparkles size={8}/></span>}
                                                                  {cellState(md.meta_faturamento,md.meta_aprovada)==='changed'&&<span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-white"><Pencil size={8}/></span>}
                                                                </div>
                                                              ) : <span className="flex justify-center text-slate-300">—</span>}
                                                            </td>
                                                          )
                                                        })}
                                                        <td className="px-2 py-2 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{colTotal>0?fmtBRL(colTotal):'—'}</td>
                                                        <td className="px-2 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[statusLabel]||'bg-slate-100 text-slate-500'}`}>{STATUS_DISPLAY[statusLabel] || statusLabel}</span></td>
                                                        <td className="px-2 py-2 text-center">
                                                          <PermissionActionButtons
                                                            menuPath="/metas/pos-vendas/servicos"
                                                            onView={() => abrirVisualizar(empId, colabId)}
                                                            onEdit={() => abrirEditar(empId, colabId)}
                                                            onDelete={() => { setColabExcluir({colaborador_id:colabId,empresa_id:empId,nome:colab.nome}); setModalExcluirAberto(true) }}
                                                            className="justify-center"
                                                          />
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{modoModal === 'visualizar' ? 'Visualizar Consultor — Metas' : modoModal === 'editar' ? 'Editar Consultor — Metas' : 'Adicionar Consultor — Metas'}</h2>
              <button onClick={()=>setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="overflow-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3"><label className={LBL}>Empresa *</label>
                  <select name="empresa_id" className={SEL} value={form.empresa_id} onChange={handleFormChange} disabled={modoModal !== 'incluir'}>
                    <option value="">Selecione...</option>
                    {empresas.map(e=><option key={e.id} value={e.id}>{e.empresa_fantasia||e.nome_empresa}</option>)}
                  </select></div>
                <div><label className={LBL}>Ano</label>
                  <select name="ano" className={SEL} value={form.ano} onChange={handleFormChange} disabled={modoModal !== 'incluir'}>
                    {ANOS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LBL}>Departamento</label>
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>OFICINA</div>
                </div>
                <div><label className={LBL}>Setor</label>
                  <select name="setor_id" className={SEL} value={form.setor_id} onChange={handleFormChange} disabled={!form.departamento_id || modoModal !== 'incluir'}>
                    <option value="">Selecione...</option>
                    {setoresDoDepto.map(s=><option key={s.id} value={s.id}>{s.nome_setor}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LBL}>Box</label>
                  <select name="box_id" className={SEL} value={form.box_id} onChange={handleFormChange} disabled={!form.setor_id || modoModal !== 'incluir'}>
                    <option value="">Nenhum</option>
                    {boxesDoSetor.map(b=><option key={b.id} value={b.id}>{b.nome_box}</option>)}
                  </select></div>
                <div><label className={LBL}>Cargo</label>
                  <select name="cargo_id" className={SEL} value={form.cargo_id} onChange={handleFormChange} disabled={!form.departamento_id || modoModal !== 'incluir'}>
                    <option value="">Selecione...</option>
                    {cargosDoDepto.map(c=><option key={c.id} value={c.id}>{c.nome_cargo}</option>)}
                  </select></div>
              </div>
              <div><label className={LBL}>Consultor *</label>
                <select name="colaborador_id" className={SEL} value={form.colaborador_id} onChange={handleFormChange} disabled={!form.empresa_id || modoModal !== 'incluir'}>
                  <option value="">Selecione...</option>
                  <option value="A_CONTRATAR">A contratar</option>
                  {funcsEmp.map(f => <option key={f.id} value={f.id}>{f.nome_funcionario}</option>)}
                </select></div>

              {/* GRADE DE % POR MÊS */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Distribuição % por Mês</span>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="border-separate border-spacing-1 p-1" style={{ minWidth: '1200px' }}>
                    <thead>
                      <tr>
                        <th className="w-32 text-left text-xs text-slate-500 font-semibold px-1">Campo</th>
                        {MESES_ABR.map((m,i)=><th key={i} className="w-24 text-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1 py-1">{m}</th>)}
                        <th className="w-28 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 py-1">Total Ano</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Referência conforme box selecionado */}
                      <tr>
                        <td className="text-xs font-semibold text-emerald-600 px-1 whitespace-nowrap">{isFunBoxModal ? 'Ref. Funilaria/Pintura (R$)' : 'Ref. Mecânica + Terceiros (R$)'}</td>
                        {Array.from({length:12},(_,i)=>{
                          const v=refModalPorMes[i+1]||0
                          return <td key={i} className="bg-emerald-50 border border-emerald-100 rounded p-1 text-right text-xs font-mono text-emerald-700">{v>0?fmtBRL(v):'—'}</td>
                        })}
                        <td className="bg-emerald-50 border border-emerald-200 rounded p-1 text-right text-xs font-bold text-emerald-700">{fmtBRL(Object.values(refModalPorMes).reduce((s,v)=>s+(Number(v)||0),0))}</td>
                      </tr>
                      {/* Percentual */}
                      <tr>
                        <td className="text-xs font-semibold text-slate-500 px-1">% deste consultor</td>
                        {mesesForm.map((m,i)=>{
                          if (modoModal === 'visualizar') {
                            return <td key={i} className="bg-slate-100 border border-slate-200 rounded p-1 text-center text-xs text-slate-600 font-mono">{m.percentual !== '' && m.percentual !== 0 ? fmtPct(m.percentual) : '—'}</td>
                          }
                          const jaUsado = pctSomadoNoMes[m.mes]||0
                          const disponivel = Math.max(0, 100 - jaUsado)
                          const pctAtual = Number(m.percentual)||0
                          const over = pctAtual > disponivel + 0.01
                          return (
                            <td key={i} className={`border rounded p-1 ${over?'bg-red-50 border-red-300':'bg-white border-slate-200'}`}>
                              <PctInput value={m.percentual} onChange={v=>setMesesForm(prev=>prev.map((x,xi)=>xi===i?{...x,percentual:v}:x))}/>
                              {jaUsado > 0 && <div className="text-[9px] text-center text-slate-400">disp: {fmtPct(disponivel)}</div>}
                            </td>
                          )
                        })}
                        <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-center text-xs font-bold text-indigo-700">
                          {fmtPct(mesesForm.reduce((s,m)=>s+(Number(m.percentual)||0),0)/12)}
                        </td>
                      </tr>
                      {/* Meta calculada */}
                      <tr>
                        <td className="text-xs font-bold text-indigo-700 px-1 whitespace-nowrap">Meta R$ (calculado)</td>
                        {mesesForm.map((m,i)=>{
                          const v=calcMetaConsultor(m.mes, m.percentual)
                          return <td key={i} className="bg-indigo-50 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-700">{v>0?fmtBRL(v):'—'}</td>
                        })}
                        <td className="bg-indigo-100 border border-indigo-300 rounded p-1 text-right text-xs font-bold text-indigo-800">{fmtBRL(mesesForm.reduce((s,m)=>s+calcMetaConsultor(m.mes,m.percentual),0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {!form.empresa_id && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={12}/> Selecione a empresa para ver os totais do mecânico como referência.</p>}
              </div>
            </div>
            {erroModal && <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"><AlertTriangle size={15}/> {erroModal}</div>}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={()=>setModalAberto(false)} className={BTN_SEC} disabled={salvando}>{modoModal === 'visualizar' ? 'Fechar' : 'Cancelar'}</button>
              {modoModal !== 'visualizar' && <button onClick={handleSalvar} className={BTN_PRI} disabled={salvando}>{salvando?<><Loader2 size={15} className="animate-spin"/> Salvando...</>:modoModal==='editar'?'Salvar':'Adicionar'}</button>}
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
              <button onClick={()=>setModalExcluirAberto(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleExcluir} className="inline-flex items-center justify-center gap-2 flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"><Trash2 size={15}/> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
