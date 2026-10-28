// Textos do BI Planos de Manutenção: objetivo/cálculo do botão ⓘ dos cards e indicadores do Resumo
// (BiPlanosManutencao.jsx) e o conteúdo do Manual operacional (BiPlanosManutencaoManual.jsx).
// Ao mudar uma regra do BI, atualizar aqui também.

// Textos do botão ⓘ de cada card/indicador do Resumo (objetivo, fonte, cálculo, filtros).
const ARQ_VENDAS = 'REL_VEICULOSVENDIDOSPORPERIODO_REPORT'
const ARQ_OS = 'ROF042_FaturamentoServicosProdutivos_Excel (só O.S. tipo P04)\nROF017_FATURAMENTOPOROS (data de abertura da O.S.)'
const ARQ_CONTRATOS = 'Potencial Renovação'
// "Filtros e regras" do botão ⓘ: os seletores da tela que mexem no número + as regras fixas do cálculo.
const FILTRO_VENDAS = 'Filtros da tela: Data (data de emissão da nota de venda) · Empresas · Tipo de veículo vendido (Novo/Usado).\n'
  + 'Regras: • só veículos da marca DAF • só notas de venda (VEN); devolução (DVE) desconta • notas canceladas ficam fora • cada chassi conta uma vez'
const REGRAS_OS = 'Regras das O.S.: • só O.S. tipo P04 (Plano Manut DAF MultiSuporte) • TMO PLAN01 = novo contrato, PLAN02 = renovação • a O.S. tem que ser aberta na data da venda ou depois • O.S. de qualquer data (não usa o filtro Data)'
const FILTRO_RENOV = 'Filtros da tela: Data (fim do contrato). Não usa Empresas nem Tipo de veículo: o arquivo de contratos não traz essas informações.\n'
  + 'Regras: • só contratos com status Expirado (Prazo ou KM); Cancelado e os demais ficam fora • cada linha do arquivo (chassi do contrato) conta uma vez'
const REGRAS_RENOVADO = 'Regras da renovação: • depois do fim do contrato, o chassi tem O.S. P04 (qualquer TMO) ou um novo contrato que começa até 90 dias antes do fim e termina depois dele • se todos os novos contratos estiverem Cancelados, não conta como renovado'
// "Colunas utilizadas" do botão ⓘ: as colunas de cada relatório que entram no cálculo.
const COL_VENDAS = 'REL_VEICULOSVENDIDOSPORPERIODO_REPORT:\n'
  + '• Veiculo_Chassi (chassi) • NotaFiscal_DataEmissao (data da venda) • NotaFiscal_GrupoMovimento (VEN/DVE) • NotaFiscal_DataCancelamento (cancelada) • VeiculoMarca_Descricao (marca DAF) • NotaFiscal_EstoqueTipo (VN novo / VU usado) • NotaFiscal_EmpresaNom (empresa)'
const COL_OS = 'ROF042_FaturamentoServicosProdutivos_Excel:\n'
  + '• Chassi • Tipo O.S. (P04) • O.S. (número) • TMO Referência (PLAN01/PLAN02) • Data Encerramento • NF Data • Empresa\n'
  + 'ROF017_FATURAMENTOPOROS:\n'
  + '• OS_Numero + Veiculo_Chassi (ligação com o ROF042) • OS_DataCriacao (data de abertura da O.S.)'
const COL_CONTRATOS = 'Potencial Renovação:\n'
  + '• Chassi (final do chassi, 8 caracteres) • Contrato • Início Contrato (Contrato) (Contrato DMS) • Fim Contrato (Contrato) (Contrato DMS) • Razão do Status'
export const INFO_RESUMO = {
  vendidos: {
    objetivo: 'Mostrar quantos veículos DAF foram vendidos no período: é a base de oportunidade de contrato novo.',
    fonte: ARQ_VENDAS,
    calculo: 'Chassis distintos com venda (VEN) no período, descontando devoluções (DVE). Chassi vendido e devolvido não conta; devolvido e revendido conta uma vez.',
    filtros: FILTRO_VENDAS,
    colunas: COL_VENDAS,
  },
  novos: {
    objetivo: 'Mostrar quantos dos veículos vendidos fecharam um contrato novo de Plano de Manutenção.',
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}\n${ARQ_CONTRATOS} (só quando a O.S. não tem TMO PLAN01/PLAN02: verifica se o chassi já tinha contrato antes da venda)`,
    calculo: 'Dos veículos vendidos no período, os que têm O.S. P04 do mesmo chassi aberta na data da venda ou depois, com TMO PLAN01 (Novo contrato) — ou sem PLAN01/PLAN02 e sem contrato anterior do chassi.',
    filtros: `${FILTRO_VENDAS}\n${REGRAS_OS}`,
    colunas: `${COL_VENDAS}\n${COL_OS}\n${COL_CONTRATOS}`,
  },
  semContrato: {
    objetivo: 'Mostrar os veículos vendidos que ainda não têm Plano de Manutenção: oportunidade em aberto de contrato novo.',
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}\n${ARQ_CONTRATOS} (só quando a O.S. não tem TMO PLAN01/PLAN02: verifica se o chassi já tinha contrato antes da venda)`,
    calculo: 'Veículos vendidos no período sem nenhuma O.S. P04 do chassi aberta na data da venda ou depois (Situação contrato = Sem contrato).',
    filtros: `${FILTRO_VENDAS}\n${REGRAS_OS}`,
    colunas: `${COL_VENDAS}\n${COL_OS}\n${COL_CONTRATOS}`,
  },
  aRenovar: {
    objetivo: 'Mostrar a oportunidade de renovação: contratos que venceram no período.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos (um por chassi) com Fim do contrato dentro do período e status Expirado (Prazo ou KM). Cancelados e demais status ficam fora.',
    filtros: FILTRO_RENOV,
    colunas: COL_CONTRATOS,
  },
  renovados: {
    objetivo: 'Mostrar quantos dos contratos vencidos no período foram renovados.',
    fonte: `${ARQ_CONTRATOS}\n${ARQ_OS}`,
    calculo: 'Dos contratos a serem renovados, os que têm, depois do fim: O.S. P04 do chassi (pela abertura) ou um novo contrato do chassi que começa até 90 dias antes do fim e termina depois dele. Se todos os novos contratos estiverem Cancelados, não conta.',
    filtros: `${FILTRO_RENOV}\n${REGRAS_RENOVADO}`,
    colunas: `${COL_CONTRATOS}\n${COL_OS}`,
  },
  semRenovacao: {
    objetivo: 'Mostrar os contratos vencidos no período que não foram renovados: oportunidade de renovação em aberto.',
    fonte: `${ARQ_CONTRATOS}\n${ARQ_OS}`,
    calculo: 'Contratos a serem renovados − Contratos renovados (os mesmos que aparecem como "Não renovado" na aba Planos de Manutenção).',
    filtros: `${FILTRO_RENOV}\n${REGRAS_RENOVADO}`,
    colunas: `${COL_CONTRATOS}\n${COL_OS}`,
  },
  gaugeNovos: {
    objetivo: 'Medir a taxa de conversão de veículos vendidos em contrato novo de Plano de Manutenção.',
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}\n${ARQ_CONTRATOS} (só quando a O.S. não tem TMO PLAN01/PLAN02: verifica se o chassi já tinha contrato antes da venda)`,
    calculo: 'Contratos novos ÷ Veículos vendidos × 100.',
    filtros: `${FILTRO_VENDAS}\n${REGRAS_OS}`,
    colunas: `${COL_VENDAS}\n${COL_OS}\n${COL_CONTRATOS}`,
  },
  gaugeRenovados: {
    objetivo: 'Medir a taxa de renovação dos contratos que venceram no período.',
    fonte: `${ARQ_CONTRATOS}\n${ARQ_OS}`,
    calculo: 'Contratos renovados ÷ Contratos a serem renovados × 100.',
    filtros: `${FILTRO_RENOV}\n${REGRAS_RENOVADO}`,
    colunas: `${COL_CONTRATOS}\n${COL_OS}`,
  },
  gaugePotencial: {
    objetivo: 'Medir o aproveitamento geral das duas oportunidades do período: vendas (contrato novo) e contratos vencendo (renovação).',
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}\n${ARQ_CONTRATOS}`,
    calculo: '(Contratos novos + Contratos renovados) ÷ (Veículos vendidos + Contratos a serem renovados) × 100.',
    filtros: 'Filtros da tela: Data · Empresas e Tipo de veículo vendido (só na parte de vendas; a parte de renovação usa só a Data, pelo fim do contrato).\nRegras: as mesmas dos cards de vendas (só DAF, só P04, PLAN01 = novo, O.S. depois da venda) e de renovação (só Expirado, O.S. P04 ou novo contrato depois do fim)',
    colunas: `${COL_VENDAS}\n${COL_OS}\n${COL_CONTRATOS}`,
  },
}

// ── Manual operacional do BI (botão "Manual" no cabeçalho) ─────────────────────────────────────────────────
// Reúne o que não cabe no ⓘ: fontes, filtros e regras, colunas usadas, abas, seletores e pop-ups.
export const MANUAL_RESUMO = [
  ['Indicador — Contratos novos', 'gaugeNovos'],
  ['Indicador — Contratos renovados', 'gaugeRenovados'],
  ['Indicador — Potencial', 'gaugePotencial'],
  ['Card — Veículos vendidos (por chassi)', 'vendidos'],
  ['Card — Contratos novos', 'novos'],
  ['Card — Sem contrato', 'semContrato'],
  ['Card — Contratos a serem renovados', 'aRenovar'],
  ['Card — Contratos renovados', 'renovados'],
  ['Card — Sem contrato renovado', 'semRenovacao'],
]
export const MANUAL_GERAL = [
  {
    titulo: 'Visão geral',
    itens: [
      ['Para que serve', 'Acompanhar os Planos de Manutenção DAF: quantos veículos vendidos fecharam contrato novo, quantos contratos venceram no período (oportunidade de renovação) e quantos foram renovados.'],
      ['Abas', 'Resumo (indicadores e cards) · Veículos Vendidos · Ordens de Serviço · Planos de Manutenção.'],
      ['Empresas', 'Só as empresas do agrupamento Trucks.'],
    ],
  },
  {
    titulo: 'Fontes (relatórios)',
    itens: [
      ['REL_VEICULOSVENDIDOSPORPERIODO_REPORT', 'Vendas e devoluções de veículos (Dealer.net). Um arquivo por ano.'],
      ['ROF042_FaturamentoServicosProdutivos_Excel', 'Serviços faturados por O.S. (Dealer.net). Só as O.S. tipo P04 (Plano Manut DAF MultiSuporte) são usadas. Um arquivo por ano ou por mês.'],
      ['ROF017_FATURAMENTOPOROS', 'Relatório Geral de O.S.: usado só para a data de abertura da O.S. (o ROF042 não tem). Lido em segundo plano: a abertura aparece a partir da atualização seguinte.'],
      ['Potencial Renovação', 'Contratos de Plano de Manutenção exportados do CRM DAF (uma linha por chassi do contrato).'],
    ],
  },
  {
    titulo: 'Cabeçalho',
    itens: [
      ['Empresas', 'Filtra vendas e O.S. pela empresa. O arquivo de contratos não traz a empresa, então não filtra os contratos.'],
      ['Data', 'Período do BI (padrão: do dia 1 do mês até ontem). As setas ‹ › pulam para o mês anterior/seguinte.'],
      ['Atualizar (botão azul)', 'Relê os relatórios. Só baixa de novo os arquivos que mudaram; os dados ficam guardados por 5 minutos.'],
    ],
  },
]
export const MANUAL_ABAS = [
  {
    titulo: 'Aba Veículos Vendidos',
    itens: [
      ['O que lista', 'Chassis DAF vendidos no período (venda menos devolução), com os dados da venda mais recente de cada chassi.'],
      ['Colunas', 'Data venda · Empresa · Chassi · Marca · Modelo · Tipo (Novo/Usado) · Cliente · Situação contrato.'],
      ['Situação contrato', 'Novo contrato: O.S. P04 do chassi aberta na data da venda ou depois, com TMO PLAN01 (ou sem PLAN01/PLAN02 e sem contrato anterior).\nRenovação de contrato: O.S. P04 após a venda com TMO PLAN02 (ou o chassi já tinha contrato antes da venda).\nSem contrato: nenhuma O.S. P04 do chassi após a venda.'],
      ['Seletores', 'Tipo (Novo/Usado) · Situação contrato · Buscar chassi (ignora o filtro de data e procura em todo o histórico).'],
      ['Lupa (pop-up)', 'Mostra as O.S. P04 após a venda (abertura, chassi, placa, NF, TMOs e valores) e os contratos do chassi no Potencial Renovação, com o play verde no contrato que realmente deu início.'],
    ],
  },
  {
    titulo: 'Aba Ordens de Serviço',
    itens: [
      ['O que lista', 'Linhas (TMOs) das O.S. tipo P04 do ROF042 com NF no período, nas empresas selecionadas. A mesma O.S. pode aparecer em várias linhas.'],
      ['Colunas', 'Data NF · NF · O.S. · Chassi · TMO · Descrição · Valor Total (Serviços + Produtos).'],
      ['Seletores', 'Buscar chassi (ignora o filtro de data).'],
    ],
  },
  {
    titulo: 'Aba Planos de Manutenção',
    itens: [
      ['O que lista', 'Contratos do Potencial Renovação (uma linha por chassi do contrato).'],
      ['Colunas', 'Contrato · Cliente · Chassi · Tipo · Início · Fim · Status (com cor por grupo) · Contrato (origem) · Grupo.'],
      ['Data (seletor)', 'Início e Fim (padrão): início OU fim no período · Início: só o início · Fim: só o fim.'],
      ['Status (seletor)', 'Um ou mais status do CRM DAF.'],
      ['Contrato (seletor e coluna)', 'Renovado: contrato Expirado que foi renovado (O.S. P04 ou novo contrato após o fim, este começando até 90 dias antes do fim), ou o contrato que veio da renovação.\nNão renovado: Expirado sem nada depois.\nSubstituição: contrato Cancelado trocado por outro do mesmo chassi, ou o contrato que entrou no lugar.\nNovo: 1º contrato do chassi, ou contrato a mais com o anterior ainda vigente.\nEm validação: status Validar Serviço, Minuta Solicitada, Aguardando Assinatura ou Pendente de Contrato.\nEm branco: Cancelado sem troca.'],
      ['Excluir cancelados', 'Marcado por padrão: esconde os contratos Cancelados.'],
      ['Ver todos (sem filtro de data)', 'Mostra os contratos de qualquer data; os seletores continuam valendo.'],
      ['Lupa (pop-up)', 'Renovado: onde foi renovado (O.S. P04 e novo contrato). Substituição: o contrato do par. Em validação: de qual contrato vem a transição e as O.S. P04 do chassi. O play verde marca o contrato que realmente deu início.'],
    ],
  },
  {
    titulo: 'Ordenação e busca',
    itens: [
      ['Ordenar', 'Clique no título da coluna: 1º clique crescente, 2º decrescente, 3º volta à ordem original.'],
      ['Buscar chassi', 'Campo único para as três abas; aceita parte do chassi e ignora o filtro de data.'],
    ],
  },
]
