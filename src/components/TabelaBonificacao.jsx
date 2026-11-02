import React from 'react'

const fmtBRL = (v) => v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct = (v) => v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const pctDe = (realizado, meta) => meta > 0 ? (realizado / meta) * 100 : null

// Regra PJ "Bonificação por Meta" — Meta × Realizado por empresa (+ % do realizado), total e a
// faixa aplicada. Usada no modal Base de Cálculo das telas de Comissões e do Processamento.
// bonificacao = { linhas: [{ empresa, meta, realizado, devolucao }], meta, realizado, devolucao, pct, faixa, premio }
// "Valor Total" = realizado + devoluções (o bruto, antes de descontar); cálculo antigo sem
// devolução gravada mostra "—" nessas duas colunas.
export default function TabelaBonificacao({ bonificacao: b }) {
  if (!b) return null
  const margem = b.modo === 'MARGEM'
  const rotuloFaixa = (f) => `${f.nome ? `${f.nome}: ` : ''}${f.operador} ${f.valor}%`
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-slate-200 overflow-hidden">
        {margem ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-1.5 text-left">Empresa</th>
              <th className="px-3 py-1.5 text-right">Faturamento</th>
              <th className="px-3 py-1.5 text-right">Lucro</th>
              <th className="px-3 py-1.5 text-right">Margem %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(b.linhas || []).map(l => (
              <tr key={l.empresa}>
                <td className="px-3 py-1.5 text-slate-700">{l.empresa}</td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-600">{fmtBRL(l.faturamento)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-700">{fmtBRL(l.lucro)}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700">{fmtPct(pctDe(l.lucro, l.faturamento))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t border-blue-200 font-bold">
              <td className="px-3 py-1.5 text-slate-700">Total (Lucro ÷ Faturamento)</td>
              <td className="px-3 py-1.5 text-right font-mono text-slate-700">{fmtBRL(b.faturamento)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-blue-700">{fmtBRL(b.lucro)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-blue-700">{fmtPct(b.pct)}</td>
            </tr>
          </tfoot>
        </table>
        ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-1.5 text-left">Empresa</th>
              <th className="px-3 py-1.5 text-right">Meta</th>
              <th className="px-3 py-1.5 text-right">Realizado</th>
              <th className="px-3 py-1.5 text-right">%</th>
              <th className="px-3 py-1.5 text-right">Valor Total</th>
              <th className="px-3 py-1.5 text-right">Devoluções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(b.linhas || []).map(l => {
              const pct = pctDe(l.realizado, l.meta)
              return (
                <tr key={l.empresa}>
                  <td className="px-3 py-1.5 text-slate-700">{l.empresa}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">{fmtBRL(l.meta)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700">{fmtBRL(l.realizado)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${pct == null ? 'text-slate-300' : pct >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmtPct(pct)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">{l.devolucao == null ? '—' : fmtBRL(l.realizado + l.devolucao)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono ${l.devolucao ? 'text-rose-600' : 'text-slate-400'}`}>{l.devolucao == null ? '—' : fmtBRL(l.devolucao)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t border-blue-200 font-bold">
              <td className="px-3 py-1.5 text-slate-700">Total</td>
              <td className="px-3 py-1.5 text-right font-mono text-slate-700">{fmtBRL(b.meta)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-blue-700">{fmtBRL(b.realizado)}</td>
              <td className={`px-3 py-1.5 text-right font-mono ${b.pct == null ? 'text-slate-300' : b.pct >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>{fmtPct(b.pct)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-slate-600">{b.devolucao == null ? '—' : fmtBRL(b.realizado + b.devolucao)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-rose-700">{b.devolucao == null ? '—' : fmtBRL(b.devolucao)}</td>
            </tr>
          </tfoot>
        </table>
        )}
      </div>
      {/* Faixas cadastradas na regra — a primeira que casa com o % atingido é a aplicada (destacada). */}
      {(b.faixas || []).length > 0 && (
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>Regras da bonificação</span>
            <span className="normal-case font-semibold text-slate-500">{margem ? 'Margem' : 'Atingido'}: <span className="font-mono">{fmtPct(b.pct)}</span></span>
          </div>
          <div className="divide-y divide-slate-100">
            {b.faixas.map((f, i) => {
              const aplicada = b.faixa === rotuloFaixa(f) || b.faixa === `${f.operador} ${f.valor}%`
              return (
                <div key={i} className={`flex items-center justify-between px-3 py-1.5 text-xs ${aplicada ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600'}`}>
                  <span>
                    {f.nome && <span className="inline-block w-20 font-bold">{f.nome}</span>}
                    {margem ? 'Margem' : 'Atingido'} <span className="font-mono">{f.operador} {fmtPct(f.valor)}</span>
                    {aplicada && <span className="ml-2 text-[10px] font-bold uppercase">✓ aplicada</span>}
                  </span>
                  <span>paga <span className="font-mono">{fmtBRL(f.premio)}</span></span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-500">
        <span>Faixa aplicada: <span className="font-semibold text-slate-700">{b.faixa ? `${margem ? 'margem' : 'atingido'} ${b.faixa}` : 'nenhuma faixa'}</span></span>
        <span>Prêmio <span className="font-mono font-semibold text-slate-700">{fmtBRL(b.premio)}</span></span>
      </div>
    </div>
  )
}
