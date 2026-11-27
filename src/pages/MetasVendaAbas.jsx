import React from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { useAuth } from '../context/AuthContext'
import MetasVendaNovos from './MetasVendaNovos'
import MetasVendaSeminovos from './MetasVendaSeminovos'
import MetasVendaTotal from './MetasVendaTotal'

// Cada aba é uma permissão própria no Grupo de Acessos (menuTree: Planejamento de Metas › Vendas).
const ABAS = [
  { key: 'novos',      label: 'Novos',        perm: 'metas/vendas/aba-novos' },
  { key: 'seminovos',  label: 'Seminovos',    perm: 'metas/vendas/aba-seminovos' },
  { key: 'total',      label: 'Total Vendas', perm: 'metas/vendas/aba-total' },
]

export default function MetasVendaAbas() {
  const { hasPermission } = useAuth()
  const [abaSalva, setAba] = useSessionState('mv_aba', 'novos')
  const abasLiberadas = ABAS.filter(a => hasPermission(a.perm))
  const aba = abasLiberadas.some(a => a.key === abaSalva) ? abaSalva : (abasLiberadas[0]?.key || null)

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-200 bg-white px-6 pt-4 gap-1">
        {abasLiberadas.map(({ key, label }) => (
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
        {!aba && (
          <div className="m-6 flex items-center justify-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl bg-white">
            Nenhuma aba do Planejamento de Metas - Vendas está liberada para o seu grupo de acesso.
          </div>
        )}
        {aba === 'novos'     && <MetasVendaNovos />}
        {aba === 'seminovos' && <MetasVendaSeminovos />}
        {aba === 'total'     && <MetasVendaTotal />}
      </div>
    </div>
  )
}
