import React from 'react'
import { X, ArrowLeftRight } from 'lucide-react'
import { fmtMoeda, fmtData } from './truckpagUtils'

const fmtPct = (v) => v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

// Detalhe linha a linha (por NF/OS) de um depósito de repasse — a tabela principal só mostra
// o total do depósito, esse modal abre todas as colunas originais do arquivo de repasse.
export default function TruckPagRepasseDetalheModal({ empresa, codigoEmpresa, data, linhas, onClose }) {
  const totais = linhas.reduce((acc, l) => {
    acc.valorOS += l.valor_os || 0
    acc.valorNfE += l.valor_nf_e || 0
    acc.valorParcelaNfE += l.valor_parcela_nf_e || 0
    acc.valorNfsE += l.valor_nfs_e || 0
    acc.valorParcelaNfsE += l.valor_parcela_nfs_e || 0
    acc.bruto += l.valor_parcela_total || 0
    acc.taxa += l.valor_taxa || 0
    acc.liquido += l.valor_recebido || 0
    return acc
  }, { valorOS: 0, valorNfE: 0, valorParcelaNfE: 0, valorNfsE: 0, valorParcelaNfsE: 0, bruto: 0, taxa: 0, liquido: 0 })

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[95vw] max-w-[1400px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ArrowLeftRight className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{empresa}</h2>
              <p className="text-[11px] text-slate-500">Repasse de {fmtData(data)} — {linhas.length} NF/OS</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto custom-scrollbar-light">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 whitespace-nowrap">Código Empresa</th>
                  <th className="p-3 whitespace-nowrap">Nº NF-e</th>
                  <th className="p-3 whitespace-nowrap">Nº NFS-e</th>
                  <th className="p-3 whitespace-nowrap">Nº OS</th>
                  <th className="p-3 whitespace-nowrap">Nº Lote</th>
                  <th className="p-3 whitespace-nowrap">Parcelas</th>
                  <th className="p-3 whitespace-nowrap">CNPJ do Cliente</th>
                  <th className="p-3 whitespace-nowrap">Nome do Cliente</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor OS</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor NF-e</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor Parc. NF-e</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor NFS-e</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor Parc. NFS-e</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor Total Parcela</th>
                  <th className="p-3 whitespace-nowrap text-right">Taxa Adm.</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor Taxa</th>
                  <th className="p-3 whitespace-nowrap text-right">Valor Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {linhas.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 whitespace-nowrap">{codigoEmpresa || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.nf_e || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.nfs_e || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.numero_os || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.numero_lote || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.parcelas || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.cnpj_cliente || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{l.nome_cliente || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-slate-900">{fmtMoeda(l.valor_os)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-slate-900">{fmtMoeda(l.valor_nf_e)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-slate-900">{fmtMoeda(l.valor_parcela_nf_e)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-slate-900">{fmtMoeda(l.valor_nfs_e)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-slate-900">{fmtMoeda(l.valor_parcela_nfs_e)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-slate-900">{fmtMoeda(l.valor_parcela_total)}</td>
                    <td className="p-3 whitespace-nowrap text-right">{fmtPct(l.taxa_adm_pct)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-red-600">{fmtMoeda(l.valor_taxa)}</td>
                    <td className="p-3 whitespace-nowrap text-right font-semibold text-emerald-700">{fmtMoeda(l.valor_recebido)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-700">
                  <td className="p-3" colSpan={8}>Total ({linhas.length})</td>
                  <td className="p-3 text-right">{fmtMoeda(totais.valorOS)}</td>
                  <td className="p-3 text-right">{fmtMoeda(totais.valorNfE)}</td>
                  <td className="p-3 text-right">{fmtMoeda(totais.valorParcelaNfE)}</td>
                  <td className="p-3 text-right">{fmtMoeda(totais.valorNfsE)}</td>
                  <td className="p-3 text-right">{fmtMoeda(totais.valorParcelaNfsE)}</td>
                  <td className="p-3 text-right">{fmtMoeda(totais.bruto)}</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right text-red-600">{fmtMoeda(totais.taxa)}</td>
                  <td className="p-3 text-right text-emerald-700">{fmtMoeda(totais.liquido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
