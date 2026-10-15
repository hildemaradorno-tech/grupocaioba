import React, { useMemo } from 'react'

const nomeEmpresaPadrao = (e) => e.empresa_fantasia || e.nome_empresa

// Lista de empresas organizada por Agrupamento (Motos, Trucks, Outros...), com pílulas que
// marcam/desmarcam o grupo inteiro de uma vez — usado em qualquer tela que precise escolher
// "em quais empresas isso vale" (Feriados, e pode ser reaproveitado em outras telas).
export default function SeletorEmpresasAgrupado({ empresas, selecionados, onChange, getNome = nomeEmpresaPadrao, maxHeight = 'max-h-44' }) {
  const porAgrupamento = useMemo(() => {
    const grupos = new Map()
    for (const e of empresas) {
      const nome = e.agrupamento_nome?.trim() || 'Sem agrupamento'
      if (!grupos.has(nome)) grupos.set(nome, [])
      grupos.get(nome).push(e)
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [empresas])

  const toggleEmpresa = (id) => {
    onChange(selecionados.includes(id) ? selecionados.filter(x => x !== id) : [...selecionados, id])
  }
  const toggleGrupo = (empresasDoGrupo) => {
    const ids = empresasDoGrupo.map(e => e.id)
    const todasMarcadas = ids.every(id => selecionados.includes(id))
    onChange(todasMarcadas ? selecionados.filter(id => !ids.includes(id)) : [...new Set([...selecionados, ...ids])])
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {porAgrupamento.map(([nomeGrupo, empresasDoGrupo]) => {
          const todasMarcadas = empresasDoGrupo.every(e => selecionados.includes(e.id))
          return (
            <button
              key={nomeGrupo}
              type="button"
              onClick={() => toggleGrupo(empresasDoGrupo)}
              className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
                todasMarcadas ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-700'
              }`}
            >
              {nomeGrupo}
            </button>
          )
        })}
      </div>
      <div className={`border border-slate-300 rounded-lg ${maxHeight} overflow-y-auto`}>
        {porAgrupamento.map(([nomeGrupo, empresasDoGrupo]) => (
          <div key={nomeGrupo} className="border-b border-slate-100 last:border-b-0">
            <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wide">{nomeGrupo}</div>
            <div className="divide-y divide-slate-100">
              {empresasDoGrupo.map(e => (
                <label key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 select-none">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(e.id)}
                    onChange={() => toggleEmpresa(e.id)}
                    className="w-3.5 h-3.5 rounded accent-indigo-600"
                  />
                  {getNome(e)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
