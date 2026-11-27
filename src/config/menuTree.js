// Telas do Gestor de Peças 2.0 (iguais para Trucks 'pecas' e Motos 'pecas-motos')
const TELAS_GESTOR_PECAS = [
  ['central-alertas', 'Central de Alertas'],
  ['estoque', 'Posição de Estoque'],
  ['classificacao', 'Classificação e Curvas (ABC/XYZ/Frequência)'],
  ['demanda', 'Demanda e Tendências'],
  ['reposicao', 'Reposição e Sugestão de Compra'],
  ['cobertura-ruptura', 'Cobertura e Ruptura'],
  ['excesso-obsoletos', 'Excesso e Obsoletos'],
  ['promocoes', 'Oportunidades de Promoção'],
  ['pedidos-pendentes', 'Itens em Pedido Pendente'],
  ['transferencias', 'Realocação entre Lojas'],
  ['anomalias', 'Anomalias de Compra, Preço e Custo'],
  ['produto', 'Evolução do Produto'],
  ['fornecedores', 'Desempenho de Fornecedores'],
  ['assistente-ia', 'Assistente IA'],
  ['parametros', 'Parâmetros'],
]
const telasGestorPecas = (prefixo) => TELAS_GESTOR_PECAS.map(([slug, label]) => ({ key: `${prefixo}/${slug}`, label }))

export const MENU_TREE = [
  {
    key: '_config',
    label: 'Configurações',
    children: [
      { key: 'usuarios', label: 'Usuários' },
      { key: 'grupos', label: 'Grupos de Acessos' },
      { key: 'permissoes-matriz', label: 'Matriz de Permissões' },
      {
        key: '_gestao-tempo',
        label: 'Gestão de Tempo',
        children: [
          { key: 'feriados', label: 'Feriados' },
          { key: 'calendario', label: 'Calendário' },
        ],
      },
      {
        key: '_cadastros',
        label: 'Cadastro de Tabelas',
        children: [
          {
            key: '_cadastros.gerais',
            label: 'Tabelas da Organização',
            children: [
              { key: 'segmentos', label: 'Segmentos' },
              { key: 'agrup-empresas', label: 'Agrupamento Empresas' },
              { key: 'empresas', label: 'Empresas' },
              { key: 'areas', label: 'Áreas' },
              { key: 'agrup-departamentos', label: 'Agrupamento Depto.' },
              { key: 'departamentos', label: 'Departamentos' },
              { key: 'setores', label: 'Setor de Serviços' },
              { key: 'box', label: 'Box' },
              { key: 'agrup-cargos', label: 'Agrupamento de Cargos' },
              { key: 'cargos', label: 'Cargos' },
              { key: 'organograma', label: 'Organograma' },
              { key: 'funcionarios', label: 'Funcionários' },
            ],
          },
          {
            key: '_cadastros.sistemas',
            label: 'Tabelas Gerais',
            children: [
              { key: 'projetos/sistemas', label: 'Sistemas' },
            ],
          },
          {
            key: '_cadastros.vendas',
            label: 'Tabelas de Vendas',
            children: [
              { key: 'movimento-venda', label: 'Movimento de Venda' },
              { key: 'natureza-operacoes', label: 'Natureza de Operações' },
              { key: 'tipos-produtos', label: 'Tipos de Produtos' },
              { key: 'tipos-os', label: 'Tipos de O.S.' },
              { key: 'classificacao-compra', label: 'Classificação de Compra' },
            ],
          },
          {
            key: '_cadastros.compras',
            label: 'Tabelas de Compras',
            children: [
              { key: 'fornecedores', label: 'Fornecedores' },
            ],
          },
          {
            key: '_cadastros.auditoria-externa',
            label: 'Auditoria Externa',
            children: [
              { key: 'auditoria-externa/tipos-divergencia', label: 'Tipos de Divergência' },
            ],
          },
          {
            key: '_cadastros.garantias',
            label: 'Tabelas de Garantia',
            children: [
              { key: 'garantia/modelos-nota-debito', label: 'Modelos de Nota de Débito' },
            ],
          },
        ],
      },
      {
        key: '_governanca',
        label: 'Governança',
        children: [
          { key: 'governanca/grupo-acessos', label: 'Grupo de Acessos' },
          { key: 'governanca/perfis-acesso', label: 'Perfis de Acesso' },
        ],
      },
      {
        // Menus por departamento da empresa. Controladoria: o grupo navega direto pra página
        // única com abas (ControladoriaNav); cada aba é uma permissão própria.
        key: '_config.departamentos',
        label: 'Departamentos',
        children: [
          {
            key: '_config.departamentos.controladoria',
            label: 'Controladoria',
            navTo: 'controladoria/dre',
            children: [
              { key: 'controladoria/dre', label: 'DRE' },
              { key: 'controladoria/plano-contas', label: 'Plano de Contas' },
              { key: 'controladoria/centro-resultado', label: 'Centro de Resultado' },
              { key: 'controladoria/orcamento', label: 'Orçamento' },
            ],
          },
          {
            // Regra única de classificação do Gestor de Peças 2.0 (Trucks/Dealer.net e Motos/MicroWork).
            // Key começa com 'pecas/' para valer a mesma liberação do backend e das policies pec_*.
            key: '_config.departamentos.pecas',
            label: 'Peças',
            children: [
              { key: 'pecas/configuracao', label: 'Classificação de Estoque — Trucks' },
              { key: 'pecas-motos/configuracao', label: 'Classificação de Estoque — Motos' },
            ],
          },
        ],
      },
      {
        // Manuais de integração do sistema com ferramentas externas (ex.: Power BI ↔ Supabase).
        key: '_config.integracoes',
        label: 'Integrações',
        children: [
          { key: 'integracoes/controladoria', label: 'Controladoria' },
        ],
      },
      {
        // Medidas BI: movido do menu BI (grupo Fontes de Dados) para Configurações em nov/2026.
        // Mesma key (bi/medidas) e rota pra não perder as permissões já concedidas.
        key: '_config.fontes-dados',
        label: 'Fontes de Dados',
        children: [
          { key: 'bi/medidas', label: 'Medidas BI' },
        ],
      },
    ],
  },
  {
    key: '_comissoes-calculo',
    label: 'Comissões',
    children: [
      {
        // Agrupamento de menu (sem navTo) — cada item abaixo é uma tela própria, não mais abas
        // de uma página única. Ordem de cima pra baixo no menu lateral = ordem desta lista.
        key: '_comissoes',
        label: 'Regras de Comissões',
        children: [
          { key: 'tipos-processo', label: 'Tipo de Processo' },
          { key: 'rubricas', label: 'Rubrica' },
          // Fonte de Dados: uma tela com abas (Dealer.net / MicroWork); as duas permissões continuam
          // separadas (mesmas keys de antes). Na Home vira um botão só.
          { key: 'fontes-calculo', label: 'Fonte de Dados — Dealer.net', atalhosHome: [{ label: 'Fonte de Dados', navTo: 'fontes-dados' }] },
          { key: 'fontes-microwork', label: 'Fonte de Dados — MicroWork', virtual: true },
          { key: 'bases-calculo', label: 'Base de Cálculo' },
          { key: 'politica-comissao', label: 'Política de Comissões' },
          { key: 'regras-faixas', label: 'Regras' },
          { key: 'regras-pj', label: 'Regras PJ' },
          { key: 'descontos-pj', label: 'Descontos PJ' },
          { key: 'documentos-pj', label: 'Documentos PJ' },
          { key: 'cargos-remuneracoes', label: 'Cargos e Remunerações' },
        ],
      },
      {
        // Agrupamento de menu (sem navTo) — cada item abaixo é uma tela própria. Comissões - DAF
        // ('calculo-comissoes'), Comissões - HONDA ('calculo-comissoes-motos') e Prestadores de Serviços
        // ('calculo-comissoes-grupo') têm permissões separadas: cada grupo de acesso libera a tela da sua operação.
        key: '_folha-pagamento-daf',
        label: 'Comissões Pós-Vendas',
        children: [
          { key: 'ferias', label: 'Férias' },
          { key: 'sobreaviso-plantao', label: 'Sobreaviso/Plantão' },
          { key: 'calculo-comissoes', label: 'Comissões - DAF' },
          { key: 'calculo-comissoes-motos', label: 'Comissões - HONDA' },
          { key: 'calculo-comissoes-grupo', label: 'Prestadores de Serviços' },
          { key: 'processamento-comissoes', label: 'Processamento de Comissões' },
        ],
      },
    ],
  },
  {
    key: '_metas',
    label: 'Planejamento de Metas',
    children: [
      {
        key: '_metas.operacionais',
        label: 'Operacionais',
        children: [
          // Mesmo padrão de Contas a Receber HONDA: o grupo navega direto pra tela; a key da tela é mantida
          // (o acesso já dado não muda) e cada aba é uma permissão própria (marcar = pode ver a aba). Botões
          // são ações em acoesMenu.js. (27/11/2026)
          {
            key: '_metas.vendas',
            label: 'Vendas',
            navTo: 'metas/vendas',
            children: [
              { key: 'metas/vendas', label: 'Tela Vendas' },
              { key: 'metas/vendas/aba-novos', label: 'Aba Novos' },
              { key: 'metas/vendas/aba-seminovos', label: 'Aba Seminovos' },
              { key: 'metas/vendas/aba-total', label: 'Aba Total Vendas' },
            ],
          },
          {
            key: '_metas.posvendas',
            label: 'Pós-Vendas',
            navTo: 'metas/pos-vendas/servicos_pecas',
            children: [
              { key: 'metas/pos-vendas/servicos_pecas', label: 'Tela Pós-Vendas' },
              { key: 'metas/pos-vendas/servicos_pecas/aba-mecanico', label: 'Aba Mecânico' },
              { key: 'metas/pos-vendas/servicos_pecas/aba-consultor', label: 'Aba Consultor' },
              { key: 'metas/pos-vendas/servicos_pecas/aba-pecas', label: 'Aba Peças' },
              { key: 'metas/pos-vendas/servicos_pecas/aba-total', label: 'Aba Total' },
              { key: 'metas/pos-vendas/servicos_pecas/aba-grupo', label: 'Aba Grupo' },
            ],
          },
          { key: 'metas/pos-vendas/total', label: 'Total Pós-Vendas', virtual: true },
          { key: 'metas/pos-vendas/distribuicao-consultores', label: 'Distribuição — Consultores', virtual: true },
          {
            key: '_metas.gestao',
            label: 'Total Grupo',
            navTo: 'metas/gestao-aprovacao',
            children: [
              { key: 'metas/gestao-aprovacao', label: 'Tela Total Grupo - Gestão de Aprovação' },
              { key: 'metas/gestao-aprovacao/aba-posvendas', label: 'Aba Pós-Vendas' },
              { key: 'metas/gestao-aprovacao/aba-vendas', label: 'Aba Vendas' },
              { key: 'metas/gestao-aprovacao/aba-geral', label: 'Aba Geral' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: '_controle-processos',
    label: 'Controle de Processos',
    children: [
      {
        // Mesmo padrão da Campanha Pós-Venda: o grupo navega direto pra tela única. A key da tela
        // (honda/contas-a-receber) é mantida, então o acesso já concedido não muda; cada aba é uma
        // permissão própria (marcar = pode ver a aba) e os botões são ações em acoesMenu.js.
        key: '_honda.contas-receber',
        label: 'Contas a Receber HONDA',
        navTo: 'honda/contas-a-receber',
        children: [
          { key: 'honda/contas-a-receber', label: 'Tela Contas a Receber HONDA' },
          { key: 'honda/contas-a-receber/garantias', label: 'Aba Garantias' },
          { key: 'honda/contas-a-receber/revisoes', label: 'Aba Revisões Gratuitas' },
          { key: 'honda/contas-a-receber/seguradoras', label: 'Aba Seguradoras' },
        ],
      },
      {
        key: '_bpm',
        label: 'Cancelamento/Devolução NF-e',
        navTo: 'bpm/nfe-cancelamento-devolucao',
        children: [
          { key: 'bpm/nfe-cancelamento-devolucao', label: 'Solicitações' },
          { key: 'bpm/processos', label: 'Processos (BPM)' },
          { key: 'bpm/modelador', label: 'Modelador de Processos' },
        ],
      },
      {
        key: '_truckpag',
        label: 'TruckPag a Receber',
        navTo: 'truckpag/conciliacao',
        children: [
          { key: 'truckpag/conciliacao', label: 'Conciliação' },
          { key: 'truckpag/repasses', label: 'Repasses' },
          { key: 'truckpag/titulos', label: 'Títulos a Receber' },
        ],
      },
      // Extrato de Pagamento DAF (19/11/2026) — planilha do SAP (Account-303920.xlsx) lida do SharePoint
      {
        key: '_garantia.extrato-daf',
        label: 'Extrato de Pagamento DAF',
        navTo: 'garantia/extrato-pagamento-daf',
        children: [
          { key: 'garantia/extrato-pagamento-daf', label: 'Extrato de Pagamento DAF' },
        ],
      },
      // Gestor de Peças 2.0 (movido para Controle de Processos em 29/10/2026) — dois Gestores separados com
      // as mesmas telas; keys mantidas (permissões pecas/... e pecas-motos/... não mudam). Sem dashboard no menu BI
      // (excluído a pedido do usuário em 29/10/2026); regras em Configurações → Departamentos → Peças.
      { key: '_pecas', label: 'Gestor de Peças 2.0 — Trucks', children: telasGestorPecas('pecas') },
      { key: '_pecas-motos', label: 'Gestor de Peças 2.0 — Motos', children: telasGestorPecas('pecas-motos') },
      {
        key: '_garantia.cadastros',
        label: 'Cadastros de Garantia',
        children: [
          { key: 'garantia/tipo-titulo', label: 'Tipo de Título Garantia' },
        ],
      },
      // Calculadoras movidas para Controle de Processos em 31/10/2026 — key da tela mantida
      // (calculadoras/venda-servico), então as permissões já concedidas não mudam.
      {
        key: '_calculadoras',
        label: 'Calculadoras',
        children: [
          { key: 'calculadoras/venda-servico', label: 'Venda de Serviço Terceiro' },
        ],
      },
    ],
  },
  {
    key: '_gestao-projetos',
    label: 'Gestão de Projetos',
    children: [
      { key: 'projetos', label: 'Projetos' },
      { key: 'projetos/lista-tarefas', label: 'Lista de Tarefas', virtual: true },
      { key: 'projetos/manifestacoes', label: 'Manifestações', virtual: true },
      { key: 'projetos/ata-reuniao', label: 'Ata de Reunião', virtual: true },
      { key: 'projetos/custos', label: 'Custos de Projetos', virtual: true },
      // Veio do BI - Dashboard › Gestão (13/11/2026) — key e endereço (/bi/projetos) mantidos.
      // virtual: fica dentro de Projetos (botão Dashboard | Controle), não aparece como menu próprio na Home
      { key: 'bi/projetos', label: 'BI — Gestão de Projetos', virtual: true },
      {
        key: '_gestao-projetos.auditoria-externa',
        label: 'Auditoria Externa',
        navTo: 'auditoria-externa/dashboard',
        children: [
          { key: 'auditoria-externa/dashboard', label: 'Dashboard' },
          { key: 'auditoria-externa/ciclos', label: 'Ciclos de Auditoria' },
          { key: 'auditoria-externa/divergencias', label: 'Divergências' },
          { key: 'auditoria-externa/plano-acao', label: 'Plano de Ação' },
          { key: 'auditoria-externa/tipos-acao', label: 'Tipos de Ação' },
        ],
      },
      {
        // virtual (16/11/2026): os cadastros ficam no botão engrenagem da tela Projetos; permissões mantidas
        key: '_gestao-projetos.cadastros',
        label: 'Cadastros',
        virtual: true,
        children: [
          { key: 'projetos/responsaveis', label: 'Responsáveis' },
          { key: 'projetos/fases', label: 'Fases' },
          { key: 'projetos/status', label: 'Status' },
          { key: 'projetos/templates', label: 'Templates de Tarefa' },
          { key: 'projetos/config-emails', label: 'Configurar E-mails' },
          { key: 'projetos/enviar-avisos', label: 'Enviar Avisos Agora (atrasadas e vencendo hoje)' },
        ],
      },
    ],
  },
  {
    key: '_bi',
    label: 'BI - Dashboard',
    children: [
      {
        // Agrupamento "Gestão Estratégica" (sem navTo, 13/11/2026), antes do Pós-Vendas: Matriz de KPIs - DAF.
        key: '_bi.gestao',
        label: 'Gestão Estratégica',
        children: [
          {
            // Permissões individuais mantidas (controlam quais abas aparecem em /kpi/matriz),
            // mas o grupo inteiro navega direto pra página única — ver navTo no Home.jsx (TabelaMenu).
            key: '_bi.kpis',
            label: 'Matriz de KPIs - DAF',
            navTo: 'kpi/matriz',
            children: [
              { key: 'kpi/resultados', label: 'Resultados' },
              { key: 'kpi/bloco1-corporativo', label: 'Bloco 1 — Corporativo' },
              { key: 'kpi/bloco2-operacional', label: 'Bloco 2 — Departamental' },
              { key: 'kpi/bloco3-servicos', label: 'Bloco 3 — Serviços' },
              { key: 'kpi/bloco3-pecas', label: 'Bloco 3 — Peças' },
              { key: 'kpi/orcamento-backlog', label: 'Orçamento & Backlog' },
            ],
          },
          // Campanha Pós-Venda logo abaixo da Matriz de KPIs, no grupo Gestão (13/11/2026). Mesmo padrão da Matriz de KPIs:
          // o grupo navega direto pra página única; cada aba e cada empresa é uma permissão própria
          // (ver CAMPANHA_ABAS / PERM_EMPRESA em BiCampanha.jsx) e os botões são ações em acoesMenu.js.
          // Precisa de pelo menos 1 aba E 1 empresa para usar a tela.
          {
            key: '_bi.campanha',
            label: 'Campanha Pós-Venda - DAF',
            navTo: 'bi/campanha',
            children: [
              { key: 'bi/campanha/regras', label: 'Aba Regras' },
              // Apuração e Resultado são uma aba só ("Resultado"); cada permissão libera uma visão dela.
              { key: 'bi/campanha/apuracao', label: 'Aba Resultado — Apuração (contribuição e faixa)' },
              { key: 'bi/campanha/resultado', label: 'Aba Resultado — Bônus R$ (colunas de bônus e cálculo)' },
              { key: 'bi/campanha/pagamento', label: 'Aba Pagamento' },
              { key: 'bi/campanha/empresa-trucks', label: 'Empresa CAIOBÁ TRUCKS (Gerente Geral)' },
              { key: 'bi/campanha/empresa-cg', label: 'Empresa Campo Grande' },
              { key: 'bi/campanha/empresa-dou', label: 'Empresa Dourados' },
              { key: 'bi/campanha/empresa-tl', label: 'Empresa Três Lagoas' },
              { key: 'bi/campanha/empresa-cs', label: 'Empresa Chapadão do Sul' },
            ],
          },
        ],
      },
      {
      // Agrupamento "Pós-Vendas" (sem navTo, 13/11/2026) — o mesmo subtítulo do menu lateral; as keys de
      // dentro não mudaram (permissões já dadas continuam valendo).
      key: '_bi.pos-vendas',
      label: 'Pós-Vendas',
      children: [
      { key: 'bi/agendamento-servicos', label: 'Agendamento de Serviços' },
      {
        // Auditoria O.S. Aberta numa tela só (nov/2026): Dashboard e Controle. A key do Controle
        // (auditoria-os-aberto) foi mantida — permissões e ações já dadas aos grupos não mudam.
        key: '_auditoria-os-aberto',
        label: 'Auditoria O.S. Aberta',
        navTo: 'bi/auditoria-os-aberto',
        children: [
          { key: 'auditoria-os-aberto/dashboard', label: 'Dashboard' },
          { key: 'auditoria-os-aberto', label: 'Controle' },
        ],
      },
      {
        // Garantias DAF numa tela só (BI — Garantias DAF): Dashboard (bi/garantias-daf) e Controle de
        // cada aba (chaves garantias-daf-*, mantidas para não mudar as permissões já dadas aos grupos).
        key: '_garantias-daf',
        label: 'Garantias DAF',
        navTo: 'bi/garantias-daf',
        children: [
          { key: 'bi/garantias-daf', label: 'Dashboards' },
          { key: 'garantias-daf-andamento', label: 'Controle — Na Oficina' },
          { key: 'garantias-daf', label: 'Controle — Com Garantista' },
          { key: 'garantias-daf-titulos', label: 'Controle — Títulos a Receber' },
          { key: 'garantias-daf-historicodeos', label: 'Controle — Histórico de O.S.' },
        ],
      },
      // Vieram do menu Pós-Vendas (13/11/2026, o menu foi removido) — keys e endereços (/pos-vendas/...) mantidos.
      { key: 'pos-vendas/produtividade', label: 'Indicadores de Produtividade' },
      // BI Planos de Manutenção: mesmo padrão do Contas a Receber HONDA — a key da tela (bi/planos-manutencao) dá o
      // acesso à tela (rotas do backend e RLS usam ela); cada aba é uma permissão própria (marcar = pode ver a aba) e os
      // botões são ações em acoesMenu.js. Precisa da tela e de pelo menos 1 aba.
      {
        key: '_bi.planos-manutencao',
        label: 'Planos de Manutenção',
        navTo: 'bi/planos-manutencao',
        children: [
          { key: 'bi/planos-manutencao', label: 'Tela BI — Planos de Manutenção' },
          { key: 'bi/planos-manutencao/resultado', label: 'Aba Resultado (Resumo, Tabela e Gráfico)' },
          { key: 'bi/planos-manutencao/oportunidades', label: 'Aba Oportunidades' },
          { key: 'bi/planos-manutencao/contratos', label: 'Aba Contratos' },
          { key: 'bi/planos-manutencao/veiculos-vendidos', label: 'Aba Veículos Vendidos' },
          { key: 'bi/planos-manutencao/ordens-servico', label: 'Aba Ordens de Serviço' },
        ],
      },
      { key: 'bi/possibilidades', label: 'Possibilidades - Sintonia do Dia' },
      ],
      },
    ],
  },
  {
    // Exibido como "Governança" desde 18/11/2026 (era "Documentações"); key mantida para não mudar as permissões.
    key: '_documentacoes',
    label: 'Governança',
    children: [
      // Saúde do Sistema (19/11/2026): semáforo de todos os monitores + rotinas automáticas + integrações (/api/saude-sistema) — primeiro do menu (21/11/2026)
      { key: 'governanca/saude-sistema', label: 'Saúde do Sistema' },
      {
        // Controle de Execuções RPA numa tela só (18/11/2026), como Garantias DAF: Dashboard (log do Robert
        // Automation, bi/rpa-execucoes) e Controle (antiga tela Agendamento de Processos — key rpa/agendamentos
        // mantida para não mudar as permissões já dadas; /rpa/agendamentos redireciona para ?modo=controle).
        // 21/11/2026: dividido em 3 menus no Governança — Monitor Robert Automation (Dashboard + Controle dos RPA),
        // Monitor Power BI e Monitor Microsoft Fabric (Controle filtrado pelo tipo). Mesmas 2 permissões para os três.
        key: '_rpa-execucoes',
        label: 'Monitores de Processos (Robert Automation, Power BI, Fabric)',
        // Na Home aparecem os 3 monitores separados (21/11/2026), como no menu lateral
        atalhosHome: [
          { label: 'Monitor Robert Automation', navTo: 'governanca/processos/rpa' },
          { label: 'Monitor Power BI', navTo: 'governanca/processos/power-bi' },
          { label: 'Monitor Microsoft Fabric', navTo: 'governanca/processos/fabric' },
        ],
        navTo: 'bi/rpa-execucoes',
        children: [
          { key: 'bi/rpa-execucoes', label: 'Dashboard' },
          { key: 'rpa/agendamentos', label: 'Controle — Agendamento de Processos' },
        ],
      },
      // Monitor Railway (19/11/2026): status, saúde, consumo, deploys e logs do backend (/api/railway)
      { key: 'governanca/monitor-railway', label: 'Monitor Railway' },
      // Monitor Supabase (19/11/2026): banco, Storage, conexões, desempenho, saúde e logs (/api/supabase-monitor)
      { key: 'governanca/monitor-supabase', label: 'Monitor Supabase' },
      // Monitor SharePoint (19/11/2026): planilhas que alimentam o portal (existência e atualização), senha do app no Azure (/api/sharepoint-monitor)
      { key: 'governanca/monitor-sharepoint', label: 'Monitor SharePoint' },
      // Monitor Cloudflare (19/11/2026): site no ar, publicações do frontend (Pages) e limite do plano (/api/cloudflare-monitor)
      { key: 'governanca/monitor-cloudflare', label: 'Monitor Cloudflare' },
      { key: 'documentacoes', label: 'Documentações' },
      { key: 'ecossistema', label: 'Ecossistema' },
    ],
  },
  {
    key: '_treinamentos',
    label: 'Treinamentos',
    children: [
      { key: 'treinamentos/grade', label: 'Grade de Treinamentos' },
      { key: 'treinamentos/central', label: 'Central de Treinamentos', href: 'https://centraldetreinamentos.netlify.app/' },
    ],
  },
]

// Returns all leaf keys (route paths) under a node
export function getLeafKeys(node) {
  if (!node.children) return [node.key]
  return node.children.flatMap(getLeafKeys)
}

export const ALL_LEAF_KEYS = MENU_TREE.flatMap(getLeafKeys)

// Normalize: strip leading slashes
export function normalizePath(path) {
  return String(path || '').replace(/^\/+/, '')
}
