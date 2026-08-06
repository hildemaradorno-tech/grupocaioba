import React from 'react'
import { NavLink } from 'react-router-dom'
import { FolderKanban, List, ClipboardList, CalendarDays, LayoutGrid } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const LINKS = [
  { to: '/projetos',               key: 'projetos',              label: 'Projetos',         icon: FolderKanban, end: true },
  { to: '/projetos/lista-tarefas', key: 'projetos/lista-tarefas',label: 'Lista de Tarefas', icon: List },
  { to: '/projetos/pdca',          key: 'projetos/pdca',         label: 'PDCA',             icon: ClipboardList },
  { to: '/projetos/planejamento',  key: 'projetos/planejamento', label: 'Planejamento',     icon: LayoutGrid },
  { to: '/projetos/calendario',    key: 'projetos/calendario',   label: 'Agenda',           icon: CalendarDays },
]

export default function ProjetosNav() {
  const { hasPermission } = useAuth()
  const visíveis = LINKS.filter(l => hasPermission(l.key))

  return (
    <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 w-fit">
      {visíveis.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`
          }
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </NavLink>
      ))}
    </div>
  )
}
