import React, { useState } from 'react'
import { User, Edit2, Trash2 } from 'lucide-react'
import { apiService } from '../../services/api'

const COLUNAS = [
  { key: 'mapeado',      label: 'Mapeado',       cor: 'border-slate-300' },
  { key: 'programado',   label: 'Programado',    cor: 'border-blue-300' },
  { key: 'em_andamento', label: 'Em Andamento',  cor: 'border-amber-300' },
  { key: 'pausado',      label: 'Pausado',       cor: 'border-purple-300' },
  { key: 'concluido',    label: 'Concluído',     cor: 'border-teal-400' },
]


const getTextColor = (hex) => {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

function Card({ tarefa, onEdit, onDelete, onDragStart, sistemaCorMap = {} }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tarefa)}
      className="bg-white border border-slate-200 rounded-md p-2.5 shadow-sm cursor-grab active:cursor-grabbing space-y-1.5 group"
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-bold text-slate-800 leading-snug">{tarefa.nome}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(tarefa)} className="p-0.5 text-slate-400 hover:text-blue-600 rounded"><Edit2 className="h-3 w-3" /></button>
          <button onClick={() => onDelete(tarefa)} className="p-0.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {tarefa.sistema_nome && (
        <div>
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{
              backgroundColor: sistemaCorMap[tarefa.sistema_nome] || '#1e293b',
              color: getTextColor(sistemaCorMap[tarefa.sistema_nome] || '#1e293b'),
            }}
          >
            {tarefa.sistema_nome}
          </span>
        </div>
      )}
      {tarefa.responsavel_nome && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <User className="h-2.5 w-2.5" /> {tarefa.responsavel_nome}
        </div>
      )}
      {(tarefa.area_nome || tarefa.empresa_nome) && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {tarefa.area_nome && (
            <span className="text-[9px] text-slate-400 italic">{tarefa.area_nome}</span>
          )}
          {tarefa.empresa_nome && (
            <span className="text-[9px] text-slate-400">{tarefa.empresa_nome}</span>
          )}
        </div>
      )}
      {Number(tarefa.progresso_pct) > 0 && (
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, tarefa.progresso_pct)}%` }} />
        </div>
      )}
    </div>
  )
}

export default function KanbanBoard({ tarefas, onEdit, onDelete, onChanged, sistemaCorMap = {} }) {
  const [draggingId, setDraggingId] = useState(null)
  const [overColuna, setOverColuna] = useState(null)

  const handleDragStart = (e, tarefa) => {
    setDraggingId(tarefa.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, colunaKey) => {
    e.preventDefault()
    setOverColuna(null)
    const tarefa = tarefas.find(t => t.id === draggingId)
    setDraggingId(null)
    if (!tarefa || tarefa.status_kanban === colunaKey) return
    const novaOrdem = tarefas.filter(t => t.status_kanban === colunaKey).length
    try {
      await apiService.updateTarefaStatusKanban(tarefa.id, colunaKey, novaOrdem)
      onChanged()
    } catch (err) {
      alert('Erro ao mover tarefa: ' + (err.message || String(err)))
    }
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      {COLUNAS.map(col => {
        const itens = tarefas.filter(t => t.status_kanban === col.key)
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverColuna(col.key) }}
            onDragLeave={() => setOverColuna(prev => prev === col.key ? null : prev)}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`rounded-lg border-t-2 ${col.cor} bg-slate-50 p-2 space-y-2 min-h-[200px] transition-colors ${overColuna === col.key ? 'bg-blue-50/60' : ''}`}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{col.label}</span>
              <span className="text-[10px] font-bold text-slate-400">{itens.length}</span>
            </div>
            {itens.map(t => (
              <Card key={t.id} tarefa={t} onEdit={onEdit} onDelete={onDelete} onDragStart={handleDragStart} sistemaCorMap={sistemaCorMap} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
