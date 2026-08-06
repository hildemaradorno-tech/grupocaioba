import React from 'react'
import { Car, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function MetasVendaSeminovos() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Orçamento de Metas — Vendas Seminovos</h1>
            <p className="text-xs text-slate-400">Vendas · Rascunho editável antes da aprovação</p>
          </div>
        </div>
        <button onClick={() => navigate('/metas/gestao-aprovacao')} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors">
          <ClipboardCheck size={16} /> Gestão de Aprovação
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
        <p className="text-slate-400 text-sm">Em desenvolvimento</p>
      </div>
    </div>
  )
}
