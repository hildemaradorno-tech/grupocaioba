// Exporta a matriz de Grupo de Acessos (Governança) em Excel ou PDF, no mesmo modelo da tela:
// árvore de menus/submenus/botões nas linhas e um grupo por coluna, com o "check" no cruzamento.
// Só sai o que está marcado (respeitando a busca da tela); os menus pais dos itens marcados
// entram como contexto (sem check) só para a árvore continuar legível.

export function montarDadosExport({ menus, grupos, marcados, idsVisiveisBusca }) {
  const filhos = {}
  menus.forEach(m => { (filhos[m.pai_id || 'raiz'] ||= []).push(m) })
  Object.values(filhos).forEach(arr => arr.sort((a, b) => a.ordem - b.ordem))
  const porId = new Map(menus.map(m => [m.id, m]))
  const visivel = (m) => !idsVisiveisBusca || idsVisiveisBusca.has(m.id)
  const marcasDe = (m) => grupos.map(g => marcados.has(`${g.id}::${m.id}`))

  const incluidos = new Set()
  menus.forEach(m => {
    if (!visivel(m) || !marcasDe(m).some(Boolean)) return
    let c = m
    while (c && !incluidos.has(c.id)) { incluidos.add(c.id); c = c.pai_id ? porId.get(c.pai_id) : null }
  })

  const linhas = []
  const visitar = (m, nivel) => {
    if (!incluidos.has(m.id)) return
    const marcas = marcasDe(m)
    linhas.push({ nome: m.nome, nivel, marcas, contexto: !marcas.some(Boolean) })
    ;(filhos[m.id] || []).forEach(f => visitar(f, nivel + 1))
  }
  ;(filhos.raiz || []).forEach(r => visitar(r, 0))

  // Só as colunas de grupos que têm algum item marcado no que está sendo exportado.
  const usados = grupos.map((_, i) => linhas.some(l => l.marcas[i]))
  return {
    grupos: grupos.filter((_, i) => usados[i]),
    linhas: linhas.map(l => ({ ...l, marcas: l.marcas.filter((_, i) => usados[i]) })),
  }
}

const agora = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return { texto: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`, arquivo: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
}

const baixar = (blob, nome) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const textoFiltro = (busca) => (busca ? `Filtro: busca "${busca}"` : 'Sem filtro de busca')

export async function exportarExcel({ sistema, busca, dados }) {
  const { default: ExcelJS } = await import('exceljs')
  const { grupos, linhas } = dados
  const { texto, arquivo } = agora()
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Grupo de Acessos')
  const nCols = 1 + grupos.length

  ws.mergeCells(1, 1, 1, Math.max(nCols, 2))
  ws.getCell(1, 1).value = `Grupo de Acessos — ${sistema}`
  ws.getCell(1, 1).font = { bold: true, size: 14 }
  ws.mergeCells(2, 1, 2, Math.max(nCols, 2))
  ws.getCell(2, 1).value = `${textoFiltro(busca)} · somente itens marcados · gerado em ${texto}`
  ws.getCell(2, 1).font = { size: 9, color: { argb: 'FF64748B' } }

  const cab = ws.getRow(4)
  cab.getCell(1).value = 'Menu / Submenu / Botões'
  grupos.forEach((g, i) => { cab.getCell(2 + i).value = g.nome })
  cab.height = 150
  cab.eachCell((cell, col) => {
    cell.font = { bold: true, size: 9, color: { argb: 'FF334155' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
    cell.alignment = col === 1
      ? { vertical: 'middle', horizontal: 'left' }
      : { textRotation: 90, vertical: 'bottom', horizontal: 'center', wrapText: false }
  })

  linhas.forEach((l, idx) => {
    const row = ws.getRow(5 + idx)
    const c = row.getCell(1)
    c.value = l.nome
    c.alignment = { indent: l.nivel * 2, vertical: 'middle' }
    c.font = { bold: l.nivel === 0, size: 10, color: { argb: l.contexto ? 'FF94A3B8' : 'FF1E293B' } }
    l.marcas.forEach((marcado, i) => {
      const g = row.getCell(2 + i)
      if (marcado) {
        g.value = '✓'
        g.font = { bold: true, size: 11, color: { argb: 'FF16A34A' } }
        g.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })
    if (idx % 2 === 1) row.eachCell({ includeEmpty: true }, cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } })
  })

  ws.getColumn(1).width = 70
  grupos.forEach((_, i) => { ws.getColumn(2 + i).width = 5 })
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 4 }]

  const buffer = await wb.xlsx.writeBuffer()
  baixar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Grupo_de_Acessos_${sistema}_${arquivo}.xlsx`)
}

export async function exportarPdf({ sistema, busca, dados }) {
  const { jsPDF } = await import('jspdf')
  const { grupos, linhas } = dados
  const { texto, arquivo } = agora()
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const PW = pdf.internal.pageSize.getWidth()
  const PH = pdf.internal.pageSize.getHeight()
  const M = 28
  const ROW_H = 13
  const COL_G = 16 // largura de cada coluna de grupo
  const larguraGrupos = grupos.length * COL_G
  const larguraNome = Math.max(220, PW - 2 * M - larguraGrupos)
  const totalW = larguraNome + larguraGrupos

  // Altura do cabeçalho = maior nome de grupo (escrito de pé), com teto.
  pdf.setFontSize(7)
  pdf.setFont(undefined, 'bold')
  const CAB_MAX = 150
  const alturaCab = Math.min(CAB_MAX, Math.max(30, ...grupos.map(g => pdf.getTextWidth(g.nome) + 10)))
  const truncar = (t, largura) => {
    let r = t
    while (r.length > 1 && pdf.getTextWidth(r) > largura) r = r.slice(0, -1)
    return r.length < t.length ? `${r.slice(0, -1)}…` : r
  }

  const desenharCabecalhoPagina = () => {
    pdf.setFont(undefined, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(30, 41, 59)
    pdf.text(`Grupo de Acessos — ${sistema}`, M, M)
    pdf.setFont(undefined, 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 116, 139)
    pdf.text(`${textoFiltro(busca)} · somente itens marcados · gerado em ${texto}`, M, M + 12)
    const y0 = M + 20
    pdf.setFillColor(241, 245, 249)
    pdf.rect(M, y0, totalW, alturaCab, 'F')
    pdf.setFont(undefined, 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(51, 65, 85)
    pdf.text('Menu / Submenu / Botões', M + 4, y0 + alturaCab - 6)
    pdf.setFontSize(7)
    grupos.forEach((g, i) => {
      const x = M + larguraNome + i * COL_G + COL_G / 2 + 2.5
      pdf.text(truncar(g.nome, alturaCab - 8), x, y0 + alturaCab - 4, { angle: 90 })
    })
    pdf.setDrawColor(203, 213, 225)
    pdf.line(M, y0 + alturaCab, M + totalW, y0 + alturaCab)
    return y0 + alturaCab
  }

  let y = desenharCabecalhoPagina()
  linhas.forEach((l, idx) => {
    if (y + ROW_H > PH - M) {
      pdf.addPage()
      y = desenharCabecalhoPagina()
    }
    if (idx % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(M, y, totalW, ROW_H, 'F') }
    pdf.setFont(undefined, l.nivel === 0 ? 'bold' : 'normal')
    pdf.setFontSize(8)
    if (l.contexto) pdf.setTextColor(148, 163, 184); else pdf.setTextColor(30, 41, 59)
    const recuo = 4 + l.nivel * 10
    pdf.text(truncar(l.nome, larguraNome - recuo - 4), M + recuo, y + ROW_H - 4)
    pdf.setDrawColor(22, 163, 74)
    pdf.setLineWidth(1.1)
    l.marcas.forEach((marcado, i) => {
      if (!marcado) return
      const cx = M + larguraNome + i * COL_G + COL_G / 2
      const cy = y + ROW_H / 2
      pdf.line(cx - 3, cy, cx - 1, cy + 2.5)
      pdf.line(cx - 1, cy + 2.5, cx + 3.5, cy - 3)
    })
    y += ROW_H
  })

  const paginas = pdf.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    pdf.setPage(p)
    pdf.setFont(undefined, 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(148, 163, 184)
    pdf.text(`Página ${p} de ${paginas}`, PW - M, PH - 12, { align: 'right' })
  }
  pdf.save(`Grupo_de_Acessos_${sistema}_${arquivo}.pdf`)
}
