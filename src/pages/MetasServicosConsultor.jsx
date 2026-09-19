import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, Trash2, X, AlertTriangle, ChevronRight, ChevronDown, Cog, Loader2, CheckCircle2, Sparkles, Pencil, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SearchCombobox } from '../components/SearchCombobox'
import { EmpresaMultiFilter, empresaParam, filtrarPorEmpresas, empresaUnica } from '../components/EmpresaMultiFilter'
import { valoresMetaMecanico } from '../utils/metasMecanico'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Moeda contábil: R$ na frente, negativo entre parênteses em vez de sinal de menos — o CLDR do
// pt-BR não tem um padrão "accounting" próprio, então o parêntese é montado manualmente aqui.
const fmtBRL = (v) => {
  const n = Number(v)
  if (!v && v !== 0) return '—'
  const s = Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}
const round2 = (v) => Math.round((Number(v) || 0) * 100 + 1e-7) / 100
const fmtPct = (v) => { const n = Number(v); if (!n && n !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' }
function parseBRL(s) { if (!s && s !== 0) return 0; const str = String(s).trim(); if (str.includes(',')) return parseFloat(str.replace(/\./g,'').replace(',','.')) || 0; return parseFloat(str) || 0 }

function cellState(cur, apr) { const c = Number(cur)||0; if(c===0) return 'ok'; if(apr===null||apr===undefined) return 'new'; if(Math.abs(c-Number(apr))>0.001) return 'changed'; return 'ok' }

function aggColabs(cm) { const a=Array(12).fill(0); Object.values(cm).forEach(c=>Object.entries(c.meses).forEach(([m,d])=>{a[+m-1]+=Number(d.meta_faturamento)||0})); return a }
function aggSetor(st)  { const a=Array(12).fill(0); Object.values(st.colabs).forEach(c=>aggColabs({x:c}).forEach((v,i)=>{a[i]+=v})); return a }
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
  const fmt = (v) => { const n=Number(v); if(!n&&n!==0) return ''; return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
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
  const [empresas,      setEmpresas]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [dados,         setDados]         = useState([])
  const [mecRows,       setMecRows]       = useState([]) // linhas brutas de fato_rascunho_metas_servicos_mecanico
  const [totaisTer,     setTotaisTer]     = useState({}) // { empresaId: { mes: servicos } }
  const [totaisFun,     setTotaisFun]     = useState({}) // { empresaId: { mes: { servicos, pecas } } }
  const [filtroVisu,    setFiltroVisu]    = useSessionState('msc_visu', 'total')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('mpvs_servicos_empresas', [])
  const [filtroAno,     setFiltroAno]     = useSessionState('mpvs_servicos_ano', anoAtual)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/pos-vendas/servicos', 'editar')
  const canDelete = hasPermission('/metas/pos-vendas/servicos', 'excluir')

  const [grupoAberto,      setGrupoAberto]      = useState(true)
  const [expandedEmpresas, setExpandedEmpresas] = useState(new Set())
  const [expandedDepts,    setExpandedDepts]    = useState(new Set())
  const [expandedSetores,  setExpandedSetores]  = useState(new Set())

  const [modalAberto,        setModalAberto]        = useState(false)
  const [modoModal,          setModoModal]          = useState('incluir')
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [form,               setForm]               = useState(FORM_VAZIO)
  const [mesesForm,          setMesesForm]          = useState(mesesVazios())
  const [mecRowsModal,       setMecRowsModal]       = useState([])
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
      const [rows, todasEmpresas, terRows, funRows, mecRowsAll] = await Promise.all([
        apiService.getMetasConsultor(empresaParam(filtroEmpresa), filtroAno),
        apiService.getEmpresas(),
        apiService.getMetasTerceiros(empresaParam(filtroEmpresa), filtroAno),
        apiService.getMetasFunilaria(empresaParam(filtroEmpresa), filtroAno),
        apiService.getMetasMecanico(empresaParam(filtroEmpresa), filtroAno),
      ])
      setDados(filtrarPorEmpresas(rows, filtroEmpresa))
      setMecRows(mecRowsAll)
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

  // Mapa box_id → setor_id atual (via dim_box.setor_ids) — usado tanto pra rotear o total do
  // mecânico por setor quanto pra rotear a árvore/modal de consultor pro setor certo mesmo
  // quando a linha gravada antiga ainda aponta pra um box específico.
  const boxToSetorMap = useMemo(() => {
    const setorIds = new Set(setores.map(s => s.id))
    const map = {}
    boxes.forEach(bx => {
      const ids = Array.isArray(bx.setor_ids) ? bx.setor_ids : (bx.setor_id ? [bx.setor_id] : [])
      const validSetor = ids.find(sid => setorIds.has(sid))
      if (validSetor) map[bx.id] = validSetor
    })
    return map
  }, [boxes, setores])

  // Totais do mecânico SEMPRE por SETOR (não a empresa toda somada, mas também não por box
  // isolado) — o setor Mecânica agrega todos os boxes dele (ex: Mecânica + Express) como uma
  // única referência de distribuição pros consultores. Resolve o box de cada linha pelo cadastro
  // atual do funcionário, senão pelo box gravado na linha, e daí o setor daquele box.
  const totaisMec = useMemo(() => {
    const map = {}
    mecRows.forEach(r => {
      const bId = funcionarios.find(f => f.id === r.colaborador_id)?.box_id || r.box_id
      const sId = bId ? boxToSetorMap[bId] : null
      if (!sId) return
      if (!map[r.empresa_id]) map[r.empresa_id] = {}
      if (!map[r.empresa_id][sId]) map[r.empresa_id][sId] = {}
      if (!map[r.empresa_id][sId][r.mes]) map[r.empresa_id][sId][r.mes] = { servicos: 0, pecas: 0 }
      const v = valoresMetaMecanico(r)
      map[r.empresa_id][sId][r.mes].servicos += v.meta_servicos
      map[r.empresa_id][sId][r.mes].pecas    += v.meta_pecas
    })
    return map
  }, [mecRows, funcionarios, boxToSetorMap])

  const tree = useMemo(() => {
    // Lookup maps for O(1) resolution from dimension tables
    const deptMap    = Object.fromEntries(departamentos.map(d => [d.id, d.nome_departamento]))
    const setorMap   = Object.fromEntries(setores.map(s => [s.id, s.nome_setor]))
    const setorObjMap = Object.fromEntries(setores.map(s => [s.id, s]))
    const funcObjMap = Object.fromEntries(funcionarios.map(f => [f.id, f]))

    const t = {}
    dados.forEach(row => {
      const colid = row.colaborador_id
      const func  = funcObjMap[colid]

      // Setor: linhas antigas (de quando o consultor era vinculado a um Box) reroteiam pro setor
      // atual daquele box; linhas novas já vêm com setor_id direto (Mecânica/Funilaria) e sem box.
      const eid = row.empresa_id
      const sId = (row.box_id && boxToSetorMap[row.box_id])
        || (row.setor_id && setorMap[row.setor_id] ? row.setor_id : null)
        || row.setor_id || '—'
      const did = setorObjMap[sId]?.departamento_id || row.departamento_id || '—'

      // Nomes SEMPRE resolvidos pelo cadastro atual (podem ser renomeados depois que a meta foi
      // lançada) — só cai pro retrato gravado na linha se o próprio ID não existir mais.
      const dNome  = deptMap[did]  || row.departamento_nome || '—'
      const sNome  = setorMap[sId] || row.setor_nome        || '—'
      const coNome = func?.nome_funcionario || row.colaborador_nome || colid

      if(!t[eid]) t[eid]={ nome:row.empresa_nome||eid, depts:{} }
      const depts=t[eid].depts
      if(!depts[did]) depts[did]={ nome:dNome, setores:{} }
      depts[did].nome = dNome
      const stMap=depts[did].setores
      if(!stMap[sId]) stMap[sId]={ nome:sNome, colabs:{} }
      const coMap=stMap[sId].colabs
      if(!coMap[colid]) coMap[colid]={ nome:coNome, meses:{} }
      const _isFun = sNome.toLowerCase().includes('funilaria') || sNome.toLowerCase().includes('pintura')
      const _mec  = totaisMec[eid]?.[sId]?.[row.mes] || {}
      const _ter  = Number(totaisTer[eid]?.[row.mes]) || 0
      const _fun  = totaisFun[eid]?.[row.mes] || {}
      // Referência respeita o filtro Total/Peças/Serviços — Terceiros não tem Peças, então some
      // do filtro "Peças" e entra em "Serviços" (mesmo critério do resto da tela).
      const _refPecas    = _isFun ? (_fun.pecas    || 0) : (_mec.pecas || 0)
      const _refServicos = _isFun ? (_fun.servicos || 0) : (_mec.servicos || 0) + _ter
      const _pct = (Number(row.percentual) || 0) / 100
      const _metaPecas    = round2(_refPecas * _pct)
      const _metaServicos = round2(_refServicos * _pct)
      // Total = Serviços + Peças (mesmas partes exibidas), nunca calculado à parte.
      const _metaCalc = filtroVisu === 'servicos' ? _metaServicos
                      : filtroVisu === 'pecas'    ? _metaPecas
                      : _metaServicos + _metaPecas
      coMap[colid].meses[row.mes]={
        id:row.id, percentual:row.percentual,
        meta_faturamento:_metaCalc, meta_aprovada:row.meta_aprovada??null,
        dias_uteis_reais:row.dias_uteis_reais,
      }
    })
    return t
  }, [dados, totaisMec, totaisTer, totaisFun, filtroVisu, setores, departamentos, boxToSetorMap, funcionarios])

  const toggle = (set, setter, key) => setter(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n })

  const tudoExpandido = grupoAberto && Object.keys(tree).length > 0 &&
    Object.keys(tree).every(eid => expandedEmpresas.has(eid))

  const expandirTudo = () => {
    setGrupoAberto(true)
    const emps = new Set(), depts = new Set(), sets = new Set()
    Object.entries(tree).forEach(([eid, emp]) => {
      emps.add(eid)
      Object.entries(emp.depts).forEach(([did, dept]) => {
        const dKey = `${eid}§${did}`; depts.add(dKey)
        Object.keys(dept.setores).forEach(sid => sets.add(`${dKey}§${sid}`))
      })
    })
    setExpandedEmpresas(emps); setExpandedDepts(depts); setExpandedSetores(sets)
  }

  const recolherTudo = () => {
    setGrupoAberto(false)
    setExpandedEmpresas(new Set()); setExpandedDepts(new Set()); setExpandedSetores(new Set())
  }

  const setoresDoDepto = useMemo(()=>setores.filter(s=>s.departamento_id===form.departamento_id && s.tipo_setor==='manutencao_reparo'),[setores,form.departamento_id])
  // Boxes do setor selecionado — não aparece mais como campo no formulário, só usado internamente
  // pra somar a referência (Mecânica + Express, por ex.) de todos os boxes daquele setor.
  const boxesDoSetor   = useMemo(()=>boxes.filter(b=>(Array.isArray(b.setor_ids)?b.setor_ids:[b.setor_id]).includes(form.setor_id)),[boxes,form.setor_id])
  const cargosPorId = useMemo(()=>Object.fromEntries(cargos.map(c=>[c.id,c])),[cargos])
  const funcsEmp = useMemo(() => {
    let l=funcionarios
    if(form.empresa_id) l=l.filter(f=>f.empresa_id===form.empresa_id)
    return l
  },[funcionarios,form.empresa_id])

  const handleFormChange = async (e) => {
    const { name, value } = e.target
    const up = { [name]: value }
    if(name==='empresa_id') {
      const emp=empresas.find(x=>x.id===value)
      up.empresa_nome=emp?(emp.empresa_fantasia||emp.nome_empresa):''; up.colaborador_id=''; up.colaborador_nome=''
      // Carrega linhas de mecânico desta empresa (pra filtrar pelo box selecionado)
      if(value && filtroAno) {
        try { setMecRowsModal(await apiService.getMetasMecanico(value, filtroAno)) } catch {}
      } else { setMecRowsModal([]) }
    }
    if(name==='departamento_id') { const dep=departamentos.find(x=>x.id===value); up.departamento_nome=dep?.nome_departamento||''; up.setor_id=''; up.setor_nome=''; up.cargo_id=''; up.cargo_nome='' }
    if(name==='setor_id') {
      const s=setores.find(x=>x.id===value); up.setor_nome=s?.nome_setor||''
      // Em Incluir, trocar o setor limpa o consultor (a lista de consultores pode mudar);
      // em Editar, o consultor já é fixo (não tem seletor), então não faz sentido limpar.
      if (modoModal === 'incluir') { up.colaborador_id=''; up.colaborador_nome='' }
    }
    if(name==='cargo_id') { up.cargo_nome=cargos.find(x=>x.id===value)?.nome_cargo||'' }
    if(name==='colaborador_id') { up.colaborador_nome = value === 'A_CONTRATAR' ? 'A contratar' : (funcionarios.find(x=>x.id===value)?.nome_funcionario||'') }
    setForm(prev=>({...prev,...up}))
  }

  const abrirIncluir = async () => {
    const empIdUnica=empresaUnica(filtroEmpresa)
    const emp=empresas.find(e=>e.id===empIdUnica)
    const deptOficina=departamentos.find(d=>(d.nome_departamento||'').toUpperCase().includes('OFICINA'))
    setForm({...FORM_VAZIO, ano:filtroAno, empresa_id:empIdUnica, empresa_nome:emp?(emp.empresa_fantasia||emp.nome_empresa):'', departamento_id:deptOficina?.id||'', departamento_nome:deptOficina?.nome_departamento||''})
    setMesesForm(mesesVazios())
    setErroModal(null)
    if(empIdUnica) {
      try { setMecRowsModal(await apiService.getMetasMecanico(empIdUnica, filtroAno)) } catch {}
    } else { setMecRowsModal([]) }
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
    // Setor: mesma regra de roteamento da árvore — linha antiga presa a um Box reroteia pro
    // setor atual daquele box; senão usa o setor_id gravado na linha.
    const r0SId = (r0.box_id && boxToSetorMap[r0.box_id])
      || (r0.setor_id && setores.find(s => s.id === r0.setor_id) ? r0.setor_id : null)
      || r0.setor_id || ''
    const r0Setor = setores.find(s => s.id === r0SId)
    setForm({
      ...FORM_VAZIO,
      empresa_id:       r0.empresa_id,
      empresa_nome:     r0.empresa_nome     || '',
      departamento_id:  r0Setor?.departamento_id || r0.departamento_id  || '',
      departamento_nome:r0.departamento_nome|| '',
      setor_id:         r0SId,
      setor_nome:       r0Setor?.nome_setor || r0.setor_nome || '',
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
      try { setMecRowsModal(await apiService.getMetasMecanico(empId, filtroAno)) } catch {}
    } else { setMecRowsModal([]) }
    setModoModal(modo)
    setModalAberto(true)
  }

  const abrirEditar     = (empId, colabId) => _abrirModalConsultor(empId, colabId, 'editar')
  const abrirVisualizar = (empId, colabId) => _abrirModalConsultor(empId, colabId, 'visualizar')

  const isFunSetorModal = (form.setor_nome||'').toLowerCase().includes('funilaria') || (form.setor_nome||'').toLowerCase().includes('pintura')

  // Referência do modal, detalhada por Peças/Serviços/Terceiros: Funilaria/Pintura se setor for
  // funilaria, senão soma TODOS os boxes do setor Mecânica selecionado (ex: Mecânica + Express,
  // não a empresa toda) + Terceiros (Terceiros não tem box nem Peças, então entra só em Serviços).
  const refModalDetalhePorMes = useMemo(() => {
    const result = {}
    if (isFunSetorModal) {
      const fun = totaisFun[form.empresa_id] || {}
      for (let m = 1; m <= 12; m++) {
        const pecas = fun[m]?.pecas || 0, servicos = fun[m]?.servicos || 0
        result[m] = { pecas, servicos, terceiros: 0, total: pecas + servicos }
      }
    } else {
      const ter = totaisTer[form.empresa_id] || {}
      const boxIdsDoSetor = new Set(boxesDoSetor.map(b => b.id))
      const rowsDoSetor = form.setor_id
        ? mecRowsModal.filter(r => boxIdsDoSetor.has(funcionarios.find(f => f.id === r.colaborador_id)?.box_id || r.box_id))
        : []
      for (let m = 1; m <= 12; m++) {
        const doMes = rowsDoSetor.filter(r => Number(r.mes) === m)
        const servicos  = doMes.reduce((s, r) => s + valoresMetaMecanico(r).meta_servicos, 0)
        const pecas     = doMes.reduce((s, r) => s + valoresMetaMecanico(r).meta_pecas, 0)
        const terceiros = Number(ter[m]) || 0
        result[m] = { pecas, servicos, terceiros, total: pecas + servicos + terceiros }
      }
    }
    return result
  }, [mecRowsModal, totaisTer, totaisFun, funcionarios, form.empresa_id, form.setor_id, boxesDoSetor, isFunSetorModal])

  // Meta do consultor detalhada: Peças isolado; Serviços já soma Terceiros (que não tem Peças).
  // Total é sempre a soma de Serviços + Peças (cada parte em centavos, como exibida/gravada).
  const calcMetaConsultorDetalhe = (mes, percentual) => {
    const ref = refModalDetalhePorMes[mes] || { pecas: 0, servicos: 0, terceiros: 0 }
    const pct = (Number(percentual)||0) / 100
    const pecas    = round2(ref.pecas * pct)
    const servicos = round2((ref.servicos + ref.terceiros) * pct)
    return { pecas, servicos, total: pecas + servicos }
  }

  const calcMetaConsultor = (mes, percentual) => calcMetaConsultorDetalhe(mes, percentual).total

  // Soma % já cadastrada para o mesmo Setor+Empresa no mês (excluindo o consultor atual) — roteia
  // cada linha pelo setor atual do box gravado nela (linhas antigas), pra não deixar escapar
  // consultores lançados antes da mudança pro modelo por Setor.
  const pctSomadoNoMes = useMemo(() => {
    if (!form.empresa_id || !form.setor_id) return {}
    const map = {}
    dados.forEach(r => {
      if (r.empresa_id !== form.empresa_id) return
      if (Number(r.ano) !== Number(form.ano)) return
      if (r.colaborador_id === form.colaborador_id) return
      const rSId = (r.box_id && boxToSetorMap[r.box_id]) || r.setor_id
      if (rSId !== form.setor_id) return
      map[r.mes] = (map[r.mes]||0) + (Number(r.percentual)||0)
    })
    return map
  }, [dados, form.empresa_id, form.ano, form.colaborador_id, form.setor_id, boxToSetorMap])

  const handleSalvar = async () => {
    if(!form.empresa_id)     { setErroModal('Selecione a Empresa.'); return }
    if(!form.colaborador_id) { setErroModal('Selecione o Colaborador.'); return }
    // Trava de 100%: mesmo se a % não foi digitada agora (ex: só trocou de Setor e o valor
    // salvo anteriormente ficou acima do que ainda está disponível no setor de destino).
    const mesesEstourados = mesesForm
      .filter(m => (Number(m.percentual)||0) > Math.max(0, 100 - (pctSomadoNoMes[m.mes]||0)) + 0.01)
      .map(m => MESES_ABR[m.mes-1])
    if (mesesEstourados.length) {
      setErroModal(`A distribuição ultrapassa 100% do setor em: ${mesesEstourados.join(', ')}. Ajuste a % desses meses antes de salvar.`)
      return
    }
    setSalvando(true); setErroModal(null)
    try {
      // Campos uuid não podem ir como string vazia — vira null. Box não é mais selecionado no
      // formulário (consultor fica ligado direto ao Setor da Oficina), e Cargo também não tem
      // mais seletor na tela desde que o nível de Cargo saiu da árvore.
      const cleanPayload = {
        ...form,
        departamento_id: form.departamento_id || null,
        setor_id:        form.setor_id        || null,
        box_id:          null,
        cargo_id:        form.cargo_id        || null,
      }
      for (const m of mesesForm) {
        const pct  = Number(m.percentual) || 0
        const meta = calcMetaConsultor(m.mes, pct)
        await apiService.upsertMetaConsultor({
          ...cleanPayload,
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
  const NCOLS = 15

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
          {canEdit && <button onClick={abrirIncluir} className={BTN_PRI}><Plus size={16}/> Adicionar Consultor</button>}
        </div>
      </div>

      <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex-1 max-w-xs"><label className={LBL}>Empresa</label>
          <EmpresaMultiFilter value={filtroEmpresa} onChange={setFiltroEmpresa} empresas={empresas} /></div>
        <div className="w-28"><label className={LBL}>Ano</label>
          <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select></div>
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
                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-40 whitespace-nowrap">Situação</th>
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

                      return (
                        <React.Fragment key={empId}>
                          <tr className="cursor-pointer bg-indigo-700 hover:bg-indigo-600 transition-colors" onClick={() => toggle(expandedEmpresas,setExpandedEmpresas,empId)}>
                            <td className="px-3 py-2 text-white font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-4">{expandedEmpresas.has(empId)?<ChevronDown size={14}/>:<ChevronRight size={14}/>}{emp.nome}</div>
                            </td>
                            {empMeses.map((v,i)=><td key={i} className="px-1 py-2 text-right text-xs font-semibold text-indigo-200 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                            <td className="px-2 py-2 text-right text-xs font-bold text-amber-300 bg-indigo-800 whitespace-nowrap">{empTotal>0?fmtBRL(empTotal):'—'}</td>
                            <td colSpan="2"/>
                          </tr>



                          {expandedEmpresas.has(empId) && Object.entries(emp.depts).map(([deptId, dept]) => {
                            const dKey=`${empId}§${deptId}`; const dMeses=aggDept(dept); const dTotal=sumArr(dMeses)
                            return (
                              <React.Fragment key={deptId}>
                                <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors" onClick={()=>toggle(expandedDepts,setExpandedDepts,dKey)}>
                                  <td className="px-3 py-1.5 text-slate-800 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-8">{expandedDepts.has(dKey)?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<span className="text-slate-500 font-normal mr-0.5">Departamento:</span><span className="font-bold">{dept.nome}</span></div></td>
                                  {dMeses.map((v,i)=><td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                  <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{dTotal>0?fmtBRL(dTotal):'—'}</td>
                                  <td colSpan="2"/>
                                </tr>

                                {expandedDepts.has(dKey) && Object.entries(dept.setores).map(([sId, setor]) => {
                                  const sKey=`${dKey}§${sId}`; const sMeses=aggSetor(setor); const sTotal=sumArr(sMeses)
                                  // Situação por Setor (não mais por consultor individual): olha todos os
                                  // meses com valor de todos os consultores desse setor — se algum não
                                  // estiver aprovado, o setor inteiro fica "Aguard. Aprovação".
                                  let setorTemValor = false, setorAprovado = true
                                  Object.values(setor.colabs).forEach(co => Object.values(co.meses).forEach(m => {
                                    if (Number(m.meta_faturamento) > 0) {
                                      setorTemValor = true
                                      if (cellState(m.meta_faturamento, m.meta_aprovada) !== 'ok') setorAprovado = false
                                    }
                                  }))
                                  const setorStatusLabel = setorAprovado ? 'APROVADO' : 'AGUARDANDO APROVACAO'
                                  const pctSetor = sumPctPorMes(setor.colabs)
                                  const mecRef = totaisMec[empId]?.[sId] || {}
                                  const terRef = totaisTer[empId] || {}
                                  const funRef = totaisFun[empId] || {}
                                  const isFunSetor = setor.nome.toLowerCase().includes('funilaria') || setor.nome.toLowerCase().includes('pintura')
                                  // Pool de referência do setor (Mecânica+Terceiros ou Funilaria, somando todos
                                  // os boxes daquele setor), usado só pra saber se faz sentido mostrar o
                                  // indicador de % distribuído (denominador > 0).
                                  const getPoolVal = (mes) => {
                                    if (isFunSetor) {
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
                                  return (
                                    <React.Fragment key={sId}>
                                      <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors" onClick={()=>toggle(expandedSetores,setExpandedSetores,sKey)}>
                                        <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap"><div className="flex items-center gap-2 pl-12">{expandedSetores.has(sKey)?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<span className="text-slate-400 mr-0.5">Setor:</span><span className="font-semibold text-slate-700">{setor.nome}</span></div></td>
                                        {sMeses.map((v,i)=>{
                                          const pct = pctSetor[i]
                                          const poolVal = getPoolVal(i+1)
                                          return (
                                            <td key={i} className="px-1 py-1.5 text-right whitespace-nowrap">
                                              <div className="text-xs text-slate-600">{v>0?fmtBRL(v):'—'}</div>
                                              {poolVal > 0 && (
                                                <div className={`text-[10px] font-semibold ${pct>=99.9?'text-green-600':pct>0?'text-amber-600':'text-red-500'}`}>
                                                  {fmtPct(pct)} distrib.
                                                </div>
                                              )}
                                            </td>
                                          )
                                        })}
                                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{sTotal>0?fmtBRL(sTotal):'—'}</td>
                                        <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                          {setorTemValor && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_CLS[setorStatusLabel]||'bg-slate-100 text-slate-500'}`}>{STATUS_DISPLAY[setorStatusLabel] || setorStatusLabel}</span>}
                                        </td>
                                      </tr>

                                      {expandedSetores.has(sKey) && Object.entries(setor.colabs).map(([colabId, colab]) => {
                                        const colMeses=aggColabs({x:colab}); const colTotal=sumArr(colMeses)
                                        return (
                                          <tr key={colabId} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-3 py-2 sticky left-0 bg-white z-10">
                                              <div className="pl-16 font-semibold text-indigo-600 whitespace-nowrap cursor-pointer hover:text-indigo-800 hover:underline select-none"
                                                onClick={() => abrirVisualizar(empId, colabId)}>
                                                {colab.nome}
                                              </div>
                                            </td>
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
                  {modoModal !== 'visualizar' ? (
                    <select name="setor_id" className={SEL} value={form.setor_id} onChange={handleFormChange} disabled={!form.departamento_id}>
                      <option value="">Selecione...</option>
                      {setoresDoDepto.map(s=><option key={s.id} value={s.id}>{s.nome_setor}</option>)}
                    </select>
                  ) : (
                    <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>{form.setor_nome || '—'}</div>
                  )}</div>
              </div>
              <div><label className={LBL}>Consultor *</label>
                {(!form.empresa_id || modoModal !== 'incluir') ? (
                  <div className={`${SEL} bg-slate-100 text-slate-500 cursor-not-allowed`}>
                    {form.colaborador_id === 'A_CONTRATAR' ? 'A contratar' : (form.colaborador_nome || '—')}
                  </div>
                ) : (
                  <SearchCombobox
                    value={form.colaborador_id}
                    onChange={(id) => setForm(prev => ({
                      ...prev,
                      colaborador_id: id,
                      colaborador_nome: id === 'A_CONTRATAR' ? 'A contratar' : (funcionarios.find(f => f.id === id)?.nome_funcionario || ''),
                    }))}
                    placeholder="Selecione..."
                    emptyOptionLabel="Selecione..."
                    searchPlaceholder="Buscar pelo nome ou cargo..."
                    notFoundLabel="Nenhum consultor encontrado."
                    opcoes={[{ id: 'A_CONTRATAR', nome_funcionario: 'A contratar' }, ...funcsEmp]}
                    getLabel={(o) => {
                      if (o.id === 'A_CONTRATAR') return o.nome_funcionario
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
                      {/* Referência conforme box selecionado, detalhada por Peças/Serviços/Terceiros/Total */}
                      {[
                        { key: 'pecas',     label: 'Ref. Peças (R$)' },
                        { key: 'servicos',  label: 'Ref. Serviços (R$)' },
                        { key: 'terceiros', label: 'Ref. Terceiros (R$)' },
                        { key: 'total',     label: `Ref. Total ${isFunSetorModal ? 'Funilaria/Pintura' : 'Mecânica + Terceiros'} (R$)` },
                      ].map(({ key, label }) => {
                        const isTotal = key === 'total'
                        return (
                          <tr key={key}>
                            <td className={`text-xs px-1 whitespace-nowrap ${isTotal ? 'font-bold text-emerald-700' : 'font-semibold text-emerald-600'}`}>{label}</td>
                            {Array.from({length:12},(_,i)=>{
                              const v = refModalDetalhePorMes[i+1]?.[key] || 0
                              return <td key={i} className={`border rounded p-1 text-right text-xs font-mono ${isTotal ? 'bg-emerald-100 border-emerald-200 font-bold' : 'bg-emerald-50 border-emerald-100'} text-emerald-700`}>{v>0?fmtBRL(v):'—'}</td>
                            })}
                            <td className={`border rounded p-1 text-right text-xs font-bold text-emerald-700 ${isTotal ? 'bg-emerald-200 border-emerald-300' : 'bg-emerald-50 border-emerald-200'}`}>
                              {fmtBRL(Array.from({length:12},(_,i)=>refModalDetalhePorMes[i+1]?.[key]||0).reduce((s,v)=>s+v,0))}
                            </td>
                          </tr>
                        )
                      })}
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
                              <PctInput value={m.percentual} onChange={v=>setMesesForm(prev=>prev.map((x,xi)=>xi===i?{...x,percentual:Math.min(v,disponivel)}:x))}/>
                              {jaUsado > 0 && <div className="text-[9px] text-center text-slate-400">disp: {fmtPct(disponivel)}</div>}
                            </td>
                          )
                        })}
                        <td className="bg-indigo-50 border border-indigo-200 rounded p-1 text-center text-xs font-bold text-indigo-700">
                          {fmtPct(mesesForm.reduce((s,m)=>s+(Number(m.percentual)||0),0)/12)}
                        </td>
                      </tr>
                      {/* Meta calculada do consultor, detalhada por Peças/Serviços/Total */}
                      {[
                        { key: 'pecas',    label: 'Meta Peças (R$)' },
                        { key: 'servicos', label: 'Meta Serviços (R$)' },
                        { key: 'total',    label: 'Meta Total (R$)' },
                      ].map(({ key, label }) => {
                        const isTotal = key === 'total'
                        return (
                          <tr key={key}>
                            <td className={`text-xs px-1 whitespace-nowrap ${isTotal ? 'font-bold text-indigo-800' : 'font-semibold text-indigo-600'}`}>{label}</td>
                            {mesesForm.map((m,i)=>{
                              const v = calcMetaConsultorDetalhe(m.mes, m.percentual)[key]
                              return <td key={i} className={`border rounded p-1 text-right text-xs font-bold ${isTotal ? 'bg-indigo-100 border-indigo-200 text-indigo-800' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>{v>0?fmtBRL(v):'—'}</td>
                            })}
                            <td className={`border rounded p-1 text-right text-xs font-bold ${isTotal ? 'bg-indigo-200 border-indigo-300 text-indigo-900' : 'bg-indigo-100 border-indigo-300 text-indigo-800'}`}>
                              {fmtBRL(mesesForm.reduce((s,m)=>s+calcMetaConsultorDetalhe(m.mes,m.percentual)[key],0))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {!form.empresa_id && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={12}/> Selecione a empresa para ver os totais do mecânico como referência.</p>}
                {form.empresa_id && !form.setor_id && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={12}/> Selecione o Setor para ver a referência de distribuição daquele setor.</p>}
              </div>
            </div>
            {erroModal && <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"><AlertTriangle size={15}/> {erroModal}</div>}
            {modoModal === 'visualizar' ? (
              <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-200">
                <div className="flex gap-2">
                  {canEdit && (
                    <button onClick={() => setModoModal('editar')} className={BTN_SEC}>
                      <Pencil size={14}/> Editar
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
                <button onClick={()=>setModalAberto(false)} className={BTN_SEC}>Fechar</button>
              </div>
            ) : (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
                <button onClick={()=>setModalAberto(false)} className={BTN_SEC} disabled={salvando}>Cancelar</button>
                <button onClick={handleSalvar} className={BTN_PRI} disabled={salvando}>{salvando?<><Loader2 size={15} className="animate-spin"/> Salvando...</>:modoModal==='editar'?'Salvar':'Adicionar'}</button>
              </div>
            )}
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
