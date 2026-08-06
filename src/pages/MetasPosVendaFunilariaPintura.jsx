import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Paintbrush, ChevronRight, ChevronDown, AlertTriangle, X, Loader2, ClipboardCheck, Trash2, Plus, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtBRL = (v) => { const n = Number(v); if (!n && n !== 0) return '—'; return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
const SEL = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'

function cellState(cur, apr) {
  const c = Number(cur) || 0
  if (c === 0) return 'ok'
  if (apr === null || apr === undefined) return 'new'
  if (Math.abs(c - Number(apr)) > 0.001) return 'changed'
  return 'ok'
}

function EditCell({ value, onChange, saving }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (saving) return <div className="flex justify-center py-0.5"><Loader2 size={10} className="animate-spin text-blue-400" /></div>
  if (editing) return (
    <input autoFocus type="text" inputMode="decimal" value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => { setEditing(false); onChange(parseFloat(String(raw).replace(/\./g, '').replace(',', '.')) || 0) }}
      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
      className="w-full text-xs text-right outline-none bg-blue-50 border border-blue-300 rounded px-1 py-0.5 text-slate-800"
    />
  )
  return (
    <div onClick={() => { setRaw(Number(value) > 0 ? fmt(value) : ''); setEditing(true) }}
      className="text-xs text-right cursor-text hover:bg-blue-50 rounded px-1 py-0.5 min-h-[20px] whitespace-nowrap">
      {Number(value) > 0 ? <span className="text-slate-800">{fmt(value)}</span> : <span className="text-slate-300">—</span>}
    </div>
  )
}

export default function MetasPosVendaFunilariaPintura() {
  const navigate = useNavigate()
  const [empresas,      setEmpresas]      = useState([])
  const [dados,         setDados]         = useState([])
  const [dadosConsultor, setDadosConsultor] = useState([])
  const [diasUteis,     setDiasUteis]     = useState({})
  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('mpvfp_empresa', '')
  const [filtroAno,     setFiltroAno]     = useSessionState('mpvfp_ano', anoAtual)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/pos-vendas/funilaria-pintura', 'editar')
  const canDelete = hasPermission('/metas/pos-vendas/funilaria-pintura', 'excluir')
  const [grupoAberto,    setGrupoAberto]    = useState(true)
  const [expandedEmps,   setExpandedEmps]   = useState(new Set())
  const [expandedDepts,  setExpandedDepts]  = useState(new Set())
  const [expandedSetores,setExpandedSetores]= useState(new Set())
  const [expandedBoxes,  setExpandedBoxes]  = useState(new Set())
  const [expandedCargos, setExpandedCargos] = useState(new Set())
  const [localEdits,     setLocalEdits]     = useState({})
  const [salvandoKeys,  setSalvandoKeys]  = useState(new Set())
  const [modalZerar,    setModalZerar]    = useState(null)
  const [zerandoId,     setZerandoId]     = useState(null)
  const [modalIncluir,    setModalIncluir]    = useState(false)
  const [formEmpresa,     setFormEmpresa]     = useState('')
  const [formMeses,       setFormMeses]       = useState(Array.from({length: 12}, (_, i) => ({ mes: i+1, meta_pecas: 0, meta_servicos: 0 })))
  const [salvandoInclusao, setSalvandoInclusao] = useState(false)
  const [erroInclusao,    setErroInclusao]    = useState(null)
  const [modalAberto,    setModalAberto]    = useState(false)
  const [modoModal,      setModoModal]      = useState('visualizar')
  const [modalEmpId,     setModalEmpId]     = useState(null)
  const [modalEmpNome,   setModalEmpNome]   = useState('')
  const [modalFormMeses, setModalFormMeses] = useState([])
  const [erroModal,      setErroModal]      = useState(null)
  const [salvandoModal,  setSalvandoModal]  = useState(false)

  const dadosRef     = useRef(dados)
  const editsRef     = useRef(localEdits)
  const filtroAnoRef = useRef(filtroAno)
  useEffect(() => { dadosRef.current = dados },         [dados])
  useEffect(() => { editsRef.current = localEdits },    [localEdits])
  useEffect(() => { filtroAnoRef.current = filtroAno }, [filtroAno])

  useEffect(() => { loadAll() }, [filtroEmpresa, filtroAno])

  const loadAll = async () => {
    setLoading(true); setError(null); setLocalEdits({})
    try {
      const [emps, rows, cons] = await Promise.all([
        apiService.getEmpresas(),
        apiService.getMetasFunilaria(null, filtroAno),
        apiService.getMetasConsultor(null, filtroAno),
      ])
      const sorted = [...emps].sort((a, b) => (a.empresa_fantasia || '').localeCompare(b.empresa_fantasia || ''))
      setEmpresas(sorted)
      setDados(rows)
      setDadosConsultor(cons)
      const comDados = sorted.filter(e => rows.some(r => r.empresa_id === e.id))
      const map = {}
      await Promise.all(comDados.map(async ({ id: eid }) => {
        try { map[eid] = await apiService.getDiasUteisPorMes(eid, filtroAno) } catch { map[eid] = {} }
      }))
      setDiasUteis(map)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  const abrirVisualizar = (empId, empNome) => {
    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      return {
        mes,
        meta_pecas:    Number(getVal(empId, mes, 'meta_pecas'))    || 0,
        meta_servicos: Number(getVal(empId, mes, 'meta_servicos')) || 0,
      }
    })
    setModalEmpId(empId)
    setModalEmpNome(empNome)
    setModalFormMeses(meses)
    setModoModal('visualizar')
    setErroModal(null)
    setModalAberto(true)
  }

  const handleSalvarModal = async () => {
    setSalvandoModal(true); setErroModal(null)
    try {
      for (const m of modalFormMeses) {
        const total = (Number(m.meta_pecas) || 0) + (Number(m.meta_servicos) || 0)
        await apiService.upsertMetaFunilaria({
          empresa_id: modalEmpId, empresa_nome: modalEmpNome,
          mes: m.mes, ano: filtroAno,
          meta_pecas:       Number(m.meta_pecas)    || 0,
          meta_servicos:    Number(m.meta_servicos)  || 0,
          meta_faturamento: total,
          status: 'AGUARDANDO APROVACAO',
        })
      }
      await loadAll()
      setModalAberto(false)
    } catch (err) { setErroModal(err.message || String(err)) }
    finally { setSalvandoModal(false) }
  }

  const abrirModalIncluir = () => {
    setFormEmpresa('')
    setFormMeses(Array.from({length: 12}, (_, i) => ({ mes: i+1, meta_pecas: 0, meta_servicos: 0 })))
    setErroInclusao(null)
    setModalIncluir(true)
  }

  const handleIncluirEmpresa = async () => {
    if (!formEmpresa) { setErroInclusao('Selecione a empresa.'); return }
    const emp = empresas.find(e => e.id === formEmpresa)
    setSalvandoInclusao(true); setErroInclusao(null)
    try {
      for (const m of formMeses) {
        const total = (Number(m.meta_pecas) || 0) + (Number(m.meta_servicos) || 0)
        await apiService.upsertMetaFunilaria({
          empresa_id:       formEmpresa,
          empresa_nome:     emp?.empresa_fantasia || emp?.nome_empresa || '',
          mes:              m.mes,
          ano:              filtroAno,
          meta_pecas:       Number(m.meta_pecas) || 0,
          meta_servicos:    Number(m.meta_servicos) || 0,
          meta_faturamento: total,
          status:           'AGUARDANDO APROVACAO',
        })
      }
      await loadAll()
      setModalIncluir(false)
    } catch (err) {
      setErroInclusao('Erro ao incluir: ' + (err.message || String(err)))
    } finally { setSalvandoInclusao(false) }
  }

  const distribSet = useMemo(() => {
    const s = new Set()
    dadosConsultor.forEach(r => { if (Number(r.meta_faturamento) > 0) s.add(`${r.empresa_id}|${r.mes}`) })
    return s
  }, [dadosConsultor])

  const getVal = useCallback((empId, mes, field) => {
    const key = `${empId}_${mes}`
    const e = editsRef.current[key]
    if (e && e[field] !== undefined) return e[field]
    return dadosRef.current.find(r => r.empresa_id === empId && r.mes === mes)?.[field] ?? 0
  }, [])

  const handleEdit = useCallback(async (empId, empNome, mes, field, value) => {
    const key = `${empId}_${mes}`
    const prevEdit = editsRef.current[key] || {}
    const existingRow = dadosRef.current.find(r => r.empresa_id === empId && r.mes === mes)
    const newEdit = { ...prevEdit, [field]: value }
    const pecas    = newEdit.meta_pecas    !== undefined ? newEdit.meta_pecas    : (existingRow?.meta_pecas    ?? 0)
    const servicos = newEdit.meta_servicos !== undefined ? newEdit.meta_servicos : (existingRow?.meta_servicos ?? 0)
    const total = (Number(pecas) || 0) + (Number(servicos) || 0)

    setLocalEdits(prev => ({ ...prev, [key]: newEdit }))
    setSalvandoKeys(prev => new Set(prev).add(key))
    try {
      await apiService.upsertMetaFunilaria({
        empresa_id: empId, empresa_nome: empNome,
        mes, ano: filtroAnoRef.current,
        meta_pecas: Number(pecas) || 0,
        meta_servicos: Number(servicos) || 0,
        meta_faturamento: total,
        status: 'AGUARDANDO APROVACAO',
      })
    } catch (err) { setError(err.message || String(err)) }
    finally { setSalvandoKeys(prev => { const n = new Set(prev); n.delete(key); return n }) }
  }, [])

  const empresasNaTabela = useMemo(() =>
    empresas.filter(e => dados.some(r => r.empresa_id === e.id)),
    [empresas, dados])

  const empresasParaIncluir = useMemo(() =>
    empresas.filter(e => !dados.some(r => r.empresa_id === e.id)),
    [empresas, dados])

  const empList = useMemo(() =>
    filtroEmpresa ? empresasNaTabela.filter(e => e.id === filtroEmpresa) : empresasNaTabela,
    [empresasNaTabela, filtroEmpresa])

  const handleZerar = async () => {
    if (!modalZerar) return
    setZerandoId(modalZerar.empId); setModalZerar(null)
    try { await apiService.deleteMetasFunilariaEmpresa(modalZerar.empId, filtroAno); await loadAll() }
    catch (err) { setError(err.message || String(err)) }
    finally { setZerandoId(null) }
  }

  const toggle = (setter, key) => setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const tudoExpandido = grupoAberto && empList.length > 0 && empList.every(e => expandedEmps.has(e.id))

  const expandirTudo = () => {
    setGrupoAberto(true)
    const emps = new Set(), depts = new Set(), sets = new Set(), bxs = new Set(), cars = new Set()
    empList.forEach(emp => {
      emps.add(emp.id)
      depts.add(`${emp.id}_d`)
      sets.add(`${emp.id}_s`)
      bxs.add(`${emp.id}_b`)
      cars.add(`${emp.id}_c`)
    })
    setExpandedEmps(emps); setExpandedDepts(depts); setExpandedSetores(sets)
    setExpandedBoxes(bxs); setExpandedCargos(cars)
  }

  const recolherTudo = () => {
    setGrupoAberto(false)
    setExpandedEmps(new Set()); setExpandedDepts(new Set()); setExpandedSetores(new Set())
    setExpandedBoxes(new Set()); setExpandedCargos(new Set())
  }

  const grupoMeses = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      return empList.reduce((s, emp) => s + (Number(getVal(emp.id, mes, 'meta_pecas')) || 0) + (Number(getVal(emp.id, mes, 'meta_servicos')) || 0), 0)
    })
  }, [empList, getVal, localEdits, dados])

  const NCOLS = 15

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Paintbrush size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Metas - Funilaria e Pintura</h1>
            <p className="text-xs text-slate-400">Pós-Vendas · Entrada direta de valores · Rascunho editável</p>
          </div>
        </div>
        <button onClick={abrirModalIncluir} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Incluir Empresa
        </button>
        <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
          <ClipboardCheck size={16} /> Gestão de Aprovação
        </button>
      </div>

      {/* Filtros */}
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
        <div className="ml-auto text-sm text-slate-500">{empList.length} empresa(s)</div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="text-xs border-separate border-spacing-0" style={{ minWidth: '1700px' }}>
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase border-b border-slate-200 w-64 sticky left-0 bg-slate-50 z-10">
                  <div className="flex items-center gap-2">
                    <span>Estrutura / Métrica</span>
                    {empList.length > 0 && (
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400">
                  <div className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
                </td></tr>
              ) : empList.length === 0 ? (
                <tr><td colSpan={NCOLS} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <Paintbrush size={32} className="text-slate-300"/>
                    <span>Nenhuma empresa adicionada para {filtroAno}.</span>
                    <button onClick={abrirModalIncluir} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                      <Plus size={14}/> Incluir Empresa
                    </button>
                  </div>
                </td></tr>
              ) : (
                <>
                  {/* Linha Grupo */}
                  <tr className="cursor-pointer bg-blue-950 hover:bg-blue-900 transition-colors sticky top-[41px] z-10"
                    onClick={() => setGrupoAberto(v => !v)}>
                    <td className="px-3 py-2.5 text-white font-bold sticky left-0 bg-blue-950 z-10 whitespace-nowrap">
                      <div className="flex items-center gap-2">{grupoAberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}🏢 Grupo Caiobá</div>
                    </td>
                    {grupoMeses.map((v, i) => <td key={i} className="px-1 py-2.5 text-right text-xs font-bold text-blue-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                    <td className="px-2 py-2.5 text-right text-xs font-bold text-amber-300 bg-blue-900 whitespace-nowrap">{fmtBRL(grupoMeses.reduce((s, v) => s + v, 0))}</td>
                    <td />
                  </tr>

                  {grupoAberto && empList.map(emp => {
                    const empId   = emp.id
                    const empNome = emp.empresa_fantasia || emp.nome_empresa
                    const isExp   = expandedEmps.has(empId)
                    const du      = diasUteis[empId] || {}
                    const empMeses = Array.from({ length: 12 }, (_, i) => {
                      const mes = i + 1
                      return (Number(getVal(empId, mes, 'meta_pecas')) || 0) + (Number(getVal(empId, mes, 'meta_servicos')) || 0)
                    })
                    const empAnual = empMeses.reduce((s, v) => s + v, 0)

                    const empRows = dados.filter(r => r.empresa_id === empId)
                    const hasData = empMeses.some(v => v > 0)
                    const distribuido = hasData && empRows.every(r => {
                      const t = (Number(r.meta_pecas) || 0) + (Number(r.meta_servicos) || 0)
                      return t === 0 || distribSet.has(`${empId}|${r.mes}`)
                    })

                    return (
                      <React.Fragment key={empId}>
                        {/* Linha Empresa */}
                        <tr className="cursor-pointer bg-indigo-700 hover:bg-indigo-600 transition-colors"
                          onClick={() => toggle(setExpandedEmps, empId)}>
                          <td className="px-3 py-2 text-white font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                            <div className="flex items-center gap-2 pl-4">
                              {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {empNome}
                            </div>
                          </td>
                          {empMeses.map((v, i) => <td key={i} className="px-1 py-2 text-right text-xs font-semibold text-indigo-200 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                          <td className="px-2 py-2 text-right text-xs font-bold text-amber-300 bg-indigo-800 whitespace-nowrap">{empAnual > 0 ? fmtBRL(empAnual) : '—'}</td>
                          <td />
                        </tr>

                        {isExp && (() => {
                          const dKey = `${empId}_d`
                          const sKey = `${empId}_s`
                          const bKey = `${empId}_b`
                          const cKey = `${empId}_c`
                          const dOpen = expandedDepts.has(dKey)
                          const sOpen = expandedSetores.has(sKey)
                          const bOpen = expandedBoxes.has(bKey)
                          const cOpen = expandedCargos.has(cKey)
                          return (
                          <>
                            {/* Departamento */}
                            <tr className="cursor-pointer bg-slate-200 hover:bg-slate-300 transition-colors"
                              onClick={() => toggle(setExpandedDepts, dKey)}>
                              <td className="px-3 py-1.5 text-slate-700 font-bold sticky left-0 bg-slate-200 z-10 whitespace-nowrap">
                                <div className="flex items-center gap-2 pl-8">
                                  {dOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                  <span className="text-slate-400 text-xs mr-0.5">Departamento:</span>
                                  <span>Oficina</span>
                                </div>
                              </td>
                              {empMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                              <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{empAnual > 0 ? fmtBRL(empAnual) : '—'}</td>
                              <td />
                            </tr>

                            {/* Setor */}
                            {dOpen && (
                              <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
                                onClick={() => toggle(setExpandedSetores, sKey)}>
                                <td className="px-3 py-1.5 sticky left-0 bg-slate-100 z-10 whitespace-nowrap">
                                  <div className="flex items-center gap-2 pl-12">
                                    {sOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    <span className="text-slate-400 text-xs mr-0.5">Setor:</span>
                                    <span className="font-semibold text-slate-700">Funilaria e Pintura</span>
                                  </div>
                                </td>
                                {empMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-600 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                                <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-600 bg-indigo-50/60 whitespace-nowrap">{empAnual > 0 ? fmtBRL(empAnual) : '—'}</td>
                                <td />
                              </tr>
                            )}

                            {/* Box */}
                            {dOpen && sOpen && (
                              <tr className="cursor-pointer bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                onClick={() => toggle(setExpandedBoxes, bKey)}>
                                <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                                  <div className="flex items-center gap-2 pl-16">
                                    {bOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    <span className="text-slate-400 text-xs mr-0.5">Box:</span>
                                    <span className="font-semibold text-slate-600">Funilaria e Pintura</span>
                                  </div>
                                </td>
                                {empMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs text-slate-500 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                                <td className="px-2 py-1.5 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{empAnual > 0 ? fmtBRL(empAnual) : '—'}</td>
                                <td />
                              </tr>
                            )}

                            {/* Cargo */}
                            {dOpen && sOpen && bOpen && (
                              <tr className="cursor-pointer bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                onClick={() => toggle(setExpandedCargos, cKey)}>
                                <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                                  <div className="flex items-center gap-2 pl-20">
                                    {cOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    <span className="text-slate-400 text-xs mr-0.5">Cargo:</span>
                                    <span className="font-semibold text-slate-600">Funilaria e Pintura</span>
                                  </div>
                                </td>
                                {empMeses.map((v, i) => <td key={i} className="px-1 py-1 text-right text-xs text-slate-500 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                                <td className="px-2 py-1 text-right text-xs font-semibold text-indigo-500 bg-indigo-50/40 whitespace-nowrap">{empAnual > 0 ? fmtBRL(empAnual) : '—'}</td>
                                <td />
                              </tr>
                            )}

                            {/* Produtivo Não Associado Funilaria */}
                            {dOpen && sOpen && bOpen && cOpen && (
                              <tr className="bg-amber-50 border-b border-amber-100">
                                <td className="px-3 py-1.5 sticky left-0 bg-amber-50 z-10 whitespace-nowrap">
                                  <div className="pl-24 font-bold text-xs text-indigo-600 cursor-pointer hover:text-indigo-800 hover:underline select-none"
                                    onClick={() => abrirVisualizar(empId, empNome)}>
                                    Produtivo Não Associado Funilaria
                                  </div>
                                </td>
                                {empMeses.map((v, i) => <td key={i} className="px-1 py-1.5 text-right text-xs font-bold text-slate-700 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>)}
                                <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{empAnual > 0 ? fmtBRL(empAnual) : '—'}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${distribuido ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {distribuido ? 'Valor Distribuído' : 'Aguard. Distribuição'}
                                  </span>
                                </td>
                              </tr>
                            )}
                          </>
                          )
                        })()}
                      </React.Fragment>
                    )
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visualizar / Editar */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '95vw', maxWidth: '1200px', maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Paintbrush size={20} className="text-indigo-600"/>
                <h2 className="text-lg font-bold text-slate-800">
                  {modoModal === 'visualizar' ? 'Visualizar' : 'Editar'} — Funilaria e Pintura · {modalEmpNome} · {filtroAno}
                </h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="text-xs border-separate border-spacing-0 w-full" style={{ minWidth: '1100px' }}>
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase border-b border-slate-200 w-40 sticky left-0 bg-white z-10"></th>
                    {MESES_ABR.map(m => <th key={m} className="px-1 py-2 text-center font-semibold text-slate-500 uppercase border-b border-slate-200 w-20">{m}</th>)}
                    <th className="px-2 py-2 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 bg-white">
                    <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap font-semibold text-slate-500">Dias Úteis</td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const du = diasUteis[modalEmpId] || {}
                      const v = du[i + 1] || 0
                      return <td key={i} className="px-1 py-1.5 text-center text-xs text-slate-500 bg-slate-50 whitespace-nowrap">{v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</td>
                    })}
                    <td className="px-2 py-1.5 text-center text-xs font-semibold text-slate-600 bg-slate-100 whitespace-nowrap">
                      {(() => { const du = diasUteis[modalEmpId] || {}; const t = Object.values(du).reduce((s, v) => s + (Number(v) || 0), 0); return t > 0 ? t.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—' })()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                      <span className="text-xs font-semibold text-orange-600">Meta Peças (R$)</span>
                    </td>
                    {modalFormMeses.map((m, i) => (
                      <td key={i} className="p-1 border-l border-slate-100">
                        {modoModal === 'visualizar' ? (
                          <div className="text-xs text-right px-1 py-0.5 whitespace-nowrap">
                            {m.meta_pecas > 0 ? <span className="text-slate-800">{fmtBRL(m.meta_pecas)}</span> : <span className="text-slate-300">—</span>}
                          </div>
                        ) : (
                          <EditCell value={m.meta_pecas} saving={false}
                            onChange={val => setModalFormMeses(prev => prev.map((x, xi) => xi === i ? { ...x, meta_pecas: val } : x))} />
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right text-xs font-bold text-orange-700 bg-orange-50 whitespace-nowrap">
                      {fmtBRL(modalFormMeses.reduce((s, m) => s + (Number(m.meta_pecas) || 0), 0))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                      <span className="text-xs font-semibold text-blue-600">Meta Serviços (R$)</span>
                    </td>
                    {modalFormMeses.map((m, i) => (
                      <td key={i} className="p-1 border-l border-slate-100">
                        {modoModal === 'visualizar' ? (
                          <div className="text-xs text-right px-1 py-0.5 whitespace-nowrap">
                            {m.meta_servicos > 0 ? <span className="text-slate-800">{fmtBRL(m.meta_servicos)}</span> : <span className="text-slate-300">—</span>}
                          </div>
                        ) : (
                          <EditCell value={m.meta_servicos} saving={false}
                            onChange={val => setModalFormMeses(prev => prev.map((x, xi) => xi === i ? { ...x, meta_servicos: val } : x))} />
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right text-xs font-bold text-blue-700 bg-blue-50 whitespace-nowrap">
                      {fmtBRL(modalFormMeses.reduce((s, m) => s + (Number(m.meta_servicos) || 0), 0))}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 sticky left-0 bg-indigo-50/50 z-10 whitespace-nowrap">
                      <span className="text-xs font-bold text-indigo-700">Meta Total (R$)</span>
                    </td>
                    {modalFormMeses.map((m, i) => {
                      const t = (Number(m.meta_pecas) || 0) + (Number(m.meta_servicos) || 0)
                      return <td key={i} className="px-1 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50/50 whitespace-nowrap">{t > 0 ? fmtBRL(t) : '—'}</td>
                    })}
                    <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-800 bg-indigo-100 whitespace-nowrap">
                      {fmtBRL(modalFormMeses.reduce((s, m) => s + (Number(m.meta_pecas) || 0) + (Number(m.meta_servicos) || 0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {erroModal && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
                <AlertTriangle size={13}/> {erroModal}
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
                    {canDelete && (
                      <button onClick={() => { setModalAberto(false); setModalZerar({ empId: modalEmpId, empNome: modalEmpNome }) }}
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
                    <button onClick={() => { setModoModal('visualizar'); setErroModal(null) }} className={BTN_SEC} disabled={salvandoModal}>Cancelar</button>
                    <button onClick={handleSalvarModal} className={BTN_PRI} disabled={salvandoModal}>
                      {salvandoModal ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : 'Salvar Alterações'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Incluir Empresa */}
      {modalIncluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '95vw', maxWidth: '1200px', maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Paintbrush size={20} className="text-indigo-600"/>
                <h2 className="text-lg font-bold text-slate-800">Incluir Empresa — Funilaria e Pintura · {filtroAno}</h2>
              </div>
              <button onClick={() => setModalIncluir(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* Empresa select */}
            <div className="px-6 pt-4 pb-3">
              <label className={LBL}>Empresa *</label>
              <select
                value={formEmpresa}
                onChange={e => setFormEmpresa(e.target.value)}
                className={SEL + ' max-w-xs'}
              >
                <option value="">Selecione...</option>
                {empresasParaIncluir.map(e => (
                  <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>
                ))}
              </select>
              {empresasParaIncluir.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">Todas as empresas já foram incluídas para {filtroAno}.</p>
              )}
            </div>

            {/* Grade de meses */}
            <div className="flex-1 overflow-auto px-6 pb-2">
              <table className="text-xs border-separate border-spacing-0 w-full" style={{ minWidth: '1100px' }}>
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase border-b border-slate-200 w-40 sticky left-0 bg-white z-10"></th>
                    {MESES_ABR.map(m => <th key={m} className="px-1 py-2 text-center font-semibold text-slate-500 uppercase border-b border-slate-200 w-20">{m}</th>)}
                    <th className="px-2 py-2 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Meta Peças */}
                  <tr>
                    <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                      <span className="text-xs font-semibold text-orange-600">Meta Peças (R$)</span>
                    </td>
                    {formMeses.map((m, i) => (
                      <td key={i} className="p-1 border-l border-slate-100">
                        <EditCell
                          value={m.meta_pecas}
                          saving={false}
                          onChange={val => setFormMeses(prev => prev.map((x, xi) => xi === i ? {...x, meta_pecas: val} : x))}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right text-xs font-bold text-orange-700 bg-orange-50 whitespace-nowrap">
                      {fmtBRL(formMeses.reduce((s, m) => s + (Number(m.meta_pecas) || 0), 0))}
                    </td>
                  </tr>
                  {/* Meta Serviços */}
                  <tr>
                    <td className="px-3 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                      <span className="text-xs font-semibold text-blue-600">Meta Serviços (R$)</span>
                    </td>
                    {formMeses.map((m, i) => (
                      <td key={i} className="p-1 border-l border-slate-100">
                        <EditCell
                          value={m.meta_servicos}
                          saving={false}
                          onChange={val => setFormMeses(prev => prev.map((x, xi) => xi === i ? {...x, meta_servicos: val} : x))}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right text-xs font-bold text-blue-700 bg-blue-50 whitespace-nowrap">
                      {fmtBRL(formMeses.reduce((s, m) => s + (Number(m.meta_servicos) || 0), 0))}
                    </td>
                  </tr>
                  {/* Meta Total */}
                  <tr>
                    <td className="px-3 py-1.5 sticky left-0 bg-indigo-50/50 z-10 whitespace-nowrap">
                      <span className="text-xs font-bold text-indigo-700">Meta Total (R$)</span>
                    </td>
                    {formMeses.map((m, i) => {
                      const t = (Number(m.meta_pecas) || 0) + (Number(m.meta_servicos) || 0)
                      return <td key={i} className="px-1 py-1.5 text-right text-xs font-bold text-indigo-700 bg-indigo-50/50 whitespace-nowrap">{t > 0 ? fmtBRL(t) : '—'}</td>
                    })}
                    <td className="px-2 py-1.5 text-right text-xs font-bold text-indigo-800 bg-indigo-100 whitespace-nowrap">
                      {fmtBRL(formMeses.reduce((s, m) => s + (Number(m.meta_pecas)||0) + (Number(m.meta_servicos)||0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {erroInclusao && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
                <AlertTriangle size={13}/> {erroInclusao}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setModalIncluir(false)} className={BTN_SEC} disabled={salvandoInclusao}>
                Cancelar
              </button>
              <button
                onClick={handleIncluirEmpresa}
                disabled={salvandoInclusao || !formEmpresa}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvandoInclusao ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : <><Plus size={15}/> Incluir Empresa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zerar */}
      {modalZerar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Zerar Metas</h2>
              <p className="text-sm text-slate-500 mb-1">Todos os valores de <strong>{filtroAno}</strong> serão excluídos para:</p>
              <p className="text-sm font-bold text-red-700">{modalZerar.empNome}</p>
              <p className="text-xs text-slate-400 mt-2">Isso remove os dados e desfaz a aprovação.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalZerar(null)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleZerar}
                className="inline-flex items-center justify-center gap-2 flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <Trash2 size={15} /> Zerar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
