import React from 'react'
import { Eye, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ACOES_POR_PATH } from '../config/acoesMenu'

// Ação configurável em Grupos de Acesso para este menu? Só nesses casos o botão depende da
// permissão — menus sem a ação cadastrada continuam controlados pela própria tela.
const acaoConfiguravel = (menuPath, acao) =>
  (ACOES_POR_PATH[menuPath.replace(/^\//, '')] || []).some(a => a.value === acao)

export default function PermissionActionButtons({ menuPath, onView, onEdit, onDelete, className = '' }) {
  const { hasActionOrDefault } = useAuth()
  const permite = (acao) => !menuPath || !acaoConfiguravel(menuPath, acao) || hasActionOrDefault(menuPath, acao)
  const editar = permite('editar') ? onEdit : null
  const excluir = permite('excluir') ? onDelete : null

  if (!onView && !editar && !excluir) return null

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {onView && (
        <button type="button" onClick={onView} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Visualizar">
          <Eye className="h-3.5 w-3.5" />
        </button>
      )}
      {editar && (
        <button type="button" onClick={editar} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      )}
      {excluir && (
        <button type="button" onClick={excluir} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
