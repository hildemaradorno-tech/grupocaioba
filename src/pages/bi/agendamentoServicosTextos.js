// Textos do BI Agendamento de Serviços (Mesa de Agendamento): objetivo/cálculo do botão ⓘ dos cards e
// indicadores (BiAgendamentoServicos.jsx) e o conteúdo do Manual operacional (BiAgendamentoServicosManual.jsx).
// Mesmo formato de planosManutencaoTextos.js. Ao mudar uma regra do BI, atualizar aqui também (e vice-versa):
// o manual é usado para auditoria — os números do BI têm que poder ser conferidos pelos relatórios descritos.

const ARQ_OS = 'ROF001_OSAberta_Excel TODAS'
const ARQ_AGEND = 'ROF037_AGENDAMENTOSERVICO'
const ARQ_CAMPANHA = 'RCR038_CampanhaCRM_Clientes_Excel'

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
  '• A O.S. vem de agendamento quando a coluna Agendador do ROF001 está preenchida',
  '• O tipo (Ativo × Passivo) vem do ROF037, ligando Empresa + OS Numero com EmpresaNome + OSNumero',
  '• O.S. com Agendador que não está no ROF037 conta como agendada, mas fica sem tipo (aviso no card O.S. com agendamento)',
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
  '• Agendador — preenchido = O.S. veio de agendamento',
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
].join('\n')


// ── Aba Por Data Agendamento ─────────────────────────────────────────────────────────────────────────────────────
const REGRAS_AGENDA = [
  'Regras dos agendamentos:',
  '• O filtro Data vale para a data do agendamento (DtAgendamento), não para a O.S. nem para o contato',
  '• Fonte única: ROF037 (o ROF026 não entra nesta aba)',
  '• Um agendamento com vários serviços aparece em várias linhas do ROF037 e conta uma vez',
  '• Agendamentos cancelados (status CAN) ficam fora',
  '• Ativo = tipo Ativo · Passivo = Receptivo, Presencial ou Internet',
].join('\n')
const REGRAS_DESFECHO = [
  'O que aconteceu com o agendamento:',
  '• Agendamento comparecido: o agendamento tem número de O.S. (OSNumero) no ROF037',
  '• Agendamentos Não comparecidos (No-Show): sem O.S. e status NSW (o cliente não compareceu)',
  '• Agendamento a comparecer: sem O.S. e sem no-show (AGE, CON, RAG: data por vir ou ainda não resolvido)',
].join('\n')
const COL_AGENDA = [
  `${ARQ_AGEND}:`,
  '• EmpresaNome — empresa',
  '• DtAgendamento — data do agendamento (filtro Data)',
  '• AgendamentoTipo — Ativo / Receptivo / Presencial / Internet',
  '• StatusAgendamento — AGE, CON, RAG, FIM, NSW, CAN',
  '• OSNumero — O.S. gerada pelo agendamento',
  '• CodCliente + Chassi — identificam o agendamento (uma vez só)',
].join('\n')
const FONTE_AGENDA = ARQ_AGEND

// ── Aba Campanhas ─── (2 relatórios: RCR038 + ROF037, ligados pelo chassi)
const REGRAS_CAMPANHA = [
  'Regras da campanha:',
  '• Um arquivo RCR038 por execução de campanha e unidade, ex: "... CGR 20261019.xls"',
  '• A data da campanha vem do nome do arquivo (a planilha não traz data); o filtro Data vale para ela',
  '• Sem filtro de Empresas: o relatório da campanha não identifica a empresa',
  '• Cada contato da campanha (ID_Campanha_Execucao + id_atendimento) conta uma vez',
].join('\n')
const REGRAS_AGENDADO = [
  'Regras do agendamento da campanha:',
  '• Agendado: o chassi do contato gerado tem agendamento do tipo Ativo no ROF037 criado (AgendamentoHistorico_Data) da data da campanha até 30 dias depois',
  '• Agendamento cancelado (status CAN) não conta',
  '• Não agendado: contato gerado sem agendamento nessas condições',
  '• Ligação pelo chassi: o ROF037 não traz o ID da campanha nem o atendimento do CRM',
].join('\n')
const REGRAS_SITUACAO = [
  'O que aconteceu com o agendamento (ROF037):',
  '• Vieram: o agendamento tem número de O.S. (OSNumero) ou status FIM',
  '• No-show: status NSW (agendou e não compareceu)',
  '• Vão vir: AGE, CON ou RAG, ainda sem O.S.',
].join('\n')
const COL_CAMPANHA = [
  `${ARQ_CAMPANHA}:`,
  '• (nome do arquivo) — data da campanha',
  '• ID_Campanha_Execucao — número da campanha',
  '• ID_Cliente — contato gerado',
  '• id_atendimento — identifica o contato (conta uma vez)',
  '• Chassi — liga com o ROF037',
].join('\n')
const COL_AGEND_CAMPANHA = [
  `${ARQ_AGEND}:`,
  '• Chassi — liga com o chassi da campanha',
  '• AgendamentoTipo — só Ativo',
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
    fonte: ARQ_OS,
    calculo: `O.S. com agendamento ÷ Quant. O.S. por data de abertura × 100.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  gaugeAtivo: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento ativo (a equipe procurou o cliente).',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: `Agendamentos ativos ÷ Quant. O.S. por data de abertura × 100.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  gaugePassivo: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento passivo (o cliente procurou).',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
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
    fonte: ARQ_OS,
    calculo: 'Das O.S. do card Quant. O.S. por data de abertura, as que têm a coluna Agendador preenchida.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: COL_OS,
  },
  agAtivos: {
    objetivo: 'Mostrar quantas O.S. com agendamento vieram de agendamento ativo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'O.S. com agendamento cujo tipo é Ativo (ROF037 AgendamentoTipo).',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  agPassivos: {
    objetivo: 'Mostrar quantas O.S. com agendamento vieram de agendamento passivo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'O.S. com agendamento cujo tipo é Receptivo, Presencial ou Internet (ROF037 AgendamentoTipo).',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  conversaoTotal: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento.',
    fonte: ARQ_OS,
    calculo: 'Soma de Peças (Produto), Serviços (Servico) e Total das O.S. com agendamento. Ticket médio = Faturamento Total ÷ quantidade do card O.S. com agendamento.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },
  conversaoAtivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento ativo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com as O.S. de agendamento Ativo. Ticket médio = Faturamento Total ÷ quantidade do card Agendamentos ativos.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },
  conversaoPassivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento passivo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com as O.S. de agendamento Receptivo, Presencial ou Internet. Ticket médio = Faturamento Total ÷ quantidade do card Agendamentos passivos.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },

  // Aba Por Data Agendamento
  agTaxaConversao: {
    objetivo: 'Medir quanto dos agendamentos marcados para o período virou O.S.',
    origem: 'Card Agendamentos comparecidos ÷ card Agendamentos realizados.',
    calculo: `Agendamentos comparecidos ÷ Agendamentos realizados × 100.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTaxaConversaoAtivo: {
    objetivo: 'Medir quanto dos agendamentos ativos marcados para o período virou O.S.',
    origem: 'Parte ativa do card Agendamentos comparecidos ÷ card Agendamentos ativos.',
    calculo: `Agendamentos ativos que viraram O.S. ÷ Agendamentos ativos × 100.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTaxaConversaoPassivo: {
    objetivo: 'Medir quanto dos agendamentos passivos marcados para o período virou O.S.',
    origem: 'Parte passiva do card Agendamentos comparecidos ÷ card Agendamentos passivos.',
    calculo: `Agendamentos passivos que viraram O.S. ÷ Agendamentos passivos × 100.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTaxaNoShow: {
    objetivo: 'Medir quanto dos agendamentos marcados para o período o cliente não compareceu.',
    origem: 'Card Agendamentos Não comparecidos (No-Show) ÷ card Agendamentos realizados.',
    calculo: `Agendamentos Não comparecidos (No-Show) ÷ Agendamentos realizados × 100.\n${META_MENOR(15)}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
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
    calculo: 'Agendamentos realizados com tipo Ativo.',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agPassivosAgenda: {
    objetivo: 'Mostrar quantos dos agendamentos do período foram passivos (o cliente procurou).',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos realizados com tipo Receptivo, Presencial ou Internet.',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agVirouOs: {
    objetivo: 'Mostrar quantos agendamentos do período tiveram o cliente comparecendo (viraram O.S.).',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos realizados com número de O.S. (OSNumero) no ROF037.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agNoShow: {
    objetivo: 'Mostrar quantos agendamentos do período o cliente não compareceu.',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos realizados sem O.S. e com status NSW.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agAExecutar: {
    objetivo: 'Mostrar quantos agendamentos do período ainda não tiveram desfecho.',
    fonte: FONTE_AGENDA,
    calculo: 'Agendamentos realizados sem O.S. e sem no-show (status AGE, CON ou RAG).',
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
  taxaAgendamento: {
    objetivo: 'Medir quanto dos contatos gerados nas campanhas virou agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: `Agendados ÷ Contatos gerados × 100.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaConversao: {
    objetivo: 'Medir quanto dos agendados das campanhas veio (abriu O.S.).',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: `Vieram ÷ Agendados × 100.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaNoShow: {
    objetivo: 'Medir quanto dos agendados das campanhas não compareceu.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: `No-show ÷ Agendados × 100.\n${META_MENOR(15)}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
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
    calculo: 'Contatos (ID_Campanha_Execucao + id_atendimento) nos arquivos com data de campanha no período. Um cliente em duas campanhas conta duas vezes.',
    filtros: REGRAS_CAMPANHA,
    colunas: COL_CAMPANHA,
  },
  agendados: {
    objetivo: 'Mostrar quantos contatos gerados viraram agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Contatos gerados cujo chassi tem agendamento Ativo no ROF037 criado da data da campanha até 30 dias depois, sem estar cancelado.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  naoAgendados: {
    objetivo: 'Mostrar quantos contatos gerados não viraram agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Contatos gerados − Agendados.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  osAberta: {
    objetivo: 'Mostrar quantos agendados das campanhas vieram.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Agendados cujo agendamento no ROF037 tem número de O.S. (ou status FIM).',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  programados: {
    objetivo: 'Mostrar quantos agendados das campanhas ainda vão vir.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Agendados cujo agendamento no ROF037 está AGE, CON ou RAG, ainda sem O.S.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  noShow: {
    objetivo: 'Mostrar quantos agendados das campanhas não compareceram.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Agendados cujo agendamento no ROF037 está NSW (no-show).',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
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
  'Por Data da O.S.': 'Análise com base na data de abertura da ordem de serviço: considera as ordens de serviço abertas no período e identifica quantas tiveram origem em agendamento.',
  'Por Data Agendamento': 'Análise com base na data do agendamento: considera os agendamentos programados para o período e apresenta o seu desfecho.',
  'Por Campanhas': 'Análise com base na data de execução da campanha: considera as campanhas de ativação do CRM executadas no período e acompanha a evolução dos contatos.',
}

// Tabela do ícone ao lado do subtítulo "Campanhas de Ativação" (aba Por Campanhas).
const TABELA_CAMPANHAS = {
  itens: [
    ['O que mostra', 'Uma linha por data de geração (todas as campanhas do dia juntas), da mais recente para a mais antiga, e uma linha de Total no fim.'],
    ['Colunas', 'Data de geração (do nome do arquivo RCR038), Campanhas geradas, Contatos gerados, Agendados, Não agendados, Vieram, Vão vir, No-show e as taxas de Agendamento, Conversão e No-show.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data de geração; o Total é igual aos cards.'],
  ],
}

// Tabela do ícone ao lado do subtítulo "Agendamentos" (aba Por Data Agendamento).
const TABELA_AGENDAMENTOS = {
  itens: [
    ['O que mostra', 'Uma linha por data do agendamento, em ordem de data (da mais antiga para a mais recente), e uma linha de Total no fim.'],
    ['Colunas', 'Data do agendamento, Agendamentos, Ativos, Passivos, Agendamentos comparecidos, Agendamentos a comparecer, Agendamentos Não comparecidos (No-Show), as taxas de Conversão (total, ativo e passivo) e de No-show, Faturamento Total e Ticket médio das O.S. geradas.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data do agendamento; o Total é igual aos cards.'],
  ],
}
// Tabela do ícone ao lado do subtítulo "Passagens" (aba Por Data da O.S.).
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
    ['Indicador — Taxa de Agendamento', 'taxaAgendamento'],
    ['Card — Campanhas geradas', 'campanhas'],
    ['Card — Contatos gerados', 'contatos'],
    ['Card — Agendados', 'agendados'],
    ['Card — Não agendados', 'naoAgendados'],
    ['Card — Vieram', 'osAberta'],
    ['Card — Vão vir', 'programados'],
    ['Card — No-show', 'noShow'],
    ['Indicador — Taxa de Conversão', 'taxaConversao'],
    ['Indicador — Taxa de No-show', 'taxaNoShow'],
  ]],
  ['Aba Por Data Agendamento', [
    ['Tabela — Agendamentos por data do agendamento', TABELA_AGENDAMENTOS],
    ['Indicador — Taxa de Conversão', 'agTaxaConversao'],
    ['Indicador — Taxa de Conversão Ativo', 'agTaxaConversaoAtivo'],
    ['Indicador — Taxa de Conversão Passivo', 'agTaxaConversaoPassivo'],
    ['Indicador — Taxa de No-show', 'agTaxaNoShow'],
    ['Card — Agendamentos realizados', 'agTotal'],
    ['Card — Agendamentos ativos', 'agAtivosAgenda'],
    ['Card — Agendamentos passivos', 'agPassivosAgenda'],
    ['Card — Agendamentos comparecidos', 'agVirouOs'],
    ['Card — Agendamentos Não comparecidos (No-Show)', 'agNoShow'],
    ['Card — Agendamentos a comparecer', 'agAExecutar'],
    ['Card — Conversão — Total', 'agConversaoTotal'],
    ['Card — Conversão — Ativos', 'agConversaoAtivos'],
    ['Card — Conversão — Passivos', 'agConversaoPassivos'],
  ]],
  ['Aba Por Data da O.S.', [
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
      [ARQ_AGEND, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › AGENDAMENTO DE SERVICOS E PRODUTOS'],
      [ARQ_CAMPANHA, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › CAMPANHA CRM › (ano)'],
    ],
  },
]
