import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FolderKanban, List, CalendarDays, ClipboardList, FileText, Wallet, BarChart2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'

// Cache módulo-nível para não refazer a query em cada render de navegação
let _convIds = null
let _convTs   = 0
// Última aba de Controle visitada — o botão "Controle" volta para ela a partir do Dashboard
let _ultimaAbaControle = '/projetos'

export default function ProjetosNav() {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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
    { to: '/projetos',               key: 'projetos',               label: 'Projetos',          icon: FolderKanban, end: true },
    { to: '/projetos/lista-tarefas', key: 'projetos/lista-tarefas', label: 'Lista de Tarefas',  icon: List },
    { to: '/projetos/manifestacoes', key: 'projetos/manifestacoes', label: 'Manifestações',     icon: ClipboardList, convidadoOk: true },
    { to: '/projetos/calendario',    key: 'projetos/calendario',    label: 'Agenda',            icon: CalendarDays },
    { to: '/projetos/ata-reuniao',   key: 'projetos/ata-reuniao',   label: 'Ata de Reunião',    icon: FileText },
    { to: '/projetos/custos',        key: 'projetos/custos',        label: 'Custos de Projetos', icon: Wallet },
  ]

  const visíveis = LINKS.filter(l =>
    hasPermission(l.key) || (l.convidadoOk && isConvidadoEmAlgum)
  )

  // Modo Dashboard | Controle (mesmo botão do BI Garantias DAF)
  const modo = location.pathname.startsWith('/bi/projetos') ? 'dashboard' : 'controle'
  if (modo === 'controle' && visíveis.some(l => l.to === location.pathname)) _ultimaAbaControle = location.pathname
  const podeDashboard = hasPermission('bi/projetos')
  const podeControle = visíveis.length > 0
  const destinoControle = visíveis.some(l => l.to === _ultimaAbaControle) ? _ultimaAbaControle : visíveis[0]?.to

  const botaoModo = (valor, label, Icon, habilitado, dica, destino) => (
    <button
      type="button"
      onClick={() => habilitado && modo !== valor && navigate(destino)}
      disabled={!habilitado}
      title={`${label} — ${dica}`}
      aria-label={label}
      className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${
        modo === valor ? 'bg-orange-500 text-white shadow-sm'
          : habilitado ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className="flex flex-1 min-w-0 items-center gap-2 flex-wrap">
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

      {(podeDashboard || modo === 'dashboard') && (
        <div className="ml-auto flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
          {botaoModo('dashboard', 'Dashboard', BarChart2, podeDashboard,
            podeDashboard ? 'Ver indicadores de projetos' : 'Sem permissão para o dashboard', '/bi/projetos')}
          {botaoModo('controle', 'Controle', ClipboardList, podeControle,
            podeControle ? 'Ver e editar projetos e tarefas' : 'Sem permissão para o controle de projetos', destinoControle)}
        </div>
      )}
    </div>
  )
}
