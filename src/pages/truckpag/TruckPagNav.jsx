import React from 'react'
import { NavLink } from 'react-router-dom'
import { Receipt, Link2, ArrowLeftRight, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const PASTA = 'Pasta SharePoint: /Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF'

// `info` é o texto do botão de informação de cada aba (descrição + de onde vem o dado).
const LINKS = [
  {
    to: '/truckpag/conciliacao', label: 'Saldo Concessionária', icon: Link2,
    info: [
      'Repasses Fabricante x Saldo disponível na concessionária — vinculados pela soma do valor por estabelecimento/data.',
      'Fonte de dados: Saldo de créditos não identificados na tesouraria (RFN024)',
      'Nome do Arquivo: RFN024_SALDOCREDITOSNAOIDENTIFICADOS.xlsx',
      PASTA,
    ],
  },
  {
    to: '/truckpag/repasses', label: 'Repasses', icon: ArrowLeftRight,
    info: [
      'Extrato linha a linha dos repasses recebidos com título vinculado — sincronizado do SharePoint.',
      'Fonte de dados: Relatório de repasses recebidos da TruckPag',
      'Nome do Arquivo: contas-receber-daf.xlsx',
      PASTA,
    ],
  },
  {
    to: '/truckpag/titulos', label: 'Títulos a Receber', icon: Receipt,
    info: [
      'Posição de títulos em aberto (RFN003) — sincronizado do SharePoint.',
      'Fonte de dados: Posição analítica de títulos a receber (filtrado por Agente Cobrador = TRUCKPAG)',
      'Nome do Arquivo: RFN003_PosicaoAnaliticoReceber_Excel (4 arquivos, um por unidade — busca por início do nome)',
      PASTA,
    ],
  },
]

export default function TruckPagNav() {
  const { hasPermission } = useAuth()
  const linksPermitidos = LINKS.filter(l => hasPermission(l.to))

  return (
    <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 w-fit">
      {linksPermitidos.map(({ to, label, icon: Icon, info }) => (
        <NavLink
          key={to}
          to={to}
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
          <span className="relative group cursor-help">
            <Info className="h-3 w-3 text-slate-400" />
            <span className="absolute top-full left-0 mt-2 w-96 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 normal-case font-normal tracking-normal space-y-1">
              {info.map(l => <div key={l}>{l}</div>)}
            </span>
          </span>
        </NavLink>
      ))}
    </div>
  )
}
