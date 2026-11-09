// Textos do BI Agendamento de Serviços (Mesa de Agendamento): objetivo/cálculo do botão ⓘ dos cards e
// indicadores (BiAgendamentoServicos.jsx) e o conteúdo do Manual operacional (BiAgendamentoServicosManual.jsx).
// Mesmo formato de planosManutencaoTextos.js. Ao mudar uma regra do BI, atualizar aqui também (e vice-versa):
// o manual é usado para auditoria — os números do BI têm que poder ser conferidos pelos relatórios descritos.

const ARQ_OS = 'ROF001_OSAberta_Excel TODAS'
const ARQ_AGEND = 'ROF037_AGENDAMENTOSERVICO'
const ARQ_CAMPANHA = 'RCR038_CampanhaCRM_Clientes_Excel'
const ARQ_CONTATO = 'RCR017_LISTAPORDATACONTATOENCERRAMENTO'

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
  '• O ROF037 é a fonte padrão dos agendamentos em todas as abas',
  '• A O.S. vem de agendamento quando está no ROF037: Empresa + OS Numero (ROF001) = EmpresaNome + OSNumero (ROF037)',
  '• O tipo (Ativo × Passivo) vem do mesmo agendamento do ROF037',
  '• A coluna Agendador do ROF001 não é usada (O.S. com Agendador que não está no ROF037 não conta)',
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
  '• Fonte única: ROF037',
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

// ── Aba Campanhas ─── (3 relatórios: RCR038 + RCR017 pelo ID do atendimento + ROF037 pelo chassi e cliente)
// Distribuídos por ATENDIMENTO (veículo repetido em outra campanha conta de novo); cada agendamento do ROF037
// conta UMA vez (na 1ª campanha do veículo) — as outras linhas do mesmo veículo ficam como não agendadas.
const REGRAS_CAMPANHA = [
  'Regras da campanha:',
  '• Um arquivo RCR038 por execução de campanha e unidade, ex: "... CGR 20261019.xls"',
  '• A data da campanha vem do nome do arquivo (a planilha não traz data); o filtro Data vale para ela',
  '• Sem filtro de Empresas: o relatório da campanha não identifica a empresa',
  '• Cada contato gerado (ID_Campanha_Execucao + id_atendimento) conta uma vez; o mesmo veículo em outra campanha conta de novo (ex: as campanhas 165 e 168 de 03/10 são a mesma lista de 63 veículos)',
  '• O agendamento conta UMA vez: se o mesmo veículo está em mais de uma campanha e o agendamento do ROF037 serve para as duas, ele conta só na 1ª campanha (data mais antiga; mesma data, menor número de campanha)',
  '• As outras linhas desse veículo (nas outras campanhas) contam como Não agendados, com o motivo de encerramento delas no RCR017 (ex: S03 ou Agendamento cancelado); na conferência linha a linha, a coluna Veículo agendado na mostra a campanha onde o agendamento contou',
  '• Não agendados = Contatos gerados − Contatos agendados',
  '• O Sintético do Dealer.net conta o agendamento em cada atendimento (ex: outubro — 8 no Dealer.net × 5 aqui; os outros 3 atendimentos dos mesmos veículos estão em Não agendados)',
].join('\n')
const REGRAS_AGENDADO = [
  'Regras do agendamento da campanha:',
  '• Agendado: o chassi do contato gerado tem agendamento do tipo Ativo no ROF037, do mesmo cliente (CodCliente = ID_Cliente), criado (AgendamentoHistorico_Data) da data da campanha até 30 dias depois',
  '• Agendamento cancelado (status CAN) não conta',
  '• Não agendado: contato gerado sem agendamento nessas condições',
  '• Ligação pelo chassi e cliente: o ROF037 não traz o ID da campanha nem o atendimento do CRM',
  'Datas usadas no agendamento:',
  '• Início da janela: data da campanha (nome do arquivo RCR038)',
  '• Data comparada: criação do agendamento (AgendamentoHistorico_Data do ROF037), não a data para quando foi agendado (DtAgendamento)',
  '• Fim da janela: 30 dias depois da data da campanha. Depois disso o agendamento não é atribuído à campanha (o Dealer.net também não conta)',
  '• A data de contato do RCR017 não entra: o cliente costuma recusar no contato e ser agendado dias depois por fora do atendimento, e o contato com "Serviços:" nem sempre tem a data da criação do agendamento',
  '• Com essas datas, contando o agendamento em cada atendimento, o número bate com o Agendamento Realizado do Sintético do Dealer.net; o BI conta cada agendamento uma vez (ver Regras da campanha)',
].join('\n')
const REGRAS_CONTATO = [
  'Regras dos não agendados (RCR017):',
  '• Quem agendou vem sempre do ROF037; o RCR017 só explica os NÃO agendados',
  '• Liga pelo ID do atendimento: id_atendimento do RCR038 = Atendimento_Codigo do RCR017',
  '• Contatos encerrados: não agendado cujo atendimento tem motivo de encerramento (MotivoEncerramento) ou o agendamento registrado num contato ativo ("Serviços:" na descrição, meio de contato que não é Receptivo) sem agendamento Ativo no ROF037',
  '• Motivo: um por cliente — o do contato mais recente com motivo',
  '• Contatos a realizar: não agendado sem motivo — o atendimento não aparece no RCR017 (sem contato) ou aparece sem resultado (já contatado, ex: retorno programado, contato receptivo)',
].join('\n')
const COL_CONTATO = [
  `${ARQ_CONTATO}:`,
  '• Atendimento_Codigo — liga com o id_atendimento da campanha',
  '• MotivoEncerramento — motivo do encerramento do contato',
  '• AtendimentoContato_Descricao — "Serviços:" = agendamento registrado no contato',
  '• MeioContato_Descricao — tira o contato Receptivo',
].join('\n')
const REGRAS_SITUACAO = [
  'O que aconteceu com o agendamento (ROF037):',
  '• Agendamentos comparecidos: o agendamento tem número de O.S. (OSNumero) ou status FIM',
  '• Agendamentos não comparecidos (No-show): status NSW (agendou e não compareceu)',
  '• Agendamentos a comparecer: AGE, CON ou RAG, ainda sem O.S.',
].join('\n')
const COL_CAMPANHA = [
  `${ARQ_CAMPANHA}:`,
  '• (nome do arquivo) — data da campanha',
  '• ID_Campanha_Execucao — número da campanha',
  '• ID_Cliente — cliente; liga com o CodCliente do ROF037',
  '• id_atendimento — atendimento da campanha; liga com o RCR017',
  '• Chassi — liga com o ROF037',
].join('\n')
const COL_AGEND_CAMPANHA = [
  `${ARQ_AGEND}:`,
  '• Chassi — liga com o chassi da campanha',
  '• CodCliente — tem que ser o mesmo cliente da campanha',
  '• AgendamentoTipo — só Ativo',
  '• AgendamentoHistorico_Data — data em que o agendamento foi criado',
  '• StatusAgendamento — AGE, CON, RAG, FIM, NSW, CAN',
  '• OSNumero — O.S. gerada pelo agendamento',
].join('\n')
const META = 'Meta: definida na engrenagem (⚙) ao lado do botão Atualizar — o valor aparece no velocímetro (padrão 80%). Cor pelo atingimento da meta: abaixo de 80% vermelho, de 80% a 99% amarelo, 100% ou mais verde.'
const META_MENOR = (meta) => `Meta: definida na engrenagem (⚙) ao lado do botão Atualizar — o valor aparece no velocímetro (padrão ${meta}%); quanto menor, melhor: atingimento = meta ÷ valor. Abaixo de 80% de atingimento vermelho, de 80% a 99% amarelo, 100% ou mais verde.`

export const INFO = {
  // Aba Passagens
  gaugeAgendamentoOs: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: `O.S. com agendamento ÷ Quant. O.S. por data de abertura × 100. Conciliação: cada O.S. do ROF001 (Empresa + OS Numero, aberta no período, sem "Cancelada") é procurada no ROF037 pela EmpresaNome + OSNumero; se existir, é O.S. com agendamento.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  gaugeAtivo: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento ativo (a equipe procurou o cliente).',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: `Agendamentos ativos ÷ Quant. O.S. por data de abertura × 100. Conciliação: O.S. do ROF001 encontrada no ROF037 (Empresa + OS Numero = EmpresaNome + OSNumero) com AgendamentoTipo = Ativo.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  gaugePassivo: {
    objetivo: 'Medir quanto das O.S. abertas no período vieram de agendamento passivo (o cliente procurou).',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: `Agendamentos passivos ÷ Quant. O.S. por data de abertura × 100. Conciliação: O.S. do ROF001 encontrada no ROF037 (Empresa + OS Numero = EmpresaNome + OSNumero) com AgendamentoTipo = Receptivo, Presencial ou Internet.\n${META}`,
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  osAbertura: {
    objetivo: 'Mostrar quantas O.S. (passagens) foram abertas no período.',
    fonte: ARQ_OS,
    calculo: 'O.S. do ROF001 com Data Criacao no período, cada uma contada uma vez por Empresa + OS Numero (o arquivo tem várias linhas por O.S.). Ficam fora as com Situacao Tipo OS "Cancelada"; as pendentes de autorização contam (alerta ⚠). Filtro Empresas pela coluna Empresa.',
    filtros: REGRAS_OS,
    colunas: COL_OS,
  },
  osAgendamento: {
    objetivo: 'Mostrar quantas das O.S. abertas no período vieram de agendamento.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Das O.S. do card Quant. O.S. por data de abertura, conta as que existem no ROF037: Empresa + OS Numero (ROF001) = EmpresaNome + OSNumero (ROF037). O.S. que não está no ROF037 não conta, mesmo com a coluna Agendador preenchida no ROF001.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  agAtivos: {
    objetivo: 'Mostrar quantas O.S. com agendamento vieram de agendamento ativo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Das O.S. com agendamento, as que no ROF037 (mesma EmpresaNome + OSNumero) têm AgendamentoTipo = Ativo.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  agPassivos: {
    objetivo: 'Mostrar quantas O.S. com agendamento vieram de agendamento passivo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Das O.S. com agendamento, as que no ROF037 (mesma EmpresaNome + OSNumero) têm AgendamentoTipo = Receptivo, Presencial ou Internet.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}`,
    colunas: `${COL_OS}\n${COL_AGEND}`,
  },
  osAgNaoLigado: {
    objetivo: 'Mostrar quantas O.S. foram abertas para veículos que estavam no agendamento, mas não foram abertas pelo agendamento.',
    fonte: `${ARQ_OS}
${ARQ_AGEND}`,
    calculo: 'Das O.S. do card Quant. O.S. por data de abertura, as que NÃO estão no ROF037 (Empresa + OS Numero = EmpresaNome + OSNumero), mas cujo veículo (Veiculo Chassi do ROF001 = Chassi do ROF037) tinha agendamento no ROF037, sem CAN, perto da abertura: (1) 2ª O.S. da mesma visita — no mesmo dia, o agendamento abriu outra O.S.; (2) agendamento marcado para o mesmo dia, sem ligação com esta O.S.; (3) agendamento sem O.S. (no-show ou em aberto) marcado nos 30 dias antes, e o veículo veio depois sem agendar. Na Consulta de O.S., o filtro Estava no agendamento, não aberta por ele mostra cada uma e o caso.',
    filtros: `${REGRAS_OS}
${REGRAS_AGEND}`,
    colunas: `${COL_OS}
${COL_AGEND}`,
  },
  gaugeAgNaoLigado: {
    objetivo: 'Medir quanto das O.S. abertas no período eram de veículos que estavam no agendamento mas não foram abertas por ele.',
    fonte: `${ARQ_OS}
${ARQ_AGEND}`,
    calculo: `O.S. estava no agendamento, não aberta por ele ÷ Quant. O.S. por data de abertura × 100.
${META_MENOR(10)}`,
    filtros: `${REGRAS_OS}
${REGRAS_AGEND}`,
    colunas: `${COL_OS}
${COL_AGEND}`,
  },
  conversaoTotal: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Pega as O.S. do card O.S. com agendamento e soma no ROF001 todas as linhas de cada O.S. (uma O.S. pode ter várias linhas, ex: uma por NF): Peças = Produto, Serviços = Servico, Faturamento Total = Total (já com o Desconto). Ticket médio = Faturamento Total ÷ quantidade do card O.S. com agendamento.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },
  conversaoAtivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento ativo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com as O.S. que no ROF037 têm AgendamentoTipo = Ativo. Ticket médio = Faturamento Total ÷ quantidade do card Agendamentos ativos.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },
  conversaoPassivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. que vieram de agendamento passivo.',
    fonte: `${ARQ_OS}\n${ARQ_AGEND}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com as O.S. que no ROF037 têm AgendamentoTipo = Receptivo, Presencial ou Internet. Ticket médio = Faturamento Total ÷ quantidade do card Agendamentos passivos.',
    filtros: `${REGRAS_OS}\n${REGRAS_AGEND}\n${REGRAS_VALOR}`,
    colunas: `${COL_OS_VALOR}\n${COL_AGEND}`,
  },

  // Aba Por Data Agendamento
  agTaxaConversao: {
    objetivo: 'Medir quanto dos agendamentos marcados para o período virou O.S.',
    origem: 'Card Agendamentos comparecidos ÷ card Agendamentos realizados.',
    calculo: `Agendamentos comparecidos ÷ Agendamentos realizados × 100. Os dois saem do ROF037: realizado = agendamento com DtAgendamento no período e sem CAN; comparecido = esse agendamento tem OSNumero.\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTaxaConversaoAtivo: {
    objetivo: 'Medir quanto dos agendamentos ativos marcados para o período virou O.S.',
    origem: 'Parte ativa do card Agendamentos comparecidos ÷ card Agendamentos ativos.',
    calculo: `Agendamentos ativos com OSNumero ÷ Agendamentos ativos × 100 (ROF037, AgendamentoTipo = Ativo).\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTaxaConversaoPassivo: {
    objetivo: 'Medir quanto dos agendamentos passivos marcados para o período virou O.S.',
    origem: 'Parte passiva do card Agendamentos comparecidos ÷ card Agendamentos passivos.',
    calculo: `Agendamentos passivos com OSNumero ÷ Agendamentos passivos × 100 (ROF037, AgendamentoTipo = Receptivo, Presencial ou Internet).\n${META}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTaxaNoShow: {
    objetivo: 'Medir quanto dos agendamentos marcados para o período o cliente não compareceu.',
    origem: 'Card Agendamentos Não comparecidos (No-Show) ÷ card Agendamentos realizados.',
    calculo: `Agendamentos Não comparecidos (No-Show) ÷ Agendamentos realizados × 100. No-show = agendamento do ROF037 sem OSNumero e com StatusAgendamento = NSW.\n${META_MENOR(15)}`,
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agTotal: {
    objetivo: 'Mostrar quantos agendamentos estavam marcados para o período.',
    fonte: FONTE_AGENDA,
    calculo: 'Linhas do ROF037 com DtAgendamento no período e StatusAgendamento FIM (atendido), NSW (no-show) ou AGE/CON/RAG (a comparecer) — o CAN (cancelado) fica fora. Diferente do ROF026 e do RCR014, que não trazem os no-shows. O ROF037 repete o agendamento em uma linha por serviço: cada agendamento conta uma vez por EmpresaNome + CodCliente + data/hora do agendamento + Chassi. Filtro Empresas pela EmpresaNome.',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agAtivosAgenda: {
    objetivo: 'Mostrar quantos dos agendamentos do período foram ativos (a equipe procurou o cliente).',
    fonte: FONTE_AGENDA,
    calculo: 'Dos Agendamentos realizados (ROF037), os com AgendamentoTipo = Ativo.',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agPassivosAgenda: {
    objetivo: 'Mostrar quantos dos agendamentos do período foram passivos (o cliente procurou).',
    fonte: FONTE_AGENDA,
    calculo: 'Dos Agendamentos realizados (ROF037), os com AgendamentoTipo = Receptivo, Presencial ou Internet.',
    filtros: REGRAS_AGENDA,
    colunas: COL_AGENDA,
  },
  agVirouOs: {
    objetivo: 'Mostrar quantos agendamentos do período tiveram o cliente comparecendo (viraram O.S.).',
    fonte: FONTE_AGENDA,
    calculo: 'Dos Agendamentos realizados, os que têm OSNumero preenchido no ROF037 (o cliente compareceu e a O.S. foi aberta).',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agNoShow: {
    objetivo: 'Mostrar quantos agendamentos do período o cliente não compareceu.',
    fonte: FONTE_AGENDA,
    calculo: 'Dos Agendamentos realizados, os sem OSNumero e com StatusAgendamento = NSW no ROF037.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agAExecutar: {
    objetivo: 'Mostrar quantos agendamentos do período ainda não tiveram desfecho.',
    fonte: FONTE_AGENDA,
    calculo: 'Dos Agendamentos realizados, os sem OSNumero e sem NSW (StatusAgendamento AGE, CON ou RAG: data ainda por vir ou sem desfecho).',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}`,
    colunas: COL_AGENDA,
  },
  agConversaoTotal: {
    objetivo: 'Mostrar quanto faturaram as O.S. geradas pelos agendamentos do período.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Pega os Agendamentos comparecidos e procura a O.S. de cada um no ROF001: EmpresaNome + OSNumero (ROF037) = Empresa + OS Numero (ROF001). Soma todas as linhas de cada O.S., cada O.S. uma vez: Peças = Produto, Serviços = Servico, Faturamento Total = Total. Ticket médio = Faturamento Total ÷ número dessas O.S.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}\n${REGRAS_VALOR}`,
    colunas: `${COL_AGENDA}\n${COL_OS_VALOR}`,
  },
  agConversaoAtivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. geradas pelos agendamentos ativos do período.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com os agendamentos comparecidos com AgendamentoTipo = Ativo. Ticket médio = Faturamento Total ÷ número dessas O.S.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}\n${REGRAS_VALOR}`,
    colunas: `${COL_AGENDA}\n${COL_OS_VALOR}`,
  },
  agConversaoPassivos: {
    objetivo: 'Mostrar quanto faturaram as O.S. geradas pelos agendamentos passivos do período.',
    fonte: `${FONTE_AGENDA}\n${ARQ_OS}`,
    calculo: 'Mesmo cálculo da Conversão — Total, só com os agendamentos comparecidos com AgendamentoTipo = Receptivo, Presencial ou Internet. Ticket médio = Faturamento Total ÷ número dessas O.S.',
    filtros: `${REGRAS_AGENDA}\n${REGRAS_DESFECHO}\n${REGRAS_VALOR}`,
    colunas: `${COL_AGENDA}\n${COL_OS_VALOR}`,
  },

  // Aba Campanhas
  taxaAgendamento: {
    objetivo: 'Medir quanto dos contatos gerados nas campanhas virou agendamento.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: `Contatos agendados ÷ Contatos gerados × 100. Contatos gerados = linhas do RCR038 (campanha + atendimento); Contatos agendados = contatos ligados a um agendamento Ativo do ROF037 pelo Chassi + cliente (ID_Cliente = CodCliente), criado até 30 dias após a campanha, sem CAN — cada agendamento contado uma vez.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaConversao: {
    objetivo: 'Medir quanto dos agendamentos das campanhas compareceu (abriu O.S.).',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: `Agendamentos comparecidos ÷ Contatos agendados × 100. Comparecido = o agendamento do ROF037 ligado ao contato tem OSNumero ou StatusAgendamento = FIM.\n${META}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  taxaNoShow: {
    objetivo: 'Medir quanto dos agendados das campanhas não compareceu.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: `Agendamentos não comparecidos (No-show) ÷ Contatos agendados × 100. No-show = o agendamento do ROF037 ligado ao contato está com StatusAgendamento = NSW.\n${META_MENOR(15)}`,
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_SITUACAO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  campanhas: {
    objetivo: 'Mostrar quantas campanhas de ativação foram executadas no período.',
    fonte: ARQ_CAMPANHA,
    calculo: 'Números distintos de ID_Campanha_Execucao nos arquivos RCR038 cuja data (no nome do arquivo, ex: "... CGR 20261019.xls" = 19/10/2026) está no período.',
    filtros: REGRAS_CAMPANHA,
    colunas: COL_CAMPANHA,
  },
  contatos: {
    objetivo: 'Mostrar quantos contatos as campanhas geraram.',
    fonte: ARQ_CAMPANHA,
    calculo: 'Linhas do RCR038 dos arquivos com data da campanha no período, cada uma contada uma vez por ID_Campanha_Execucao + id_atendimento (se a mesma campanha foi salva em dois arquivos, a linha repetida é ignorada). O mesmo veículo em outra campanha conta de novo.',
    filtros: REGRAS_CAMPANHA,
    colunas: COL_CAMPANHA,
  },
  agendados: {
    objetivo: 'Mostrar quantos agendamentos as campanhas geraram, sem duplicar.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Para cada contato gerado (RCR038), procura no ROF037 um agendamento com: mesmo Chassi; CodCliente = ID_Cliente; AgendamentoTipo = Ativo; StatusAgendamento diferente de CAN; AgendamentoHistorico_Data (criação) entre a data da campanha e 30 dias depois. Achou = contato agendado. O mesmo agendamento conta uma vez: fica no contato da 1ª campanha do veículo; os outros contatos do mesmo veículo vão para Contatos encerrados ou Contatos a realizar.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}`,
  },
  encerrados: {
    objetivo: 'Mostrar quantos não agendados já foram trabalhados e não agendaram — e por quê.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}\n${ARQ_CONTATO}`,
    calculo: 'Contatos gerados não agendados (ROF037) cujo atendimento, no RCR017 (id_atendimento do RCR038 = Atendimento_Codigo), tem MotivoEncerramento preenchido — ou um contato ativo com "Serviços:" na descrição. O motivo de cada um está no quadro Motivo de Encerramento.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}\n${COL_CONTATO}`,
  },
  faltaContatar: {
    objetivo: 'Mostrar quantos não agendados ainda precisam de contato para agendar.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}\n${ARQ_CONTATO}`,
    calculo: 'Contatos gerados não agendados (ROF037) e sem motivo de encerramento no RCR017: o id_atendimento não aparece no RCR017 (sem contato) ou aparece só com contato sem resultado (a coluna Contato da lista Contatos a realizar separa os dois casos). Contatos gerados = Contatos agendados + Contatos encerrados + Contatos a realizar.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}\n${COL_CONTATO}`,
  },
  listaFaltaContatar: {
    objetivo: 'Listar os contatos a realizar, para a equipe da Mesa de Agendamento trabalhar.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}\n${ARQ_CONTATO}`,
    calculo: 'Os mesmos clientes do card Contatos a realizar, um por linha, da campanha mais antiga para a mais recente. Colunas: Data da campanha (nome do arquivo RCR038), Campanha (ID_Campanha_Execucao), Atendimento (id_atendimento), Cliente (nome), Chassi, Contato (Sem contato / Já contatado, sem resultado) e Próximo contato (data do contato registrado no RCR017 — AtendimentoContato_Data — para quem já foi contatado e ainda está sem resultado; vazio = ainda sem contato).',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}\n${COL_CONTATO}`,
  },
  motivos: {
    objetivo: 'Mostrar por que os clientes das campanhas não agendaram.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}\n${ARQ_CONTATO}`,
    calculo: 'Os clientes do card Contatos encerrados, um por cliente, pelo MotivoEncerramento do contato mais recente no RCR017; o total é igual ao card. "Agendamento no CRM sem Ativo no ROF037" = o contato registrou agendamento ("Serviços:"), mas não há agendamento Ativo no ROF037 dentro da regra. Quem agendou depois de recusar (ROF037) fica fora: conta em Contatos agendados. % = quantidade ÷ total do quadro.',
    filtros: `${REGRAS_CAMPANHA}\n${REGRAS_AGENDADO}\n${REGRAS_CONTATO}`,
    colunas: `${COL_CAMPANHA}\n${COL_AGEND_CAMPANHA}\n${COL_CONTATO}`,
  },
  quadroAgendados: {
    objetivo: 'Mostrar o que aconteceu com os contatos agendados das campanhas: compareceram, ainda vão comparecer ou não compareceram.',
    fonte: `${ARQ_CAMPANHA}\n${ARQ_AGEND}`,
    calculo: 'Contatos agendados por situação do agendamento no ROF037 — Agendamentos comparecidos: tem número de O.S. (ou status FIM) · Agendamentos a comparecer: AGE, CON ou RAG, ainda sem O.S. · Agendamentos não comparecidos (No-show): status NSW. O total é igual ao card Contatos agendados; % = quantidade ÷ total do quadro.',
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
  'Por Campanhas': 'Análise com base na data de execução da campanha: considera as campanhas de ativação do CRM executadas no período e mostra quantos clientes agendaram, por que os demais não agendaram e quantos ainda falta contatar.',
}

// Tabela do ícone na linha das abas, à direita (aba Por Campanhas).
const TABELA_CAMPANHAS = {
  itens: [
    ['O que mostra', 'Uma linha por data de geração (todas as campanhas do dia juntas), da mais recente para a mais antiga, e uma linha de Total no fim.'],
    ['Colunas', 'Data de geração (do nome do arquivo RCR038), Campanhas geradas, Contatos gerados, Contatos agendados, Contatos encerrados, Contatos a realizar, Agendamentos comparecidos, Agendamentos a comparecer, Agendamentos não comparecidos (No-show) e as taxas de Agendamento, Conversão e No-show.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data de geração; o Total é igual aos cards.'],
  ],
}

// Pop-up do ícone ✓ (Conferência linha a linha) na linha das abas, à direita (aba Por Campanhas).
const TABELA_CONFERENCIA = {
  itens: [
    ['Para que serve', 'Conferir de onde sai cada número da aba: um contato gerado (atendimento) por linha, com o que foi encontrado em cada relatório. A soma das linhas de cada situação é igual ao card.'],
    ['Filtros', 'Todos, Contato agendado, Contato encerrado e Contato a realizar (quantidade de cada um no botão = cards), e busca por cliente, chassi, atendimento, campanha ou operador. Vale o filtro Data da tela.'],
    ['Colunas do RCR038', 'Data da campanha (nome do arquivo), Campanha (ID_Campanha_Execucao), Atendimento (id_atendimento), Cód. cliente (ID_Cliente), Cliente (nome), Chassi.'],
    ['Colunas do RCR017 (pelo atendimento)', 'Contato (Encerrado / registrado, Já contatado sem resultado, Sem contato), Motivo de encerramento (o do contato mais recente), 1º contato e Último contato (AtendimentoContato_Data), Nº contatos (linhas do atendimento), Operador (Atendimento_UsuarioNom). Vazias = atendimento não está no RCR017.'],
    ['Colunas do ROF037 (pelo chassi + cliente)', 'Agendamento criado em (AgendamentoHistorico_Data), Dias após a campanha (criação − data da campanha, até 30), Agendado para (DtAgendamento), Tipo, Status, O.S. (OSNumero) e Resultado (Compareceu, A comparecer, Não compareceu (No-show)). Vazias = não agendado. Veículo agendado na = quando o mesmo veículo foi agendado por outra campanha, mostra a campanha e o atendimento onde o agendamento contou (esta linha fica como não agendada).'],
    ['Situação', 'Contato agendado (achou agendamento no ROF037 — vale mesmo se o RCR017 tiver motivo de recusa) · Contato encerrado (não agendado com motivo no RCR017) · Contato a realizar (não agendado sem motivo).'],
    ['Exportar Excel', 'Baixa as linhas do filtro atual, com as mesmas colunas, para conferir nos relatórios do Dealer.net.'],
  ],
}

// Tabela do ícone na linha das abas, à direita (aba Por Data Agendamento).
const TABELA_AGENDAMENTOS = {
  itens: [
    ['O que mostra', 'Uma linha por data do agendamento, em ordem de data (da mais antiga para a mais recente), e uma linha de Total no fim.'],
    ['Colunas', 'Data do agendamento, Agendamentos, Ativos, Passivos, Agendamentos comparecidos, Agendamentos a comparecer, Agendamentos Não comparecidos (No-Show), as taxas de Agendamento (total, ativo e passivo — agendamentos que compareceram) e de No-show, Faturamento Total e Ticket médio das O.S. geradas.'],
    ['Regras', 'As mesmas dos cards e indicadores da aba, calculadas por data do agendamento; o Total é igual aos cards.'],
  ],
}
// Pop-up do ícone ✓ (Consulta de agendamentos) da aba Por Data Agendamento.
const TABELA_CONSULTA_AGEND = {
  itens: [
    ['Para que serve', 'Consultar os agendamentos do ROF037 um a um e conferir os cards da aba. Vale o filtro Data (data do agendamento, DtAgendamento) e o filtro Empresas da tela.'],
    ['Filtros', 'Todos (sem cancelados) — igual ao card Agendamentos realizados · Ativos · Ativos de campanha · Ativos sem campanha · Passivos (Receptivo, Presencial, Internet) · Com mais de um serviço (o mesmo agendamento tem 2 ou mais serviços no ROF037, uma linha por serviço; sem os cancelados) · Cancelados (status CAN, fora dos cards). Quantidade de cada um no botão; busca por cliente, chassi, placa, agendador ou O.S.'],
    ['Um agendamento por linha', 'O ROF037 repete o agendamento em várias linhas (uma por serviço); a consulta mostra uma vez (empresa + cliente + data/hora + chassi, a mesma regra dos cards) e junta os serviços na coluna Serviço (OficinaServico_TMODes); a coluna Nº de serviços mostra quantos são.'],
    ['Colunas do ROF037', 'Data agendada (DtAgendamento), Criado em (AgendamentoHistorico_Data), Empresa (EmpresaNome), Cód. cliente (CodCliente), Cliente, Chassi, Placa, Modelo (ModeloVeiculo), Tipo (AgendamentoTipo), Agendador, Status (StatusAgendamento), O.S. (OSNumero), Abertura da O.S. (DataAbertura), Serviço (OficinaServico_TMODes — os vários serviços do mesmo agendamento ficam juntos, separados por /), Nº de serviços (quantos serviços diferentes o agendamento tem), Observação (OBSAgendamento), Cancelado em (DataCancelamento), Motivo do cancelamento (MotivoCancelamento).'],
    ['Desfecho', 'Comparecido (tem O.S.) · No-show (status NSW) · A comparecer (sem O.S. e sem no-show) · Cancelado (CAN) — as mesmas regras dos cards.'],
    ['Veio de campanha?', 'Só para os Ativos. Sim = o mesmo chassi + cliente (Chassi + CodCliente = Chassi + ID_Cliente) está num RCR038 e o agendamento foi criado da data da campanha até 30 dias depois — a mesma regra do Agendado da aba Por Campanhas, olhando ao contrário. Colunas Campanha(s) (data), Atendimento(s), Dias após a campanha e Nº de campanhas vêm do RCR038; o veículo pode estar em mais de uma campanha dentro dos 30 dias, e aí todas aparecem, cada uma com a sua data. Campanhas de meses anteriores contam (ex: agendamento de outubro criado por campanha de setembro).'],
    ['Diferença com a aba Por Campanhas', 'Aqui o filtro Data é a data do AGENDAMENTO; na aba Por Campanhas é a data da CAMPANHA. Por isso aqui entram agendamentos de campanhas de meses anteriores. As duas contam cada agendamento uma vez (ex: outubro — 5 agendados das campanhas de outubro; aqui 15 ativos de campanha agendados para outubro, contando campanhas de setembro).'],
    ['Exportar Excel', 'Baixa as linhas do filtro atual, com as mesmas colunas.'],
    ['Por que o ROF037 e não o RCR014', 'O ROF037 traz o tipo do agendamento (Ativo/Receptivo/Presencial/Internet), o status (inclusive no-show e cancelado), a empresa, o agendador e o número da O.S.; o RCR014 não traz tipo, status nem empresa.'],
  ],
}

// Pop-up do ícone ✓ (Consulta de O.S.) na linha das abas, à direita (aba Por Data da O.S.).
const TABELA_CONSULTA_OS = {
  itens: [
    ['Para que serve', 'Consultar as O.S. do ROF001 TODAS uma a uma e conferir os cards da aba. Vale o filtro Data (data de abertura, Data Criacao) e o filtro Empresas da tela.'],
    ['Filtros', 'Todas (sem canceladas) — igual ao card Quant. O.S. por data de abertura · Com agendamento — igual ao card O.S. com agendamento · Agendamento ativo · Agendamento ativo de campanha · Agendamento passivo (Receptivo, Presencial, Internet) · Sem agendamento · Estava no agendamento, não aberta por ele — igual ao card O.S. estava no agendamento, não aberta por ele · Pendentes de autorização (alerta ⚠) · Canceladas (fora dos cards). Quantidade de cada um no botão; busca por O.S., chassi, consultor, agendador, empresa ou número da campanha.'],
    ['Uma O.S. por linha', 'O ROF001 tem várias linhas por O.S.; a consulta mostra uma vez (Empresa + OS Numero) com os valores somados de todas as linhas — a mesma regra dos cards.'],
    ['Colunas do ROF001', 'Data de abertura (Data Criacao), Empresa, O.S. (OS Numero), Situação (Situacao Tipo OS), Tipo O.S. (Tipo OS Sigla), Chassi, Consultor (Consultor Nome), Agendador (só informativo — não é usado na conta), Peças (Produto), Serviços (Servico), Desconto e Total.'],
    ['Colunas do ROF037', 'Veio de agendamento? = Sim quando a O.S. está no ROF037 (Empresa + OS Numero = EmpresaNome + OSNumero) · Tipo do agendamento (AgendamentoTipo) e Agendamento criado em (AgendamentoHistorico_Data) desse agendamento.'],
    ['Veio de campanha? (RCR038)', 'Só para O.S. de agendamento Ativo. Sim = o Chassi + CodCliente do agendamento do ROF037 está num RCR038 (Chassi + ID_Cliente) e o agendamento foi criado da data da campanha até 30 dias depois — a mesma regra da aba Por Campanhas. Campanha(s) (data), Atendimento(s) e Dias após a campanha vêm do RCR038; se o veículo estava em mais de uma campanha na janela, todas aparecem. Filtro próprio: Agendamento ativo de campanha.'],
    ['Estava no agendamento, não aberta por ele', 'O.S. que NÃO está no ROF037, mas o veículo (chassi) tinha agendamento no ROF037 (sem CAN) perto da abertura: (1) 2ª O.S. da mesma visita — no mesmo dia, o agendamento abriu outra O.S.; (2) agendamento no mesmo dia sem ligação com esta O.S.; (3) agendamento sem O.S. (no-show ou em aberto) nos 30 dias antes, e o veículo veio depois sem agendar. Colunas: Estava no agendamento sem ser aberta por ele (qual dos três casos) e Agendamento do veículo (não ligado) — data, tipo, status, O.S. e empresa do agendamento.'],
    ['Exportar Excel', 'Baixa as linhas do filtro atual, com as mesmas colunas.'],
  ],
}

// Tabela do ícone na linha das abas, à direita (aba Por Data da O.S.).
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
    ['Tabela — Conferência linha a linha', TABELA_CONFERENCIA],
    ['Indicador — Taxa de Agendamento', 'taxaAgendamento'],
    ['Indicador — Taxa de Conversão', 'taxaConversao'],
    ['Indicador — Taxa de No-show', 'taxaNoShow'],
    ['Card — Campanhas geradas', 'campanhas'],
    ['Card — Contatos gerados', 'contatos'],
    ['Card — Contatos agendados', 'agendados'],
    ['Card — Contatos encerrados', 'encerrados'],
    ['Card — Contatos a realizar', 'faltaContatar'],
    ['Quadro — Contatos agendados', 'quadroAgendados'],
    ['Quadro — Motivo de Encerramento', 'motivos'],
    ['Lista — Contatos a realizar', 'listaFaltaContatar'],
  ]],
  ['Aba Por Data Agendamento', [
    ['Tabela — Agendamentos por data do agendamento', TABELA_AGENDAMENTOS],
    ['Tabela — Consulta de agendamentos', TABELA_CONSULTA_AGEND],
    ['Indicador — Taxa de Agendamento', 'agTaxaConversao'],
    ['Indicador — Taxa de Agendamento Ativo', 'agTaxaConversaoAtivo'],
    ['Indicador — Taxa de Agendamento Passivo', 'agTaxaConversaoPassivo'],
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
    ['Tabela — Consulta de O.S.', TABELA_CONSULTA_OS],
    ['Indicador — Taxa de Agendamento', 'gaugeAgendamentoOs'],
    ['Indicador — Taxa de Agendamento Ativo', 'gaugeAtivo'],
    ['Indicador — Taxa de Agendamento Passivo', 'gaugePassivo'],
    ['Indicador — Taxa de O.S. fora do Agendamento', 'gaugeAgNaoLigado'],
    ['Card — Quant. O.S. por data de abertura', 'osAbertura'],
    ['Alerta — O.S. pendentes', ALERTA_PENDENTES],
    ['Card — O.S. com agendamento', 'osAgendamento'],
    ['Card — Agendamentos ativos', 'agAtivos'],
    ['Card — Agendamentos passivos', 'agPassivos'],
    ['Card — O.S. estava no agendamento, não aberta por ele', 'osAgNaoLigado'],
    ['Card — Conversão — Total', 'conversaoTotal'],
    ['Card — Conversão — Ativos', 'conversaoAtivos'],
    ['Card — Conversão — Passivos', 'conversaoPassivos'],
  ]],
]
export const MANUAL_GERAL = [
  {
    titulo: 'Visão geral',
    itens: [
      ['Para que serve', 'Acompanhar a Mesa de Agendamento do Pós-Venda: o resultado das campanhas de ativação do CRM (contatos agendados, encerrados e a realizar, motivos de encerramento), os agendamentos marcados e o seu desfecho (comparecido, a comparecer, no-show), e quantas O.S. vieram de agendamento (ativo ou passivo) e quanto faturaram.'],
      ['Abas', 'Por Campanhas (data da campanha) · Por Data Agendamento (data para quando o agendamento foi marcado) · Por Data da O.S. (data de abertura da O.S.). O objetivo de cada aba aparece logo abaixo das abas.'],
      ['Fonte dos agendamentos', 'O ROF037 é a fonte única dos agendamentos em todas as abas (o ROF026 e o RCR014 não são usados).'],
    ],
  },
  {
    titulo: 'Filtros e botões',
    itens: [
      ['Data', 'Ao abrir: o mês atual, do dia 1 até ontem (no dia 1, o mês anterior). As setas ‹ › trocam de mês; o calendário aceita qualquer data. O período escolhido continua o mesmo ao trocar de aba. Cada aba aplica o filtro na sua data (ver Abas).'],
      ['Empresas', 'Nas abas Por Data Agendamento e Por Data da O.S. (por EmpresaNome do ROF037 / Empresa do ROF001). Não existe na aba Por Campanhas: o RCR038 não identifica a empresa.'],
      ['Ícones da aba', 'Na linha das abas, à direita: ✓ abre a consulta linha a linha da aba (Conferência linha a linha, Consulta de agendamentos ou Consulta de O.S., todas com filtros, busca e Exportar Excel) e ▦ abre a tabela com os números por data.'],
      ['Cabeçalho', 'Atualizar (↻) relê os relatórios do SharePoint · Engrenagem (⚙) define as metas dos indicadores · Livro abre este manual. "Última atualização" = quando os relatórios foram lidos.'],
      ['ⓘ dos cards', 'Cada card, indicador e quadro tem o botão ⓘ com o objetivo, o cálculo (como os relatórios são ligados) e a fonte; as regras completas e as colunas usadas estão nas seções de cada aba deste manual.'],
    ],
  },
  {
    titulo: 'Metas dos indicadores',
    itens: [
      ['Onde definir', 'Botão de engrenagem (⚙) ao lado do botão Atualizar, no cabeçalho do BI. A janela lista os indicadores (velocímetros) de cada aba com a meta em %; Salvar vale para todos os usuários.'],
      ['Padrão', 'Enquanto ninguém alterar: 80% para as taxas de agendamento e de conversão e 15% para as taxas de No-show (quanto menor, melhor).'],
      ['Cor do velocímetro', 'Pelo atingimento da meta: abaixo de 80% vermelho, de 80% a 99% amarelo, 100% ou mais verde. Nas taxas de No-show, atingimento = meta ÷ valor.'],
      ['Registro', 'A janela mostra a data e o usuário da última alteração.'],
    ],
  },
  {
    titulo: 'Fontes (relatórios)',
    itens: [
      [ARQ_OS, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Relatório Geral OS'],
      [ARQ_AGEND, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › AGENDAMENTO DE SERVICOS E PRODUTOS'],
      [ARQ_CAMPANHA, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › CAMPANHA CRM › (ano)'],
      [ARQ_CONTATO, 'Pasta SharePoint: Banco de Dados - DAF - Pós-Vendas › Agendamentos - CRM › LISTA POR DATA CONTATO_ENCERRAMENTO'],
      ['Aba lida', 'De cada arquivo é lida a aba "Dados" (como vem do Dealer.net); se não existir, a aba com mais linhas. Abas criadas a mais (ex: tabela dinâmica) não atrapalham.'],
      ['Arquivos soltos', 'Só os arquivos dentro das pastas acima são lidos; arquivos salvos direto na pasta Agendamentos - CRM não entram.'],
    ],
  },
]
