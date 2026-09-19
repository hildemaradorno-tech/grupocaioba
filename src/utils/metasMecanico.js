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
