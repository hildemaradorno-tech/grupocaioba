import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronDown, GanttChartSquare, RefreshCw,
  ExternalLink, CalendarDays, X,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { supabase } from '../../services/supabaseClient'

// ─── Layout constants ─────────────────────────────────────────────────────────
const ROW_H    = 44
const LEFT_W   = 580
const DAY_W    = 28    // largura de cada dia quando a semana está EXPANDIDA
const WEEK_W   = 60    // largura de cada semana quando RECOLHIDA
const COL_GRID = '1fr 78px 78px 82px 96px'
const MONTH_H  = 26
const WEEK_H   = 28
const DAY_H    = 24
const HEADER_H = MONTH_H + WEEK_H + DAY_H   // 78 px

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const PALETTE = [
  '#3b82f6','#10b981','#8b5cf6','#f59e0b',
  '#ef4444','#06b6d4','#ec4899','#84cc16','#6366f1','#14b8a6',
]

const STATUS_STYLE = {
  // status de projeto
  planejado:    { bg:'#eff6ff', text:'#1d4ed8', label:'Planejado'    },
  cancelado:    { bg:'#fef2f2', text:'#991b1b', label:'Cancelado'    },
  // status kanban de tarefa (também usados como status de projeto)
  mapeado:      { bg:'#f8fafc', text:'#475569', label:'Mapeado'      },
  programado:   { bg:'#eff6ff', text:'#1d4ed8', label:'Programado'   },
  em_andamento: { bg:'#fefce8', text:'#92400e', label:'Em Andamento' },
  pausado:      { bg:'#faf5ff', text:'#6b21a8', label:'Pausado'      },
  concluido:    { bg:'#f0fdf4', text:'#14532d', label:'Concluído'    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseDate   = (s) => s ? new Date(s + 'T12:00:00') : null
const diffDays    = (a, b) => a && b ? Math.round((b - a) / 86_400_000) : 0
const addDays     = (d, n) => new Date(d.getTime() + n * 86_400_000)
const fmtDate     = (d) => d
  ? d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
  : '—'
const toInputFmt  = (d) => {
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const isMilestone = (a, b) => a && b && a.toDateString() === b.toDateString()
const initials    = (name) => {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase()
}
const hexRgba = (hex, a) => {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}

// ─── ISO week helpers ─────────────────────────────────────────────────────────
const getISOWeek = (d) => {
  const dt  = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7)
}
// Segunda-feira da semana que contém d
const weekMon = (d) => {
  const dt  = new Date(d)
  const dow = dt.getDay() || 7
  dt.setDate(dt.getDate() - (dow - 1))
  dt.setHours(12, 0, 0, 0)
  return dt
}
const weekKey = (d) => {
  const m = weekMon(d)
  return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`
}

// ─── CPM: caminho crítico (maior cadeia de duração total) ─────────────────────
function computeCriticalSet(tarefas, dependencias) {
  if (!tarefas.length) return { critIds: new Set(), critDepIds: new Set() }
  const byId = Object.fromEntries(tarefas.map(t => [t.id, t]))
  const succs  = Object.fromEntries(tarefas.map(t => [t.id, []]))
  const preds  = Object.fromEntries(tarefas.map(t => [t.id, []]))
  const depKey = {}
  dependencias.forEach(d => {
    const p = d.depende_de_tarefa_id, s = d.tarefa_id
    if (succs[p] && preds[s]) { succs[p].push(s); preds[s].push(p); depKey[`${p}→${s}`] = d.id }
  })
  const dur = id => {
    const t = byId[id]
    if (!t?.data_inicio || !t?.data_fim) return 1
    return Math.max(1, Math.round((new Date(t.data_fim + 'T12:00:00') - new Date(t.data_inicio + 'T12:00:00')) / 86400000) + 1)
  }
  const inDeg = Object.fromEntries(tarefas.map(t => [t.id, preds[t.id].length]))
  const queue = tarefas.filter(t => inDeg[t.id] === 0).map(t => t.id)
  const topo = []
  while (queue.length) { const id = queue.shift(); topo.push(id); succs[id].forEach(s => { if (!--inDeg[s]) queue.push(s) }) }
  const ef = {}, bestPred = {}
  topo.forEach(id => {
    let maxEF = 0, best = null
    preds[id].forEach(p => { if ((ef[p] ?? 0) > maxEF) { maxEF = ef[p]; best = p } })
    ef[id] = maxEF + dur(id); bestPred[id] = best
  })
  let maxEF = 0, end = null
  topo.forEach(id => { if (ef[id] > maxEF) { maxEF = ef[id]; end = id } })
  const critIds = new Set(), critDepIds = new Set()
  let cur = end
  while (cur) {
    critIds.add(cur)
    const p = bestPred[cur]
    if (p) { const k = `${p}→${cur}`; if (depKey[k]) critDepIds.add(depKey[k]) }
    cur = p
  }
  return { critIds, critDepIds }
}

// ─── Cache de módulo ──────────────────────────────────────────────────────────
const _gantt = {
  projetos:     null,
  tarefas:      [],
  dependencias: [],
  filtroStatus: 'todos',
  filterStart:  null,
  filterEnd:    null,
  expandedProj: new Set(),
  expandedWeeks:new Set(),
  showCritical: true,
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GanttGeral() {
  const navigate = useNavigate()
  const scrollRef = useRef(null)

  const [projetos,     setProjetos]     = useState(() => _gantt.projetos ?? [])
  const [tarefas,      setTarefas]      = useState(() => _gantt.tarefas)
  const [dependencias, setDependencias] = useState(() => _gantt.dependencias)
  const [loading,      setLoading]      = useState(() => _gantt.projetos === null)
  const [error,        setError]        = useState(null)

  const [filtroStatus, setFiltroStatus] = useState(() => _gantt.filtroStatus)
  const [filterStart,  setFilterStart]  = useState(() => {
    if (_gantt.filterStart) return _gantt.filterStart
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const [filterEnd,    setFilterEnd]    = useState(() => {
    if (_gantt.filterEnd) return _gantt.filterEnd
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth() + 1, 0)
  })

  const [expandedProj,    setExpandedProj]    = useState(() => new Set(_gantt.expandedProj))
  const [expandedTarefas, setExpandedTarefas] = useState(() => new Set())
  const [expandedWeeks,   setExpandedWeeks]   = useState(() => new Set(_gantt.expandedWeeks))
  const [showCritical,    setShowCritical]    = useState(() => _gantt.showCritical)

  // ── Carregar dados ────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const projs   = await apiService.getProjetos({})
      setProjetos(projs)
      _gantt.projetos = projs

      if (!projs.length) {
        setTarefas([]); setDependencias([])
        _gantt.tarefas = []; _gantt.dependencias = []
        return
      }

      const projIds = projs.map(p => p.id)
      const { data: tfs, error: eTfs } = await supabase
        .from('proj_tarefas').select('*')
        .in('projeto_id', projIds)
        .order('projeto_id').order('ordem', { ascending: true })
      if (eTfs) throw eTfs
      setTarefas(tfs || [])
      _gantt.tarefas = tfs || []

      const tfIds = (tfs || []).map(t => t.id)
      if (tfIds.length) {
        const { data: deps, error: eDeps } = await supabase
          .from('proj_tarefas_dependencias').select('*').in('tarefa_id', tfIds)
        if (eDeps) throw eDeps
        setDependencias(deps || [])
        _gantt.dependencias = deps || []
      } else {
        setDependencias([])
        _gantt.dependencias = []
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData(_gantt.projetos !== null) }, [loadData])

  // Sync cache
  useEffect(() => { _gantt.filtroStatus  = filtroStatus  }, [filtroStatus])
  useEffect(() => { _gantt.filterStart   = filterStart   }, [filterStart])
  useEffect(() => { _gantt.filterEnd     = filterEnd     }, [filterEnd])
  useEffect(() => { _gantt.expandedProj  = new Set(expandedProj)  }, [expandedProj])
  useEffect(() => { _gantt.expandedWeeks = new Set(expandedWeeks) }, [expandedWeeks])
  useEffect(() => { _gantt.showCritical  = showCritical  }, [showCritical])

  // Tudo começa recolhido — o usuário abre manualmente

  // ── Montar linhas hierárquicas ────────────────────────────────────────────
  const { rows, colorMap } = useMemo(() => {
    const colorMap = {}
    projetos.forEach((p, i) => { colorMap[p.id] = p.cor || PALETTE[i % PALETTE.length] })

    const rows = []
    projetos.forEach(proj => {
      const color   = colorMap[proj.id]
      const projTfs = tarefas.filter(t => t.projeto_id === proj.id)

      // Filtro por status_kanban da tarefa
      const tfsVisiveis = filtroStatus !== 'todos'
        ? projTfs.filter(t => t.status_kanban === filtroStatus)
        : projTfs

      // Ocultar projeto que não tem nenhuma tarefa com o status filtrado
      if (filtroStatus !== 'todos' && tfsVisiveis.length === 0) return

      const allI = tfsVisiveis.map(t => parseDate(t.data_inicio)).filter(Boolean)
      const allF = tfsVisiveis.map(t => parseDate(t.data_fim)).filter(Boolean)
      const pI   = allI.length ? new Date(Math.min(...allI)) : parseDate(proj.data_inicio)
      const pF   = allF.length ? new Date(Math.max(...allF)) : parseDate(proj.data_fim_prevista)
      const prog = projTfs.length
        ? Math.round(projTfs.reduce((s,t) => s+(t.progresso_pct||0),0)/projTfs.length) : 0

      rows.push({ type:'projeto', id:proj.id, proj, label:proj.nome,
        responsavel:proj.responsavel_nome, dataInicio:pI, dataFim:pF,
        dias:pI&&pF?diffDays(pI,pF)+1:null, progresso:prog, cor:color, status:proj.status, depth:0 })

      if (!expandedProj.has(proj.id)) return

      tfsVisiveis.forEach(t => {
        const di = parseDate(t.data_inicio); const df = parseDate(t.data_fim)
        rows.push({ type:'tarefa', id:t.id, tarefa:t, label:t.nome,
          responsavel:t.responsavel_nome, dataInicio:di, dataFim:df,
          progresso:t.progresso_pct||0,
          cor:t.cor||color, depth:1, milestone:isMilestone(di,df) })
      })
    })
    return { rows, colorMap }
  }, [projetos, tarefas, expandedProj, filtroStatus])

  const { critIds, critDepIds } = useMemo(
    () => showCritical ? computeCriticalSet(tarefas, dependencias) : { critIds: new Set(), critDepIds: new Set() },
    [tarefas, dependencias, showCritical]
  )

  // ── Estrutura do calendário + mapeamento dia→pixel ────────────────────────
  // dayToX[i] = pixel X do início do dia i (relativo à timeline)
  // A largura de cada dia varia: DAY_W se a semana está expandida, WEEK_W/7 se recolhida
  const timelineData = useMemo(() => {
    const today = new Date()

    // Calcular limites
    let min, max
    if (filterStart && filterEnd && filterStart <= filterEnd) {
      min = new Date(filterStart); max = new Date(filterEnd)
    } else {
      const allD = rows.flatMap(r=>[r.dataInicio,r.dataFim]).filter(Boolean)
      if (allD.length) {
        const raw0 = new Date(Math.min(...allD))
        const raw1 = new Date(Math.max(...allD))
        min = new Date(raw0.getFullYear(), raw0.getMonth(), 1)
        min = addDays(min, -10)
        max = addDays(raw1, 20)
        if (filterStart) min = new Date(filterStart)
        if (filterEnd)   max = new Date(filterEnd)
      } else {
        min = new Date(today.getFullYear(), today.getMonth(), 1)
        max = new Date(today.getFullYear(), today.getMonth()+3, 0)
      }
    }
    min.setHours(12,0,0,0); max.setHours(12,0,0,0)
    const total = diffDays(min, max) + 1

    // Semanas (sem posição em pixel ainda)
    const rawWeeks = []
    let wCur = weekMon(min)
    while (wCur <= max) {
      const wEnd = addDays(wCur, 6)
      const d0   = diffDays(min, wCur)
      const d1   = diffDays(min, wEnd)
      const vd0  = Math.max(0, d0)
      const vd1  = Math.min(total-1, d1)
      if (vd0 <= vd1) {
        rawWeeks.push({ key:weekKey(wCur), label:`Sem ${getISOWeek(wCur)}`,
          dayStart:d0, dayEnd:d1, vd0, vd1 })
      }
      wCur = addDays(wCur, 7)
    }

    // Mapa dia→chave da semana
    const dayWK = new Array(total).fill(null)
    rawWeeks.forEach(wk => { for (let d=wk.vd0; d<=wk.vd1; d++) dayWK[d]=wk.key })

    // dayToX: pixel acumulado
    // dia na semana recolhida → WEEK_W/7 por dia
    // dia na semana expandida → DAY_W por dia
    const dayToX = new Array(total+1)
    let x = 0
    for (let i=0; i<=total; i++) {
      dayToX[i] = x
      if (i < total) {
        const wk = dayWK[i]
        x += (wk && expandedWeeks.has(wk)) ? DAY_W : WEEK_W/7
      }
    }
    const timelineW = x

    // Posições em pixel das semanas
    const weeks = rawWeeks.map(wk => ({
      ...wk,
      leftPx:  dayToX[wk.vd0],
      widthPx: dayToX[wk.vd1+1] - dayToX[wk.vd0],
    }))

    // Posições em pixel dos meses
    const months = []
    let cur = new Date(min.getFullYear(), min.getMonth(), 1)
    while (cur <= max) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth()+1, 0)
      const d0   = Math.max(0, diffDays(min, cur))
      const d1   = Math.min(total-1, diffDays(min, mEnd))
      const isCurrentMonth = cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear()
      months.push({
        label:          cur.toLocaleDateString('pt-BR', { month:'long' }),
        leftPx:         dayToX[d0],
        widthPx:        dayToX[d1+1] - dayToX[d0],
        isCurrentMonth,
      })
      cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1)
    }

    const todayOff = diffDays(min, today)
    const todayX   = (todayOff >= 0 && todayOff < total)
      ? (dayToX[todayOff] + dayToX[todayOff+1]) / 2
      : -1

    return { minDate:min, totalDias:total, months, weeks, rawWeeks, todayOff, todayX, dayToX, timelineW }
  }, [rows, filterStart, filterEnd, expandedWeeks])

  const { minDate, totalDias, months, weeks, todayOff, todayX, dayToX, timelineW } = timelineData

  // Auto-scroll para o mês atual na primeira abertura (depois de todayX estar disponível)
  useEffect(() => {
    if (!scrollRef.current || todayX < 0) return
    const container = scrollRef.current
    const scrollTo = Math.max(0, todayX - container.clientWidth * 0.25)
    container.scrollLeft = scrollTo
  }, [todayX])

  // ── Posição de barra na timeline ──────────────────────────────────────────
  const getBar = (row) => {
    if (!row.dataInicio || !row.dataFim) return null
    const s = diffDays(minDate, row.dataInicio)
    const e = diffDays(minDate, row.dataFim)
    if (s >= totalDias || e < 0) return null
    const left  = dayToX[Math.max(0, s)]
    const right = dayToX[Math.min(totalDias, e+1)]
    if (right <= left) return null
    return { left, width: right-left }
  }

  // ── Setas de dependência ──────────────────────────────────────────────────
  // Posição Y acumulada de cada linha (levando em conta tarefas expandidas que são mais altas)
  const rowYStart = useMemo(() => {
    const ys = new Array(rows.length)
    let y = 0
    rows.forEach((r, i) => {
      ys[i] = y
      y += (r.type==='tarefa' && expandedTarefas.has(r.id)) ? ROW_H + 34 : ROW_H
    })
    return ys
  }, [rows, expandedTarefas])

  const depPaths = useMemo(() => {
    const byId = {}
    rows.forEach((r,i) => { if (r.type==='tarefa') byId[r.id]=i })
    return dependencias.map(d => {
      const sI=byId[d.tarefa_id]; const pI=byId[d.depende_de_tarefa_id]
      if (sI==null||pI==null) return null
      const pred=rows[pI]; const succ=rows[sI]
      if (!pred.dataFim||!succ.dataInicio) return null
      const ep=diffDays(minDate,pred.dataFim)
      const ss=diffDays(minDate,succ.dataInicio)
      const x1 = dayToX[Math.min(totalDias, ep+1)]
      const y1 = rowYStart[pI] + ROW_H/2
      const x2 = dayToX[Math.max(0, ss)]
      const y2 = rowYStart[sI] + ROW_H/2
      const mx = (x1+x2)/2
      return { id:d.id, isCritical: critDepIds.has(d.id), d:`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` }
    }).filter(Boolean)
  }, [dependencias, rows, minDate, dayToX, totalDias, rowYStart, critDepIds])

  // ── Toggles ───────────────────────────────────────────────────────────────
  const togProj   = id  => setExpandedProj(p    => { const s=new Set(p); s.has(id) ?s.delete(id) :s.add(id); return s })
  const togTarefa = id  => setExpandedTarefas(p => { const s=new Set(p); s.has(id) ?s.delete(id) :s.add(id); return s })
  const togWeek   = key => setExpandedWeeks(p   => { const s=new Set(p); s.has(key)?s.delete(key):s.add(key); return s })

  const expandirTodasTarefas = () => {
    setExpandedProj(new Set(projetos.map(p => p.id)))
    setExpandedTarefas(new Set(tarefas.map(t => t.id)))
  }
  const recolherTodasTarefas = () => {
    setExpandedProj(new Set())
    setExpandedTarefas(new Set())
  }

  // ── Presets de período ────────────────────────────────────────────────────
  const applyPreset = (p) => {
    const t=new Date(); const y=t.getFullYear(); const m=t.getMonth()
    if      (p==='mes') { setFilterStart(new Date(y,m,1));  setFilterEnd(new Date(y,m+1,0)) }
    else if (p==='3m')  { setFilterStart(new Date(y,m,1));  setFilterEnd(addDays(new Date(y,m,1),89)) }
    else if (p==='6m')  { setFilterStart(new Date(y,m,1));  setFilterEnd(addDays(new Date(y,m,1),179)) }
    else if (p==='ano') { setFilterStart(new Date(y,0,1));  setFilterEnd(new Date(y,11,31)) }
    else                { setFilterStart(null); setFilterEnd(null) }
  }

  const STATUS_OPTS = [
    { value:'todos',        label:'Todos' },
    { value:'mapeado',      label:'Mapeado' },
    { value:'programado',   label:'Programado' },
    { value:'em_andamento', label:'Em Andamento' },
    { value:'pausado',      label:'Pausado' },
    { value:'concluido',    label:'Concluído' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Carregando projetos...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, background:'#f8fafc' }}>

      {/* ── TOOLBAR ──────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:0, background:'#fff', borderBottom:'1px solid #e2e8f0',
        padding:'10px 20px', display:'flex', alignItems:'center',
        justifyContent:'space-between', gap:12, flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <GanttChartSquare style={{ width:17, height:17, color:'#3b82f6' }} />
          <span style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Gantt de Projetos</span>
          <span style={{ fontSize:11, fontWeight:600, color:'#64748b', background:'#f1f5f9', borderRadius:99, padding:'2px 8px' }}>
            {projetos.length} projeto{projetos.length!==1?'s':''}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {STATUS_OPTS.map(o => (
            <button key={o.value} onClick={() => setFiltroStatus(o.value)}
              style={{
                fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99, border:'none', cursor:'pointer',
                background: filtroStatus===o.value ? '#3b82f6' : '#f1f5f9',
                color:      filtroStatus===o.value ? '#fff'    : '#475569',
              }}>
              {o.label}
            </button>
          ))}
          <div style={{ width:1, height:16, background:'#e2e8f0', margin:'0 4px' }} />
          <button
            onClick={() => setShowCritical(v => !v)}
            title="Destacar caminho crítico"
            style={{
              fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99,
              border: showCritical ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
              cursor:'pointer',
              background: showCritical ? '#fef2f2' : '#f1f5f9',
              color:      showCritical ? '#ef4444' : '#475569',
            }}>
            ◆ Caminho Crítico
          </button>
          <button onClick={() => loadData()}
            style={{ padding:5, borderRadius:6, border:'none', cursor:'pointer', background:'transparent', color:'#94a3b8', display:'flex', alignItems:'center' }}>
            <RefreshCw style={{ width:13, height:13 }} />
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS ──────────────────────────────────────────────── */}
      <div style={{
        flexShrink:0, background:'#fff', borderBottom:'1px solid #f1f5f9',
        padding:'7px 20px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <CalendarDays style={{ width:12, height:12, color:'#94a3b8' }} />
          <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Período
          </span>
        </div>

        {[
          { k:'tudo', l:'Tudo'     },
          { k:'mes',  l:'Este Mês' },
          { k:'3m',   l:'3 Meses'  },
          { k:'6m',   l:'6 Meses'  },
          { k:'ano',  l:'Este Ano' },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => applyPreset(k)}
            style={{
              fontSize:11, fontWeight:600, padding:'3px 10px',
              borderRadius:99, border:'none', cursor:'pointer',
              background: (k==='tudo' && !filterStart && !filterEnd) ? '#3b82f6' : '#f1f5f9',
              color:      (k==='tudo' && !filterStart && !filterEnd) ? '#fff'    : '#475569',
            }}>
            {l}
          </button>
        ))}

        <div style={{ width:1, height:16, background:'#e2e8f0', flexShrink:0 }} />

        <label style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <span style={{ fontSize:10, color:'#64748b', fontWeight:500 }}>De</span>
          <input type="date" value={toInputFmt(filterStart)}
            onChange={e => setFilterStart(e.target.value ? new Date(e.target.value+'T12:00:00') : null)}
            style={{ fontSize:11, padding:'3px 7px', border:'1px solid #e2e8f0', borderRadius:6, color:'#334155', background:'#f8fafc', outline:'none', cursor:'pointer' }}
          />
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <span style={{ fontSize:10, color:'#64748b', fontWeight:500 }}>Até</span>
          <input type="date" value={toInputFmt(filterEnd)}
            onChange={e => setFilterEnd(e.target.value ? new Date(e.target.value+'T12:00:00') : null)}
            style={{ fontSize:11, padding:'3px 7px', border:'1px solid #e2e8f0', borderRadius:6, color:'#334155', background:'#f8fafc', outline:'none', cursor:'pointer' }}
          />
        </label>
        {(filterStart || filterEnd) && (
          <button onClick={() => { setFilterStart(null); setFilterEnd(null) }}
            style={{ padding:3, border:'none', background:'transparent', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center' }}>
            <X style={{ width:12, height:12 }} />
          </button>
        )}

        {/* Legenda */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
          <LegendItem color="#3b82f6" label="Projeto"     shape="bar"     bold />
          <LegendItem color="#64748b" label="Tarefa"      shape="bar"     thin />
          <LegendItem color="#64748b" label="Marco"       shape="diamond" />
          <LegendItem color="#ef4444" label="Hoje"        shape="line"    />
          <LegendItem color="#94a3b8" label="Dependência" shape="arrow"   />
          {showCritical && <LegendItem color="#ef4444" label="Crítico"     shape="arrow" />}
        </div>
      </div>

      {/* ── ESTADO VAZIO ─────────────────────────────────────────────────── */}
      {!loading && rows.length === 0 && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <p style={{ fontSize:13, color:'#94a3b8' }}>Nenhum projeto encontrado.</p>
        </div>
      )}

      {/* ── CORPO DO GANTT ────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div ref={scrollRef} style={{ flex:1, overflow:'auto', minHeight:0 }} className="custom-scrollbar-light">
          <div style={{ display:'inline-block', minWidth: LEFT_W + timelineW, minHeight:'100%' }}>

            {/* ─── CABEÇALHO (3 linhas) ───────────────────────────────── */}
            <div style={{
              position:'sticky', top:0, zIndex:20,
              display:'flex', height:HEADER_H,
              background:'#f8fafc', borderBottom:'2px solid #e2e8f0',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {/* Labels das colunas esquerda */}
              <div style={{
                width:LEFT_W, flexShrink:0,
                position:'sticky', left:0, zIndex:21,
                background:'#f8fafc', borderRight:'2px solid #e2e8f0',
                display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'6px 16px 8px',
                gap:6,
              }}>
                {/* Botões expandir/recolher dentro do cabeçalho */}
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ fontSize:9, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginRight:2 }}>Tarefas</span>
                  <button onClick={expandirTodasTarefas} title="Expandir todas as linhas"
                    style={{ fontSize:11, fontWeight:700, width:18, height:18, borderRadius:4, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  <button onClick={recolherTodasTarefas} title="Recolher todas as linhas"
                    style={{ fontSize:13, fontWeight:700, width:18, height:18, borderRadius:4, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                  <div style={{ width:1, height:12, background:'#e2e8f0', margin:'0 4px' }} />
                  <span style={{ fontSize:9, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginRight:2 }}>Semanas</span>
                  <button onClick={() => setExpandedWeeks(new Set(weeks.map(w=>w.key)))} title="Expandir todas as semanas"
                    style={{ fontSize:11, fontWeight:700, width:18, height:18, borderRadius:4, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  <button onClick={() => setExpandedWeeks(new Set())} title="Recolher todas as semanas"
                    style={{ fontSize:13, fontWeight:700, width:18, height:18, borderRadius:4, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                </div>
                {/* Rótulos das colunas */}
                <div style={{ display:'grid', gridTemplateColumns:COL_GRID, gap:4, width:'100%' }}>
                  {['Tarefa','Início','Fim','Status','Progresso'].map(c => (
                    <div key={c} style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{c}</div>
                  ))}
                </div>
              </div>

              {/* Colunas da timeline */}
              <div style={{ position:'relative', width:timelineW, display:'flex', flexDirection:'column', overflow:'hidden' }}>

                {/* LINHA 1: Meses */}
                <div style={{ height:MONTH_H, position:'relative', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
                  {months.map((m,i) => (
                    <div key={i} style={{
                      position:'absolute', left:m.leftPx, width:m.widthPx, top:0, bottom:0,
                      borderLeft:'1px solid #e2e8f0',
                      display:'flex', alignItems:'center', paddingLeft:8,
                      fontSize:10, fontWeight:700, color:'#475569',
                      textTransform:'capitalize', whiteSpace:'nowrap', overflow:'hidden',
                    }}>
                      {m.label}
                    </div>
                  ))}
                  {todayX >= 0 && (
                    <div style={{ position:'absolute', left:todayX-1, top:0, bottom:0, width:2, background:'#ef4444', zIndex:5 }} />
                  )}
                </div>

                {/* LINHA 2: Semanas com botão expandir */}
                <div style={{ height:WEEK_H, position:'relative', borderBottom:'1px solid #e2e8f0', background:'#fafafa', flexShrink:0 }}>
                  {weeks.map(wk => {
                    const exp = expandedWeeks.has(wk.key)
                    return (
                      <div key={wk.key} style={{
                        position:'absolute', left:wk.leftPx, width:wk.widthPx,
                        top:0, bottom:0, borderLeft:'1px solid #e2e8f0',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        gap:3, overflow:'hidden', paddingLeft:2, paddingRight:2,
                      }}>
                        <button
                          onClick={() => togWeek(wk.key)}
                          title={exp ? 'Recolher dias' : 'Expandir dias'}
                          style={{
                            flexShrink:0, width:14, height:14,
                            borderRadius:3, border:`1px solid ${exp?'#3b82f6':'#cbd5e1'}`,
                            background: exp ? '#3b82f6' : '#fff',
                            color: exp ? '#fff' : '#64748b',
                            cursor:'pointer', display:'flex', alignItems:'center',
                            justifyContent:'center', padding:0,
                          }}>
                          {exp
                            ? <ChevronDown  style={{ width:8, height:8 }} />
                            : <ChevronRight style={{ width:8, height:8 }} />
                          }
                        </button>
                        {/* Rótulo só aparece se houver espaço suficiente */}
                        {wk.widthPx > 46 && (
                          <span style={{ fontSize:9, fontWeight:600, color:'#64748b', whiteSpace:'nowrap' }}>
                            {wk.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {todayX >= 0 && (
                    <div style={{ position:'absolute', left:todayX-1, top:0, bottom:0, width:2, background:'#ef4444', opacity:0.5, zIndex:5 }} />
                  )}
                </div>

                {/* LINHA 3: Dias (só nas semanas expandidas) */}
                <div style={{ height:DAY_H, position:'relative', background:'#f8fafc', flexShrink:0 }}>
                  {/* Semanas recolhidas: área vazia com borda */}
                  {weeks.filter(wk => !expandedWeeks.has(wk.key)).map(wk => (
                    <div key={wk.key} style={{
                      position:'absolute', left:wk.leftPx, width:wk.widthPx,
                      top:0, bottom:0, borderLeft:'1px solid #f1f5f9',
                    }} />
                  ))}
                  {/* Semanas expandidas: dia a dia */}
                  {weeks.filter(wk => expandedWeeks.has(wk.key)).flatMap(wk =>
                    Array.from({ length: wk.vd1-wk.vd0+1 }, (_, idx) => {
                      const di = wk.vd0 + idx
                      const d  = addDays(minDate, di)
                      const dw = d.getDay()
                      const isW = dw===0||dw===6
                      const isT = di===todayOff
                      const cellL = dayToX[di]
                      const cellW = dayToX[di+1]-dayToX[di]
                      return (
                        <div key={di} style={{
                          position:'absolute', left:cellL, width:cellW, top:0, bottom:0,
                          borderLeft:'1px solid #f1f5f9',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          background: isT?'rgba(239,68,68,0.08)': isW?'#f1f5f9':'transparent',
                        }}>
                          <span style={{ fontSize:8, fontWeight:isT?800:400, color:isT?'#ef4444':isW?'#cbd5e1':'#94a3b8' }}>
                            {d.getDate()}
                          </span>
                          {isT && (
                            <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:0, bottom:0, width:2, background:'#ef4444', opacity:0.5 }} />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

              </div>
            </div>

            {/* ─── LINHAS DE DADOS ────────────────────────────────────── */}
            <div style={{ position:'relative' }}>

              {rows.map((row, ri) => {
                const isProj = row.type==='projeto'
                const isTf   = row.type==='tarefa'
                const bp     = getBar(row)
                const isExp  = isProj ? expandedProj.has(row.id) : expandedTarefas.has(row.id)
                const rowBg  = isProj ? '#f1f5f9' : ri%2===0 ? '#fff' : '#fafafa'
                const barH   = isProj ? 22 : 13
                // Tarefas expandidas ganham altura extra para mostrar detalhes
                const rowHeight = isTf && isExp ? ROW_H + 34 : ROW_H

                return (
                  <div key={row.id} style={{
                    display:'flex', height:rowHeight,
                    borderBottom:`1px solid ${isProj?'#dde3eb':'#f1f5f9'}`,
                    background:rowBg,
                  }}>

                    {/* CÉLULA ESQUERDA */}
                    <div style={{
                      width:LEFT_W, flexShrink:0,
                      position:'sticky', left:0, zIndex:10,
                      background:rowBg, borderRight:'2px solid #e2e8f0',
                      display:'grid', gridTemplateColumns:COL_GRID,
                      alignItems:'center', padding:'0 16px', gap:4,
                    }}>
                      {/* Coluna Tarefa */}
                      <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0, paddingLeft:row.depth*18 }}>
                        <button
                          onClick={() => isProj ? togProj(row.id) : togTarefa(row.id)}
                          style={{
                            width:17, height:17, flexShrink:0, border:'none', cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            borderRadius:4,
                            background: hexRgba(row.cor, isProj ? 0.1 : 0.06),
                            color:row.cor, padding:0,
                          }}>
                          {isExp
                            ? <ChevronDown  style={{ width:10, height:10 }} />
                            : <ChevronRight style={{ width:10, height:10 }} />
                          }
                        </button>
                        <div style={{ width:3, height:isProj?30:16, borderRadius:2, background:row.cor, flexShrink:0 }} />
                        <span style={{
                          fontSize:isProj?12:11, fontWeight:isProj?700:400,
                          color:isProj?'#0f172a':'#334155',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1,
                        }} title={row.label}>{row.label}</span>
                        {isProj && (
                          <button onClick={() => navigate(`/projetos/detalhe/${row.id}`)} title="Abrir projeto"
                            style={{ flexShrink:0, border:'none', background:'transparent', cursor:'pointer', color:'#94a3b8', padding:1, display:'flex', alignItems:'center' }}>
                            <ExternalLink style={{ width:10, height:10 }} />
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize:10, color:'#64748b', fontVariantNumeric:'tabular-nums' }}>{fmtDate(row.dataInicio)}</div>
                      <div style={{ fontSize:10, color:'#64748b', fontVariantNumeric:'tabular-nums' }}>{fmtDate(row.dataFim)}</div>
                      {/* Status */}
                      <div style={{ overflow:'hidden' }}>
                        {(() => {
                          const st = isProj ? row.status : row.tarefa?.status_kanban
                          if (!st) return <span style={{ fontSize:9, color:'#cbd5e1' }}>—</span>
                          const style = STATUS_STYLE[st] || { bg:'#f1f5f9', text:'#64748b', label: st.replace(/_/g,' ') }
                          return (
                            <span style={{
                              fontSize:8, fontWeight:700, padding:'2px 5px', borderRadius:99,
                              background:style.bg, color:style.text,
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                              display:'inline-block', maxWidth:'100%',
                            }}>
                              {style.label}
                            </span>
                          )
                        })()}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ flex:1, height:isProj?8:6, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ width:`${row.progresso}%`, height:'100%', background:row.cor, borderRadius:99 }} />
                        </div>
                        <span style={{ fontSize:9, fontWeight:700, color:'#64748b', minWidth:26, textAlign:'right' }}>{row.progresso}%</span>
                      </div>

                      {/* Painel de detalhes da tarefa — só quando expandida */}
                      {isTf && isExp && row.tarefa && (
                        <div style={{
                          gridColumn: '1 / -1',
                          marginTop: 4,
                          padding: '4px 8px',
                          background: hexRgba(row.cor, 0.06),
                          borderRadius: 6,
                          borderLeft: `3px solid ${row.cor}`,
                          display: 'flex', gap: 12, flexWrap: 'wrap',
                        }}>
                          {[
                            { l:'Fase',     v: row.tarefa.fase_nome      },
                            { l:'Sistema',  v: row.tarefa.sistema_nome   },
                            { l:'Status',   v: row.tarefa.status_kanban?.replace(/_/g,' ') },
                            { l:'Progresso',  v: `${row.progresso}%`    },
                          ].filter(f => f.v).map(f => (
                            <span key={f.l} style={{ fontSize:9, color:'#64748b' }}>
                              <span style={{ fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.04em' }}>{f.l}:</span>
                              {' '}{f.v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CÉLULA DIREITA — timeline */}
                    <div style={{ position:'relative', width:timelineW }}>

                      {/* Sombreamento por semana expandida (fins de semana em cinza) */}
                      {weeks.filter(wk => expandedWeeks.has(wk.key)).flatMap(wk =>
                        Array.from({ length: wk.vd1-wk.vd0+1 }, (_, idx) => {
                          const di = wk.vd0+idx
                          const dw = addDays(minDate, di).getDay()
                          const isW = dw===0||dw===6
                          return (
                            <div key={di} style={{
                              position:'absolute', left:dayToX[di], width:dayToX[di+1]-dayToX[di],
                              top:0, bottom:0,
                              background: isW?'rgba(241,245,249,0.7)':'transparent',
                              borderLeft:'1px solid #f8fafc', pointerEvents:'none',
                            }} />
                          )
                        })
                      )}

                      {/* Barra da tarefa */}
                      {bp && !row.milestone && (() => {
                        const isCrit = showCritical && isTf && critIds.has(row.id)
                        const barBg     = isCrit ? 'rgba(239,68,68,0.12)' : hexRgba(row.cor, 0.18)
                        const barBorder = isCrit ? '#ef4444' : row.cor
                        const fillColor = isCrit ? '#ef4444' : row.cor
                        const borderW   = isCrit ? '2px' : '1.5px'
                        return (
                          <div title={`${isTf ? `Fase: ${row.tarefa?.fase_nome||'—'}` : row.label}${isCrit ? ' — Caminho crítico' : ''}`} style={{
                            position:'absolute', left:bp.left, width:bp.width,
                            top:'50%', transform:'translateY(-50%)',
                            height:barH, borderRadius:5,
                            background:barBg,
                            border:`${borderW} solid ${barBorder}`,
                            overflow:'visible',
                          }}>
                            <div style={{ width:`${row.progresso}%`, height:'100%', background:fillColor, borderRadius:'4px 0 0 4px' }} />
                            {bp.width>50 && row.progresso>12 && (
                              <span style={{
                                position:'absolute', left:5, top:'50%', transform:'translateY(-50%)',
                                fontSize:8, fontWeight:700, color:'#fff', pointerEvents:'none', mixBlendMode:'overlay',
                              }}>{row.progresso}%</span>
                            )}
                            {!isProj && row.responsavel && (
                              <span style={{
                                position:'absolute', left:bp.width+6, top:'50%', transform:'translateY(-50%)',
                                fontSize:9, fontWeight:500, color:'#64748b',
                                whiteSpace:'nowrap', pointerEvents:'none',
                              }}>
                                {row.responsavel.split(';').map(r => r.trim().split(' ')[0]).join(', ')}
                              </span>
                            )}
                          </div>
                        )
                      })()}

                      {/* Marco (losango) */}
                      {bp && row.milestone && (
                        <>
                          <div title={row.label} style={{
                            position:'absolute', left:bp.left+DAY_W/2-9,
                            top:'50%', transform:'translateY(-50%) rotate(45deg)',
                            width:16, height:16, borderRadius:3, background:row.cor,
                            boxShadow:`0 0 0 2px #fff, 0 0 0 3px ${row.cor}`,
                          }} />
                          <span style={{
                            position:'absolute', left:bp.left+DAY_W/2+14, top:'50%', transform:'translateY(-50%)',
                            fontSize:9, fontWeight:600, color:'#64748b', whiteSpace:'nowrap', pointerEvents:'none',
                          }}>{row.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Linha "Hoje" — única, vertical, atravessa todas as linhas */}
              {todayX >= 0 && (
                <div style={{
                  position:'absolute', left: LEFT_W + todayX - 1,
                  top:0, bottom:0, width:2,
                  background:'rgba(239,68,68,0.55)',
                  pointerEvents:'none', zIndex:9,
                  borderRight:'1px dashed rgba(239,68,68,0.35)',
                }} />
              )}

              {/* SVG de setas de dependência */}
              {depPaths.length > 0 && (
                <svg style={{
                  position:'absolute', top:0, left:LEFT_W,
                  width:timelineW, height:rows.length ? rowYStart[rows.length-1] + (rows[rows.length-1].type==='tarefa'&&expandedTarefas.has(rows[rows.length-1].id)?ROW_H+34:ROW_H) : 0,
                  pointerEvents:'none', zIndex:8, overflow:'visible',
                }}>
                  <defs>
                    <marker id="gg-arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                      <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
                    </marker>
                    <marker id="gg-arr-crit" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                      <path d="M0,0 L7,3.5 L0,7 Z" fill="#ef4444" />
                    </marker>
                  </defs>
                  {/* Setas normais primeiro, críticas por cima */}
                  {depPaths.filter(p => !p.isCritical).map(p => (
                    <path key={p.id} d={p.d} fill="none" stroke="#94a3b8"
                      strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#gg-arr)" />
                  ))}
                  {depPaths.filter(p => p.isCritical).map(p => (
                    <path key={p.id} d={p.d} fill="none" stroke="#ef4444"
                      strokeWidth="2" markerEnd="url(#gg-arr-crit)" />
                  ))}
                </svg>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Legenda ──────────────────────────────────────────────────────────────────
function LegendItem({ color, label, shape, bold, thin }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      {shape==='bar'     && <div style={{ width:20, height:bold?8:thin?4:6, borderRadius:3, background:color, opacity:bold?1:0.75 }} />}
      {shape==='diamond' && <div style={{ width:9, height:9, background:color, borderRadius:2, transform:'rotate(45deg)', flexShrink:0 }} />}
      {shape==='line'    && <div style={{ width:18, height:2, background:color, borderRadius:1 }} />}
      {shape==='arrow'   && (
        <svg width="20" height="10" style={{ flexShrink:0 }}>
          <line x1="2" y1="5" x2="14" y2="5" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M12,2 L19,5 L12,8 Z" fill={color} />
        </svg>
      )}
      <span style={{ fontSize:10, color:'#64748b', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  )
}
