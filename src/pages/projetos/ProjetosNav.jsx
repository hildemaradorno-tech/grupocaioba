import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FolderKanban, List, CalendarDays, ClipboardList, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'

// Cache módulo-nível para não refazer a query em cada render de navegação
let _convIds = null
let _convTs   = 0

export default function ProjetosNav() {
  const { hasPermission } = useAuth()
  const [isConvidadoEmAlgum, setIsConvidadoEmAlgum] = useState(false)

  useEffect(() => {
    const now = Date.now()
    if (_convIds !== null && now - _convTs < 300_000) {
      setIsConvidadoEmAlgum(_convIds.length > 0)
      return
    }
    apiService.getProjetosConvidadoIds().then(ids => {
      _convIds = ids
      _convTs  = Date.now()
      setIsConvidadoEmAlgum(ids.length > 0)
    }).catch(() => {})
  }, [])

  const LINKS = [
    { to: '/projetos',               key: 'projetos',               label: 'Projetos',        icon: FolderKanban, end: true },
    { to: '/projetos/lista-tarefas', key: 'projetos/lista-tarefas', label: 'Lista de Tarefas', icon: List },
    { to: '/projetos/manifestacoes', key: 'projetos/manifestacoes', label: 'Manifestações',   icon: ClipboardList, convidadoOk: true },
    { to: '/projetos/calendario',    key: 'projetos/calendario',    label: 'Agenda',           icon: CalendarDays },
    { to: '/projetos/ata-reuniao',   key: 'projetos/ata-reuniao',   label: 'Ata de Reunião',   icon: FileText },
  ]

  const visíveis = LINKS.filter(l =>
    hasPermission(l.key) || (l.convidadoOk && isConvidadoEmAlgum)
  )

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
