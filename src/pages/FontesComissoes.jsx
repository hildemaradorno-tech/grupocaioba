import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Database, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSessionState } from '../hooks/useSessionState'
import FontesCalculo from './FontesCalculo'
import FontesMicrowork from './FontesMicrowork'

const ABAS = [
  { menuPath: 'fontes-calculo', label: 'Dealer.net', icon: Database, Componente: FontesCalculo,
    description: 'Cadastre de qual arquivo do SharePoint cada evento de comissão lê seus dados.' },
  { menuPath: 'fontes-microwork', label: 'MicroWork', icon: Database, Componente: FontesMicrowork,
    description: 'Cadastre relatórios do MicroWork Cloud (via API) como fonte de dados de comissão.' },
]

function InfoAba({ texto }) {
  return (
    <span className="relative inline-flex group">
      <Info className="h-3 w-3 text-slate-400 hover:text-slate-600" />
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {texto}
      </span>
    </span>
  )
}

export default function FontesComissoes() {
  const { hasPermission } = useAuth()
  const [searchParams] = useSearchParams()
  const abasPermitidas = ABAS.filter(a => hasPermission(a.menuPath))
  const [abaAtivaKey, setAbaAtivaKey] = useSessionState('fontes_comissoes_aba', abasPermitidas[0]?.menuPath || '')

  // Só usa ?aba= pra pré-selecionar no primeiro load (sustenta os redirects das rotas antigas).
  useEffect(() => {
    const abaParam = searchParams.get('aba')
    if (abaParam && abasPermitidas.some(a => a.menuPath === abaParam)) setAbaAtivaKey(abaParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abaAtual = abasPermitidas.find(a => a.menuPath === abaAtivaKey) || abasPermitidas[0]
  if (!abaAtual) return null

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 bg-white shrink-0">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fontes de Dados</h1>
        <p className="text-xs text-slate-500">Cadastre de onde vêm os dados usados no cálculo das comissões (SharePoint e MicroWork).</p>
      </div>
      <div className="flex items-center flex-wrap border-b border-slate-200 bg-white px-6 pt-4 shrink-0">
        {abasPermitidas.map(a => (
          <button
            key={a.menuPath}
            onClick={() => setAbaAtivaKey(a.menuPath)}
            className={`flex items-center gap-1 px-2 py-2 rounded-t-md text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              abaAtual.menuPath === a.menuPath
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <a.icon className="h-3.5 w-3.5" /> {a.label}
            {a.description && <InfoAba texto={a.description} />}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <abaAtual.Componente />
      </div>
    </div>
  )
}
