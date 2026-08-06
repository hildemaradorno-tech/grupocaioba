import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Layers, ClipboardCheck, AlertTriangle, ChevronRight, ChevronDown,
  Building2, FolderOpen, Package, Briefcase, User, RefreshCw, Loader2,
  TrendingUp, BarChart3, CheckCircle2, Clock, Filter, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TIPOS = [
  { key: 'todos',     label: 'Todos',          color: 'slate'  },
  { key: 'pecas',     label: 'Peças',          color: 'blue'   },
  { key: 'mecanico',  label: 'Mecânico',       color: 'orange' },
  { key: 'consultor', label: 'Consultor',      color: 'purple' },
  { key: 'funilaria', label: 'Funilaria',      color: 'rose'   },
  { key: 'terceiros', label: 'Terceiros',      color: 'teal'   },
]

const TIPO_COLORS = {
  pecas:     { badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  mecanico:  { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  consultor: { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  funilaria: { badge: 'bg-rose-100 text-rose-700',   dot: 'bg-rose-500'   },
  terceiros: { badge: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-500'   },
}

const fmtBRL = (v) => {
  const n = Number(v) || 0
  if (n === 0) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const fmtBRLFull = (v) => {
  const n = Number(v) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const fmtMi = (v) => {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`
  return fmtBRL(n)
}

function sumMeses(rows, tipo) {
  const arr = Array(12).fill(0)
  rows.forEach(r => {
    if (tipo && tipo !== 'todos' && r.tipo !== tipo) return
    arr[r.mes - 1] += Number(r.meta_faturamento) || 0
  })
  return arr
}
function sumTotal(arr) { return arr.reduce((s, v) => s + v, 0) }

// Monta árvore: empresa → dept → setor → cargo → colaborador
function buildTree(rows, filtroTipo) {
  const tree = {}
  rows.forEach(r => {
    if (filtroTipo && filtroTipo !== 'todos' && r.tipo !== filtroTipo) return
    const empKey  = r.empresa_id  || '__sem_empresa__'
    const deptKey = r.departamento_id || '__sem_dept__'
    const setKey  = r.setor_id    || '__sem_setor__'
    const carKey  = r.cargo_id    || '__sem_cargo__'
    const colKey  = r.colaborador_id || '__sem_colab__'
    const mes     = r.mes - 1 // 0-indexed

    if (!tree[empKey]) tree[empKey] = { nome: r.empresa_nome || empKey, depts: {}, meses: Array(12).fill(0) }
    const emp = tree[empKey]

    if (!emp.depts[deptKey]) emp.depts[deptKey] = { nome: r.departamento_nome || 'Sem Departamento', setores: {}, meses: Array(12).fill(0) }
    const dept = emp.depts[deptKey]

    if (!dept.setores[setKey]) dept.setores[setKey] = { nome: r.setor_nome || 'Sem Setor', cargos: {}, meses: Array(12).fill(0) }
    const setor = dept.setores[setKey]

    if (!setor.cargos[carKey]) setor.cargos[carKey] = { nome: r.cargo_nome || 'Sem Cargo', colabs: {}, meses: Array(12).fill(0) }
    const cargo = setor.cargos[carKey]

    if (!cargo.colabs[colKey]) cargo.colabs[colKey] = { nome: r.colaborador_nome || 'Sem Colaborador', tipos: {}, meses: Array(12).fill(0) }
    const colab = cargo.colabs[colKey]

    const val = Number(r.meta_faturamento) || 0
    emp.meses[mes]   += val
    dept.meses[mes]  += val
    setor.meses[mes] += val
    cargo.meses[mes] += val
    colab.meses[mes] += val
    if (!colab.tipos[r.tipo]) colab.tipos[r.tipo] = Array(12).fill(0)
    colab.tipos[r.tipo][mes] += val
  })
  return tree
}

// Linha da tabela com células mensais
function RowMeses({ meses, depth = 0, bold = false, className = '' }) {
  const total = sumTotal(meses)
  return (
    <>
      {meses.map((v, i) => (
        <td key={i} className={`px-2 py-1.5 text-right text-xs whitespace-nowrap ${bold ? 'font-semibold' : ''} ${className}`}>
          {fmtBRL(v)}
        </td>
      ))}
      <td className={`px-3 py-1.5 text-right text-xs font-bold whitespace-nowrap sticky right-0 bg-white border-l border-slate-200 ${className}`}>
        {fmtBRL(total)}
      </td>
    </>
  )
}

function ColabRow({ nome, meses, tipos, expanded, onToggle }) {
  const hasTipos = Object.keys(tipos).length > 1
  return (
    <>
      <tr className="hover:bg-slate-50 border-b border-slate-100">
        <td className="pl-20 pr-3 py-1.5 text-xs text-slate-600 whitespace-nowrap sticky left-0 bg-white">
          <div className="flex items-center gap-1.5">
            {hasTipos
              ? <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">{expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</button>
              : <span className="w-3"/>
            }
            <User size={11} className="text-slate-400 shrink-0"/>
            <span>{nome}</span>
            <div className="flex gap-1 ml-1">
              {Object.keys(tipos).map(t => (
                <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TIPO_COLORS[t]?.badge || 'bg-slate-100 text-slate-600'}`}>
                  {TIPOS.find(x => x.key === t)?.label || t}
                </span>
              ))}
            </div>
          </div>
        </td>
        <RowMeses meses={meses} className="text-slate-600"/>
      </tr>
      {expanded && hasTipos && Object.entries(tipos).map(([tipo, tMeses]) => (
        <tr key={tipo} className="bg-slate-50 border-b border-slate-100">
          <td className="pl-28 pr-3 py-1 text-xs text-slate-500 sticky left-0 bg-slate-50">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TIPO_COLORS[tipo]?.badge || ''}`}>
                {TIPOS.find(x => x.key === tipo)?.label || tipo}
              </span>
            </div>
          </td>
          <RowMeses meses={tMeses} className="text-slate-500"/>
        </tr>
      ))}
    </>
  )
}

export default function MetasTotalGrupo() {
  const navigate = useNavigate()
  const [filtroAno,    setFiltroAno]    = useSessionState('mtg_ano', anoAtual)
  const [filtroTipo,   setFiltroTipo]   = useSessionState('mtg_tipo', 'todos')
  const [dados,        setDados]        = useState([])
  const [pendentes,    setPendentes]    = useState(0)
  const [ultimaPubl,   setUltimaPubl]   = useState(null)
  const [carregando,   setCarregando]   = useState(false)
  const [erro,         setErro]         = useState(null)
  const [expandedEmps, setExpandedEmps] = useState({})
  const [expandedDepts,setExpandedDepts]= useState({})
  const [expandedSets, setExpandedSets] = useState({})
  const [expandedCars, setExpandedCars] = useState({})
  const [expandedCols, setExpandedCols] = useState({})
  const [visuModo,     setVisuModo]     = useSessionState('mtg_visu', 'arvore')

  const load = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [dadosPubl, pend, ultima] = await Promise.all([
        apiService.getTotalGrupoPublicado(filtroAno),
        apiService.getPendingCountTotal(filtroAno),
        apiService.getUltimaPublicacao(filtroAno),
      ])
      setDados(dadosPubl)
      setPendentes(pend)
      setUltimaPubl(ultima)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [filtroAno])

  useEffect(() => { load() }, [load])

  // KPIs
  const kpi = useMemo(() => {
    const filtrado = filtroTipo === 'todos' ? dados : dados.filter(r => r.tipo === filtroTipo)
    const total = filtrado.reduce((s, r) => s + (Number(r.meta_faturamento) || 0), 0)
    const porTipo = {}
    TIPOS.filter(t => t.key !== 'todos').forEach(t => {
      porTipo[t.key] = dados.filter(r => r.tipo === t.key).reduce((s, r) => s + (Number(r.meta_faturamento) || 0), 0)
    })
    const mesesArr = Array(12).fill(0)
    filtrado.forEach(r => { mesesArr[r.mes - 1] += Number(r.meta_faturamento) || 0 })
    const empresas = new Set(dados.map(r => r.empresa_id)).size
    return { total, porTipo, mesesArr, empresas }
  }, [dados, filtroTipo])

  const tree = useMemo(() => buildTree(dados, filtroTipo), [dados, filtroTipo])

  // Resumo mensal por empresa (modo resumo)
  const resumoEmpresas = useMemo(() => {
    const map = {}
    const filtrado = filtroTipo === 'todos' ? dados : dados.filter(r => r.tipo === filtroTipo)
    filtrado.forEach(r => {
      if (!map[r.empresa_id]) map[r.empresa_id] = { nome: r.empresa_nome, meses: Array(12).fill(0), porTipo: {} }
      map[r.empresa_id].meses[r.mes - 1] += Number(r.meta_faturamento) || 0
      if (!map[r.empresa_id].porTipo[r.tipo]) map[r.empresa_id].porTipo[r.tipo] = Array(12).fill(0)
      map[r.empresa_id].porTipo[r.tipo][r.mes - 1] += Number(r.meta_faturamento) || 0
    })
    return Object.entries(map).sort((a, b) => a[1].nome.localeCompare(b[1].nome))
  }, [dados, filtroTipo])

  const toggle = (setter, key) => setter(prev => ({ ...prev, [key]: !prev[key] }))

  const tudoExpandido = Object.keys(tree).length > 0 && Object.keys(tree).every(eid => expandedEmps[eid])

  const expandirTudo = () => {
    const emps = {}, depts = {}, sets = {}, cars = {}, cols = {}
    Object.entries(tree).forEach(([empId, emp]) => {
      emps[empId] = true
      Object.entries(emp.depts || {}).forEach(([deptId, dept]) => {
        const dKey = `${empId}|${deptId}`; depts[dKey] = true
        Object.entries(dept.setores || {}).forEach(([setId, setor]) => {
          const sKey = `${dKey}|${setId}`; sets[sKey] = true
          Object.entries(setor.cargos || {}).forEach(([carId, cargo]) => {
            const cKey = `${sKey}|${carId}`; cars[cKey] = true
            Object.keys(cargo.colabs || {}).forEach(colId => { cols[`${cKey}|${colId}`] = true })
          })
        })
      })
    })
    setExpandedEmps(emps); setExpandedDepts(depts); setExpandedSets(sets)
    setExpandedCars(cars); setExpandedCols(cols)
  }

  const recolherTudo = () => {
    setExpandedEmps({}); setExpandedDepts({}); setExpandedSets({})
    setExpandedCars({}); setExpandedCols({})
  }

  const semDados = dados.length === 0 && !carregando

  return (
    <div className="flex flex-col h-full p-6 gap-4 overflow-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Total Grupo</h1>
            <p className="text-xs text-slate-400">Consolidado aprovado · Vendas + Pós-Vendas · Base para Power BI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={load} disabled={carregando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm hover:bg-slate-50 transition-colors">
            {carregando ? <Loader2 size={15} className="animate-spin"/> : <RefreshCw size={15}/>} Atualizar
          </button>
          <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
            <ClipboardCheck size={16} /> Gestão de Aprovação
          </button>
        </div>
      </div>

      {/* Alerta de pendentes */}
      {pendentes > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {pendentes} {pendentes === 1 ? 'registro pendente de aprovação' : 'registros pendentes de aprovação'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Os valores abaixo refletem a última publicação aprovada. Há alterações ainda não aprovadas que não aparecem aqui.
            </p>
          </div>
          <button onClick={() => navigate('/metas/gestao-aprovacao')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
            <ClipboardCheck size={14}/> Aprovar agora
          </button>
        </div>
      )}

      {/* Última publicação */}
      {ultimaPubl && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CheckCircle2 size={13} className="text-green-500"/>
          Última publicação: {new Date(ultimaPubl).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {semDados && !erro && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl py-16">
          <Clock size={40} className="text-slate-300"/>
          <p className="text-slate-500 font-medium">Nenhuma meta publicada para {filtroAno}</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            As metas aparecerão aqui após serem aprovadas e publicadas no menu Gestão de Aprovação.
          </p>
          <button onClick={() => navigate('/metas/gestao-aprovacao')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors mt-2">
            <ClipboardCheck size={16}/> Ir para Gestão de Aprovação
          </button>
        </div>
      )}

      {dados.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-1 xl:col-span-1 bg-indigo-600 text-white rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium">
                <TrendingUp size={14}/> Total Aprovado
              </div>
              <p className="text-2xl font-bold leading-tight">{fmtMi(kpi.total)}</p>
              <p className="text-xs text-indigo-200">{filtroAno} · {kpi.empresas} empresa(s)</p>
            </div>
            {TIPOS.filter(t => t.key !== 'todos').map(t => (
              <button key={t.key} onClick={() => setFiltroTipo(prev => prev === t.key ? 'todos' : t.key)}
                className={`rounded-xl p-4 flex flex-col gap-1 text-left border-2 transition-all ${
                  filtroTipo === t.key ? 'border-indigo-400 shadow-md' : 'border-transparent'
                } ${
                  t.color === 'blue'   ? 'bg-blue-50'   :
                  t.color === 'orange' ? 'bg-orange-50' :
                  t.color === 'purple' ? 'bg-purple-50' :
                  t.color === 'rose'   ? 'bg-rose-50'   : 'bg-teal-50'
                }`}>
                <div className={`text-xs font-medium ${
                  t.color === 'blue'   ? 'text-blue-600'   :
                  t.color === 'orange' ? 'text-orange-600' :
                  t.color === 'purple' ? 'text-purple-600' :
                  t.color === 'rose'   ? 'text-rose-600'   : 'text-teal-600'
                }`}>{t.label}</div>
                <p className={`text-lg font-bold ${
                  t.color === 'blue'   ? 'text-blue-800'   :
                  t.color === 'orange' ? 'text-orange-800' :
                  t.color === 'purple' ? 'text-purple-800' :
                  t.color === 'rose'   ? 'text-rose-800'   : 'text-teal-800'
                }`}>{fmtMi(kpi.porTipo[t.key] || 0)}</p>
                <p className={`text-[10px] ${
                  t.color === 'blue'   ? 'text-blue-500'   :
                  t.color === 'orange' ? 'text-orange-500' :
                  t.color === 'purple' ? 'text-purple-500' :
                  t.color === 'rose'   ? 'text-rose-500'   : 'text-teal-500'
                }`}>
                  {kpi.total > 0 ? ((kpi.porTipo[t.key] / kpi.total) * 100).toFixed(1) : 0}% do total
                </p>
              </button>
            ))}
          </div>

          {/* Controles de visualização + filtro tipo */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { key: 'arvore',  label: 'Árvore Detalhada', icon: <FolderOpen size={14}/> },
                { key: 'resumo',  label: 'Resumo Mensal',    icon: <BarChart3 size={14}/>  },
              ].map(({ key, label, icon }) => (
                <button key={key} onClick={() => setVisuModo(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    visuModo === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter size={13}/>
              {filtroTipo === 'todos' ? 'Todos os tipos' : TIPOS.find(t => t.key === filtroTipo)?.label}
              {filtroTipo !== 'todos' && (
                <button onClick={() => setFiltroTipo('todos')} className="text-indigo-600 hover:underline">limpar</button>
              )}
            </div>
          </div>

          {/* Modo Resumo Mensal */}
          {visuModo === 'resumo' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-4 py-2.5 text-left font-semibold sticky left-0 bg-slate-800 min-w-[200px]">Empresa / Tipo</th>
                      {MESES.map(m => <th key={m} className="px-2 py-2.5 text-right font-semibold w-20">{m}</th>)}
                      <th className="px-3 py-2.5 text-right font-semibold sticky right-0 bg-slate-700 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Linha total geral */}
                    <tr className="bg-indigo-50 border-b-2 border-indigo-200">
                      <td className="px-4 py-2 font-bold text-indigo-800 sticky left-0 bg-indigo-50">
                        <div className="flex items-center gap-2"><TrendingUp size={13}/> Total Geral</div>
                      </td>
                      <RowMeses meses={kpi.mesesArr} bold className="text-indigo-800 bg-indigo-50"/>
                    </tr>
                    {resumoEmpresas.map(([empId, emp]) => (
                      <React.Fragment key={empId}>
                        <tr className="bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                          onClick={() => toggle(setExpandedEmps, empId)}>
                          <td className="px-4 py-2 font-semibold text-slate-800 sticky left-0 bg-slate-50">
                            <div className="flex items-center gap-1.5">
                              {expandedEmps[empId] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                              <Building2 size={13} className="text-indigo-500"/>
                              {emp.nome}
                            </div>
                          </td>
                          <RowMeses meses={emp.meses} bold className="text-slate-800 bg-slate-50"/>
                        </tr>
                        {expandedEmps[empId] && Object.entries(emp.porTipo).map(([tipo, tMeses]) => (
                          <tr key={tipo} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="pl-10 pr-4 py-1.5 text-slate-600 sticky left-0 bg-white">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${TIPO_COLORS[tipo]?.dot || 'bg-slate-400'}`}/>
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${TIPO_COLORS[tipo]?.badge || ''}`}>
                                  {TIPOS.find(t => t.key === tipo)?.label || tipo}
                                </span>
                              </div>
                            </td>
                            <RowMeses meses={tMeses} className="text-slate-600"/>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modo Árvore Detalhada */}
          {visuModo === 'arvore' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-4 py-2.5 text-left font-semibold sticky left-0 bg-slate-800 min-w-[280px]">
                        <div className="flex items-center gap-2">
                          <span>Empresa / Departamento / Setor / Cargo / Colaborador</span>
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
                      {MESES.map(m => <th key={m} className="px-2 py-2.5 text-right font-semibold w-20">{m}</th>)}
                      <th className="px-3 py-2.5 text-right font-semibold sticky right-0 bg-slate-700 w-28">Total Anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Total geral */}
                    <tr className="bg-indigo-600 text-white">
                      <td className="px-4 py-2 font-bold sticky left-0 bg-indigo-600">
                        <div className="flex items-center gap-2"><TrendingUp size={13}/> Total Geral {filtroAno}</div>
                      </td>
                      <RowMeses meses={kpi.mesesArr} bold className="text-white bg-indigo-600"/>
                    </tr>

                    {Object.entries(tree).map(([empId, emp]) => {
                      const empTotal = sumTotal(emp.meses)
                      return (
                        <React.Fragment key={empId}>
                          {/* Empresa */}
                          <tr className="bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200"
                            onClick={() => toggle(setExpandedEmps, empId)}>
                            <td className="px-4 py-2.5 font-bold text-slate-800 sticky left-0 bg-slate-100">
                              <div className="flex items-center gap-2">
                                {expandedEmps[empId] ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                                <Building2 size={14} className="text-indigo-600 shrink-0"/>
                                <span className="text-sm">{emp.nome}</span>
                              </div>
                            </td>
                            <RowMeses meses={emp.meses} bold className="text-slate-800 bg-slate-100"/>
                          </tr>

                          {expandedEmps[empId] && Object.entries(emp.depts).map(([deptId, dept]) => {
                            const dKey = `${empId}|${deptId}`
                            return (
                              <React.Fragment key={deptId}>
                                {/* Departamento */}
                                <tr className="bg-blue-50 border-b border-blue-100 cursor-pointer hover:bg-blue-100"
                                  onClick={() => toggle(setExpandedDepts, dKey)}>
                                  <td className="pl-8 pr-4 py-2 font-semibold text-blue-800 sticky left-0 bg-blue-50">
                                    <div className="flex items-center gap-1.5">
                                      {expandedDepts[dKey] ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                                      <FolderOpen size={13} className="text-blue-600 shrink-0"/>
                                      {dept.nome}
                                    </div>
                                  </td>
                                  <RowMeses meses={dept.meses} bold className="text-blue-800 bg-blue-50"/>
                                </tr>

                                {expandedDepts[dKey] && Object.entries(dept.setores).map(([setId, setor]) => {
                                  const sKey = `${dKey}|${setId}`
                                  return (
                                    <React.Fragment key={setId}>
                                      {/* Setor */}
                                      <tr className="bg-purple-50 border-b border-purple-100 cursor-pointer hover:bg-purple-100"
                                        onClick={() => toggle(setExpandedSets, sKey)}>
                                        <td className="pl-14 pr-4 py-1.5 font-semibold text-purple-800 sticky left-0 bg-purple-50">
                                          <div className="flex items-center gap-1.5">
                                            {expandedSets[sKey] ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                            <Package size={12} className="text-purple-600 shrink-0"/>
                                            {setor.nome}
                                          </div>
                                        </td>
                                        <RowMeses meses={setor.meses} bold className="text-purple-800 bg-purple-50"/>
                                      </tr>

                                      {expandedSets[sKey] && Object.entries(setor.cargos).map(([carId, cargo]) => {
                                        const cKey = `${sKey}|${carId}`
                                        return (
                                          <React.Fragment key={carId}>
                                            {/* Cargo */}
                                            <tr className="bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                                              onClick={() => toggle(setExpandedCars, cKey)}>
                                              <td className="pl-[72px] pr-4 py-1.5 font-medium text-slate-700 sticky left-0 bg-slate-50">
                                                <div className="flex items-center gap-1.5">
                                                  {expandedCars[cKey] ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                                  <Briefcase size={12} className="text-slate-500 shrink-0"/>
                                                  {cargo.nome}
                                                </div>
                                              </td>
                                              <RowMeses meses={cargo.meses} bold className="text-slate-700 bg-slate-50"/>
                                            </tr>

                                            {expandedCars[cKey] && Object.entries(cargo.colabs).map(([colId, colab]) => (
                                              <ColabRow
                                                key={colId}
                                                nome={colab.nome}
                                                meses={colab.meses}
                                                tipos={colab.tipos}
                                                expanded={!!expandedCols[`${cKey}|${colId}`]}
                                                onToggle={() => toggle(setExpandedCols, `${cKey}|${colId}`)}
                                              />
                                            ))}
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rodapé informativo */}
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
            <BarChart3 size={14} className="shrink-0 mt-0.5 text-slate-400"/>
            <div>
              <span className="font-semibold text-slate-600">Base de dados Power BI:</span>{' '}
              Estes valores são extraídos da tabela <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">fato_metas_publicadas</code> no Supabase.
              Conecte o Power BI diretamente a esta tabela para criar dashboards com dados aprovados em tempo real.
              {ultimaPubl && <span className="ml-1">Última sincronização: {new Date(ultimaPubl).toLocaleString('pt-BR')}.</span>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
