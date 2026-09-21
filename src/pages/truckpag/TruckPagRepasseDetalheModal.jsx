import React, { useState } from 'react'
import { X, ArrowLeftRight, FileText, Loader2 } from 'lucide-react'
import { fmtMoeda, fmtData } from './truckpagUtils'

const fmtPct = (v) => v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

// Detalhe linha a linha (por NF/OS) de um depósito de repasse — a tabela principal só mostra
// o total do depósito, esse modal abre todas as colunas originais do arquivo de repasse.
export default function TruckPagRepasseDetalheModal({ empresa, codigoEmpresa, data, linhas, onClose }) {
  const [gerandoPdf, setGerandoPdf] = useState(false)
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

  // PDF dos repasses listados no modal — html2canvas + jsPDF (mesmo pipeline do resto do módulo).
  // Tabela dividida em blocos de linhas pra paginar sem cortar uma linha no meio.
  const exportarPdf = async () => {
    setGerandoPdf(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const MARGIN = 24
      const WRAP_W = 1400
      const POR_BLOCO = 16
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN
      const FONT = 'font-family:Arial,Helvetica,sans-serif;'
      const esc = (v) => String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '—'
      const COLS = [
        ['Nº NF-e', l => esc(l.nf_e), 'left'],
        ['Nº NFS-e', l => esc(l.nfs_e), 'left'],
        ['Nº OS', l => esc(l.numero_os), 'left'],
        ['Nº Lote', l => esc(l.numero_lote), 'left'],
        ['Parcelas', l => esc(l.parcelas), 'left'],
        ['CNPJ do Cliente', l => esc(l.cnpj_cliente), 'left'],
        ['Nome do Cliente', l => esc(l.nome_cliente), 'left'],
        ['Valor Total Parcela', l => fmtMoeda(l.valor_parcela_total), 'right'],
        ['Taxa Adm.', l => fmtPct(l.taxa_adm_pct), 'right'],
        ['Valor Taxa', l => fmtMoeda(l.valor_taxa), 'right'],
        ['Valor Recebido', l => fmtMoeda(l.valor_recebido), 'right'],
      ]
      const cabecalhoTabela = COLS.map(([t, , a]) => `<th style="padding:6px;text-align:${a};">${t}</th>`).join('')

      const htmlCabecalho = `
        <div style="${FONT}background:#fff;padding:20px 20px 8px;width:${WRAP_W}px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:10px;">
            <div>
              <div style="font-size:22px;font-weight:800;color:#0f172a;">Repasse — ${esc(empresa)}</div>
              <div style="font-size:12px;color:#475569;margin-top:4px;">${codigoEmpresa ? 'Código ' + esc(codigoEmpresa) + ' · ' : ''}Pagamento em ${fmtData(data)} · ${linhas.length} NF/OS</div>
            </div>
            <div style="font-size:12px;color:#475569;">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>`

      const htmlBloco = (parte, ultimo) => `
        <div style="${FONT}background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;">
            <thead><tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;">${cabecalhoTabela}</tr></thead>
            <tbody>${parte.map(l => `<tr style="border-top:1px solid #f1f5f9;">${COLS.map(([, f, a]) => `<td style="padding:6px;text-align:${a};color:#334155;">${f(l)}</td>`).join('')}</tr>`).join('')}</tbody>
            ${ultimo ? `<tfoot><tr style="background:#f8fafc;font-weight:800;color:#0f172a;border-top:2px solid #cbd5e1;">
              <td colspan="7" style="padding:7px 6px;">Total (${linhas.length})</td>
              <td style="padding:7px 6px;text-align:right;">${fmtMoeda(totais.bruto)}</td>
              <td></td>
              <td style="padding:7px 6px;text-align:right;color:#b91c1c;">${fmtMoeda(totais.taxa)}</td>
              <td style="padding:7px 6px;text-align:right;color:#047857;">${fmtMoeda(totais.liquido)}</td>
            </tr></tfoot>` : ''}
          </table>
        </div>`

      const renderBloco = async (html) => {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:#fff;z-index:-1;`
        wrap.innerHTML = html
        document.body.appendChild(wrap)
        try {
          return await html2canvas(wrap, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: WRAP_W })
        } finally {
          document.body.removeChild(wrap)
        }
      }

      const pageBottom = pdf.internal.pageSize.getHeight() - MARGIN
      let y = MARGIN
      let primeiro = true
      const colocar = async (html) => {
        const canvas = await renderBloco(html)
        const h = (canvas.height / canvas.width) * CW
        if (!primeiro && y + h > pageBottom) { pdf.addPage(); y = MARGIN }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, y, CW, h)
        y += h + 4
        primeiro = false
      }

      await colocar(htmlCabecalho)
      for (let i = 0; i < linhas.length; i += POR_BLOCO) {
        await colocar(htmlBloco(linhas.slice(i, i + POR_BLOCO), i + POR_BLOCO >= linhas.length))
      }
      const dataArquivo = String(data ?? '').split('-').reverse().join('')
      pdf.save(`repasse_${codigoEmpresa || 'empresa'}_${dataArquivo}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      window.alert('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPdf(false)
    }
  }

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
          <button
            onClick={exportarPdf}
            disabled={gerandoPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
          >
            {gerandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Exportar PDF
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
