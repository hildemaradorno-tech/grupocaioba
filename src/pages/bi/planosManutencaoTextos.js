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
  '• Data da venda no mês ANTERIOR a cada mês do filtro Mês/Ano',
  '• Só veículos da marca DAF',
  '• Só notas de venda (VEN); a devolução (DVE) desconta',
  '• Notas canceladas ficam fora',
  '• Cada chassi conta uma vez',
  '• Filtra: Empresas (veículos novos e usados juntos)',
].join('\n')
const FILTRO_RENOV = [
  'Regras dos contratos a renovar:',
  '• Fim do contrato no mês ANTERIOR a cada mês do filtro Mês/Ano (como os veículos vendidos)',
  '• Só contratos com status Expirado (Prazo ou KM); Cancelado e os demais status ficam fora',
  '• Cada linha do arquivo (chassi do contrato) conta uma vez',
  '• O seletor de Empresas não filtra (o arquivo não traz a empresa)',
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
  '• OS_DataCriacao — data de abertura da O.S.',
  '• NotaFiscalItem_TMOCod — 3216 = PLAN01 (novo contrato) · 3218 = PLAN02 (renovação)',
].join('\n')
const COL_CONTRATOS = [
  'CRM DAF - Plano de Manutenção - Potencial Renovação:',
  '• Chassi — final do chassi (8 caracteres)',
  '• Contrato — número do contrato',
  '• Início Contrato (Contrato) (Contrato DMS) — início',
  '• Fim Contrato (Contrato) (Contrato DMS) — fim',
  '• Razão do Status — status (Expirado, Cancelado...)',
].join('\n')
// Contratos novos / renovados do Resumo: aba Contratos (CRM DAF), coluna Situação, pela Data de Criação.
const REGRAS_CRM = [
  'Regras dos contratos novos e renovados (aba Contratos):',
  '• Data de Criação no CRM nos meses do filtro Mês/Ano (o próprio mês, não o anterior)',
  '• Situação Novo = 1º contrato do chassi; Renovação = o chassi já teve contrato que começou antes deste',
  '• Todos os status contam, inclusive Cancelado',
  '• Cada linha do arquivo (chassi do contrato) conta uma vez',
  '• O seletor de Empresas não filtra (o arquivo não traz a empresa)',
].join('\n')
const COL_CRM = [
  'CRM DAF - Plano de Manutenção - Potencial Renovação:',
  '• Chassi — final do chassi (8 caracteres), liga os contratos do mesmo veículo',
  '• Contrato — número do contrato',
  '• Data de Criação — mês em que o contrato conta',
  '• Início Contrato (Contrato) (Contrato DMS) — ordem dos contratos do chassi (Novo × Renovação)',
].join('\n')
const FILTRO_POTENCIAL = [
  'Regras:',
  '• Contratos novos e renovados: aba Contratos, Situação Novo / Renovação, criados nos meses do filtro (todos os status)',
  '• Veículos vendidos: mês anterior a cada mês do filtro, só DAF, venda menos devolução, cada chassi uma vez',
  '• Contratos a serem renovados: só Expirado, com fim no mês anterior a cada mês do filtro',
].join('\n')
export const INFO_RESUMO = {
  vendidos: {
    objetivo: 'Mostrar quantos veículos DAF foram vendidos no mês anterior ao filtro: é a base de oportunidade de contrato novo.',
    fonte: ARQ_VENDAS,
    calculo: 'Chassis distintos com venda (VEN) no mês anterior a cada mês do filtro, descontando devoluções (DVE). Chassi vendido e devolvido não conta; devolvido e revendido conta uma vez. É a mesma lista da aba Veículos Vendidos (sem os filtros da aba).',
    filtros: FILTRO_VENDAS,
    colunas: COL_VENDAS,
  },
  novos: {
    objetivo: 'Mostrar quantos contratos novos de Plano de Manutenção foram criados nos meses do filtro.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos da aba Contratos com Situação Novo (1º contrato do chassi) e Data de Criação nos meses do filtro. Todos os status contam, inclusive Cancelado.',
    filtros: REGRAS_CRM,
    colunas: COL_CRM,
  },
  semContrato: {
    objetivo: 'Mostrar os veículos vendidos (mês anterior ao filtro) que ainda não têm Plano de Manutenção: oportunidade em aberto de contrato novo.',
    fonte: `${ARQ_VENDAS}\n${ARQ_CONTRATOS}`,
    calculo: 'Veículos vendidos (por chassi) mês anterior − Contratos novos',
    filtros: `${FILTRO_VENDAS}\n${REGRAS_CRM}`,
    colunas: `${COL_VENDAS}\n${COL_CRM}`,
  },
  aRenovar: {
    objetivo: 'Mostrar a oportunidade de renovação: contratos que venceram no mês anterior ao filtro.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos (um por chassi) com Fim do contrato no mês anterior a cada mês do filtro e status Expirado (Prazo ou KM). Cancelados e demais status ficam fora. A lista desses contratos está na aba Oportunidade de Renovação.',
    filtros: FILTRO_RENOV,
    colunas: COL_CONTRATOS,
  },
  renovados: {
    objetivo: 'Mostrar quantos contratos de renovação de Plano de Manutenção foram criados nos meses do filtro.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos da aba Contratos com Situação Renovação (o chassi já teve contrato antes) e Data de Criação nos meses do filtro. Todos os status contam, inclusive Cancelado.',
    filtros: REGRAS_CRM,
    colunas: COL_CRM,
  },
  semRenovacao: {
    objetivo: 'Mostrar os contratos vencidos no mês anterior ao filtro que não foram renovados: oportunidade de renovação em aberto.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos a serem renovados do mês anterior − Contratos renovados',
    filtros: `${FILTRO_RENOV}\n${REGRAS_CRM}`,
    colunas: `${COL_CONTRATOS}\n${COL_CRM}`,
  },
  totalOportunidades: {
    objetivo: 'Mostrar o total de oportunidades de contrato: veículos vendidos (contrato novo) e contratos vencidos (renovação).',
    fonte: `${ARQ_VENDAS}\n${ARQ_CONTRATOS}`,
    calculo: 'Veículos vendidos (por chassi) mês anterior + Contratos a serem renovados do mês anterior',
    filtros: `${FILTRO_VENDAS}\n${FILTRO_RENOV}`,
    colunas: `${COL_VENDAS}\n${COL_CONTRATOS}`,
  },
  totalRealizados: {
    objetivo: 'Mostrar o total de contratos vendidos: novos e de renovação.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos novos + Contratos renovados',
    filtros: REGRAS_CRM,
    colunas: COL_CRM,
  },
  totalNaoRealizados: {
    objetivo: 'Mostrar o total de oportunidades que ainda não viraram contrato.',
    fonte: `${ARQ_VENDAS}\n${ARQ_CONTRATOS}`,
    calculo: 'Sem contrato + Sem contrato renovado (= Oportunidades − Contratos realizados)',
    filtros: `${FILTRO_VENDAS}\n${FILTRO_RENOV}\n${REGRAS_CRM}`,
    colunas: `${COL_VENDAS}\n${COL_CONTRATOS}\n${COL_CRM}`,
  },
  gaugeNovos: {
    objetivo: 'Comparar os contratos novos criados no mês com os veículos vendidos no mês anterior.',
    fonte: `${ARQ_VENDAS}\n${ARQ_CONTRATOS}`,
    calculo: 'Contratos novos ÷ Veículos vendidos (por chassi) mês anterior × 100.',
    filtros: `${FILTRO_VENDAS}\n${REGRAS_CRM}`,
    colunas: `${COL_VENDAS}\n${COL_CRM}`,
  },
  gaugeRenovados: {
    objetivo: 'Comparar os contratos de renovação criados no mês com os contratos que venceram no mês anterior.',
    fonte: ARQ_CONTRATOS,
    calculo: 'Contratos renovados ÷ Contratos a serem renovados do mês anterior × 100.',
    filtros: `${REGRAS_CRM}\n${FILTRO_RENOV}`,
    colunas: `${COL_CRM}\n${COL_CONTRATOS}`,
  },
  gaugePotencial: {
    objetivo: 'Medir o aproveitamento geral das duas oportunidades: vendas (contrato novo) e contratos vencendo (renovação).',
    fonte: `${ARQ_VENDAS}\n${ARQ_CONTRATOS}`,
    calculo: '(Contratos novos + Contratos renovados) ÷ (Veículos vendidos (por chassi) mês anterior + Contratos a serem renovados do mês anterior) × 100.',
    filtros: FILTRO_POTENCIAL,
    colunas: `${COL_VENDAS}\n${COL_CRM}\n${COL_CONTRATOS}`,
  },
}

// ── Manual operacional do BI (botão "Manual" no cabeçalho) ─────────────────────────────────────────────────
// Reúne o que não cabe no ⓘ: fontes, filtros e regras, colunas usadas, abas, seletores e pop-ups.
export const MANUAL_RESUMO = [
  ['Indicador — Contratos novos', 'gaugeNovos'],
  ['Indicador — Contratos renovados', 'gaugeRenovados'],
  ['Indicador — Potencial de contratos', 'gaugePotencial'],
  ['Card — Veículos vendidos (por chassi) mês anterior', 'vendidos'],
  ['Card — Contratos novos', 'novos'],
  ['Card — Sem contrato', 'semContrato'],
  ['Card — Contratos a serem renovados do mês anterior', 'aRenovar'],
  ['Card — Contratos renovados', 'renovados'],
  ['Card — Sem contrato renovado', 'semRenovacao'],
  ['Card — Oportunidades', 'totalOportunidades'],
  ['Card — Contratos realizados', 'totalRealizados'],
  ['Card — Contratos não realizados', 'totalNaoRealizados'],
]
export const MANUAL_GERAL = [
  {
    titulo: 'Visão geral',
    itens: [
      ['Para que serve', 'Acompanhar os Planos de Manutenção DAF: quantos contratos novos e de renovação foram vendidos (criados no CRM), comparando com os veículos vendidos e com os contratos que venceram (oportunidade de renovação).'],
    ],
  },
  {
    titulo: 'Fontes (relatórios)',
    itens: [
      ['REL_VEICULOSVENDIDOSPORPERIODO_REPORT', 'Os veículos DAF vendidos (venda menos devolução): chassi, data da venda, empresa e se é novo ou usado.'],
      ['ROF017_FATURAMENTOPOROS', 'O faturamento das O.S. de Plano de Manutenção (tipo P04).'],
      ['ROF001_OSAberta_Excel TODAS', 'Todas as O.S. de Plano de Manutenção (tipo P04) do ano, inclusive as ainda sem NF: número, abertura, chassi, valor e situação.'],
      ['CRM DAF - Plano de Manutenção - Potencial Renovação', 'Os contratos de Plano de Manutenção do CRM DAF: número, chassi, cliente, data de criação, início, fim e status.'],
    ],
  },
  {
    titulo: 'Importar arquivo',
    itens: [
      ['Importar arquivo (engrenagem)', 'Use quando o arquivo de contratos do CRM DAF no SharePoint estiver desatualizado:\n• No CRM DAF, exporte a lista Potencial Renovação em Excel (.xlsx)\n• No BI, clique na engrenagem [[engrenagem]] ao lado do botão Atualizar e escolha [[importar]]\n• Selecione o arquivo exportado\n• O sistema confere se é a exportação certa (colunas Chassi, Contrato, Início, Fim e Razão do Status) e substitui o arquivo CRM DAF - Plano de Manutenção - Potencial Renovação no SharePoint\n• Ao terminar, aparece a mensagem com a quantidade de contratos gravados e o BI já passa a usar o arquivo novo'],
      ['Quem pode', 'Só quem tem a ação Importar Arquivo do CRM DAF liberada no grupo de acesso (Grupos › BI — Planos de Manutenção). Sem ela, a engrenagem não aparece.'],
    ],
  },
  {
    titulo: 'Como informar as metas',
    itens: [
      ['Onde', 'Na aba Resultado, clique no ícone [[tabela]] Tabela (à direita, abaixo das abas). O ano é o escolhido no seletor Mês/Ano do cabeçalho. Cada mês tem uma coluna Meta (%) em Contratos novos e outra em Contratos renovados. A meta do Potencial de contratos não é digitada: é calculada a partir das duas.'],
      ['Passo a passo', '• Clique em [[editar]] (canto direito da tabela)\n• Para um mês: digite a meta (%) direto na coluna Meta de Contratos novos e/ou de Contratos renovados\n• Para vários meses de uma vez: marque as caixas [[caixa]] ao lado dos meses (a caixa no título Mês marca o ano inteiro), digite a meta no topo da tabela e clique em [[aplicar]]\n• Clique em [[salvar]] para gravar (ou [[cancelar]] para desfazer)'],
      ['Regras', '• A meta é um percentual de 0 a 100 e vale para todos os usuários\n• Cada mês tem a sua meta; mês sem meta não calcula o % e o velocímetro do Resumo fica sem a marca da meta\n• Para tirar a meta de um mês, apague o valor do campo e salve'],
      ['Quem pode', 'Só quem tem a ação Editar e Salvar Metas liberada no grupo de acesso (Grupos › BI — Planos de Manutenção). Sem ela, a tabela aparece só para consulta, sem o botão Editar metas.'],
    ],
  },
]
// Fonte de cada tabela das abas: botão ⓘ no título da tabela e item "Fonte (arquivo)" de cada aba no manual.
export const FONTE_TABELAS = {
  vendidos: [
    '• REL_VEICULOSVENDIDOSPORPERIODO_REPORT',
    '• ROF017_FATURAMENTOPOROS',
    '• CRM DAF - Plano de Manutenção - Potencial Renovação',
  ].join('\n'),
  oportunidade: [
    '• CRM DAF - Plano de Manutenção - Potencial Renovação',
    '• ROF017_FATURAMENTOPOROS',
  ].join('\n'),
  os: [
    '• ROF001_OSAberta_Excel TODAS',
    '• ROF017_FATURAMENTOPOROS',
  ].join('\n'),
  contratos: [
    '• CRM DAF - Plano de Manutenção - Potencial Renovação',
    '• ROF017_FATURAMENTOPOROS',
    '• ROF001_OSAberta_Excel TODAS',
  ].join('\n'),
}

export const MANUAL_ABAS = [
  {
    titulo: 'Resultado',
    itens: [
      ['O que mostra', 'Mês a mês do ano escolhido no cabeçalho (o seletor de meses não vale nesta aba): a meta e o resultado de Contratos novos, Contratos renovados e Potencial de contratos, com o % de cada um. O % fica verde quando bate a meta, amarelo de 80% a 99% da meta e vermelho abaixo de 80%.'],
      ['Visualização (ícones abaixo das abas)', '[[resumo]] Resumo: os indicadores e cards (seções logo abaixo).\n[[tabela]] Tabela: metas e resultados de cada mês (é onde se editam as metas).\n[[grafico]] Gráfico: um gráfico por mês em que você escolhe o indicador (Contratos novos, Contratos renovados ou Potencial de contratos) e se quer ver Quantidade (ex.: vendidos do mês anterior × contratos novos) ou % (com a meta em linha tracejada).'],
      ['Metas', 'Digitadas nesta tabela pelo botão Editar metas. O passo a passo está na seção Como informar as metas.'],
    ],
  },
  {
    titulo: 'Contratos',
    itens: [
      ['O que lista', 'Todos os contratos de Plano de Manutenção, novos e de renovação, realizados no período do filtro selecionado (pela Data de Criação do contrato no CRM).'],
      ['Fonte (arquivo)', FONTE_TABELAS.contratos],
      ['Excluir cancelados', 'Vem marcado: esconde os contratos com status Cancelado. Desmarcando, eles voltam para a tabela. Só vale no botão Todos.'],
      ['Ver todos (sem filtro de data)', 'Ignora o filtro Mês/Ano e mostra todos os contratos do arquivo, de qualquer data. Os demais filtros continuam valendo. Só vale no botão Todos.'],
      ['Lupa (Ver detalhes)', 'Aparece na Situação Renovação: mostra o contrato anterior do chassi (o que este contrato renovou) e as O.S. P04 deste contrato.'],
      ['Lupa na coluna Chassi', 'Aparece quando o veículo está no relatório de vendas: mostra a venda do veículo (data, NF, empresa, placa, modelo, novo ou usado e cliente).'],
    ],
  },
  {
    titulo: 'Oportunidade de Renovação',
    itens: [
      ['O que lista', 'Contratos de Plano de Manutenção que venceram no mês anterior ao escolhido no filtro (status Expirado por prazo ou por KM), mostrando se cada um foi renovado ou não.'],
      ['Fonte (arquivo)', FONTE_TABELAS.oportunidade],
      ['Ver todos (sem filtro de data)', 'Mostra todos os contratos com status Expirado, de qualquer data, em vez de só os que venceram no mês anterior.'],
      ['Lupa (Ver detalhes)', 'Aparece no Renovado Sim: mostra em qual novo contrato foi renovado (com o play verde no que deu início) e as O.S. P04 faturadas depois do fim.'],
    ],
  },
  {
    titulo: 'Veículos Vendidos',
    itens: [
      ['O que lista', 'Chassis DAF vendidos no mês anterior ao do filtro Mês/Ano (venda menos devolução).'],
      ['Fonte (arquivo)', FONTE_TABELAS.vendidos],
      ['Ver todos (sem filtro de data)', 'Mostra os veículos vendidos de todas as datas do relatório, em vez de só os do mês anterior.'],
      ['Lupa (Ver detalhes)', 'Aparece quando o veículo tem contrato: mostra as O.S. P04 do chassi depois da venda e os contratos do chassi no CRM.'],
    ],
  },
  {
    titulo: 'Ordens de Serviço',
    itens: [
      ['O que lista', 'As O.S. de Plano de Manutenção (tipo P04) do período do filtro, abertas ou já faturadas.'],
      ['Fonte (arquivo)', FONTE_TABELAS.os],
      ['Ver todos (sem filtro de data)', 'Mostra as O.S. de todas as datas, sem o filtro Mês/Ano.'],
    ],
  },
]
