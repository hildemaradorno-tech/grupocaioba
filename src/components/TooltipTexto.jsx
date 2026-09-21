import React, { useState } from 'react'

// Envolve qualquer elemento e mostra um texto ao passar o mouse (posição "fixed" para não ser cortado por scroll).
export default function TooltipTexto({ texto, children }) {
  const [pos, setPos] = useState(null)
  if (!texto) return children
  return (
    <span className="inline-flex"
      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left + r.width / 2, y: r.bottom + 6 }) }}
      onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <span style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
          className="z-[60] bg-slate-800 text-white text-[11px] font-normal leading-snug rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
          {texto}
        </span>
      )}
    </span>
  )
}
