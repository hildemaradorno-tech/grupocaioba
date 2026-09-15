import React from 'react'

// Formulário dinâmico genérico, guiado por um schema simples: [{ key, label, tipo, opcoes, obrigatorio }]
// tipo: 'texto' | 'texto_longo' | 'numero' | 'booleano' | 'selecao'
// Usado tanto para o formulário inicial (form_schemas do evento de início) quanto para o
// formulário de cada tarefa humana (form_schemas do elemento da user task) — sempre em formato
// de tabela (rótulo numa coluna, campo na outra), uma linha por campo.
export default function BpmFormRenderer({ schema, valores, onChange, disabled }) {
  const campos = Array.isArray(schema) ? schema : []
  if (!campos.length) {
    return <p className="text-xs text-slate-400 italic">Esta etapa não tem campos de formulário definidos.</p>
  }
  const set = (key, value) => onChange({ ...valores, [key]: value })

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-left border-collapse">
        <tbody className="divide-y divide-slate-100">
          {campos.map(campo => (
            <tr key={campo.key} className="align-top">
              <td className="w-[38%] min-w-[130px] bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-600 border-r border-slate-200">
                {campo.label}{campo.obrigatorio && <span className="text-red-500"> *</span>}
              </td>
              <td className="px-3 py-2">
                {campo.tipo === 'texto_longo' ? (
                  <textarea
                    rows={3}
                    disabled={disabled}
                    value={valores[campo.key] ?? ''}
                    onChange={e => set(campo.key, e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-50"
                  />
                ) : campo.tipo === 'numero' ? (
                  <input
                    type="number" step="0.01"
                    disabled={disabled}
                    value={valores[campo.key] ?? ''}
                    onChange={e => set(campo.key, e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-50"
                  />
                ) : campo.tipo === 'booleano' ? (
                  <select
                    disabled={disabled}
                    value={valores[campo.key] === true ? 'true' : valores[campo.key] === false ? 'false' : ''}
                    onChange={e => set(campo.key, e.target.value === '' ? null : e.target.value === 'true')}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                  >
                    <option value="">Selecione...</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                ) : campo.tipo === 'selecao' ? (
                  <select
                    disabled={disabled}
                    value={valores[campo.key] ?? ''}
                    onChange={e => set(campo.key, e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                  >
                    <option value="">Selecione...</option>
                    {(campo.opcoes || []).map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled={disabled}
                    value={valores[campo.key] ?? ''}
                    onChange={e => set(campo.key, e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-50"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
