import React, { useState } from 'react'

// Botão só com ícone; a descrição aparece ao passar o mouse (posição "fixed" para não ser cortada pelo scroll da tabela).
const TONS = {
  verde:    'text-green-600 hover:bg-green-100',
  vermelho: 'text-red-600 hover:bg-red-100',
}

export default function BotaoIconeTooltip({ Icone, dica, tom = 'verde', onClick, disabled = false, carregando = false }) {
  const [pos, setPos] = useState(null)
  return (
    <span className="inline-flex"
      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left + r.width / 2, y: r.bottom + 6 }) }}
      onMouseLeave={() => setPos(null)}>
      <button type="button" disabled={disabled || carregando} aria-label={dica}
        onClick={e => { e.stopPropagation(); setPos(null); onClick?.(e) }}
        className={`p-1 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${TONS[tom]}`}>
        <Icone size={16} className={carregando ? 'animate-pulse' : ''} />
      </button>
      {pos && (
        <span style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
          className="z-[60] max-w-xs bg-slate-800 text-white text-[11px] font-normal leading-snug rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
          {dica}
        </span>
      )}
    </span>
  )
}
