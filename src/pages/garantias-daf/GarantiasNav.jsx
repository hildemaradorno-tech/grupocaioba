import React from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, FileText, DollarSign } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const LINKS = [
  { to: '/garantias-daf-andamento',  label: 'Aberto (Em andamento)', icon: Activity },
  { to: '/garantias-daf',            label: 'Aberto (Encerrada)',  icon: FileText, end: true },
  { to: '/garantias-daf-titulos',    label: 'Títulos a Receber',   icon: DollarSign },
]

export default function GarantiasNav() {
  const { hasPermission } = useAuth()
  const linksPermitidos = LINKS.filter(l => hasPermission(l.to))

  return (
    <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 w-fit">
      {linksPermitidos.map(({ to, label, icon: Icon, end }) => (
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
