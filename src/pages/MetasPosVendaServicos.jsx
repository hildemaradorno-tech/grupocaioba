import React, { useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Cog } from 'lucide-react'
import MetasServicosMecanico from './MetasServicosMecanico'
import MetasServicosConsultor from './MetasServicosConsultor'
import MetasPecas from './MetasPecas'
import MetasPosVendaTotal from './MetasPosVendaTotal'

const ABAS = [
  { key: 'mecanico',     label: 'Mecânico' },
  { key: 'consultor',    label: 'Consultor' },
  { key: 'pecas',        label: 'Peças' },
  { key: 'total',        label: 'Total' },
]

export default function MetasPosVendaServicos() {
  const [abaSalva, setAba] = useSessionState('mpvs_aba', 'mecanico')
  // Aba salva que não existe mais (ex.: Total Oficina, removida) volta para a primeira.
  const aba = ABAS.some(a => a.key === abaSalva) ? abaSalva : 'mecanico'

  return (
    <div className="flex flex-col h-full">
      {/* Abas */}
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

      {/* Conteúdo da aba */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {aba === 'mecanico'     && <MetasServicosMecanico />}
        {aba === 'consultor'    && <MetasServicosConsultor />}
        {aba === 'pecas'        && <MetasPecas />}
        {aba === 'total'        && <MetasPosVendaTotal />}
      </div>
    </div>
  )
}
