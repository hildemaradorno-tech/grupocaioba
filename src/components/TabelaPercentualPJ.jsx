import React from 'react'

const fmtBRL = (v) => v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct = (v) => v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

// Regra PJ "Percentual sobre regras" — a conta passo a passo: cada regra usada (e de onde vem o
// valor dela), × o % aplicado = resultado; a soma dos resultados é o Valor Serviços.
// percentualPj = { itens: [{ codigo, descricao, tipo, origem, valor, percentual, resultado }], base, comissao }
export default function TabelaPercentualPJ({ percentualPj: p }) {
  if (!p) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">
        Como é calculado: para cada regra abaixo, <strong>valor da regra no mês × %</strong>; o <strong>Valor Serviços</strong> é a soma dos resultados.
      </p>
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-1.5 text-left">Regra / de onde vem o valor</th>
              <th className="px-3 py-1.5 text-right">Valor da regra</th>
              <th className="px-3 py-1.5 text-center">×</th>
              <th className="px-3 py-1.5 text-right">%</th>
              <th className="px-3 py-1.5 text-center">=</th>
              <th className="px-3 py-1.5 text-right">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(p.itens || []).map((it, i) => (
              <tr key={i} className="align-top">
                <td className="px-3 py-1.5">
                  <div className="font-semibold text-slate-700">
                    {it.codigo && <span className="font-mono text-slate-400 mr-1.5">{it.codigo}</span>}
                    {it.descricao}
                    {it.tipo && <span className="ml-1.5 text-[10px] font-normal text-slate-400">({it.tipo})</span>}
                  </div>
                  {it.origem && <div className="text-[10px] text-slate-400 mt-0.5">{it.origem}</div>}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-700">{fmtBRL(it.valor)}</td>
                <td className="px-1 py-1.5 text-center text-slate-300">×</td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-700">{fmtPct(it.percentual)}</td>
                <td className="px-1 py-1.5 text-center text-slate-300">=</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold text-emerald-700">{fmtBRL(it.resultado)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50 border-t border-emerald-200 font-bold">
              <td className="px-3 py-1.5 text-slate-700">Valor Serviços (soma dos resultados)</td>
              <td className="px-3 py-1.5 text-right font-mono text-slate-500">{fmtBRL(p.base)}</td>
              <td colSpan="3" />
              <td className="px-3 py-1.5 text-right font-mono text-emerald-700">{fmtBRL(p.comissao)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
