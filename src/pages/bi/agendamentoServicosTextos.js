// Textos do BI Agendamento de Serviços (Mesa de Agendamento): objetivo/cálculo do botão ⓘ dos cards e
// indicadores (BiAgendamentoServicos.jsx) e o conteúdo do Manual operacional (BiAgendamentoServicosManual.jsx).
// Mesmo formato de planosManutencaoTextos.js. Ao mudar uma regra do BI, atualizar aqui também (e vice-versa):
// o manual é usado para auditoria — os números do BI têm que poder ser conferidos pelos relatórios descritos.

const ARQ_OS = 'ROF001_OSAberta_Excel TODAS'
const ARQ_AGEND = 'ROF037_AGENDAMENTOSERVICO'
const ARQ_CLIENTES_AGEND = 'ROF026_CLIENTEAGENDADO (só quando o agendamento não está no ROF037)'
const ARQ_CAMPANHA = 'RCR038_CampanhaCRM_Clientes_Excel'
const ARQ_CONTATOS = 'RCR017_LISTAPORDATACONTATOENCERRAMENTO'

// "Regras" e "Colunas utilizadas" do manual. Formato, uma informação por linha:
//   linha terminada em ":"  → subtítulo
//   "• texto"               → item de lista
//   "• Coluna — para quê"   → linha da tabela de colunas (coluna à esquerda, uso à direita)

// ── Aba Passagens ───────────────────────────────────────────────────────────────────────────────────────────
const REGRAS_OS = [
  'Regras das O.S.:',
  '• O filtro Data vale para a data de abertura da O.S. (Data Criacao)',
  '• O.S. com "Cancelada" na Situacao Tipo OS ficam fora; as pendentes de autorização contam',
  '• Cada O.S. conta uma vez (Empresa + OS Numero); o arquivo tem várias linhas por O.S.',
].join('\n')
const REGRAS_AGEND = [
  'Regras do agendamento:',
  '• A O.S. vem de agendamento quando Empresa + OS Numero aparece no ROF037 (EmpresaNome + OSNumero)',
  '• Se não estiver no ROF037, procura no ROF026 (Agendamento_EmpresaCod + OficinaServico_OSNumero)',
  '• Não importa a data do agendamento, só se a O.S. está num relatório de agendamento',
  '• Ativo = tipo Ativo · Passivo = Receptivo, Presencial ou Internet',
].join('\n')
const REGRAS_VALOR = [
  'Regras dos valores:',
  '• Soma de todas as linhas de cada O.S. (cada linha traz uma parte dos valores, ex: uma por NF)',
  '• Faturamento Total = Peças + Serviços − Descontos (como vem no relatório)',
  '• Entram as O.S. ainda não faturadas, com o valor atual da O.S.',
].join('\n')
const COL_OS = [
  `${ARQ_OS}:`,
  '• Empresa — empresa (filtro Empresas)',
  '• OS Numero — número da O.S.',
  '• Data Criacao — data de abertura (filtro Data)',
  '• Situacao Tipo OS — tira as "Cancelada"; alerta das pendentes',
  '• Tipo OS Sigla — tipo da O.S. (lista do alerta)',
  '• Consultor Nome — consultor (lista do alerta)',
  '• Agendador — conferência: agendador preenchido fora dos relatórios de agendamento',
].join('\n')
const COL_OS_VALOR = [
  `${ARQ_OS}:`,
  '• Produto — Faturamento Peças',
  '• Servico — Faturamento Serviços',
  '• Desconto — descontos (já abatidos do Total)',
  '• Total — Faturamento Total',
].join('\n')
const COL_AGEND = [
  `${ARQ_AGEND}:`,
  '• EmpresaNome — empresa da O.S.',
  '• OSNumero — número da O.S. gerada pelo agendamento',
  '• AgendamentoTipo — Ativo / Receptivo / Presencial / Internet',
  'ROF026_CLIENTEAGENDADO:',
  '• Agendamento_EmpresaCod — 1 Campo Grande · 2 Dourados · 12 Três Lagoas · 13 Chapadão',
  '• OficinaServico_OSNumero — número da O.S.',
  '• Agendamento_Tipo — A Ativo · R Receptivo · P Presencial · I Internet',
].join('\n')

// ── Aba Por Agendamentos ─────────────────────────────────────────────────────────────────────────────────────
const REGRAS_AGENDA = [
  'Regras dos agendamentos:',
  '• O filtro Data vale para a data do agendamento (DtAgendamento), não para a O.S. nem para o contato',
  '• Base: ROF037; os agendamentos que só estão no ROF026 entram também',
  '• Um agendamento com vários serviços aparece em várias linhas do ROF037 e conta uma vez',
  '• Agendamentos cancelados (status CAN) ficam fora',
  '• Ativo = tipo Ativo · Passivo = Receptivo, Presencial ou Internet',
].join('\n')
const REGRAS_DESFECHO = [
  'O que aconteceu com o agendamento:',
  '• Virou O.S.: o agendamento tem número de O.S. e essa O.S. não está Cancelada no ROF001 TODAS',
  '• O.S. cancelada: tem número de O.S., mas a O.S. está Cancelada (não conta como conversão; aparece só na tabela por data)',
  '• No-show: sem O.S. e status NSW (o cliente não compareceu)',
  '• A executar: sem O.S. e sem no-show (AGE, CON, RAG: data por vir ou ainda não resolvido)',
].join('\n')
const COL_AGENDA = [
  `${ARQ_AGEND}:`,
  '• EmpresaNome — empresa',
  '• DtAgendamento — data do agendamento (filtro Data)',
  '• AgendamentoTipo — Ativo / Receptivo / Presencial / Internet',
  '• StatusAgendamento — AGE, CON, RAG, FIM, NSW, CAN',
  '• OSNumero — O.S. gerada pelo agendamento',
  '• CodCliente + Chassi — identificam o agendamento (uma vez só)',
  'ROF026_CLIENTEAGENDADO:',
  '• Agendamento_EmpresaCod — 1 Campo Grande · 2 Dourados · 12 Três Lagoas · 13 Chapadão',
  '• Agendamento_Data — data do agendamento',
  '• Agendamento_Tipo — A Ativo · R Receptivo · P Presencial · I Internet',
  '• Agendamento_Status — status',
  '• OficinaServico_OSNumero — O.S. gerada',
].join('\n')
const COL_OS_SITUACAO = [
  `${ARQ_OS}:`,
  '• Empresa + OS Numero — liga com a O.S. do agendamento',
  '• Situacao Tipo OS — O.S. Cancelada não conta como conversão',
].join('\n')
const FONTE_AGENDA = `${ARQ_AGEND}\nROF026_CLIENTEAGENDADO (agendamentos que não estão no ROF037)`

// ── Aba Campanhas ───────────────────────────────────────────────────────────────────────────────────────────
const REGRAS_CAMPANHA = [
  'Regras da campanha:',
  '• Um arquivo RCR038 por execução de campanha e unidade, ex: "... CGR 20261019.xls"',
  '• A unidade e a data vêm do nome do arquivo (a planilha não traz nenhuma das duas)',
  '• O filtro Data vale para a data da campanha (nome do arquivo)',
  '• Sigla → empresa: CGR Campo Grande · CPD Chapadão · DOU Dourados · TLG Três Lagoas',
].join('\n')
const REGRAS_CONTATO = [
  'Regras do contato:',
  '• O contato da campanha liga com o RCR017 por id_atendimento = Atendimento_Codigo',
  '• Contato realizado: o atendimento tem pelo menos um contato no RCR017',
  '• Não contam como realizados os encerrados "S00 - Finalizado sem contato" e "S01 - Telefones incorretos"',
].join('\n')
const REGRAS_AGENDADO = [
  'Regras do contato agendado:',
  '• Contato realizado cujo chassi tem agendamento no ROF037 criado na data da campanha ou depois',
  '• Agendamento cancelado (status CAN) não conta',
  '• Ligação pelo chassi: o ROF037 não traz o atendimento do CRM',
].join('\n')
const REGRAS_SITUACAO = [
  'Situação do agendamento (ROF037):',
  '• Com O.S. aberta: o agendamento tem número de O.S. (ou status FIM)',
  '• No-show: status NSW (agendou e não compareceu)',
  '• Programado: AGE, CON ou RAG, ainda sem O.S.',
].join('\n')
const COL_CAMPANHA = [
  `${ARQ_CAMPANHA}:`,
  '• (nome do arquivo) — sigla da unidade e data da campanha',
  '• ID_Campanha_Execucao — número da campanha',
  '• ID_Cliente — contato gerado',
  '• id_atendimento — liga com o RCR017',
  '• Chassi — liga com o ROF037',
].join('\n')
const COL_CONTATOS = [
  `${ARQ_CONTATOS}:`,
  '• Atendimento_Codigo — liga com o id_atendimento da campanha',
  '• AtendimentoContato_Data — data do contato',
  '• MotivoEncerramento — motivo de encerramento (S00, S01, S02, S03...)',
].join('\n')
const COL_AGEND_CAMPANHA = [
  `${ARQ_AGEND}:`,
  '• Chassi — liga com o chassi da campanha',
  '• AgendamentoHistorico_Data — data em que o agendamento foi criado',
  '• StatusAgendamento — AGE, CON, RAG, FIM, NSW, CAN',
  '• OSNumero — O.S. gerada pelo agendamento',
].join('\n')
const META = 'Meta: 80%. Cor pelo atingimento da meta: abaixo de 80% vermelho, de 80% a 99% amarelo, 100% ou mais verde.'
const META_MENOR = (meta) => `Meta: ${meta}% (quanto menor, melhor: atingimento = meta ÷ valor). Abaixo de 80% de atingimento vermelho, de 80% a 99% amarelo, 100% ou mais verde.`

export const INFO = {
  // Aba Passagens
  gaugeAgendamentoOs: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: `O.S. com agendamento ÷ Quant. O.S. por data de abertura × 100.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  gaugeAtivo: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento ativo (a equipe procurou o cliente).',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: `Agendamentos ativos ÷ Quant. O.S. por data de abertura × 100.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  gaugePassivo: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento passivo (o cliente procurou).',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: `Agendamentos passivos ÷ Quant. O.S. por data de abertura × 100.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  osAbertura: {
    objetivo: 'Mostrar quantas O.S. (passagens) foram abertas no período.',
    fonte: ARQ_OS,
    calculo: 'O.S. distintas (Empresa + OS Numero) com Data Criacao no período, sem as "Cancelada". O alerta ⚠ mostra as O.S. pendentes de autorização de cancelamento ou de encerramento, que também entram na conta.',
    filtros: REGRAS_OS,
    colunas: COL_OS,
  },
  osAgendamento: {
    objetivo: 'Mostrar quantas das O.S. abertas no período vieram de agendamento.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: 'Das O.S. do card Quant. O.S. por data de abertura, as que têm o número da O.S. no ROF037 (ou, se faltar lá, no ROF026).',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  agAtivos: {
    objetivo: 'Mostrar quantas O.S. com agendamento vieram de agendamento ativo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: 'O.S. com agendamento cujo tipo é Ativo (ROF037 AgendamentoTipo; no ROF026, a letra A).',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  agPassivos: {
    objetivo: 'Mostrar quantas O.S. com agendamento vieram de agendamento passivo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: 'O.S. com agendamento cujo tipo é Receptivo, Presencial ou Internet (no ROF026, as letras R, P ou I).',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  conversaoTotal: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: 'Soma de Peças (Produto), Serviços (Servico) e Total das O.S. com agendamento. Ticket médio = Faturamento Total ÷ quantidade do card O.S. com agendamento.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },
  conversaoAtivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento ativo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com as O.S. de agendamento Ativo. Ticket médio = Faturamento Total ÷ quantidade do card Agendamentos ativos.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },
  conversaoPassivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento passivo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}\n${ARQ_CLIENTES_AGEND}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com as O.S. de agendamento Receptivo, Presencial ou Internet. Ticket médio = Faturamento Total ÷ quantidade do card Agendamentos passivos.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },

  // Aba Por Agendamentos
  agTaxaConversao: {
    objetivo: 'Medir quanto dos agendamentos marcados para o período virou O.S.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: `Viraram O.S. ÷ Agendamentos no período × 100.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: `${COL_AGENDA}\n${COL_OS_SITUACAO}`,
  },
  agTaxaConversaoAtivo: {
    objetivo: 'Medir quanto dos agendamentos ativos marcados para o período virou O.S.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: `Agendamentos ativos que viraram O.S. ÷ Agendamentos ativos × 100.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: `${COL_AGENDA}\n${COL_OS_SITUACAO}`,
  },
  agTaxaConversaoPassivo: {
    objetivo: 'Medir quanto dos agendamentos passivos marcados para o período virou O.S.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: `Agendamentos passivos que viraram O.S. ÷ Agendamentos passivos × 100.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: `${COL_AGENDA}\n${COL_OS_SITUACAO}`,
  },
  agTaxaNoShow: {
    objetivo: 'Medir quanto dos agendamentos marcados para o período o cliente não compareceu.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: `No-show ÷ Agendamentos no período × 100.\n${META_MENOR(15)}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: `${COL_AGENDA}\n${COL_OS_SITUACAO}`,
  },
  agTotal: {
    objetivo: 'Mostrar quantos agendamentos estavam marcados para o período.',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos com data do agendamento no período, cada um uma vez, sem os cancelados (CAN).',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agAtivosAgenda: {
    objetivo: 'Mostrar quantos dos agendamentos do período foram ativos (a equipe procurou o cliente).',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos no período com tipo Ativo (no ROF026, a letra A).',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agPassivosAgenda: {
    objetivo: 'Mostrar quantos dos agendamentos do período foram passivos (o cliente procurou).',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos no período com tipo Receptivo, Presencial ou Internet (no ROF026, as letras R, P ou I).',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agVirouOs: {
    objetivo: 'Mostrar quantos agendamentos do período viraram O.S.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Agendamentos no período com número de O.S., e essa O.S. não está Cancelada no ROF001 TODAS. Os que viraram O.S. depois cancelada ficam fora (aparecem na coluna O.S. cancelada da tabela por data).',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: `${COL_AGENDA}\n${COL_OS_SITUACAO}`,
  },
  agNoShow: {
    objetivo: 'Mostrar quantos agendamentos do período o cliente não compareceu.',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos no período sem O.S. e com status NSW.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agAExecutar: {
    objetivo: 'Mostrar quantos agendamentos do período ainda não tiveram desfecho.',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos no período sem O.S. e sem no-show (status AGE, CON ou RAG).',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agConversaoTotal: {
    objetivo: 'Mostrar quanto faturaram as O.S. geradas pelos agendamentos do período.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Soma de Peças (Produto), Serviços (Servico) e Total das O.S. dos agendamentos que viraram O.S. (cada O.S. uma vez). Ticket médio = Faturamento Total ÷ número dessas O.S.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}\n${REGRAS_VALOR}`,
    colunas: `${COL_AGENDA}\n${COL_OS_VALOR}`,
  },
  agConversaoAtivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. geradas pelos agendamentos ativos do período.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com os agendamentos Ativos. Ticket médio = Faturamento Total ÷ número dessas O.S.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}\n${REGRAS_VALOR}`,
    colunas: `${COL_AGENDA}\n${COL_OS_VALOR}`,
  },
  agConversaoPassivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. geradas pelos agendamentos passivos do período.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com os agendamentos Receptivo, Presencial ou Internet. Ticket médio = Faturamento Total ÷ número dessas O.S.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}\n${REGRAS_VALOR}`,
    colunas: `${COL_AGENDA}\n${COL_OS_VALOR}`,
  },

  // Aba Campanhas
  taxaContato: {
    objetivo: 'Medir quanto dos contatos gerados nas campanhas a equipe conseguiu realizar.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}`,
    calculo: `Contatos realizados ÷ Contatos gerados × 100.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}`,
  },
  taxaAgendamento: {
    objetivo: 'Medir quanto dos contatos realizados virou agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: `Contatos agendados ÷ Contatos realizados × 100.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaSemAgendamento: {
    objetivo: 'Medir quanto dos contatos gerados terminou encerrado sem agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: `Contatos encerrados sem agendamento ÷ Contatos gerados × 100.\n${META_MENOR(80)}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaConversao: {
    objetivo: 'Medir quanto dos contatos agendados chegou a abrir O.S.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: `Agendamento com O.S. aberta ÷ Contatos agendados × 100.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaNoShow: {
    objetivo: 'Medir quanto dos contatos agendados não compareceu.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: `No-show ÷ Contatos agendados × 100.\n${META_MENOR(15)}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}\n${COL_AGEND_CAMPANHA}`,
  },
  campanhas: {
    objetivo: 'Mostrar quantas campanhas de ativação foram executadas no período.',
    fonte: ARQ_CAMPANHA,
    calculo: 'Números distintos de ID_Campanha_Execucao nos arquivos com data de campanha no período.',
    filtros: REGRAS_CAMPANHA,
    colunas: COL_CAMPANHA,
  },
  contatos: {
    objetivo: 'Mostrar quantos clientes as campanhas mandaram contatar.',
    fonte: ARQ_CAMPANHA,
    calculo: 'Linhas com ID_Cliente nos arquivos com data de campanha no período. Um cliente em duas campanhas conta duas vezes.',
    filtros: REGRAS_CAMPANHA,
    colunas: COL_CAMPANHA,
  },
  realizados: {
    objetivo: 'Mostrar quantos dos contatos gerados a equipe realizou.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}`,
    calculo: 'Contatos gerados cujo atendimento tem pelo menos um contato no RCR017, fora os encerrados S00/S01.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}`,
  },
  agendados: {
    objetivo: 'Mostrar quantos dos contatos realizados viraram agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: 'Contatos realizados cujo chassi tem agendamento no ROF037 criado na data da campanha ou depois, sem estar cancelado.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}\n${COL_AGEND_CAMPANHA}`,
  },
  encerrados: {
    objetivo: 'Mostrar quantos contatos realizados terminaram sem agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: 'Contatos realizados que não viraram agendamento e têm motivo de encerramento no último contato (inclui "S02 - Cliente já agendado").',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}\n${COL_AGEND_CAMPANHA}`,
  },
  aRealizar: {
    objetivo: 'Mostrar quantos contatos gerados ainda não foram trabalhados.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}`,
    calculo: 'Contatos gerados sem contato realizado no RCR017, fora os encerrados S00/S01 (já resolvidos sem contato).',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_CONTATOS}`,
  },
  osAberta: {
    objetivo: 'Mostrar quantos contatos agendados já abriram O.S.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: 'Contatos agendados cujo agendamento no ROF037 tem número de O.S. (ou status FIM).',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  programados: {
    objetivo: 'Mostrar quantos contatos agendados ainda vão acontecer.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: 'Contatos agendados cujo agendamento no ROF037 está AGE, CON ou RAG, ainda sem O.S.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  noShow: {
    objetivo: 'Mostrar quantos contatos agendados não compareceram.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_CONTATOS}\n${ARQ_AGEND}`,
    calculo: 'Contatos agendados cujo agendamento no ROF037 está NSW (no-show).',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  conversaoCampanha: {
    objetivo: 'Mostrar quanto faturaram as O.S. abertas pelos contatos agendados das campanhas.',
    fonte: 'Ainda sem fonte de dados.',
    calculo: 'Ainda não calculado (mostra —).',
    filtros: '',
    colunas: '',
  },

  // Aba Visão Período
  evolucaoTaxa: {
    objetivo: 'Mostrar a evolução mês a mês da taxa de agendamento.',
    fonte: 'Ainda sem fonte de dados.',
    calculo: 'Ainda não calculado (mostra "Sem fonte de dados ainda").',
    filtros: '',
    colunas: '',
  },
  evolucaoFaturamento: {
    objetivo: 'Mostrar a evolução mês a mês do faturamento convertido.',
    fonte: 'Ainda sem fonte de dados.',
    calculo: 'Ainda não calculado (mostra "Sem fonte de dados ainda").',
    filtros: '',
    colunas: '',
  },
}

// Seção do manual sem número próprio (logo depois do card a que se refere).
const ALERTA_PENDENTES = {
  itens: [
    ['O que mostra', 'O botão ⚠ do card Quant. O.S. por data de abertura lista as O.S. do período com Situacao Tipo OS "Pendente Autorização Cancelamento" ou "Pendente de Autorização de Encerramento". Elas contam como passagem.'],
    ['Filtro', 'Clicar numa das situações filtra a lista; clicar de novo mostra todas.'],
  ],
}

// Objetivo de cada aba: aparece abaixo das abas no BI e como 1ª seção de cada aba no manual.
export const OBJETIVO_ABAS = {
  'Por Passagens': 'Análise com base na data de abertura da ordem de serviço: considera as ordens de serviço abertas no período e identifica quantas tiveram origem em agendamento.',
  'Por Agendamentos': 'Análise com base na data do agendamento: considera os agendamentos programados para o período e apresenta o seu desfecho.',
  'Por Campanhas': 'Análise com base na data de execução da campanha: considera as campanhas de ativação do CRM executadas no período e acompanha a evolução dos contatos.',
}

// Tabela do ícone ao lado do subtítulo "Campanhas de Ativação" (aba Por Campanhas).
const TABELA_CAMPANHAS = {
  itens: [
    ['O que mostra', 'Uma linha por data de geração (todas as unidades e campanhas do dia juntas), da mais recente para a mais antiga, e uma linha de Total no fim.'],
    ['Colunas', 'Data de geração (do nome do arquivo RCR038), Campanhas geradas (ID_Campanha_Execucao distintos) e os mesmos números dos cards (contatos gerados, realizados, a realizar, agendados, encerrados sem agendamento, agendamento com O.S. aberta, programados e no-show) e as mesmas taxas dos indicadores.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data de geração; o Total é igual aos cards.'],
  ],
}

// Tabela do ícone ao lado do subtítulo "Agendamentos" (aba Por Agendamentos).
const TABELA_AGENDAMENTOS = {
  itens: [
    ['O que mostra', 'Uma linha por data do agendamento, em ordem de data (da mais antiga para a mais recente), e uma linha de Total no fim.'],
    ['Colunas', 'Data do agendamento, Agendamentos, Ativos, Passivos, Viraram O.S., O.S. cancelada, No-show, A executar, as taxas de Conversão (total, ativo e passivo) e de No-show, Faturamento Total e Ticket médio das O.S. geradas.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data do agendamento; o Total é igual aos cards.'],
  ],
}
// Tabela do ícone ao lado do subtítulo "Passagens" (aba Por Passagens).
const TABELA_PASSAGENS = {
  itens: [
    ['O que mostra', 'Uma linha por data de abertura da O.S., em ordem de data (da mais antiga para a mais recente), e uma linha de Total no fim.'],
    ['Colunas', 'Data de abertura, Quant. O.S., O.S. com agendamento, Agendamentos ativos e passivos, as taxas de Agendamento (total, ativo e passivo), Faturamento Total e Ticket médio das O.S. com agendamento.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data de abertura; o Total é igual aos cards.'],
  ],
}

// ── Manual operacional do BI (botão de livro no cabeçalho) ───────────────────────────────────────────────────
// Uma seção por indicador/card de cada aba (chave do INFO, ou um bloco { itens } para seção sem número), mais as seções gerais.
export const MANUAL_ABAS_CARDS = [
  ['Aba Por Campanhas', [
    ['Tabela — Campanhas por data de geração', TABELA_CAMPANHAS],
    ['Indicador — Taxa de Contato Realizado', 'taxaContato'],
    ['Indicador — Taxa de Agendamento', 'taxaAgendamento'],
    ['Indicador — Taxa Encerrado sem Agendamento', 'taxaSemAgendamento'],
    ['Card — Campanhas geradas', 'campanhas'],
    ['Card — Contatos gerados', 'contatos'],
    ['Card — Contatos realizados', 'realizados'],
    ['Card — Contatos agendados', 'agendados'],
    ['Card — Contatos encerrados sem agendamento', 'encerrados'],
    ['Card — Contatos a realizar', 'aRealizar'],
    ['Card — Agendamento com O.S aberta', 'osAberta'],
    ['Card — Agendamentos programados', 'programados'],
    ['Card — No-show', 'noShow'],
    ['Indicador — Taxa de Conversão', 'taxaConversao'],
    ['Card — Conversão — Resultado', 'conversaoCampanha'],
    ['Indicador — Taxa de No-show', 'taxaNoShow'],
  ]],
  ['Aba Por Agendamentos', [
    ['Tabela — Agendamentos por data do agendamento', TABELA_AGENDAMENTOS],
    ['Indicador — Taxa de Conversão', 'agTaxaConversao'],
    ['Indicador — Taxa de Conversão Ativo', 'agTaxaConversaoAtivo'],
    ['Indicador — Taxa de Conversão Passivo', 'agTaxaConversaoPassivo'],
    ['Indicador — Taxa de No-show', 'agTaxaNoShow'],
    ['Card — Agendamentos no período', 'agTotal'],
    ['Card — Agendamentos ativos', 'agAtivosAgenda'],
    ['Card — Agendamentos passivos', 'agPassivosAgenda'],
    ['Card — Viraram O.S.', 'agVirouOs'],
    ['Card — No-show', 'agNoShow'],
    ['Card — A executar', 'agAExecutar'],
    ['Card — Conversão — Total', 'agConversaoTotal'],
    ['Card — Conversão — Ativos', 'agConversaoAtivos'],
    ['Card — Conversão — Passivos', 'agConversaoPassivos'],
  ]],
  ['Aba Por Passagens', [
    ['Tabela — Passagens por data de abertura', TABELA_PASSAGENS],
    ['Indicador — Taxa de Agendamento', 'gaugeAgendamentoOs'],
    ['Indicador — Taxa de Agendamento Ativo', 'gaugeAtivo'],
    ['Indicador — Taxa de Agendamento Passivo', 'gaugePassivo'],
    ['Card — Quant. O.S. por data de abertura', 'osAbertura'],
    ['Alerta — O.S. pendentes', ALERTA_PENDENTES],
    ['Card — O.S. com agendamento', 'osAgendamento'],
    ['Card — Agendamentos ativos', 'agAtivos'],
    ['Card — Agendamentos passivos', 'agPassivos'],
    ['Card — Conversão — Total', 'conversaoTotal'],
    ['Card — Conversão — Ativos', 'conversaoAtivos'],
    ['Card — Conversão — Passivos', 'conversaoPassivos'],
  ]],
]
export const MANUAL_GERAL = [
  {
    titulo: 'Visão geral',
    itens: [
      ['Para que serve', 'Acompanhar a Mesa de Agendamento do Pós-Venda: quantas O.S. vieram de agendamento (ativo ou passivo) e quanto faturaram, e o resultado das campanhas de ativação (contatos, agendamentos, no-show).'],
    ],
  },
  {
    titulo: 'Fontes (relatórios)',
    itens: [
      [ARQ_OS, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Relatório Geral OS'],
      [ARQ_AGEND, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › AGENDAMENTO SERVICOS'],
      ['ROF026_CLIENTEAGENDADO', 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › CLIENTES AGENDADOS'],
      [ARQ_CAMPANHA, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › CAMPANHA CRM › (ano)'],
      [ARQ_CONTATOS, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › LISTA POR DATA CONTATO_ENCERRAMENTO'],
    ],
  },
]
