// Quem entra nas telas de comissões (Comissões - DAF / HONDA) — compartilhado com o Processamento
// de Comissões, que lista os mesmos Empresa × Setor mesmo antes do primeiro cálculo.

// Agrupamentos de Empresas de cada tela de cálculo (Comissões - DAF e Comissões - HONDA).
export const AGRUPAMENTOS_COMISSAO = ['Caiobá Trucks', 'Caiobá Motos']

// Mesmo critério de "Situação (Ativo) = Sim" usado em Funcionarios.jsx: sem data de demissão e
// situação vazia, "1 - Trabalhando" ou "9 - Férias" (exclui Demitido e qualquer outro Afastado).
const SITUACAO_FERIAS = '9'
export const funcionarioAtivoComissao = (f) =>
  !f.data_demissao && (!f.situacao_funcionario || f.situacao_funcionario === '1' || f.situacao_funcionario === SITUACAO_FERIAS)

// Mesma lógica de match funcionário -> política já usada em Funcionarios.jsx: cargo +
// agrupamento de empresa, com fallback só pro cargo se não achar por agrupamento. Retorna
// TODAS as políticas que baterem (não só a primeira) — um cargo pode ter uma política pra
// Peças e outra pra Serviços, cada uma com sua própria Fonte/Base, e os valores se somam.
export function resolvePoliticas(funcionario, politicas, empresasMap) {
  if (!funcionario.cargo_id) return []
  const agrupId = empresasMap[funcionario.empresa_id]?.agrupamento_empresa_id || null
  const porAgrupamento = agrupId
    ? politicas.filter(p => p.cargo_id === funcionario.cargo_id && p.agrupamento_empresa_id === agrupId && p.ativo !== false)
    : []
  if (porAgrupamento.length > 0) return porAgrupamento
  return politicas.filter(p => p.cargo_id === funcionario.cargo_id && p.ativo !== false)
}

// Fonte da política: a Fonte SharePoint dela, ou (Base ligada a uma Fonte MicroWork) a fonte do
// relatório MicroWork.
export const fonteDaPolitica = (politica) => {
  const fonteMw = politica.base_calculo?.fonte_microwork || null
  return politica.fonte_calculo || (fonteMw ? { ...fonteMw, _microwork: true } : null)
}

// Política resolvida de ponta a ponta (fonte + base configuradas) — sem isso o funcionário não
// entra na tela de cálculo.
export const politicaConfigurada = (politica) => {
  const baseCalc = politica.base_calculo || null
  const fonte = fonteDaPolitica(politica)
  if (!fonte || !baseCalc) return false
  if (!fonte._microwork && (!fonte.pasta_sharepoint || !fonte.prefixo_arquivo)) return false
  if (!baseCalc.coluna_valor) return false
  if (politica.nivel_calculo === 'INDIVIDUAL' && !fonte.coluna_funcionario) return false
  return true
}
