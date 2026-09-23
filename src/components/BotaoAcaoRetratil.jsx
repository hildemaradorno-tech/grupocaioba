import React from 'react'
import { Plus } from 'lucide-react'

// Botão "+ Adicionar X" retrátil: fica só o ícone e expande mostrando o texto ao passar o mouse (ou focar,
// pra acessibilidade via teclado). Usado nas abas de Planejamento de Metas - Pós-Vendas, onde a linha das
// abas já divide espaço com o toggle Total/Peças/Serviços.
export default function BotaoAcaoRetratil({ texto, onClick, Icone = Plus, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={texto}
      className={`group inline-flex items-center h-10 pl-2.5 pr-2.5 hover:pr-4 focus:pr-4 gap-0 hover:gap-2 focus:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Icone size={16} className="shrink-0" />
      <span className="max-w-0 group-hover:max-w-xs group-focus:max-w-xs overflow-hidden whitespace-nowrap transition-all duration-200">
        {texto}
      </span>
    </button>
  )
}
