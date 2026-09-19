import React, { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import {
  fmtMoeda, fmtData, conciliarTitulosRepasses, tituloConciliadoPorRepasse, splitEstabelecimento,
  codigoEmpresaPorNome, parcelaDoTitulo, notasFiscaisDoTitulo,
} from './truckpagUtils'

function hojeIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const esc = (v) => String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '—'

function fmtDoc(v) {
  const d = String(v ?? '').replace(/\D/g, '')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return v || '—'
}

const fmtDif = (a, b) => {
  const dif = (a || 0) - (b || 0)
  return `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${fmtMoeda(Math.abs(dif))}`
}

// Como cada campo divergente é explicado no relatório: rótulo, o que aparece de cada lado, e a
// frase de motivo em linguagem direta (o relatório vai pra gerência, não pra quem opera a tela).
// Nota: Código da Empresa, Parcela e Nota Fiscal são condição pra o título ser encontrado no
// repasse, então na prática só documento/valor/saldo aparecem como divergentes.
const CAMPOS = {
  documento: {
    resumo: 'CNPJ/CPF do cliente diferente',
    campo: 'CNPJ/CPF do cliente',
    titulo: (t) => `${fmtDoc(t.titulo_pessoa_doc_ident)} (${t.titulo_pessoa_nome || '—'})`,
    repasse: (t, r) => `${fmtDoc(r.cnpj_cliente)} (${r.nome_cliente || '—'})`,
    dif: () => 'Documento diferente',
    motivo: (t, r) => `O repasse foi recebido em nome de outro CNPJ/CPF: o título está em ${fmtDoc(t.titulo_pessoa_doc_ident)} (${t.titulo_pessoa_nome || '—'}) e o repasse veio de ${fmtDoc(r.cnpj_cliente)} (${r.nome_cliente || '—'}).`,
  },
  valor: {
    resumo: 'Valor do título diferente do repasse',
    campo: 'Valor',
    titulo: (t) => `${fmtMoeda(t.titulo_valor)} (valor original do título)`,
    repasse: (t, r) => `${fmtMoeda(r.valor_parcela_total)} (valor da parcela paga)`,
    dif: (t, r) => fmtDif(t.titulo_valor, r.valor_parcela_total),
    motivo: (t, r) => `O valor do título (${fmtMoeda(t.titulo_valor)}) não é o mesmo da parcela paga no repasse (${fmtMoeda(r.valor_parcela_total)}) — diferença de ${fmtMoeda(Math.abs((t.titulo_valor || 0) - (r.valor_parcela_total || 0)))}.`,
  },
  saldo: {
    resumo: 'Saldo em aberto diferente do repasse',
    campo: 'Saldo em aberto',
    titulo: (t) => `${fmtMoeda(t.titulo_saldo)} (ainda a receber)`,
    repasse: (t, r) => `${fmtMoeda(r.valor_parcela_total)} (valor da parcela paga)`,
    dif: (t, r) => fmtDif(t.titulo_saldo, r.valor_parcela_total),
    motivo: (t, r) => `O saldo em aberto do título (${fmtMoeda(t.titulo_saldo)}) não é o mesmo da parcela paga no repasse (${fmtMoeda(r.valor_parcela_total)}) — o pagamento não zera o saldo, diferença de ${fmtMoeda(Math.abs((t.titulo_saldo || 0) - (r.valor_parcela_total || 0)))}.`,
  },
  codigo: {
    resumo: 'Empresa diferente',
    campo: 'Código da empresa',
    titulo: (t) => codigoEmpresaPorNome(t.titulo_empresa_nome) || '—',
    repasse: (t, r) => splitEstabelecimento(r.estabelecimento).codigoEmpresa || '—',
    dif: () => 'Empresa diferente',
    motivo: () => 'O título e o repasse pertencem a empresas diferentes.',
  },
  parcela: {
    resumo: 'Parcela diferente',
    campo: 'Parcela',
    titulo: (t) => parcelaDoTitulo(t.titulo_numero) || '—',
    repasse: (t, r) => r.parcelas || '—',
    dif: () => 'Parcela diferente',
    motivo: (t, r) => `A parcela do título (${parcelaDoTitulo(t.titulo_numero) || '—'}) não é a mesma paga no repasse (${r.parcelas || '—'}).`,
  },
  notaFiscal: {
    resumo: 'Nota fiscal diferente',
    campo: 'Nota fiscal',
    titulo: (t) => notasFiscaisDoTitulo(t).join(' / ') || '—',
    repasse: (t, r) => r.nf_e || r.nfs_e || '—',
    dif: () => 'Nota diferente',
    motivo: () => 'A nota fiscal do título não aparece no repasse.',
  },
}
CAMPOS.nfse = CAMPOS.notaFiscal

// Botão do cabeçalho (presente nas 3 abas do módulo) que gera o PDF de divergências título ×
// repasse. Divergências não ficam salvas em lugar nenhum: busca os dados na hora do clique e
// gera o relatório com tudo que está divergente agora. PDF via html2canvas + jsPDF (mesmo
// pipeline do resto do módulo).
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
      // Um título por repasse, igual à tela Repasses: se dois títulos casam com o mesmo repasse,
      // fica só o melhor (Identificado tem prioridade sobre Divergente) — senão o relatório
      // contaria a mesma linha de repasse duas vezes e não bateria com a tela.
      const divergentes = [...tituloConciliadoPorRepasse(conciliarTitulosRepasses(titulos, repasses, tolerancia)).values()]
        .filter(t => t.statusConciliacao === 'divergente')
        .sort((a, b) =>
          String(a.titulo_empresa_nome).localeCompare(String(b.titulo_empresa_nome), 'pt-BR') ||
          String(a.titulo_data_venc ?? '').localeCompare(String(b.titulo_data_venc ?? '')))
      if (divergentes.length === 0) {
        window.alert('Nenhuma divergência encontrada.')
        return
      }

      const camposQueDivergem = (t) => Object.entries(t.camposDivergentes || {}).filter(([k, v]) => v === false && CAMPOS[k]).map(([k]) => k)

      // Resumo: quantos títulos por tipo de divergência e por empresa.
      const porTipo = new Map()
      const porEmpresa = new Map()
      let valorTotal = 0
      for (const t of divergentes) {
        valorTotal += t.titulo_saldo || 0
        porEmpresa.set(t.titulo_empresa_nome, (porEmpresa.get(t.titulo_empresa_nome) || 0) + 1)
        for (const k of new Set(camposQueDivergem(t).map(k => CAMPOS[k].resumo))) porTipo.set(k, (porTipo.get(k) || 0) + 1)
      }

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const MARGIN = 24
      const WRAP_W = 1400
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN
      const FONT = 'font-family:Arial,Helvetica,sans-serif;'

      const montarHtmlCabecalho = () => `
        <div style="${FONT}background:#fff;padding:20px;width:${WRAP_W}px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:14px;">
            <div>
              <div style="font-size:24px;font-weight:800;color:#0f172a;">Relatório de Divergências — Títulos a Receber</div>
              <div style="font-size:12px;color:#475569;margin-top:4px;">Títulos em aberto que foram localizados em um repasse recebido, mas cujos dados não conferem.</div>
            </div>
            <div style="text-align:right;font-size:12px;color:#475569;">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
          <div style="display:flex;gap:14px;margin-bottom:12px;">
            <div style="flex:0 0 220px;border:1px solid #fde68a;background:#fffbeb;border-radius:6px;padding:10px 14px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#b45309;">Títulos com divergência</div>
              <div style="font-size:28px;font-weight:800;color:#b45309;">${divergentes.length}</div>
              <div style="font-size:11px;color:#92400e;">Saldo em aberto: ${fmtMoeda(valorTotal)}</div>
            </div>
            <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Por tipo de divergência</div>
              ${[...porTipo.entries()].map(([k, n]) => `<div style="font-size:12px;color:#334155;">• ${esc(k)}: <b>${n}</b> título(s)</div>`).join('')}
            </div>
            <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Por empresa</div>
              ${[...porEmpresa.entries()].map(([k, n]) => `<div style="font-size:12px;color:#334155;">• ${esc(k)}: <b>${n}</b> título(s)</div>`).join('')}
            </div>
          </div>
          <div style="font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;">
            <b>Como ler:</b> cada quadro abaixo é um título. O título foi encontrado no repasse pela empresa, parcela e nota fiscal,
            mas ao menos um dado (CNPJ/CPF, valor ou saldo) está diferente. O <b>motivo</b> explica a diferença; a tabela mostra o dado
            de cada lado e a diferença encontrada.
          </div>
        </div>`

      const montarHtmlTitulo = (t, idx) => {
        const r = t.repasseMatch
        const ks = camposQueDivergem(t)
        const motivos = ks.map(k => `<li style="margin-bottom:2px;">${esc(CAMPOS[k].motivo(t, r))}</li>`).join('')
        const linhas = ks.map(k => `<tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:6px 8px;font-weight:700;color:#334155;width:16%;">${esc(CAMPOS[k].campo)}</td>
            <td style="padding:6px 8px;color:#334155;width:31%;">${esc(CAMPOS[k].titulo(t, r))}</td>
            <td style="padding:6px 8px;color:#334155;width:31%;">${esc(CAMPOS[k].repasse(t, r))}</td>
            <td style="padding:6px 8px;font-weight:700;color:#b91c1c;width:22%;">${esc(CAMPOS[k].dif(t, r))}</td>
          </tr>`).join('')
        const { empresa } = splitEstabelecimento(r.estabelecimento)
        return `
          <div style="${FONT}background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;margin-bottom:8px;">
            <div style="border:1px solid #fde68a;border-radius:6px;overflow:hidden;font-size:11px;">
              <div style="background:#fffbeb;color:#92400e;padding:7px 10px;display:flex;justify-content:space-between;font-weight:800;font-size:12px;">
                <span>${idx + 1}. Título ${esc(t.titulo_numero)} · Lançamento ${esc(t.titulo_codigo)}</span>
                <span>${esc(t.titulo_empresa_nome)}</span>
              </div>
              <div style="display:flex;gap:0;border-bottom:1px solid #fde68a;">
                <div style="flex:1;padding:8px 10px;color:#334155;line-height:1.5;">
                  <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;">Título (contas a receber)</div>
                  Cliente: <b>${esc(t.titulo_pessoa_nome)}</b> · ${esc(fmtDoc(t.titulo_pessoa_doc_ident))}<br/>
                  Vencimento: ${esc(fmtData(t.titulo_data_venc))} · Valor: ${fmtMoeda(t.titulo_valor)} · Saldo: ${fmtMoeda(t.titulo_saldo)}<br/>
                  Nota(s) fiscal(is): ${esc(notasFiscaisDoTitulo(t).join(' / '))} · Parcela: ${esc(parcelaDoTitulo(t.titulo_numero))}
                </div>
                <div style="flex:1;padding:8px 10px;color:#334155;line-height:1.5;border-left:1px solid #fde68a;">
                  <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;">Repasse encontrado</div>
                  Cliente: <b>${esc(r.nome_cliente)}</b> · ${esc(fmtDoc(r.cnpj_cliente))}<br/>
                  Pago em: ${esc(fmtData(r.data_pagamento))} · Lote: ${esc(r.numero_lote)} · ${esc(empresa)}<br/>
                  NF-e: ${esc(r.nf_e)} · NFS-e: ${esc(r.nfs_e)} · Parcela paga: ${fmtMoeda(r.valor_parcela_total)} · Recebido líquido: ${fmtMoeda(r.valor_recebido)}
                </div>
              </div>
              <div style="padding:8px 10px;background:#fef2f2;color:#7f1d1d;border-bottom:1px solid #fde68a;">
                <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#b91c1c;margin-bottom:2px;">Motivo da divergência</div>
                <ul style="margin:0;padding-left:16px;line-height:1.45;">${motivos}</ul>
              </div>
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;text-align:left;">
                    <th style="padding:5px 8px;">Onde diverge</th>
                    <th style="padding:5px 8px;">Dado no título</th>
                    <th style="padding:5px 8px;">Dado no repasse</th>
                    <th style="padding:5px 8px;">Diferença (título − repasse)</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>
            </div>
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

      for (let i = 0; i < divergentes.length; i++) {
        const canvas = await renderBloco(montarHtmlTitulo(divergentes[i], i))
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
