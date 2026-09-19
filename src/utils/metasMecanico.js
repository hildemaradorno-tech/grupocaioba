const PROD_NAO_ASSOCIADA_ID = '00000000-0000-0000-0000-000000000001'

// Meta Serviços/Peças de uma linha de Metas - Mecânico, recalculada dos campos-base (horas × produtividade
// × valor/hora × coef. peças) para ficar idêntica à tela Metas - Mecânico, sem depender do valor gravado.
// Serviços é inteiro; Peças = Serviços (como exibido) × coef. peças, sem arredondar o resultado.
export function valoresMetaMecanico(row) {
  if (row.colaborador_id === PROD_NAO_ASSOCIADA_ID) {
    return { meta_servicos: Number(row.meta_servicos) || 0, meta_pecas: Number(row.meta_pecas) || 0 }
  }
  const hm = (Number(row.horas_disponiveis) || 0) * ((Number(row.produtividade) || 0) / 100)
  const vh = Number(row.valor_hora) || 0
  const cp = Number(row.coef_pecas) || 0
  const meta_servicos = Math.round(hm * vh)
  return { meta_servicos, meta_pecas: meta_servicos * cp }
}

// Resolve cargo/depto/setor/box de uma linha de meta do Mecânico: pelo cadastro atual do funcionário quando ele
// existe em /funcionarios (campos vazios no cadastro caem no que foi gravado na linha); senão só pela linha.
// Usado pela tela Metas - Mecânico e pela Total Pós-Vendas para posicionarem cada linha no mesmo lugar.
export function resolverPosicaoMecanico(row, { funcionarios, cargos, boxes, setores, departamentos }) {
  const func = funcionarios.find(f => f.id === row.colaborador_id)
  let cId, bId, sId, did
  if (func) {
    cId = func.cargo_id || row.cargo_id || '—'
    const cargoTmp = cargos.find(c => c.id === cId)
    bId = func.box_id || row.box_id || '—'
    const boxTmp = boxes.find(b => b.id === bId)
    const boxSetorIds   = boxTmp ? (Array.isArray(boxTmp.setor_ids) ? boxTmp.setor_ids : [boxTmp.setor_id]).filter(Boolean) : []
    const cargoSetorIds = cargoTmp?.setor_ids || func.setor_ids || []
    sId = boxSetorIds.find(sid => cargoSetorIds.includes(sid)) || boxSetorIds[0] || cargoSetorIds[0] || row.setor_id || '—'
    const setorTmp = setores.find(s => s.id === sId)
    did = setorTmp?.departamento_id || cargoTmp?.departamento_ids?.[0] || func.departamento_ids?.[0] || row.departamento_id || '—'
  } else {
    cId = row.cargo_id || '—'
    bId = row.box_id   || '—'
    sId = row.setor_id || '—'
    did = row.departamento_id || '—'
  }
  const cargo = cargos.find(c => c.id === cId)
  const box   = boxes.find(b => b.id === bId)
  const setor = setores.find(s => s.id === sId)
  const dept  = departamentos.find(d => d.id === did)
  return {
    func, cId, bId, sId, did,
    dNome: dept?.nome_departamento || row.departamento_nome || did,
    sNome: setor?.nome_setor       || row.setor_nome        || '—',
    bNome: box?.nome_box           || row.box_nome          || '—',
    cNome: cargo?.nome_cargo       || row.cargo_nome        || '—',
    coNome: func?.nome_funcionario || row.colaborador_nome  || row.colaborador_id,
  }
}
