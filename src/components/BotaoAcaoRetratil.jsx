import React from 'react'
import { Plus } from 'lucide-react'

// Botão "+ Adicionar X" — texto sempre visível (não fica só o ícone). Usado nas abas de
// Planejamento de Metas - Pós-Vendas, ao lado do toggle Total/Peças/Serviços.
export default function BotaoAcaoRetratil({ texto, onClick, Icone = Plus, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={texto}
      className={`inline-flex items-center h-10 px-3.5 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Icone size={16} className="shrink-0" />
      <span className="whitespace-nowrap">{texto}</span>
    </button>
  )
}
