import React from 'react'
import { Eye, Edit2, Trash2 } from 'lucide-react'

export default function PermissionActionButtons({ menuPath, onView, onEdit, onDelete, className = '' }) {
  if (!onView && !onEdit && !onDelete) return null

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {onView && (
        <button type="button" onClick={onView} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Visualizar">
          <Eye className="h-3.5 w-3.5" />
        </button>
      )}
      {onEdit && (
        <button type="button" onClick={onEdit} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
