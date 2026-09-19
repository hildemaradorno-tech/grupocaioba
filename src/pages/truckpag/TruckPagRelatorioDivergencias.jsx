import React, { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import {
  fmtMoeda, conciliarTitulosRepasses, splitEstabelecimento,
  codigoEmpresaPorNome, parcelaDoTitulo, notasFiscaisDoTitulo, LABEL_CAMPO_CONCILIACAO,
} from './truckpagUtils'

function hojeIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Botão do cabeçalho (presente nas 3 abas do módulo) que gera o PDF de divergências título ×
// repasse. Divergências não ficam salvas em lugar nenhum: busca os dados na hora do clique e
// gera o relatório com tudo que está divergente agora. PDF via html2canvas + jsPDF (mesmo
// pipeline do resto do módulo): um bloco por título divergente, listando só os campos que NÃO
// bateram (valor do título ao lado do valor do repasse).
export default function TruckPagRelatorioDivergencias() {
  const [processando, setProcessando] = useState(false)

  const gerar = async () => {
    setProcessando(true)
    try {
      const [titulos, repasses, tolerancia] = await Promise.all([
        apiService.getTruckPagTitulos(),
        apiService.getTruckPagRepasses(),
        apiService.getTruckPagToleranciaConciliacao(),
      ])
      const divergentesInfo = conciliarTitulosRepasses(titulos, repasses, tolerancia).filter(t => t.statusConciliacao === 'divergente')
      if (divergentesInfo.length === 0) {
        window.alert('Nenhuma divergência encontrada.')
        return
      }

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const MARGIN = 24
      const WRAP_W = 1400
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN

      const montarHtmlCabecalho = () => `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px 20px 0 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:22px;font-weight:800;color:#0f172a;">Contas a Receber TruckPag — Relatório de Divergências</div>
            </div>
            <div style="text-align:right;font-size:13px;color:#475569;">
              <div>${divergentesInfo.length} título(s) divergente(s)</div>
              <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>`

      // Valor do título × valor do repasse, só pros campos que entram na comparação — usado pra
      // mostrar lado a lado o que exatamente diverge em cada campo marcado como false.
      const CAMPO_VALORES = {
        codigo: (t) => [codigoEmpresaPorNome(t.titulo_empresa_nome) || '—', splitEstabelecimento(t.repasseMatch?.estabelecimento).codigoEmpresa || '—'],
        documento: (t) => [t.titulo_pessoa_doc_ident || '—', t.repasseMatch?.cnpj_cliente || '—'],
        notaFiscal: (t) => [notasFiscaisDoTitulo(t).join(' / ') || '—', t.repasseMatch?.nf_e || '—'],
        nfse: (t) => [notasFiscaisDoTitulo(t).join(' / ') || '—', t.repasseMatch?.nfs_e || '—'],
        parcela: (t) => [parcelaDoTitulo(t.titulo_numero) || '—', t.repasseMatch?.parcelas || '—'],
        valor: (t) => [fmtMoeda(t.titulo_valor), fmtMoeda(t.repasseMatch?.valor_parcela_total)],
        saldo: (t) => [fmtMoeda(t.titulo_saldo), fmtMoeda(t.repasseMatch?.valor_parcela_total)],
      }

      const montarHtmlTitulo = (t) => {
        const camposQueDivergem = Object.entries(t.camposDivergentes || {}).filter(([, v]) => v === false).map(([k]) => k)
        const linhasCampos = camposQueDivergem.map(k => {
          const [valorTitulo, valorRepasse] = (CAMPO_VALORES[k] || (() => ['—', '—']))(t)
          return `<tr>
            <td style="padding:5px 6px;font-weight:700;color:#334155;">${LABEL_CAMPO_CONCILIACAO[k] || k}</td>
            <td style="padding:5px 6px;color:#334155;">${valorTitulo}</td>
            <td style="padding:5px 6px;color:#334155;">${valorRepasse}</td>
          </tr>`
        }).join('')
        return `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;margin-bottom:6px;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #fde68a;">
              <thead>
                <tr style="background:#fffbeb;color:#b45309;">
                  <th colspan="3" style="padding:6px 8px;text-align:left;font-size:11px;font-weight:800;">
                    Divergente — Título ${t.titulo_numero} · Lanç. ${t.titulo_codigo} · ${t.titulo_empresa_nome} · Cliente: ${t.titulo_pessoa_nome || '—'}
                  </th>
                </tr>
                <tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;">
                  <th style="padding:5px 6px;text-align:left;">Campo</th>
                  <th style="padding:5px 6px;text-align:left;">Valor no Título</th>
                  <th style="padding:5px 6px;text-align:left;">Valor no Repasse</th>
                </tr>
              </thead>
              <tbody>${linhasCampos}</tbody>
            </table>
          </div>`
      }

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

      const GAP = 4
      const pageBottom = pdf.internal.pageSize.getHeight() - MARGIN
      let primeiraPagina = true
      const iniciarPagina = () => {
        if (!primeiraPagina) pdf.addPage()
        primeiraPagina = false
        return MARGIN
      }
      const colocarCanvas = (canvas, y) => {
        const h = (canvas.height / canvas.width) * CW
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, y, CW, h)
        return h
      }

      let y = iniciarPagina()
      y += colocarCanvas(await renderBloco(montarHtmlCabecalho()), y) + GAP

      for (const t of divergentesInfo) {
        const canvas = await renderBloco(montarHtmlTitulo(t))
        const h = (canvas.height / canvas.width) * CW
        if (y + h > pageBottom) y = iniciarPagina()
        y += colocarCanvas(canvas, y) + GAP
      }

      pdf.save(`divergencias_truckpag_${hojeIso()}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      window.alert('Erro ao gerar relatório: ' + (err.message || String(err)))
    } finally {
      setProcessando(false)
    }
  }

  return (
    <button
      onClick={gerar}
      disabled={processando}
      title="Relatório de Divergências (PDF)"
      className="flex items-center gap-1.5 p-2 rounded-md text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 shadow-sm transition-colors disabled:opacity-50"
    >
      {processando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
    </button>
  )
}
