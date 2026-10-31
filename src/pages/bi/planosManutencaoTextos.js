// Textos do BI Planos de Manutenção: objetivo/cálculo do botão ⓘ dos cards e indicadores do Resumo
// (BiPlanosManutencao.jsx) e o conteúdo do Manual operacional (BiPlanosManutencaoManual.jsx).
// Ao mudar uma regra do BI, atualizar aqui também.

// Textos do botão ⓘ de cada card/indicador do Resumo (objetivo, fonte, cálculo, filtros).
const ARQ_VENDAS = 'REL_VEICULOSVENDIDOSPORPERIODO_REPORT'
const ARQ_OS = 'ROF017_FATURAMENTOPOROS (só O.S. tipo P04)'
const ARQ_CONTRATOS = 'CRM DAF - Plano de Manutenção - Potencial Renovação'
// "Regras" e "Colunas utilizadas" do manual. Formato, uma informação por linha:
//   linha terminada em ":"  → subtítulo
//   "• texto"               → item de lista
//   "• Coluna — para quê"   → linha da tabela de colunas (coluna à esquerda, uso à direita)
const FILTRO_VENDAS = [
  'Regras das vendas:',
  '• Só veículos da marca DAF',
  '• Só notas de venda (VEN); a devolução (DVE) desconta',
  '• Notas canceladas ficam fora',
  '• Cada chassi conta uma vez',
].join('\n')
const REGRAS_OS = [
  'Regras das O.S.:',
  '• Só O.S. tipo P04 (Plano Manut DAF MultiSuporte)',
  '• TMO 3216 (PLAN01) = novo contrato',
  '• TMO 3218 (PLAN02) = renovação',
  '• A O.S. tem que ser aberta na data da venda ou depois',
  '• O filtro Data vale para a data da venda, não para a O.S.: um veículo vendido em setembro com O.S. de contrato aberta em outubro conta como contrato novo em setembro',
].join('\n')
const FILTRO_RENOV = [
  'Regras dos contratos:',
  '• Só contratos com status Expirado (Prazo ou KM)',
  '• Cancelado e os demais status ficam fora',
  '• Cada linha do arquivo (chassi do contrato) conta uma vez',
].join('\n')
const REGRAS_RENOVADO = [
  'Regras da renovação:',
  '• Depois do fim do contrato, o chassi tem O.S. P04 (qualquer TMO) ou um novo contrato que começa até 90 dias antes do fim e termina depois dele',
  '• Se todos os novos contratos estiverem Cancelados, não conta como renovado',
].join('\n')
const COL_VENDAS = [
  'REL_VEICULOSVENDIDOSPORPERIODO_REPORT:',
  '• Veiculo_Chassi — chassi',
  '• NotaFiscal_DataEmissao — data da venda',
  '• NotaFiscal_GrupoMovimento — VEN (venda) / DVE (devolução)',
  '• NotaFiscal_DataCancelamento — nota cancelada (preenchida)',
  '• VeiculoMarca_Descricao — marca (só DAF)',
  '• NotaFiscal_EstoqueTipo — VN (novo) / VU (usado)',
  '• NotaFiscal_EmpresaNom — empresa',
].join('\n')
const COL_OS = [
  'ROF017_FATURAMENTOPOROS:',
  '• TipoOS_Sigla — tipo da O.S. (só P04)',
  '• Veiculo_Chassi — chassi',
  '• OS_Numero — número da O.S.',
  '• OS_DataCriacao — data de abertura da O.S.',
  '• NotaFiscalItem_TMOCod — 3216 = PLAN01 (novo contrato) · 3218 = PLAN02 (renovação)',
  '• TMOProdDesc — descrição do TMO',
  '• NotaFiscal_Numero — número da NF',
  '• OSData_Faturamento — data da NF',
  '• ServValor + ProdValor — valor (serviços + peças)',
  '• Empresa_Nome — empresa',
  '• OS_VeiculoPlaca — placa',
].join('\n')
const COL_CONTRATOS = [
  'CRM DAF - Plano de Manutenção - Potencial Renovação:',
  '• Chassi — final do chassi (8 caracteres)',
  '• Contrato — número do contrato',
  '• Início Contrato (Contrato) (Contrato DMS) — início',
  '• Fim Contrato (Contrato) (Contrato DMS) — fim',
  '• Razão do Status — status (Expirado, Cancelado...)',
].join('\n')
const FILTRO_POTENCIAL = [
  'Regras:',
  '• Parte de vendas: as mesmas do card Contratos novos (só DAF, só P04, PLAN01 = novo, O.S. aberta depois da venda)',
  '• Parte de renovação: as mesmas dos cards de renovação (só Expirado, O.S. P04 ou novo contrato depois do fim)',
].join('\n')
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
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}`,
    calculo: 'Dos veículos vendidos no período, os que têm O.S. P04 do mesmo chassi aberta na data da venda ou depois, com TMO PLAN01 (código 3216 — Novo contrato).',
    filtros: `${FILTRO_VENDAS}\n${REGRAS_OS}`,
    colunas: `${COL_VENDAS}\n${COL_OS}\n${COL_CONTRATOS}`,
  },
  semContrato: {
    objetivo: 'Mostrar os veículos vendidos que ainda não têm Plano de Manutenção: oportunidade em aberto de contrato novo.',
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}`,
    calculo: 'Veículos vendidos no período sem O.S. P04 do chassi com TMO PLAN01 ou PLAN02 aberta na data da venda ou depois (Situação contrato = Sem contrato).',
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
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}`,
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
    fonte: `${ARQ_VENDAS}\n${ARQ_OS}\n${ARQ_CONTRATOS}` + ' (só na parte de renovação)',
    calculo: '(Contratos novos + Contratos renovados) ÷ (Veículos vendidos + Contratos a serem renovados) × 100.',
    filtros: FILTRO_POTENCIAL,
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
      ['ROF017_FATURAMENTOPOROS', 'Relatório Geral de O.S. (Dealer.net), um arquivo por ano. Só as O.S. tipo P04 (Plano Manut DAF MultiSuporte), de 2024 em diante. Traz a abertura da O.S., a NF e o TMO: 3216 = PLAN01 (novo contrato) e 3218 = PLAN02 (renovação).'],      ['CRM DAF - Plano de Manutenção - Potencial Renovação', 'Contratos de Plano de Manutenção exportados do CRM DAF (uma linha por chassi do contrato).'],
    ],
  },
  {
    titulo: 'Cabeçalho',
    itens: [
      ['Empresas', 'Filtra vendas e O.S. pela empresa. O arquivo de contratos não traz a empresa, então não filtra os contratos.'],
      ['Data', 'Período do BI (ao abrir: do dia 1 do mês até ontem; qualquer data pode ser escolhida). As setas ‹ › pulam para o mês anterior/seguinte.'],
      ['Atualizar (botão azul)', 'Relê os relatórios. Só baixa de novo os arquivos que mudaram; os dados ficam guardados por 5 minutos.'],
    ],
  },
]
export const MANUAL_ABAS = [
  {
    titulo: 'Aba Veículos Vendidos',
    itens: [
      ['O que lista', 'Chassis DAF vendidos no período (venda menos devolução), com os dados da venda mais recente de cada chassi.'],
      ['Situação contrato', 'Novo contrato: O.S. P04 do chassi aberta na data da venda ou depois, com TMO PLAN01 (3216).\nRenovação de contrato: O.S. P04 aberta na data da venda ou depois, com TMO PLAN02 (3218).\nSem contrato: nenhuma O.S. P04 com PLAN01/PLAN02 depois da venda (O.S. só de "Plano Manutenção OF" não conta).'],
      ['Lupa (pop-up)', 'Mostra as O.S. P04 após a venda (abertura, chassi, placa, NF, TMOs e valores) e os contratos do chassi no Potencial Renovação, com o play verde no contrato que realmente deu início.'],
    ],
  },
  {
    titulo: 'Aba Ordens de Serviço',
    itens: [
      ['O que lista', 'Itens (TMOs) das O.S. tipo P04 do ROF017 com NF no período, nas empresas selecionadas. A mesma O.S. pode aparecer em várias linhas.'],
    ],
  },
  {
    titulo: 'Aba Planos de Manutenção',
    itens: [
      ['O que lista', 'Contratos do Potencial Renovação (uma linha por chassi do contrato).'],
      ['Coluna Contrato', 'Renovado: contrato Expirado que foi renovado (O.S. P04 ou novo contrato após o fim, este começando até 90 dias antes do fim), ou o contrato que veio da renovação.\nNão renovado: Expirado sem nada depois.\nSubstituição: contrato Cancelado trocado por outro do mesmo chassi, ou o contrato que entrou no lugar.\nNovo: 1º contrato do chassi, ou contrato a mais com o anterior ainda vigente.\nEm validação: status Validar Serviço, Minuta Solicitada, Aguardando Assinatura ou Pendente de Contrato.\nEm branco: Cancelado sem troca.'],
      ['Lupa (pop-up)', 'Renovado: onde foi renovado (O.S. P04 e novo contrato). Substituição: o contrato do par. Em validação: de qual contrato vem a transição e as O.S. P04 do chassi. O play verde marca o contrato que realmente deu início.'],
    ],
  },
]
