import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import {
  Wrench, ChevronDown, ChevronRight, Building2, Layers, FolderTree,
  Loader2, AlertTriangle, ClipboardCheck, Plus, X, Edit2, Eye, Trash2, UserCircle, CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const TIPOS_POOL = [
  { key: 'somente_mecanica',   label: 'Somente Mecânica',                        sigla: 'MEC'     },
  { key: 'mecanica_terceiro',  label: 'Mecânica + Terceiro',                     sigla: 'MEC+TER' },
  { key: 'somente_funilaria',  label: 'Somente Funilaria',                       sigla: 'FUN'     },
  { key: 'funilaria_terceiro', label: 'Funilaria + Terceiro',                    sigla: 'FUN+TER' },
  { key: 'total',              label: 'Total (Mecânica + Funilaria + Terceiro)', sigla: 'TOT'     },
]

const fmtBRL = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const sumArr = (a) => a.reduce((s, v) => s + v, 0)

export default function MetasPosVendaTotalOficina() {
  const navigate = useNavigate()
  const [filtroAno,     setFiltroAno]     = useSessionState('mpvto_ano', anoAtual)
  const [dadosMec,      setDadosMec]      = useState([])
  const [dadosFun,      setDadosFun]      = useState([])
  const [dadosTer,      setDadosTer]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  const [expandedEmps,   setExpandedEmps]   = useState(new Set())
  const [expandedSecs,   setExpandedSecs]   = useState(new Set())


  const [filtroVisu, setFiltroVisu] = useSessionState('mpvto_visu', 'total')

  const [dadosConsultor,    setDadosConsultor]    = useState([])
  const [modalConsultor,    setModalConsultor]    = useState(false)
  const [formConsultor,     setFormConsultor]     = useState({ empresa_id: '', colaborador_id: '', tipo_pool: 'total' })
  const [mesesConsultor,    setMesesConsultor]    = useState([])
  const [salvandoConsultor, setSalvandoConsultor] = useState(false)
  const [erroConsultor,     setErroConsultor]     = useState(null)
  const [fillPopup,         setFillPopup]         = useState(false)
  const [fillPct,           setFillPct]           = useState('')
  const [fillMesesSel,      setFillMesesSel]      = useState(new Set())
  const [viewModeConsultor,  setViewModeConsultor]  = useState(false)
  const [deleteConfirmData,  setDeleteConfirmData]  = useState(null)
  const [deletandoConsultor, setDeletandoConsultor] = useState(false)
  const [collapsedConsDepts, setCollapsedConsDepts] = useState(new Set())
  const [collapsedConsSets,  setCollapsedConsSets]  = useState(new Set())
  const [collapsedConsCargs, setCollapsedConsCargs] = useState(new Set())

  const toggle = (setter, key) =>
    setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const pick = (pec, ser) =>
    filtroVisu === 'pecas' ? pec : filtroVisu === 'servicos' ? ser : addArr(pec, ser)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [mec, fun, ter, depts, sets, bxs, cargs, funcs] = await Promise.all([
        apiService.getMetasMecanico(null, filtroAno),
        apiService.getMetasFunilaria(null, filtroAno),
        apiService.getMetasTerceiros(null, filtroAno),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getBox(),
        apiService.getCargos(),
        apiService.getFuncionarios(),
      ])
      setDadosMec(mec); setDadosFun(fun); setDadosTer(ter)
      setDepartamentos(depts); setSetores(sets); setBoxes(bxs); setCargos(cargs); setFuncionarios(funcs)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filtroAno])

  const loadConsultor = useCallback(async () => {
    try { setDadosConsultor(await apiService.getMetasConsultor(null, filtroAno)) } catch {}
  }, [filtroAno])
  useEffect(() => { loadConsultor() }, [loadConsultor])

  // ── Mecânico: empresa → dept → setor → box → cargo → colab → meses
  const mecTree = useMemo(() => {
    const t = {}
    dadosMec.forEach(row => {
      const eid   = row.empresa_id
      const did   = row.departamento_id || '—'
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
      if (!t[eid].depts[did]) t[eid].depts[did] = { nome: dNome, setores: {} }
      if (!t[eid].depts[did].setores[sId]) t[eid].depts[did].setores[sId] = { nome: sNome, boxes: {} }
      if (!t[eid].depts[did].setores[sId].boxes[bId]) t[eid].depts[did].setores[sId].boxes[bId] = { nome: bNome, cargos: {} }
      if (!t[eid].depts[did].setores[sId].boxes[bId].cargos[cId])
        t[eid].depts[did].setores[sId].boxes[bId].cargos[cId] = { nome: cNome, colabs: {} }
      if (!t[eid].depts[did].setores[sId].boxes[bId].cargos[cId].colabs[colid])
        t[eid].depts[did].setores[sId].boxes[bId].cargos[cId].colabs[colid] = { nome: coNome, meses: {} }
      const _hd   = Number(row.horas_disponiveis) || 0
      const _prod = Number(row.produtividade)     || 0
      const _vh   = Number(row.valor_hora)        || 0
      const _cp   = Number(row.coef_pecas)        || 0
      const _ms   = _hd * (_prod / 100) * _vh
      const _mp   = _ms * _cp
      t[eid].depts[did].setores[sId].boxes[bId].cargos[cId].colabs[colid].meses[row.mes] = {
        pecas:    _mp,
        servicos: _ms,
      }
    })
    return t
  }, [dadosMec, departamentos, setores, boxes, cargos, funcionarios])

  // Busca o setor "Funilaria" na tabela de setores pelo nome
  const funSetorInfo = useMemo(() => {
    const s = setores.find(s => s.nome_setor?.toLowerCase().includes('funilaria'))
    if (!s) return null
    return { id: s.id, nome: s.nome_setor, departamento_id: s.departamento_id }
  }, [setores])

  // Busca o setor "Terceiros" na tabela de setores pelo nome
  const terSetorInfo = useMemo(() => {
    const s = setores.find(s => s.nome_setor?.toLowerCase().includes('terceiro'))
    if (!s) return null
    return { id: s.id, nome: s.nome_setor, departamento_id: s.departamento_id }
  }, [setores])

  // Normaliza rows de funilaria com dept/setor corretos
  const funRowsNorm = useMemo(() => {
    if (!funSetorInfo) return dadosFun
    const dNome = departamentos.find(d => d.id === funSetorInfo.departamento_id)?.nome_departamento || '—'
    return dadosFun.map(r => ({
      ...r,
      departamento_id:   funSetorInfo.departamento_id,
      departamento_nome: dNome,
      setor_id:          funSetorInfo.id,
      setor_nome:        funSetorInfo.nome,
    }))
  }, [dadosFun, funSetorInfo, departamentos])

  // Normaliza rows de terceiros com dept/setor corretos (usa dept do funilaria se não existir setor próprio)
  const terRowsNorm = useMemo(() => {
    const sId   = terSetorInfo?.id   || 'terceiros'
    const sNome = terSetorInfo?.nome || 'Terceiros'
    const dId   = terSetorInfo?.departamento_id || funSetorInfo?.departamento_id || '—'
    const dNome = departamentos.find(d => d.id === dId)?.nome_departamento || '—'
    return dadosTer.map(r => ({
      empresa_id:        r.empresa_id,
      empresa_nome:      r.empresa_nome,
      departamento_id:   dId,
      departamento_nome: dNome,
      setor_id:          sId,
      setor_nome:        sNome,
      mes:               r.mes,
      meta_pecas:        0,
      meta_servicos:     Number(r.meta_servicos) || 0,
    }))
  }, [dadosTer, terSetorInfo, funSetorInfo, departamentos])

  // ── Terceiros (mantido para calcPoolByTipo): empresa → meses
  const terMap = useMemo(() => {
    const m = {}
    dadosTer.forEach(row => {
      if (!m[row.empresa_id]) m[row.empresa_id] = { nome: row.empresa_nome || row.empresa_id, meses: {} }
      m[row.empresa_id].meses[row.mes] = { servicos: Number(row.meta_servicos) || 0 }
    })
    return m
  }, [dadosTer])

  // ── Funilaria: empresa → meses (peças + serviços)
  const funPoolEmp = useMemo(() => {
    const m = {}
    funRowsNorm.forEach(row => {
      if (!m[row.empresa_id]) m[row.empresa_id] = { meses: {} }
      const cur = m[row.empresa_id].meses[row.mes] || { pecas: 0, servicos: 0 }
      m[row.empresa_id].meses[row.mes] = {
        pecas:    cur.pecas    + (Number(row.meta_pecas)    || 0),
        servicos: cur.servicos + (Number(row.meta_servicos) || 0),
      }
    })
    return m
  }, [funRowsNorm])

  // ── Árvore unificada: empresa → dept → setor → meses (mecânico + funilaria + terceiros)
  const allTree = useMemo(() => {
    const t = {}
    const addRow = (row, pecas, servicos) => {
      const eid   = row.empresa_id
      const did   = row.departamento_id || '—'
      const sId   = row.setor_id || row.setor_nome || '—'
      const dNome = departamentos.find(d => d.id === did)?.nome_departamento || row.departamento_nome || did
      const sNome = setores.find(s => s.id === row.setor_id)?.nome_setor    || row.setor_nome        || '—'
      if (!t[eid]) t[eid] = { nome: row.empresa_nome || eid, depts: {} }
      if (!t[eid].depts[did]) t[eid].depts[did] = { nome: dNome, setores: {} }
      if (!t[eid].depts[did].setores[sId]) t[eid].depts[did].setores[sId] = { nome: sNome, meses: {} }
      const cur = t[eid].depts[did].setores[sId].meses[row.mes] || { pecas: 0, servicos: 0 }
      t[eid].depts[did].setores[sId].meses[row.mes] = { pecas: cur.pecas + pecas, servicos: cur.servicos + servicos }
    }
    dadosMec.forEach(row => {
      const _hd = Number(row.horas_disponiveis) || 0, _prod = Number(row.produtividade) || 0
      const _vh = Number(row.valor_hora) || 0,        _cp   = Number(row.coef_pecas)   || 0
      const _ms = _hd * (_prod / 100) * _vh
      addRow(row, _ms * _cp, _ms)
    })
    funRowsNorm.forEach(row => addRow(row, Number(row.meta_pecas) || 0, Number(row.meta_servicos) || 0))
    terRowsNorm.forEach(row => addRow(row, 0, Number(row.meta_servicos) || 0))
    return t
  }, [dadosMec, funRowsNorm, terRowsNorm, departamentos, setores])

  // União de empresas
  const empresas = useMemo(() => {
    const ids = new Set(Object.keys(allTree))
    return Array.from(ids)
      .map(id => ({ id, nome: allTree[id]?.nome || id }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [allTree])

  const consultoresPorEmpresa = useMemo(() => {
    const m = {}
    dadosConsultor.forEach(r => {
      const empId  = r.empresa_id
      const deptId = r.departamento_id || '—'
      const setId  = r.setor_id        || '—'
      const carId  = r.cargo_id        || '—'
      const dNome  = r.departamento_nome || departamentos.find(d => d.id === deptId)?.nome_departamento || '—'
      const sNome  = r.setor_nome        || setores.find(s => s.id === setId)?.nome_setor              || '—'
      const cNome  = r.cargo_nome        || cargos.find(c => c.id === carId)?.nome_cargo               || '—'

      if (!m[empId]) m[empId] = {}
      if (!m[empId][deptId]) m[empId][deptId] = { nome: dNome, setores: {} }
      if (!m[empId][deptId].setores[setId]) m[empId][deptId].setores[setId] = { nome: sNome, cargos: {} }
      if (!m[empId][deptId].setores[setId].cargos[carId]) m[empId][deptId].setores[setId].cargos[carId] = { nome: cNome, colabs: {} }

      const key = `${r.colaborador_id}||${r.tipo_pool || 'total'}`
      if (!m[empId][deptId].setores[setId].cargos[carId].colabs[key])
        m[empId][deptId].setores[setId].cargos[carId].colabs[key] = {
          colaborador_id:   r.colaborador_id,
          colaborador_nome: r.colaborador_nome || funcionarios.find(f => f.id === r.colaborador_id)?.nome_funcionario || r.colaborador_id,
          tipo_pool:        r.tipo_pool || 'total',
          meses:            {},
        }
      m[empId][deptId].setores[setId].cargos[carId].colabs[key].meses[r.mes] = {
        meta_faturamento: Number(r.meta_faturamento) || 0,
        meta_aprovada:    r.meta_aprovada ?? null,
      }
    })
    return m
  }, [dadosConsultor, funcionarios, departamentos, setores, cargos])

  const tudoExpandido = empresas.length > 0 && empresas.every(emp => expandedEmps.has(emp.id))

  const expandirTudo = () => {
    const emps = new Set(), secs = new Set()
    empresas.forEach(emp => {
      emps.add(emp.id)
      const allEmp = allTree[emp.id]
      if (allEmp) Object.keys(allEmp.depts).forEach(dId => secs.add(`${emp.id}§${dId}`))
    })
    setExpandedEmps(emps); setExpandedSecs(secs)
  }

  const recolherTudo = () => { setExpandedEmps(new Set()); setExpandedSecs(new Set()) }

  // Agregação para mecTree (cargo → colabs → meses) — usado por calcPoolEmpByTipo
  const colabArr    = (colab, field) => Array.from({ length: 12 }, (_, i) => colab.meses[i+1]?.[field] || 0)
  const aggColabs   = (colabs, field) => { const a=Array(12).fill(0); Object.values(colabs).forEach(c=>colabArr(c,field).forEach((v,i)=>{a[i]+=v})); return a }
  const aggCargoMec = (cargo, field) => aggColabs(cargo.colabs, field)
  const aggBoxMec   = (box, field)   => { const a=Array(12).fill(0); Object.values(box.cargos).forEach(c=>aggCargoMec(c,field).forEach((v,i)=>{a[i]+=v})); return a }
  const aggSetorMec = (setor, field) => { const a=Array(12).fill(0); Object.values(setor.boxes).forEach(b=>aggBoxMec(b,field).forEach((v,i)=>{a[i]+=v})); return a }
  const aggDeptMec  = (dept, field)  => { const a=Array(12).fill(0); Object.values(dept.setores).forEach(s=>aggSetorMec(s,field).forEach((v,i)=>{a[i]+=v})); return a }
  const aggEmpMec   = (emp, field)   => { const a=Array(12).fill(0); Object.values(emp.depts).forEach(d=>aggDeptMec(d,field).forEach((v,i)=>{a[i]+=v})); return a }

  // Agregação para allTree (setor → meses direto) — usado no render
  const aggSetor = (setor, field) => Array.from({ length: 12 }, (_, i) => setor.meses[i+1]?.[field] || 0)
  const aggDept  = (dept, field)  => { const a=Array(12).fill(0); Object.values(dept.setores).forEach(s=>aggSetor(s,field).forEach((v,i)=>{a[i]+=v})); return a }
  const aggEmp   = (emp, field)   => { const a=Array(12).fill(0); Object.values(emp.depts).forEach(d=>aggDept(d,field).forEach((v,i)=>{a[i]+=v})); return a }
  const mapArr   = (meses, field) => Array.from({ length: 12 }, (_, i) => meses[i+1]?.[field] || 0)
  const addArr   = (a, b) => a.map((v, i) => v + b[i])

  // ── Distribuição: pool varia conforme tipo_pool selecionado
  const calcPoolEmpByTipo = useCallback((empId, tipo = 'total') => {
    const mPec = mecTree[empId]    ? aggEmpMec(mecTree[empId], 'pecas')      : Array(12).fill(0)
    const mSer = mecTree[empId]    ? aggEmpMec(mecTree[empId], 'servicos')   : Array(12).fill(0)
    const tSer = terMap[empId]     ? mapArr(terMap[empId].meses, 'servicos') : Array(12).fill(0)
    const fPool = funPoolEmp[empId]
      ? addArr(
          Array.from({ length: 12 }, (_, i) => funPoolEmp[empId].meses[i+1]?.pecas    || 0),
          Array.from({ length: 12 }, (_, i) => funPoolEmp[empId].meses[i+1]?.servicos || 0)
        )
      : Array(12).fill(0)
    switch (tipo) {
      case 'somente_mecanica':   return addArr(mPec, mSer)
      case 'mecanica_terceiro':  return addArr(addArr(mPec, mSer), tSer)
      case 'somente_funilaria':  return fPool
      case 'funilaria_terceiro': return addArr(fPool, tSer)
      case 'total':
      default:                   return addArr(addArr(addArr(mPec, mSer), tSer), fPool)
    }
  }, [mecTree, terMap, funPoolEmp, aggEmpMec, mapArr, addArr])

  const calcDistribuidoPctEmp = useCallback((empId, tipo = 'total', excludeColabId = null) => {
    const pool = calcPoolEmpByTipo(empId, tipo)
    const pct  = Array(12).fill(0)
    dadosConsultor
      .filter(r =>
        r.empresa_id === empId &&
        r.colaborador_id !== excludeColabId &&
        (r.tipo_pool || 'total') === tipo
      )
      .forEach(r => {
        const i = r.mes - 1
        const p = pool[i]
        pct[i] += p > 0
          ? (Number(r.meta_faturamento) || 0) / p * 100
          : (Number(r.percentual) || 0)
      })
    return pct
  }, [dadosConsultor, calcPoolEmpByTipo])

  const buildMeses = useCallback((empId, tipo = 'total') => {
    const pool       = calcPoolEmpByTipo(empId, tipo)
    const distribPct = calcDistribuidoPctEmp(empId, tipo)
    return Array.from({ length: 12 }, (_, i) => {
      const disponPct = Math.max(0, 100 - distribPct[i])
      return {
        mes:              i + 1,
        pool:             pool[i],
        distribuidoPct:   Math.min(100, distribPct[i]),
        disponivelPct:    disponPct,
        percentual:       disponPct,
        meta_faturamento: pool[i] * disponPct / 100,
      }
    })
  }, [calcPoolEmpByTipo, calcDistribuidoPctEmp])

  const abrirModalConsultor = useCallback((empId = '', tipo = 'total') => {
    setFormConsultor({ empresa_id: empId, colaborador_id: '', tipo_pool: tipo })
    setMesesConsultor(empId ? buildMeses(empId, tipo) : Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1, pool: 0, distribuidoPct: 0, disponivelPct: 100, percentual: 100, meta_faturamento: 0,
    })))
    setErroConsultor(null)
    setViewModeConsultor(false)
    setModalConsultor(true)
  }, [buildMeses])

  const buildMesesEdit = useCallback((empId, tipo, colaboradorId) => {
    const pool       = calcPoolEmpByTipo(empId, tipo)
    const distribPct = calcDistribuidoPctEmp(empId, tipo, colaboradorId)
    return Array.from({ length: 12 }, (_, i) => {
      const reg       = dadosConsultor.find(r => r.empresa_id === empId && r.colaborador_id === colaboradorId && (r.tipo_pool || 'total') === tipo && r.mes === i + 1)
      const pct       = reg ? (Number(reg.percentual) || 0) : 0
      const disponPct = Math.max(0, 100 - distribPct[i])
      return {
        mes:              i + 1,
        pool:             pool[i],
        distribuidoPct:   Math.min(100, distribPct[i]),
        disponivelPct:    disponPct,
        percentual:       pct,
        meta_faturamento: pool[i] * pct / 100,
      }
    })
  }, [calcPoolEmpByTipo, calcDistribuidoPctEmp, dadosConsultor])

  const visualizarConsultor = useCallback((empId, colaboradorId, tipoPool) => {
    setFormConsultor({ empresa_id: empId, colaborador_id: colaboradorId, tipo_pool: tipoPool })
    setMesesConsultor(buildMesesEdit(empId, tipoPool, colaboradorId))
    setErroConsultor(null)
    setViewModeConsultor(true)
    setModalConsultor(true)
  }, [buildMesesEdit])

  const editarConsultor = useCallback((empId, colaboradorId, tipoPool) => {
    setFormConsultor({ empresa_id: empId, colaborador_id: colaboradorId, tipo_pool: tipoPool })
    setMesesConsultor(buildMesesEdit(empId, tipoPool, colaboradorId))
    setErroConsultor(null)
    setViewModeConsultor(false)
    setModalConsultor(true)
  }, [buildMesesEdit])

  const executarDeletar = async () => {
    if (!deleteConfirmData) return
    setDeletandoConsultor(true)
    try {
      await apiService.deleteMetasConsultorColab(deleteConfirmData.colaboradorId, deleteConfirmData.empId, filtroAno)
      await loadConsultor()
      setDeleteConfirmData(null)
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally { setDeletandoConsultor(false) }
  }

  const onChangeEmpresaConsultor = useCallback((empId, tipo) => {
    setFormConsultor(prev => ({ ...prev, empresa_id: empId, colaborador_id: '' }))
    setMesesConsultor(empId ? buildMeses(empId, tipo) : Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1, pool: 0, distribuidoPct: 0, disponivelPct: 100, percentual: 100, meta_faturamento: 0,
    })))
  }, [buildMeses])

  const onChangeTipoPool = useCallback((tipo) => {
    setFormConsultor(prev => ({ ...prev, tipo_pool: tipo, colaborador_id: '' }))
    const empId = formConsultor.empresa_id
    setMesesConsultor(empId ? buildMeses(empId, tipo) : Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1, pool: 0, distribuidoPct: 0, disponivelPct: 100, percentual: 100, meta_faturamento: 0,
    })))
  }, [formConsultor.empresa_id, buildMeses])

  const aplicarFill = () => {
    const val = parseFloat(String(fillPct).replace(',', '.')) || 0
    setMesesConsultor(prev => prev.map((x, i) =>
      fillMesesSel.has(i) ? { ...x, percentual: val, meta_faturamento: x.pool * val / 100 } : x
    ))
    setFillPopup(false)
    setFillPct('')
    setFillMesesSel(new Set())
  }

  const handleSalvarConsultor = async () => {
    if (!formConsultor.empresa_id)     { setErroConsultor('Selecione a empresa.'); return }
    if (!formConsultor.colaborador_id) { setErroConsultor('Selecione o consultor.'); return }
    const totalPct = mesesConsultor.reduce((s, m) => s + (Number(m.percentual) || 0), 0)
    if (totalPct <= 0) { setErroConsultor('Informe ao menos um percentual maior que zero.'); return }
    setSalvandoConsultor(true); setErroConsultor(null)
    try {
      const func = funcionarios.find(f => f.id === formConsultor.colaborador_id)
      const emp  = empresas.find(e => e.id === formConsultor.empresa_id)
      for (const m of mesesConsultor) {
        const pct  = Number(m.percentual) || 0
        const meta = m.pool * pct / 100
        await apiService.upsertMetaConsultor({
          empresa_id:         formConsultor.empresa_id,
          empresa_nome:       emp?.nome || '',
          departamento_id:    func?.departamento_ids?.[0] || null,
          departamento_nome:  null,
          setor_id:           func?.setor_ids?.[0] || null,
          setor_nome:         null,
          box_id:             func?.box_id || null,
          box_nome:           null,
          cargo_id:           func?.cargo_id || null,
          cargo_nome:         null,
          colaborador_id:     formConsultor.colaborador_id,
          colaborador_nome:   func?.nome_funcionario || '',
          ano:                filtroAno,
          mes:                m.mes,
          percentual:         pct,
          meta_faturamento:   meta,
          tipo_pool:          formConsultor.tipo_pool || 'total',
          dias_uteis_reais:   0,
          media_diaria_venda: 0,
          status:             'AGUARDANDO APROVACAO',
        })
      }
      await loadConsultor()
      setFillPct(''); setFillMesesSel(new Set()); setFillPopup(false)
      setViewModeConsultor(false)
      setModalConsultor(false)
    } catch (err) {
      setErroConsultor('Erro ao salvar: ' + (err.message || String(err)))
    } finally { setSalvandoConsultor(false) }
  }

  const cellStateC = (meta_faturamento, meta_aprovada) => {
    const cur = Number(meta_faturamento) || 0
    if (cur === 0) return 'ok'
    if (meta_aprovada === null || meta_aprovada === undefined) return 'new'
    if (Math.abs(cur - Number(meta_aprovada)) > 0.001) return 'changed'
    return 'ok'
  }

  const TH    = 'px-1 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 w-20 text-[10px]'
  const THFIX = 'px-4 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 sticky left-0 bg-slate-50 z-10 text-[10px] min-w-[220px]'

  return (
    <div className="flex flex-col h-full p-6 gap-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Total Oficina</h1>
            <p className="text-xs text-slate-400">Consolidado de Mecânico · Funilaria e Pintura · Terceiros</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Botões de visualização */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs font-semibold">
            {[
              { key: 'total',    label: 'Total' },
              { key: 'pecas',    label: 'Peças' },
              { key: 'servicos', label: 'Serviços' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFiltroVisu(key)}
                className={`px-3 py-2 transition-colors ${
                  filtroVisu === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => abrirModalConsultor()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Adicionar Consultor
          </button>
          <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
            <ClipboardCheck size={16} /> Gestão de Aprovação
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400"><Loader2 size={20} className="animate-spin" /> Carregando...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth: '1400px' }}>
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr>
                <th className={THFIX}>
                  <div className="flex items-center gap-2">
                    <span>Hierarquia</span>
                    {empresas.length > 0 && (
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
                {MESES.map(m => <th key={m} className={TH}>{m}</th>)}
                <th className="px-2 py-2 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50 text-[10px]">Total Ano</th>
                <th className="px-2 py-2 text-center font-semibold text-slate-600 uppercase border-b border-slate-200 w-52 text-[10px]">Situação</th>
                <th className="px-2 py-2 border-b border-slate-200 w-24 bg-indigo-50"></th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 && (
                <tr><td colSpan={16} className="px-4 py-12 text-center text-slate-400">Nenhum dado para o ano selecionado.</td></tr>
              )}

              {empresas.map(emp => {
                const eOpen  = expandedEmps.has(emp.id)
                const allEmp = allTree[emp.id]

                const empPec = allEmp ? aggEmp(allEmp, 'pecas')    : Array(12).fill(0)
                const empSer = allEmp ? aggEmp(allEmp, 'servicos') : Array(12).fill(0)

                return (
                  <React.Fragment key={emp.id}>

                    {/* ── EMPRESA ── */}
                    <tr className="cursor-pointer bg-indigo-700 text-white hover:bg-indigo-600 transition-colors"
                        onClick={() => toggle(setExpandedEmps, emp.id)}>
                      <td className="px-4 py-2.5 font-bold sticky left-0 bg-indigo-700 z-10 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {eOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          <Building2 size={14} className="text-indigo-300 shrink-0"/>
                          {emp.nome}
                        </div>
                      </td>
                      {pick(empPec, empSer).map((v,i) => <td key={i} className="px-1 py-2.5 text-right font-bold whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                      <td className="px-2 py-2.5 text-right font-bold bg-indigo-800 whitespace-nowrap">{sumArr(pick(empPec,empSer))>0?fmtBRL(sumArr(pick(empPec,empSer))):'—'}</td>
                      <td className="bg-indigo-800" colSpan="2"/>
                    </tr>

                    {eOpen && <>

                      {/* ── DEPARTAMENTOS (empresa → dept → setor) ── */}
                      {allEmp && Object.entries(allEmp.depts).map(([deptId, dept]) => {
                        const dKey  = `${emp.id}§${deptId}`
                        const dOpen = expandedSecs.has(dKey)
                        const dPec  = aggDept(dept, 'pecas')
                        const dSer  = aggDept(dept, 'servicos')
                        return (
                          <React.Fragment key={deptId}>
                            {/* Departamento */}
                            <tr className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
                                onClick={() => toggle(setExpandedSecs, dKey)}>
                              <td className="px-4 py-1.5 font-bold text-slate-700 sticky left-0 bg-slate-100 z-10 border-b border-slate-200 whitespace-nowrap">
                                <div className="flex items-center gap-2 pl-8">
                                  {dOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                  <Layers size={12} className="text-slate-400 shrink-0"/>
                                  {dept.nome}
                                </div>
                              </td>
                              {pick(dPec, dSer).map((v,i) => <td key={i} className="px-1 py-1.5 text-right text-slate-600 font-semibold border-b border-slate-200 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                              <td className="px-2 py-1.5 text-right font-bold text-indigo-700 bg-indigo-50 border-b border-slate-200 whitespace-nowrap">{sumArr(pick(dPec,dSer))>0?fmtBRL(sumArr(pick(dPec,dSer))):'—'}</td>
                              <td className="border-b border-slate-200"/>
                              <td className="border-b border-slate-200"/>
                            </tr>

                            {/* Setores (folha) */}
                            {dOpen && Object.entries(dept.setores).map(([sId, setor]) => {
                              const sPec = aggSetor(setor, 'pecas')
                              const sSer = aggSetor(setor, 'servicos')
                              return (
                                <tr key={sId} className="border-b border-slate-100 bg-white hover:bg-slate-50/60">
                                  <td className="px-4 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                                    <div className="flex items-center gap-2 pl-12">
                                      <FolderTree size={11} className="text-slate-400 shrink-0"/>
                                      <span className="font-semibold text-slate-700">{setor.nome}</span>
                                    </div>
                                  </td>
                                  {pick(sPec, sSer).map((v,i) => <td key={i} className="px-1 py-1.5 text-right text-slate-500 border-b border-slate-100 whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                  <td className="px-2 py-1.5 text-right font-semibold text-indigo-600 bg-indigo-50/60 border-b border-slate-100 whitespace-nowrap">{sumArr(pick(sPec,sSer))>0?fmtBRL(sumArr(pick(sPec,sSer))):'—'}</td>
                                  <td className="border-b border-slate-100"/>
                                  <td className="border-b border-slate-100"/>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}

                      {/* ── CONSULTORES DE SERVIÇO ── */}
                      {(() => {
                        const empConsMap = consultoresPorEmpresa[emp.id]
                        if (!empConsMap || Object.keys(empConsMap).length === 0) return null

                        const aggColabsMeses = (colabs) => { const a=Array(12).fill(0); Object.values(colabs).forEach(c=>Array.from({length:12},(_,i)=>{a[i]+=(c.meses[i+1]?.meta_faturamento||0)})); return a }
                        const aggCargoMeses  = (cargo)  => aggColabsMeses(cargo.colabs)
                        const aggSetorCMeses = (setor)  => { const a=Array(12).fill(0); Object.values(setor.cargos).forEach(c=>aggCargoMeses(c).forEach((v,i)=>{a[i]+=v})); return a }
                        const aggDeptCMeses  = (dept)   => { const a=Array(12).fill(0); Object.values(dept.setores).forEach(s=>aggSetorCMeses(s).forEach((v,i)=>{a[i]+=v})); return a }
                        const totalConsMeses = Object.values(empConsMap).reduce((acc, dept) => { aggDeptCMeses(dept).forEach((v,i)=>{acc[i]+=v}); return acc }, Array(12).fill(0))

                        return (
                          <>
                            {/* Cabeçalho da seção — somatório de todos os consultores */}
                            <tr>
                              <td className="py-1.5 px-4 bg-teal-700 sticky left-0 z-10 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <UserCircle size={11} className="text-teal-300 shrink-0"/>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">Consultores de Serviço</span>
                                </div>
                              </td>
                              {totalConsMeses.map((v,i) => (
                                <td key={i} className="px-1 py-1.5 text-right text-white font-bold text-xs whitespace-nowrap bg-teal-700">
                                  {v > 0 ? fmtBRL(v) : '—'}
                                </td>
                              ))}
                              <td className="px-2 py-1.5 text-right font-bold text-white bg-teal-800 text-xs whitespace-nowrap">
                                {sumArr(totalConsMeses) > 0 ? fmtBRL(sumArr(totalConsMeses)) : '—'}
                              </td>
                              <td className="bg-teal-700"/>
                              <td className="bg-teal-700"/>
                            </tr>

                            {Object.entries(empConsMap).map(([deptId, dept]) => {
                              const dKey   = `${emp.id}§c§${deptId}`
                              const dOpen  = !collapsedConsDepts.has(dKey)
                              const dMeses = aggDeptCMeses(dept)
                              return (
                                <React.Fragment key={deptId}>
                                  {/* Departamento */}
                                  <tr className="bg-teal-50 border-b border-teal-200 cursor-pointer hover:bg-teal-100/60 transition-colors"
                                      onClick={() => toggle(setCollapsedConsDepts, dKey)}>
                                    <td className="px-4 py-1 sticky left-0 bg-teal-50 z-10 whitespace-nowrap">
                                      <div className="flex items-center gap-2 pl-6">
                                        {dOpen ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                                        <Layers size={11} className="text-teal-500 shrink-0"/>
                                        <span className="font-bold text-teal-800 text-xs">{dept.nome}</span>
                                      </div>
                                    </td>
                                    {dMeses.map((v,i) => <td key={i} className="px-1 py-1 text-right text-teal-700 text-xs font-semibold whitespace-nowrap bg-teal-50">{v>0?fmtBRL(v):'—'}</td>)}
                                    <td className="px-2 py-1 text-right font-bold text-teal-800 bg-teal-100 text-xs whitespace-nowrap">{sumArr(dMeses)>0?fmtBRL(sumArr(dMeses)):'—'}</td>
                                    <td className="bg-teal-50"/>
                                    <td className="bg-teal-50"/>
                                  </tr>

                                  {dOpen && Object.entries(dept.setores).map(([setId, setor]) => {
                                    const sKey   = `${emp.id}§c§${deptId}§${setId}`
                                    const sOpen  = !collapsedConsSets.has(sKey)
                                    const sMeses = aggSetorCMeses(setor)
                                    return (
                                      <React.Fragment key={setId}>
                                        {/* Setor */}
                                        <tr className="bg-white border-b border-teal-100 cursor-pointer hover:bg-teal-50/40 transition-colors"
                                            onClick={() => toggle(setCollapsedConsSets, sKey)}>
                                          <td className="px-4 py-1 sticky left-0 bg-white z-10 whitespace-nowrap">
                                            <div className="flex items-center gap-2 pl-10">
                                              {sOpen ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                              <FolderTree size={10} className="text-teal-400 shrink-0"/>
                                              <span className="font-semibold text-teal-700 text-xs">{setor.nome}</span>
                                            </div>
                                          </td>
                                          {sMeses.map((v,i) => <td key={i} className="px-1 py-1 text-right text-teal-600 text-xs whitespace-nowrap">{v>0?fmtBRL(v):'—'}</td>)}
                                          <td className="px-2 py-1 text-right font-semibold text-teal-700 bg-teal-50 text-xs whitespace-nowrap">{sumArr(sMeses)>0?fmtBRL(sumArr(sMeses)):'—'}</td>
                                          <td className="bg-white"/>
                                          <td className="bg-white"/>
                                        </tr>

                                        {sOpen && Object.entries(setor.cargos).map(([carId, cargo]) => {
                                          const cKey   = `${emp.id}§c§${deptId}§${setId}§${carId}`
                                          const cOpen  = !collapsedConsCargs.has(cKey)
                                          const cMeses = aggCargoMeses(cargo)
                                          return (
                                            <React.Fragment key={carId}>
                                              {/* Cargo */}
                                              <tr className="bg-slate-50/60 border-b border-teal-50 cursor-pointer hover:bg-teal-50/30 transition-colors"
                                                  onClick={() => toggle(setCollapsedConsCargs, cKey)}>
                                                <td className="px-4 py-1 sticky left-0 bg-slate-50/60 z-10 whitespace-nowrap">
                                                  <div className="flex items-center gap-2 pl-14">
                                                    {cOpen ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                                    <span className="text-[9px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded uppercase tracking-wide">{cargo.nome}</span>
                                                  </div>
                                                </td>
                                                {cMeses.map((v,i) => <td key={i} className="px-1 py-1 text-right text-teal-500 text-xs whitespace-nowrap bg-slate-50/60">{v>0?fmtBRL(v):'—'}</td>)}
                                                <td className="px-2 py-1 text-right font-semibold text-teal-600 bg-teal-50 text-xs whitespace-nowrap">{sumArr(cMeses)>0?fmtBRL(sumArr(cMeses)):'—'}</td>
                                                <td className="bg-slate-50/60"/>
                                                <td className="bg-slate-50/60"/>
                                              </tr>

                                              {/* Consultores (folha) */}
                                              {cOpen && Object.entries(cargo.colabs).map(([key, consultor]) => {
                                                const mValues  = Array.from({length:12},(_,i) => consultor.meses[i+1]?.meta_faturamento||0)
                                                const tipoSigla = TIPOS_POOL.find(t=>t.key===consultor.tipo_pool)?.sigla||'TOT'
                                                return (
                                                  <tr key={key} className="border-b border-teal-50 bg-white hover:bg-teal-50/50">
                                                    <td className="px-4 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                                                      <div className="flex items-center gap-2 pl-[4.5rem] cursor-pointer select-none"
                                                        onClick={() => visualizarConsultor(emp.id, consultor.colaborador_id, consultor.tipo_pool)}>
                                                        <UserCircle size={11} className="text-teal-500 shrink-0"/>
                                                        <span className="font-semibold text-teal-600 hover:text-teal-800 hover:underline text-xs">{consultor.colaborador_nome}</span>
                                                        <span className="text-[9px] font-bold text-teal-700 bg-teal-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">{tipoSigla}</span>
                                                      </div>
                                                    </td>
                                                    {mValues.map((v,i) => (
                                                      <td key={i} className="px-1 py-1.5 text-right text-teal-700 font-mono whitespace-nowrap text-xs">{v>0?fmtBRL(v):'—'}</td>
                                                    ))}
                                                    <td className="px-2 py-1.5 text-right font-bold text-teal-800 bg-teal-100 whitespace-nowrap text-xs">{sumArr(mValues)>0?fmtBRL(sumArr(mValues)):'—'}</td>
                                                    <td className="px-2 py-1.5 text-center bg-white whitespace-nowrap" colSpan="2">
                                                      {(() => {
                                                        const meses = Object.values(consultor.meses)
                                                        const comValor = meses.filter(m => m.meta_faturamento > 0)
                                                        if (comValor.length === 0) return null
                                                        const aprovado = comValor.every(m => cellStateC(m.meta_faturamento, m.meta_aprovada) === 'ok')
                                                        return (
                                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${aprovado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {aprovado ? 'Aprovado' : 'Aguard. Aprovação'}
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
                          </>
                        )
                      })()}

                    </>}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* ── MODAL ADICIONAR CONSULTOR ── */}
      {modalConsultor && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '95vw', maxWidth: '1100px', maxHeight: '90vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {viewModeConsultor ? 'Visualizar Distribuição' : formConsultor.colaborador_id ? 'Editar Distribuição' : 'Adicionar Consultor'} — Consultores de Serviços
              </h2>
              <button onClick={() => { setModalConsultor(false); setViewModeConsultor(false) }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* Form */}
            <div className="px-6 pt-4 pb-2 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Empresa *</label>
                <select
                  value={formConsultor.empresa_id}
                  onChange={e => onChangeEmpresaConsultor(e.target.value, formConsultor.tipo_pool)}
                  disabled={viewModeConsultor}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Selecione...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Distribuição *</label>
                <select
                  value={formConsultor.tipo_pool}
                  onChange={e => onChangeTipoPool(e.target.value)}
                  disabled={viewModeConsultor}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {TIPOS_POOL.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Consultor *</label>
                <select
                  value={formConsultor.colaborador_id}
                  onChange={e => setFormConsultor(prev => ({ ...prev, colaborador_id: e.target.value }))}
                  disabled={viewModeConsultor || !formConsultor.empresa_id}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Selecione...</option>
                  {funcionarios
                    .filter(f => {
                      if (f.data_demissao) return false
                      if (f.empresa_id !== formConsultor.empresa_id) return false
                      const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                      const cargoNome = f.cargo_nome || cargos.find(c => c.id === f.cargo_id)?.nome_cargo || ''
                      if (!norm(cargoNome).includes('consultor')) return false
                      const boxNome = f.box_nome || boxes.find(b => b.id === f.box_id)?.nome_box || ''
                      return norm(boxNome).includes('recep')
                    })
                    .map(f => <option key={f.id} value={f.id}>{f.nome_funcionario}</option>)
                  }
                </select>
              </div>
            </div>

            {/* Grade distribuição */}
            {formConsultor.empresa_id && (() => {
              const tipoLabel         = TIPOS_POOL.find(t => t.key === formConsultor.tipo_pool)?.label || 'Total'
              const totalPctConsultor = mesesConsultor.reduce((s, m) => s + (Number(m.percentual) || 0), 0)
              const mediaPctConsultor = totalPctConsultor / 12
              const mediaDisponivel   = mesesConsultor.reduce((s, m) => s + m.disponivelPct, 0) / 12
              const sobraPct          = mediaDisponivel - mediaPctConsultor
              const sobraOk           = sobraPct >= -0.05

              // % global do pool ainda não distribuído para nenhum consultor (todos inclusos, sem exclusão)
              const distribTotalPct    = calcDistribuidoPctEmp(formConsultor.empresa_id, formConsultor.tipo_pool)
              const pctFaltaDistribuir = distribTotalPct.reduce((s, v) => s + Math.max(0, 100 - v), 0) / 12

              return (
                <div className="flex flex-col flex-1 min-h-0 px-6 pb-2 gap-2">
                  {/* Barra de progresso do pool */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">Pool: <span className="text-indigo-700">{tipoLabel}</span></span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${Math.min(100, mesesConsultor.reduce((s, m) => s + m.distribuidoPct, 0) / 12)}%` }}
                        title="Já distribuído (outros consultores)"
                      />
                      <div
                        className="h-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.min(100, mediaPctConsultor)}%` }}
                        title="Este consultor"
                      />
                    </div>
                    <span className={`text-[10px] font-bold whitespace-nowrap ${!sobraOk ? 'text-red-600' : pctFaltaDistribuir > 0.05 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {!sobraOk
                        ? `${Math.abs(sobraPct).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% excede o pool!`
                        : pctFaltaDistribuir > 0.05
                          ? `${pctFaltaDistribuir.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% a distribuir`
                          : '100% distribuído'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"/>outros
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mx-1"/>este consultor
                    </span>
                  </div>

                  <div className="overflow-auto flex-1">
                    <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth: '900px' }}>
                      <thead className="sticky top-0 z-10 bg-white">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-200 w-40 sticky left-0 bg-white z-10"></th>
                          {MESES.map(m => <th key={m} className="px-1 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-200 w-16">{m}</th>)}
                          <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-indigo-700 uppercase border-b border-slate-200 w-24 bg-indigo-50">Total Ano</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Pool do tipo selecionado */}
                        <tr>
                          <td className="px-2 py-1.5 text-xs font-semibold text-slate-500 sticky left-0 bg-white whitespace-nowrap">{tipoLabel} (R$)</td>
                          {mesesConsultor.map((m, i) => (
                            <td key={i} className="bg-indigo-50 border border-indigo-100 rounded p-1 text-right text-xs font-mono text-indigo-700">
                              {m.pool > 0 ? fmtBRL(m.pool) : '—'}
                            </td>
                          ))}
                          <td className="bg-indigo-100 border border-indigo-200 rounded p-1 text-right text-xs font-bold text-indigo-800">
                            {fmtBRL(mesesConsultor.reduce((s, m) => s + m.pool, 0))}
                          </td>
                        </tr>
                        {/* Já distribuído % */}
                        <tr>
                          <td className="px-2 py-1.5 text-xs font-semibold text-amber-600 sticky left-0 bg-white whitespace-nowrap">Já Distribuído (%)</td>
                          {mesesConsultor.map((m, i) => (
                            <td key={i} className="bg-amber-50 border border-amber-100 rounded p-1 text-center text-xs text-amber-700">
                              {m.distribuidoPct > 0 ? m.distribuidoPct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—'}
                            </td>
                          ))}
                          <td className="bg-amber-100 border border-amber-200 rounded p-1 text-center text-xs font-bold text-amber-800">
                            {(mesesConsultor.reduce((s, m) => s + m.distribuidoPct, 0) / 12).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '% méd.'}
                          </td>
                        </tr>
                        {/* Disponível % */}
                        <tr>
                          <td className="px-2 py-1.5 text-xs font-semibold text-emerald-600 sticky left-0 bg-white whitespace-nowrap">Disponível (%)</td>
                          {mesesConsultor.map((m, i) => (
                            <td key={i} className={`border rounded p-1 text-center text-xs ${m.disponivelPct > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                              {m.disponivelPct > 0 ? m.disponivelPct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—'}
                            </td>
                          ))}
                          <td className="bg-emerald-100 border border-emerald-200 rounded p-1 text-center text-xs font-bold text-emerald-800">
                            {(mesesConsultor.reduce((s, m) => s + m.disponivelPct, 0) / 12).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '% méd.'}
                          </td>
                        </tr>
                        {/* % Consultor — EDITÁVEL */}
                        <tr>
                          <td className="px-2 py-1.5 sticky left-0 bg-white">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-xs font-bold text-slate-700">% Consultor</span>
                              {!viewModeConsultor && (
                                <button
                                  type="button"
                                  onClick={() => { setFillPct(''); setFillMesesSel(new Set()); setFillPopup(true) }}
                                  className="p-0.5 rounded text-indigo-500 hover:bg-indigo-100 transition-colors"
                                  title="Preencher % por mês"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          {mesesConsultor.map((m, i) => (
                            <td key={i} className="bg-white border-2 border-indigo-300 rounded p-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={!m.percentual ? '' : String(Math.round(Number(m.percentual)))}
                                onChange={e => {
                                  const raw = e.target.value.replace(/\D/g, '')
                                  const val = raw === '' ? 0 : parseInt(raw, 10)
                                  setMesesConsultor(prev => prev.map((x, xi) => xi === i
                                    ? { ...x, percentual: val, meta_faturamento: x.pool * val / 100 }
                                    : x))
                                }}
                                disabled={viewModeConsultor}
                                className="w-full text-xs text-center outline-none font-bold text-indigo-800 disabled:opacity-70 disabled:cursor-default"
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td className="bg-indigo-50 border-2 border-indigo-200 rounded p-1 text-center text-xs font-bold text-indigo-800">
                            {mediaPctConsultor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '% méd.'}
                          </td>
                        </tr>
                        {/* Meta Consultor (R$) — calculada */}
                        <tr>
                          <td className="px-2 py-1.5 text-xs font-semibold text-slate-500 sticky left-0 bg-white whitespace-nowrap">Meta Consultor (R$)</td>
                          {mesesConsultor.map((m, i) => {
                            const val = m.pool * (Number(m.percentual) || 0) / 100
                            return (
                              <td key={i} className="bg-slate-50 border border-slate-200 rounded p-1 text-right text-xs font-mono text-slate-700">
                                {val > 0 ? fmtBRL(val) : '—'}
                              </td>
                            )
                          })}
                          <td className="bg-slate-100 border border-slate-200 rounded p-1 text-right text-xs font-bold text-slate-800">
                            {fmtBRL(mesesConsultor.reduce((s, m) => s + m.pool * (Number(m.percentual) || 0) / 100, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {erroConsultor && (
              <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
                <AlertTriangle size={13}/> {erroConsultor}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-200">
              {viewModeConsultor ? (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => setViewModeConsultor(false)} className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                      <Edit2 size={14}/> Editar
                    </button>
                    <button
                      onClick={() => {
                        setModalConsultor(false)
                        setViewModeConsultor(false)
                        setDeleteConfirmData({ empId: formConsultor.empresa_id, colaboradorId: formConsultor.colaborador_id, tipoPool: formConsultor.tipo_pool, nome: funcionarios.find(f => f.id === formConsultor.colaborador_id)?.nome_funcionario || '' })
                      }}
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                      <Trash2 size={14}/> Excluir
                    </button>
                  </div>
                  <button onClick={() => { setModalConsultor(false); setViewModeConsultor(false) }} className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Fechar
                  </button>
                </>
              ) : (
                <div className="flex gap-3 ml-auto">
                  <button onClick={() => setModalConsultor(false)} className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors" disabled={salvandoConsultor}>
                    Cancelar
                  </button>
                  <button onClick={handleSalvarConsultor} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50" disabled={salvandoConsultor}>
                    {salvandoConsultor ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : 'Salvar Distribuição'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP CONFIRMAÇÃO EXCLUSÃO ── */}
      {deleteConfirmData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-96">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500"/>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Excluir Distribuição</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Confirma a exclusão da distribuição de <strong>{deleteConfirmData.nome}</strong> ({filtroAno})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmData(null)}
                disabled={deletandoConsultor}
                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={executarDeletar}
                disabled={deletandoConsultor}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {deletandoConsultor ? <><Loader2 size={14} className="animate-spin"/> Excluindo...</> : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP PREENCHER % CONSULTOR ── */}
      {fillPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-80">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Preencher % Consultor</h3>

            {/* % input */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">% a aplicar</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,0"
                value={fillPct}
                onChange={e => setFillPct(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fillMesesSel.size > 0 && fillPct && aplicarFill()}
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center font-bold text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Seleção de meses */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">Meses</label>
                <button
                  type="button"
                  onClick={() => setFillMesesSel(
                    fillMesesSel.size === 12 ? new Set() : new Set([0,1,2,3,4,5,6,7,8,9,10,11])
                  )}
                  className="text-[11px] text-indigo-600 hover:underline font-medium"
                >
                  {fillMesesSel.size === 12 ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-y-2 gap-x-1">
                {MESES.map((m, i) => (
                  <label key={i} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fillMesesSel.has(i)}
                      onChange={e => setFillMesesSel(prev => {
                        const next = new Set(prev)
                        e.target.checked ? next.add(i) : next.delete(i)
                        return next
                      })}
                      className="w-3.5 h-3.5 accent-indigo-600 rounded"
                    />
                    <span className="text-xs text-slate-700">{m}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setFillPopup(false); setFillPct(''); setFillMesesSel(new Set()) }}
                className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aplicarFill}
                disabled={fillMesesSel.size === 0 || !fillPct}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
