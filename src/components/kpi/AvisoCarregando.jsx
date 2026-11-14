import React from 'react'
import { Loader2 } from 'lucide-react'

// Aviso bem visível enquanto os quadros da Matriz KPIs carregam (14/11/2026) — a primeira abertura do dia pode
// levar alguns segundos (cálculo das fontes: Possibilidades, Indicadores de Produtividade, Auditoria…).
export default function AvisoCarregando({ texto = 'Carregando os valores dos indicadores…' }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      <span>
        <strong className="font-semibold">{texto}</strong>
        <span className="text-amber-700"> Os números aparecem assim que o cálculo terminar — pode levar alguns segundos.</span>
      </span>
    </div>
  )
}
