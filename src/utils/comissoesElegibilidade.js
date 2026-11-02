// Quem entra nas telas de comissões (Comissões - DAF / HONDA / GRUPO) — compartilhado com o Processamento
// de Comissões, que lista os mesmos Empresa × Setor mesmo antes do primeiro cálculo.

// Agrupamentos de Empresas de cada tela de cálculo (Comissões - DAF, HONDA e GRUPO).
export const AGRUPAMENTOS_COMISSAO = ['Caiobá Trucks', 'Caiobá Motos', 'Outras Caiobá']

// Empresa "visual" (flag no cadastro de Empresas, ex: CAIOBÁ TRUCKS / CAIOBÁ MOTOS / GRUPO CAIOBÁ):
// só existe pra agrupar/exibir — nunca aparece como opção nos seletores do menu Comissões.
export const empresaSelecionavel = (e) => !!e && e.ativo !== false && !e.empresa_visual

// Flag "Processa Comissões" (cadastro de Empresas): só essas aparecem nas telas de Comissões
// (DAF/HONDA/Prestadores de Serviços) e no Processamento de Comissões.
export const empresaProcessaComissao = (e) => empresaSelecionavel(e) && e.processa_comissoes === true

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
  // Desconto PJ (menu Descontos PJ): valor fixo, % sobre regras ou valor lançado no mês.
  if (politica.pj_desconto) {
    const d = politica.pj_desconto
    if (d.tipo === 'FIXO') return Number(d.valor) > 0
    if (d.tipo === 'PERCENTUAL') return (d.itens || []).length > 0
    return d.tipo === 'LANCADO'
  }
  // Regra PJ "Variáveis": só agrupa políticas no Processamento — não calcula nada sozinha.
  if (politica.pj_variaveis) return false
  // Regra PJ "Bonificação por Meta": precisa de empresas, Bases do realizado e faixas.
  if (politica.pj_bonificacao) {
    const b = politica.pj_bonificacao
    return (b.empresa_ids || []).length > 0 && (b.base_ids || []).length > 0 && (b.faixas || []).length > 0
      && (b.modo !== 'MARGEM' || (b.lucro_base_ids || []).length > 0)
  }
  // Regra PJ "Coparticipação": % sobre o boleto lançado, dividido entre as empresas marcadas.
  if (politica.pj_coparticipacao) {
    return Number(politica.pj_coparticipacao.percentual) > 0 && (politica.pj_coparticipacao.empresas || []).length > 0
  }
  // Regra PJ "Percentual": % sobre outras regras PJ (Valor fixo / Variáveis).
  if (politica.pj_percentual) return (politica.pj_percentuais || []).length > 0
  // Regra PJ (tela Regras PJ): valor fixo da prestação, sem Fonte/Base.
  if (politica.prestacao_pj) return politica.comissao_valor != null
  const baseCalc = politica.base_calculo || null
  const fonte = fonteDaPolitica(politica)
  if (!fonte || !baseCalc) return false
  if (!fonte._microwork && (!fonte.pasta_sharepoint || !fonte.prefixo_arquivo)) return false
  if (!baseCalc.coluna_valor) return false
  if (politica.nivel_calculo === 'INDIVIDUAL' && !fonte.coluna_funcionario) return false
  return true
}
