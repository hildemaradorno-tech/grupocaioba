import React, { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Palmtree, Wallet, PhoneCall, ClipboardCheck, BarChart2, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSessionState } from '../hooks/useSessionState'
import Ferias from './Ferias'
import CalculoComissoes from './CalculoComissoes'
import SobreavisoPlantao from './SobreavisoPlantao'
import HistoricoComissoes from './HistoricoComissoes'
import CalculoPlanoDms from './CalculoPlanoDms'

// Ordem confirmada com o usuário: Férias -> Sobreaviso/Plantão -> Cálculo de Comissões -> Plano
// DMS -> Processamento de Comissões (por último).
const ABAS = [
  { menuPath: 'ferias', label: 'Férias', icon: Palmtree, Componente: Ferias },
  { menuPath: 'sobreaviso-plantao', label: 'Sobreaviso/Plantão', icon: PhoneCall, Componente: SobreavisoPlantao },
  { menuPath: 'calculo-comissoes', label: 'Cálculo de Comissões', icon: Wallet, Componente: CalculoComissoes },
  { menuPath: 'plano-dms-calculo', label: 'Plano DMS', icon: Wrench, Componente: CalculoPlanoDms },
  { menuPath: 'processamento-comissoes', label: 'Processamento de Comissões', icon: ClipboardCheck, Componente: HistoricoComissoes },
]

export default function FolhaPagamentoDaf() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const abasPermitidas = ABAS.filter(a => hasPermission(a.menuPath))
  const [abaAtivaKey, setAbaAtivaKey] = useSessionState('folha_daf_aba', abasPermitidas[0]?.menuPath || '')

  // Só usa ?aba= pra pré-selecionar no primeiro load (sustenta os redirects das rotas antigas,
  // ex: /processamento-comissoes -> /folha-pagamento-daf?aba=processamento-comissoes) — depois
  // disso quem manda é o clique nas abas / o que já estava salvo no localStorage.
  useEffect(() => {
    const abaParam = searchParams.get('aba')
    if (abaParam && abasPermitidas.some(a => a.menuPath === abaParam)) setAbaAtivaKey(abaParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abaAtual = abasPermitidas.find(a => a.menuPath === abaAtivaKey) || abasPermitidas[0]
  if (!abaAtual) return null

  return (
    <div className="h-full flex flex-col relative">
      {abaAtual.menuPath === 'processamento-comissoes' && hasPermission('bi/comissoes') && (
        <button
          onClick={() => navigate('/bi/comissoes')}
          className="absolute top-4 right-4 z-10 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
        >
          <BarChart2 className="h-3.5 w-3.5 text-indigo-500" /> Ir para Dashboard
        </button>
      )}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 pt-8 shrink-0 overflow-x-auto">
        {abasPermitidas.map(a => (
          <button
            key={a.menuPath}
            onClick={() => setAbaAtivaKey(a.menuPath)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              abaAtual.menuPath === a.menuPath
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <abaAtual.Componente />
      </div>
    </div>
  )
}
