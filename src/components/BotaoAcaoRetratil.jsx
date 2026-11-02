import React, { useState } from 'react'
import { Plus } from 'lucide-react'

// Botão de ação só com ícone (quadrado, tamanho fixo — vários lado a lado ficam alinhados); a descrição aparece
// só ao passar o mouse, num balão "fixed" (não é cortado por containers com scroll). variante: 'primario' (cheio)
// ou 'secundario' (contorno).
export default function BotaoAcaoRetratil({ texto, onClick, Icone = Plus, variante = 'primario', className = '' }) {
  const [pos, setPos] = useState(null)
  // Mesmo formato dos botões de mês (SeletorMeses), em verde pra se diferenciar deles: primário = cheio; secundário = claro.
  const estilo = variante === 'secundario'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
  return (
    <span className="inline-flex"
      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.right, y: r.bottom + 6 }) }}
      onMouseLeave={() => setPos(null)}>
      <button
        type="button"
        aria-label={texto}
        onClick={e => { setPos(null); onClick?.(e) }}
        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md border text-xs leading-4 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${estilo} ${className}`}
      >
        <Icone size={16} />
      </button>
      {pos && (
        <span style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateX(-100%)' }}
          className="z-[60] bg-slate-800 text-white text-[11px] font-medium rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
          {texto}
        </span>
      )}
    </span>
  )
}
