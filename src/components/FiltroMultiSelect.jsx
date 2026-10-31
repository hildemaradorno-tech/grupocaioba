import React, { useEffect, useRef, useState } from 'react'
import { X, ChevronDown, Search } from 'lucide-react'
import { buscaComCoringa } from '../utils/buscaTexto'

// Seletor de várias opções com busca opcional — usado nos filtros das telas de Comissões
// (Política de Comissões, Comissões - DAF/HONDA). labelFor monta o rótulo de cada opção.
export default function FiltroMultiSelect({ placeholder, opcoes, selecionados, onChange, labelFor, comBusca }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])
  useEffect(() => { if (!aberto) setBusca('') }, [aberto])
  const toggle = (v) => onChange(selecionados.includes(v) ? selecionados.filter(x => x !== v) : [...selecionados, v])
  const rotulo = labelFor || ((v) => v)
  const texto = selecionados.length === 0 ? placeholder : selecionados.length === 1 ? rotulo(selecionados[0]) : `${selecionados.length} selecionados`
  const opcoesFiltradas = comBusca && busca.trim()
    ? opcoes.filter(op => buscaComCoringa(rotulo(op), busca))
    : opcoes
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between gap-1 px-2 py-2 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors">
        <span className={`truncate ${selecionados.length === 0 ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>{texto}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selecionados.length > 0 && (
            <span role="button" tabIndex={0} title="Limpar"
              onClick={e => { e.stopPropagation(); onChange([]) }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange([]) } }}
              className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-colors">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </button>
      {aberto && (
        <div className="absolute z-50 mt-1 min-w-full w-max max-w-sm max-h-72 flex flex-col bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden">
          {comBusca && (
            <div className="relative shrink-0 p-1.5 border-b border-slate-100">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
              <input
                type="text" autoFocus value={busca} onChange={e => setBusca(e.target.value)}
                onClick={e => e.stopPropagation()} placeholder="Buscar..."
                className="w-full text-xs pl-7 pr-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
              />
            </div>
          )}
          <div className="overflow-y-auto py-1">
            {opcoesFiltradas.length === 0
              ? <p className="px-3 py-2 text-xs text-slate-400">Nenhuma opção.</p>
              : opcoesFiltradas.map(op => (
                <label key={op} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer select-none">
                  <input type="checkbox" checked={selecionados.includes(op)} onChange={() => toggle(op)} className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0" />
                  <span className="whitespace-nowrap">{rotulo(op)}</span>
                </label>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
