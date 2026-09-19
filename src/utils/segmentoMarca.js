// Nível acima da Empresa nas árvores de Metas: "SEGMENTO - MARCA" (ex.: MOTOS - HONDA, CAMINHÕES - DAF).
export function rotuloSegmentoMarca(empresa) {
  const seg = String(empresa?.segmento_nome || '').trim().toUpperCase()
  const marca = String(empresa?.marca || '').trim().toUpperCase()
  if (seg && marca) return `${seg} - ${marca}`
  return seg || marca || 'SEM SEGMENTO'
}

// entries: [[empresaId, nodeDaEmpresa], ...]; devolve [[rotulo, entries], ...] ordenado pelo rótulo.
export function agruparPorSegmento(entries, empresas) {
  const porId = Object.fromEntries((empresas || []).map(e => [e.id, e]))
  const grupos = {}
  entries.forEach(([eid, emp]) => {
    const rotulo = rotuloSegmentoMarca(porId[eid])
    if (!grupos[rotulo]) grupos[rotulo] = []
    grupos[rotulo].push([eid, emp])
  })
  return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
}
