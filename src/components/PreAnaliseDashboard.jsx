import React, { useState, useRef, useEffect } from 'react'
import { ClipboardList, XCircle, Lightbulb, ThumbsUp, ChevronDown } from 'lucide-react'

// Status palette (crítico/atenção) e cor de sucesso — reservadas, nunca usadas como categórica.
const SITUACAO = {
  positivo: { label: 'Situação positiva', cor: 'text-[#0ca30c]', bg: 'bg-[#0ca30c]/15' },
  atencao:  { label: 'Requer atenção',    cor: 'text-[#fab219]', bg: 'bg-[#fab219]/15' },
  critico:  { label: 'Situação crítica',  cor: 'text-[#e66767]', bg: 'bg-[#e66767]/15' },
}

const GRUPOS = [
  { tipo: 'critico',  titulo: 'Pontos Críticos',   icon: XCircle,  cor: 'text-[#e66767]' },
  { tipo: 'melhoria', titulo: 'Pontos de Melhoria', icon: Lightbulb, cor: 'text-[#3987e5]' },
  { tipo: 'elogio',   titulo: 'Pontos de Elogio',   icon: ThumbsUp,  cor: 'text-[#0ca30c]' },
]

// Pré-análise dinâmica, em formato de botão/dropdown de canto — sempre no mesmo lugar
// (cabeçalho, ao lado do botão "Ir para Controle") em todas as telas de BI. Cada dashboard
// calcula `resumo` (badge de situação) e `pontos` (crítico/melhoria/elogio) a partir dos
// próprios números ao vivo; aqui só é exibido, sempre fechado por padrão.
export default function PreAnaliseDashboard({ resumo, pontos }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  if (!resumo && (!pontos || pontos.length === 0)) return null

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold text-[#c3c2b7] border border-white/10 bg-[#0f172a] hover:bg-[#182238] shadow-sm transition-colors"
      >
        <ClipboardList className="h-3.5 w-3.5 text-[#898781]" />
        Pré-análise
        {resumo && (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${SITUACAO[resumo.tipo].bg} ${SITUACAO[resumo.tipo].cor}`}>
            {SITUACAO[resumo.tipo].label}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-[#898781] transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] rounded-lg border border-white/10 bg-[#0f172a] shadow-xl z-30 p-4 space-y-4">
          {GRUPOS.map(({ tipo, titulo, icon: Icon, cor }) => {
            const itens = (pontos || []).filter(p => p.tipo === tipo)
            if (itens.length === 0) return null
            return (
              <div key={tipo}>
                <p className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${cor}`}>{titulo}</p>
                <ul className="space-y-1.5">
                  {itens.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#c3c2b7]">
                      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cor}`} />
                      <span>{p.texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
