// PDF padrão de comissões (documento pro RH computar o pagamento) — o mesmo layout em todas as
// telas do menu Comissões (Cálculo de Comissões e Processamento de Comissões). Cada tela monta
// os dados já formatados (strings) e este módulo só cuida do HTML e da paginação:
//
// setores: [{
//   empresasLabel, nomeSetor, total,
//   cargos: [{
//     titulo, regras: [{ nome, faixas: [{ texto, percentual }] }],
//     empresas: [{
//       nomeEmpresa,
//       funcionarios: [{
//         nome, nomeCurto, total,
//         linhas: [{ comissao, tipo, periodo, detalhes: [{ empresa, base, comissao }],
//                    base, pctServicos, pctPecas, pctTotal, valorFixo, valorComissao, semMeta }],
//       }],
//     }],
//   }],
// }]

import { fmtBRL } from './comissoesFormat'

// Escapa texto vindo do cadastro antes de montar o HTML do PDF (nomes podem ter & ou <).
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))

export async function gerarPdfComissoes({ setores, periodoInicio, periodoFim, nomeArquivo }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const MARGIN = 24
  const WRAP_W = 1600
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN

  const periodoLabel = periodoInicio && periodoFim
    ? `${periodoInicio.split('-').reverse().join('/')} a ${periodoFim.split('-').reverse().join('/')}`
    : '—'

  // Cabeçalho de tabela repetido em cada bloco de cargo — cada cargo vira um bloco
  // independente (própria tabela com seu próprio thead), pra poder ser paginado sozinho
  // sem depender do resto do setor.
  const THEAD_HTML = `
    <thead>
      <tr style="background:#1e293b;color:#fff;text-transform:uppercase;font-size:11px;">
        <th style="padding:7px 8px;text-align:left;">Funcionário</th>
        <th style="padding:7px 8px;text-align:left;">Comissão</th>
        <th style="padding:7px 8px;text-align:right;">Base Comissão</th>
        <th style="padding:7px 8px;text-align:right;">% Serviços</th>
        <th style="padding:7px 8px;text-align:right;">% Peças</th>
        <th style="padding:7px 8px;text-align:right;">% Total</th>
        <th style="padding:7px 8px;text-align:right;">R$ Valor</th>
        <th style="padding:7px 8px;text-align:right;">Valor Comissão</th>
      </tr>
    </thead>`

  // Bloco de cabeçalho (empresa/setor/período) — repetido no topo de cada página nova que o
  // setor precisar abrir, com um aviso de "continuação" pra deixar claro que é o mesmo setor
  // continuando, não um novo.
  const montarHtmlCabecalho = (setor, continuacao) => `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px 20px 0 20px;width:${WRAP_W}px;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#0f172a;">Cálculo de Comissões</div>
          <div style="font-size:15px;font-weight:700;color:#1e293b;margin-top:2px;">${esc(setor.empresasLabel)}</div>
        </div>
        <div style="text-align:right;font-size:13px;color:#475569;">
          <div>Período: ${periodoLabel}</div>
          <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>
      <div style="font-size:14px;font-weight:700;color:#334155;margin-bottom:8px;">${esc(setor.nomeSetor)}${continuacao ? ' <span style="font-weight:400;font-style:italic;color:#94a3b8;">(continuação)</span>' : ''}</div>
    </div>`

  // Um bloco por Cargo — tabela própria e independente, pra poder cair numa página nova
  // sem quebrar uma linha de funcionário ao meio (a quebra sempre acontece ENTRE cargos).
  const montarHtmlBlocoCargo = (cargo) => {
    const linhasEmpresas = cargo.empresas.map((empresa, idxEmpresa) => {
      const linhasFunc = empresa.funcionarios.map(func => {
        const linhas = func.linhas.map((l, idx) => {
          const detalhesHtml = (l.detalhes || []).map(d => `
            <div style="font-size:10px;font-weight:400;color:#94a3b8;margin-top:2px;">
              ${esc(d.empresa)}: Base <span style="color:#64748b;">${esc(d.base)}</span>
              <span style="color:#cbd5e1;"> &rarr; </span>
              Comissão <span style="color:#059669;font-weight:600;">${esc(d.comissao)}</span>
            </div>`).join('')
          return `
            <tr>
              <td style="padding:6px 8px;font-weight:700;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${idx === 0 ? esc(func.nome) : ''}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${esc(l.comissao)}${l.tipo ? ` <span style="font-style:italic;color:#94a3b8;">(${esc(l.tipo)})</span>` : ''}${l.periodo ? ` <span style="font-size:11px;font-weight:700;color:#2563eb;">${esc(l.periodo)}</span>` : ''}${detalhesHtml}</td>
              <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${esc(l.base)}</td>
              <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${esc(l.pctServicos)}</td>
              <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${esc(l.pctPecas)}</td>
              <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${esc(l.pctTotal)}</td>
              <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${esc(l.valorFixo)}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${l.semMeta ? '<span style="color:#d97706;font-weight:600;">Sem meta</span>' : esc(l.valorComissao)}</td>
            </tr>`
        }).join('')
        // Subtotal em TODO funcionário, mesmo com uma linha só — facilita a conferência do RH.
        return `${linhas}
            <tr style="background:#ecfdf5;">
              <td colspan="7" style="padding:5px 8px;text-align:right;font-weight:700;color:#334155;">Total ${esc(func.nomeCurto)}</td>
              <td style="padding:5px 8px;text-align:right;font-weight:700;color:#047857;">${fmtBRL(func.total)}</td>
            </tr>`
      }).join('')
      return `
        <tr><td colspan="8" style="padding:8px 8px 4px 20px;background:#f8fafc;font-weight:600;font-size:10px;text-transform:uppercase;color:#64748b;${idxEmpresa > 0 ? 'border-top:2px dashed #94a3b8;' : ''}">${esc(empresa.nomeEmpresa)}</td></tr>
        ${linhasFunc}`
    }).join('')
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${THEAD_HTML}
          <tbody>
            <tr><td colspan="8" style="padding:5px 8px;background:#f1f5f9;font-weight:700;font-size:12px;text-transform:uppercase;color:#334155;">${esc(cargo.titulo)}</td></tr>
            ${(cargo.regras || []).map(r => `<tr><td colspan="8" style="padding:5px 8px 5px 20px;background:#eef2ff;font-size:11px;"><div style="font-weight:700;color:#4338ca;">Regra: ${esc(r.nome)}</div>${r.faixas.map(f => `<div style="font-family:monospace;color:#475569;">${esc(f.texto)} → ${esc(f.percentual)}</div>`).join('')}</td></tr>`).join('')}
            ${linhasEmpresas}
          </tbody>
        </table>
      </div>`
  }

  const montarHtmlRodape = (setor) => `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px 20px 20px;width:${WRAP_W}px;box-sizing:border-box;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tfoot>
          <tr style="border-top:2px solid #1e293b;">
            <td colspan="7" style="padding:10px 8px;text-align:right;font-weight:800;color:#0f172a;">Total ${esc(setor.nomeSetor)}</td>
            <td style="padding:10px 8px;text-align:right;font-weight:800;color:#047857;">${fmtBRL(setor.total)}</td>
          </tr>
        </tfoot>
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

  // Empacota os blocos (cabeçalho / cada cargo / rodapé) nas páginas — quando um cargo não
  // cabe mais no espaço restante da página atual, abre página nova (repetindo o cabeçalho
  // do setor com "(continuação)") em vez de espremer tudo numa imagem só. A quebra sempre
  // acontece ENTRE cargos, nunca no meio de um.
  const GAP = 6
  const pageBottom = pdf.internal.pageSize.getHeight() - MARGIN
  let primeiraPaginaGeral = true
  const iniciarPagina = () => {
    if (!primeiraPaginaGeral) pdf.addPage()
    primeiraPaginaGeral = false
    return MARGIN
  }
  const colocarCanvas = (canvas, y) => {
    const h = (canvas.height / canvas.width) * CW
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, y, CW, h)
    return h
  }

  for (const setor of setores) {
    let y = iniciarPagina()
    y += colocarCanvas(await renderBloco(montarHtmlCabecalho(setor, false)), y) + GAP

    for (const cargo of setor.cargos) {
      const cargoCanvas = await renderBloco(montarHtmlBlocoCargo(cargo))
      const cargoH = (cargoCanvas.height / cargoCanvas.width) * CW
      if (y + cargoH > pageBottom) {
        y = iniciarPagina()
        y += colocarCanvas(await renderBloco(montarHtmlCabecalho(setor, true)), y) + GAP
      }
      y += colocarCanvas(cargoCanvas, y) + GAP
    }

    const footerCanvas = await renderBloco(montarHtmlRodape(setor))
    const footerH = (footerCanvas.height / footerCanvas.width) * CW
    if (y + footerH > pageBottom) y = iniciarPagina()
    colocarCanvas(footerCanvas, y)
  }

  pdf.save(`${nomeArquivo}.pdf`)
}

// Nome do arquivo sem acento/espaço/caractere especial (evita problema de download em alguns
// navegadores/SOs).
export const paraNomeArquivo = (s) => (s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
