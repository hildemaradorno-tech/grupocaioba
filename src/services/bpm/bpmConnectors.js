// Conectores de tarefas de serviço (service task) do motor de BPM.
// Nesta fase o motor é genérico, mas as integrações reais (SEFAZ, estoque, financeiro) ainda não
// existem — cada conector é um stub que registra a execução em `dados` da instância. Quando a
// integração de verdade for implementada, basta trocar o corpo da função aqui, sem mexer no motor.

async function validarPrazoSefaz({ dados }) {
  // Regra provisória: usa o campo informado no formulário de solicitação (dentro_prazo_sefaz).
  // Sem esse campo, assume "dentro do prazo" para não travar o fluxo.
  const dentroPrazo = dados.dentro_prazo_sefaz !== false
  return { dentro_prazo_sefaz: dentroPrazo }
}

async function emitirCancelamentoSefaz({ dados }) {
  return { sefaz_status: 'cancelamento_simulado', sefaz_processado_em: new Date().toISOString() }
}

async function emitirNfDevolucao({ dados }) {
  return { nfe_devolucao_status: 'emissao_simulada', nfe_devolucao_processada_em: new Date().toISOString() }
}

async function atualizarEstoque({ dados }) {
  return { estoque_atualizado_em: new Date().toISOString() }
}

async function atualizarFinanceiro({ dados }) {
  return { financeiro_atualizado_em: new Date().toISOString() }
}

export const BPM_CONNECTORS = {
  validar_prazo_sefaz: validarPrazoSefaz,
  emitir_cancelamento_sefaz: emitirCancelamentoSefaz,
  emitir_nf_devolucao: emitirNfDevolucao,
  atualizar_estoque: atualizarEstoque,
  atualizar_financeiro: atualizarFinanceiro,
}

export const BPM_CONNECTOR_OPCOES = Object.keys(BPM_CONNECTORS)
