import React, { useMemo } from 'react'

const DAY_WIDTH = 28
const ROW_HEIGHT = 40


const diasEntre = (a, b) => Math.round((b - a) / 86400000)
const parseData = (s) => new Date(s + 'T12:00:00')

// CPM: identifica tarefas e dependências no caminho crítico (maior cadeia de duração)
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
  // Ordenação topológica (Kahn)
  const inDeg = Object.fromEntries(tarefas.map(t => [t.id, preds[t.id].length]))
  const queue = tarefas.filter(t => inDeg[t.id] === 0).map(t => t.id)
  const topo = []
  while (queue.length) { const id = queue.shift(); topo.push(id); succs[id].forEach(s => { if (!--inDeg[s]) queue.push(s) }) }
  // Forward pass: EF acumulado por caminho
  const ef = {}, bestPred = {}
  topo.forEach(id => {
    let maxEF = 0, best = null
    preds[id].forEach(p => { if ((ef[p] ?? 0) > maxEF) { maxEF = ef[p]; best = p } })
    ef[id] = maxEF + dur(id); bestPred[id] = best
  })
  // Tarefa de término com maior EF
  let maxEF = 0, end = null
  topo.forEach(id => { if (ef[id] > maxEF) { maxEF = ef[id]; end = id } })
  // Retroceder pelo caminho crítico
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

export default function GanttChart({ tarefas, dependencias }) {
  const tarefasComData = [...tarefas]
    .filter(t => t.data_inicio && t.data_fim)
    .sort((a, b) => a.data_inicio < b.data_inicio ? -1 : a.data_inicio > b.data_inicio ? 1 : 0)

  const { critIds, critDepIds } = useMemo(
    () => computeCriticalSet(tarefas, dependencias),
    [tarefas, dependencias]
  )

  const { minDate, totalDias, semanas } = useMemo(() => {
    if (tarefasComData.length === 0) return { minDate: null, totalDias: 0, semanas: [] }
    const inicios = tarefasComData.map(t => parseData(t.data_inicio))
    const fins = tarefasComData.map(t => parseData(t.data_fim))
    const min = new Date(Math.min(...inicios))
    const max = new Date(Math.max(...fins))
    const total = diasEntre(min, max) + 1
    const sem = []
    for (let d = 0; d < total; d += 7) {
      const data = new Date(min.getTime() + d * 86400000)
      sem.push({ offset: d, label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) })
    }
    return { minDate: min, totalDias: total, semanas: sem }
  }, [tarefasComData])

  if (tarefasComData.length === 0) {
    return (
      <div className="p-10 text-center text-xs text-slate-400">
        Nenhuma tarefa com data de início e fim definidas. Cadastre as datas nas tarefas para visualizar o Gantt.
      </div>
    )
  }

  const idxPorTarefa = Object.fromEntries(tarefasComData.map((t, i) => [t.id, i]))
  const chartWidth = totalDias * DAY_WIDTH
  const chartHeight = tarefasComData.length * ROW_HEIGHT

  const linhas = dependencias
    .filter(d => idxPorTarefa[d.tarefa_id] !== undefined && idxPorTarefa[d.depende_de_tarefa_id] !== undefined)
    .map(d => {
      const sucessora = tarefasComData[idxPorTarefa[d.tarefa_id]]
      const predecessora = tarefasComData[idxPorTarefa[d.depende_de_tarefa_id]]
      const x1 = (diasEntre(minDate, parseData(predecessora.data_fim)) + 1) * DAY_WIDTH
      const y1 = idxPorTarefa[predecessora.id] * ROW_HEIGHT + ROW_HEIGHT / 2
      const x2 = diasEntre(minDate, parseData(sucessora.data_inicio)) * DAY_WIDTH
      const y2 = idxPorTarefa[sucessora.id] * ROW_HEIGHT + ROW_HEIGHT / 2
      return { id: d.id, x1, y1, x2, y2 }
    })

  return (
    <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Coluna fixa de nomes */}
      <div className="w-56 shrink-0 border-r border-slate-200">
        <div className="h-9 border-b border-slate-200 bg-slate-50 flex items-center px-3 text-[10px] font-bold text-slate-400 uppercase">Tarefa</div>
        {tarefasComData.map(t => (
          <div key={t.id} style={{ height: ROW_HEIGHT }} className="flex items-center px-3 border-b border-slate-50 text-xs font-semibold text-slate-700 truncate">
            {t.nome}
          </div>
        ))}
      </div>

      {/* Timeline com scroll horizontal */}
      <div className="overflow-x-auto flex-1 custom-scrollbar-light">
        <div style={{ width: chartWidth, position: 'relative' }}>
          {/* Cabeçalho de semanas */}
          <div className="h-9 border-b border-slate-200 bg-slate-50 relative">
            {semanas.map(s => (
              <div key={s.offset} style={{ left: s.offset * DAY_WIDTH, position: 'absolute', top: 0, bottom: 0 }}
                className="border-l border-slate-200 flex items-center pl-1 text-[10px] font-semibold text-slate-400">
                {s.label}
              </div>
            ))}
          </div>

          {/* Linhas de grade + barras */}
          <div style={{ height: chartHeight, position: 'relative' }}>
            {semanas.map(s => (
              <div key={s.offset} style={{ left: s.offset * DAY_WIDTH, position: 'absolute', top: 0, bottom: 0 }} className="border-l border-slate-100" />
            ))}

            {tarefasComData.map((t, i) => {
              const left = diasEntre(minDate, parseData(t.data_inicio)) * DAY_WIDTH
              const width = (diasEntre(parseData(t.data_inicio), parseData(t.data_fim)) + 1) * DAY_WIDTH
              const cor = t.cor || '#2563eb'
              const progresso = Math.min(100, Math.max(0, Number(t.progresso_pct) || 0))
              const isCrit = critIds.has(t.id)
              return (
                <div key={t.id} style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, position: 'absolute', left: 0, right: 0 }}
                  className="border-b border-slate-50 flex items-center">
                  <div
                    style={{
                      left, width,
                      backgroundColor: isCrit ? '#fef2f2' : cor + '22',
                      borderColor: isCrit ? '#ef4444' : cor,
                      borderWidth: isCrit ? 2 : 1,
                    }}
                    className="absolute h-6 rounded-md border overflow-hidden"
                    title={`${t.nome} (${progresso}%)${isCrit ? ' — Caminho crítico' : ''}`}
                  >
                    <div style={{ width: `${progresso}%`, backgroundColor: isCrit ? '#ef4444' : cor }} className="h-full opacity-70" />
                  </div>
                </div>
              )
            })}

            {/* Setas de dependência */}
            <svg width={chartWidth} height={chartHeight} className="absolute top-0 left-0 pointer-events-none">
              <defs>
                <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                </marker>
                <marker id="gantt-arrow-crit" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                </marker>
              </defs>
              {linhas.map(l => {
                const midX = (l.x1 + l.x2) / 2
                const isCrit = critDepIds.has(l.id)
                return (
                  <path key={l.id}
                    d={`M${l.x1},${l.y1} C${midX},${l.y1} ${midX},${l.y2} ${l.x2},${l.y2}`}
                    fill="none"
                    stroke={isCrit ? '#ef4444' : '#94a3b8'}
                    strokeWidth={isCrit ? 2 : 1.5}
                    strokeDasharray={isCrit ? undefined : '4 2'}
                    markerEnd={isCrit ? 'url(#gantt-arrow-crit)' : 'url(#gantt-arrow)'}
                  />
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
