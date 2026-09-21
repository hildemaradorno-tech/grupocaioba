import React from 'react'
import { useSessionState } from '../hooks/useSessionState'
import MetasVendaNovos from './MetasVendaNovos'
import MetasVendaSeminovos from './MetasVendaSeminovos'
import MetasVendaTotal from './MetasVendaTotal'

const ABAS = [
  { key: 'novos',      label: 'Novos' },
  { key: 'seminovos',  label: 'Seminovos' },
  { key: 'total',      label: 'Total Vendas' },
]

export default function MetasVendaAbas() {
  const [abaSalva, setAba] = useSessionState('mv_aba', 'novos')
  const aba = ABAS.some(a => a.key === abaSalva) ? abaSalva : 'novos'

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-200 bg-white px-6 pt-4 gap-1">
        {ABAS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              aba === key
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {aba === 'novos'     && <MetasVendaNovos />}
        {aba === 'seminovos' && <MetasVendaSeminovos />}
        {aba === 'total'     && <MetasVendaTotal />}
      </div>
    </div>
  )
}
