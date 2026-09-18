import React, { useMemo, useState } from 'react'
import { X, FileDown, Undo2, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { fmtMoeda, fmtData, splitEstabelecimento } from './truckpagUtils'

// Lista os depósitos (Estabelecimento + Data) que já tiveram título dado baixa — cada grupo pode
// ser "trazido de volta" (apaga o registro de baixa daquele grupo), fazendo os títulos voltarem a
// aparecer na tela Repasses. `baixas` já vem carregado da tela (truckpag_baixas_titulos).
export default function TruckPagBaixadosModal({ baixas, onClose, onAlterado }) {
  const [processando, setProcessando] = useState(null) // chave do grupo em andamento

  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const b of baixas) {
      const chave = `${b.estabelecimento}|${b.data_pagamento}`
      if (!mapa.has(chave)) {
        const { empresa, codigoEmpresa } = splitEstabelecimento(b.estabelecimento)
        mapa.set(chave, { chave, estabelecimento: b.estabelecimento, empresa, codigoEmpresa, data_pagamento: b.data_pagamento, valor: 0, qtd: 0 })
      }
      const g = mapa.get(chave)
      g.valor += b.valor || 0
      g.qtd += 1
    }
    return [...mapa.values()].sort((a, b) => String(b.data_pagamento).localeCompare(String(a.data_pagamento)))
  }, [baixas])

  const trazerDeVolta = async (g) => {
    setProcessando(g.chave)
    try {
      await apiService.removerTruckPagBaixasPorGrupo(g.estabelecimento, g.data_pagamento)
      await onAlterado()
    } finally {
      setProcessando(null)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[600px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileDown className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Depósitos já baixados</h2>
              <p className="text-[11px] text-slate-500">Não aparecem mais na tela Repasses — clique em "Trazer de volta" pra reexibir.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {grupos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Nenhum depósito baixado ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {grupos.map(g => (
                <div key={g.chave} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50/70">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{g.codigoEmpresa || '—'} · {g.empresa}</p>
                    <p className="text-[11px] text-slate-500">{fmtData(g.data_pagamento)} · {fmtMoeda(g.valor)} · {g.qtd} título(s)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => trazerDeVolta(g)}
                    disabled={processando === g.chave}
                    className="shrink-0 flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    {processando === g.chave ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                    Trazer de volta
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
