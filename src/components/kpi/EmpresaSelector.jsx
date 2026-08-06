import React from 'react'
import { Building2 } from 'lucide-react'

export const EMPRESAS = [
  { key: 'todas',        label: 'Todas as Empresas',           short: 'Todas' },
  { key: 'CAMPO GRANDE', label: 'Caiobá Trucks — Campo Grande', short: 'Campo Grande' },
  { key: 'DOURADOS',     label: 'Caiobá Trucks — Dourados',    short: 'Dourados' },
  { key: 'CHAPADÃO DO SUL', label: 'Caiobá Trucks — Chapadão', short: 'Chapadão' },
  { key: 'TRÊS LAGOAS',  label: 'Caiobá Trucks — Três Lagoas', short: 'Três Lagoas' },
]

export default function EmpresaSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        <Building2 className="h-3.5 w-3.5" />
        Empresa
      </div>
      <div className="flex gap-1 flex-wrap">
        {EMPRESAS.map(e => (
          <button
            key={e.key}
            onClick={() => onChange(e.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              value === e.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {e.short}
          </button>
        ))}
      </div>
    </div>
  )
}
