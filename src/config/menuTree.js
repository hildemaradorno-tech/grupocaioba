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
          { key: 'bases-calculo', label: 'Base de Cálculo' },
          { key: 'politica-comissao', label: 'Política de Comissões' },
          { key: 'regras-faixas', label: 'Regras' },
          { key: 'cargos-remuneracoes', label: 'Cargos e Remunerações' },
        ],
      },
      {
        // Agrupamento de menu (sem navTo) — cada item abaixo é uma tela própria, não mais abas
        // de uma página única. Comissões - DAF e Comissões - HONDA são 2 telas separadas no menu
        // (rotas /calculo-comissoes e /calculo-comissoes-motos) mas compartilham a mesma
        // permissão 'calculo-comissoes' (a diferença entre elas é só o agrupamento de empresas).
        key: '_folha-pagamento-daf',
        label: 'Comissões Pós-Vendas',
        children: [
          { key: 'ferias', label: 'Férias' },
          { key: 'sobreaviso-plantao', label: 'Sobreaviso/Plantão' },
          { key: 'calculo-comissoes', label: 'Cálculo de Comissões' },
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
          { key: 'metas/vendas', label: 'Vendas' },
          { key: 'metas/pos-vendas/pecas', label: 'Peças', virtual: true },
          { key: 'metas/pos-vendas/servicos_pecas', label: 'Pós-Vendas' },
          { key: 'metas/pos-vendas/total', label: 'Total Pós-Vendas', virtual: true },
          { key: 'metas/pos-vendas/distribuicao-consultores', label: 'Distribuição — Consultores', virtual: true },
          { key: 'metas/gestao-aprovacao', label: 'Total Grupo' },
        ],
      },
    ],
  },
  {
    key: '_controle-processos',
    label: 'Controle de Processos',
    children: [
      {
        // Permissões individuais mantidas (controlam quais abas aparecem em Garantias DAF),
        // mas o grupo inteiro navega direto pra página única — ver navTo no Home.jsx (TabelaMenu),
        // mesmo padrão do grupo Matriz KPIs logo abaixo. As telas de Andamento/Aberto/a Receber
        // já ficam acessíveis como abas (GarantiasNav) dentro de uma mesma tela.
        key: '_garantias-daf',
        label: 'Garantias DAF',
        navTo: 'garantias-daf-andamento',
        children: [
          { key: 'garantias-daf-andamento', label: 'Garantias DAF na Oficina' },
          { key: 'garantias-daf', label: 'Garantias DAF Aberto' },
          { key: 'garantias-daf-historicodeos', label: 'Histórico de O.S.' },
          { key: 'garantias-daf-titulos',   label: 'Garantias DAF a Receber' },
        ],
      },
      { key: 'honda/contas-a-receber', label: 'Contas a Receber HONDA' },
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
      { key: 'auditoria-os-aberto', label: 'Auditoria O.S. Aberta' },
      {
        key: '_garantia.cadastros',
        label: 'Cadastros de Garantia',
        children: [
          { key: 'garantia/tipo-titulo', label: 'Tipo de Título Garantia' },
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
      { key: 'projetos/calendario', label: 'Agenda', virtual: true },
      { key: 'projetos/ata-reuniao', label: 'Ata de Reunião', virtual: true },
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
        key: '_gestao-projetos.cadastros',
        label: 'Cadastros',
        children: [
          { key: 'projetos/areas', label: 'Áreas' },
          { key: 'projetos/responsaveis', label: 'Responsáveis' },
          { key: 'projetos/fases', label: 'Fases' },
          { key: 'projetos/status', label: 'Status' },
          { key: 'projetos/templates', label: 'Templates de Tarefa' },
        ],
      },
    ],
  },
  {
    key: '_calculadoras',
    label: 'Calculadoras',
    children: [
      { key: 'calculadoras/venda-servico', label: 'Venda de Serviço Terceiro' },
    ],
  },
  {
    // Gestor de Peças 2.0 — dois Gestores separados com as mesmas telas (fase 1 com dados simulados —
    // ver backend/services/gestorPecas/dataProvider.js). Dashboards no BI; regras em Configurações → Departamentos → Peças.
    key: '_pecas',
    label: 'Gestor de Peças 2.0 — Trucks',
    children: telasGestorPecas('pecas'),
  },
  {
    key: '_pecas-motos',
    label: 'Gestor de Peças 2.0 — Motos',
    children: telasGestorPecas('pecas-motos'),
  },
  {
    key: '_bi',
    label: 'BI - Dashboard',
    children: [
      { key: 'bi/garantias-daf', label: 'BI — Garantias DAF' },
      { key: 'bi/projetos', label: 'BI — Gestão de Projetos' },
      { key: 'bi/possibilidades', label: 'BI — Possibilidades' },
      { key: 'bi/agendamento-servicos', label: 'BI — Agendamento de Serviços' },
      { key: 'bi/planos-manutencao', label: 'BI — Planos de Manutenção' },
      { key: 'bi/gestor-pecas', label: 'BI — Gestor de Peças 2.0 — Trucks' },
      { key: 'bi/gestor-pecas-motos', label: 'BI — Gestor de Peças 2.0 — Motos' },
      {
        // Agrupamento de menu (sem navTo) — cada item abaixo é uma tela própria, não mais abas
        // de uma página única. Movido de Comissões pra cá junto com Medidas BI.
        key: '_bi.fontes-dados',
        label: 'Fontes de Dados',
        children: [
          { key: 'fontes-calculo', label: 'Dealer.net' },
          { key: 'fontes-microwork', label: 'MicroWork' },
          // Mesma key de antes (bi/medidas) pra não perder as permissões já concedidas.
          { key: 'bi/medidas', label: 'Medidas BI' },
        ],
      },
      {
        // Permissões individuais mantidas (controlam quais abas aparecem em /kpi/matriz),
        // mas o grupo inteiro navega direto pra página única — ver navTo no Home.jsx (TabelaMenu).
        key: '_bi.kpis',
        label: 'Matriz KPIs',
        navTo: 'kpi/matriz',
        children: [
          { key: 'kpi/resultados', label: 'Resultados' },
          { key: 'kpi/bloco1-corporativo', label: 'Bloco 1 — Corporativo' },
          { key: 'kpi/bloco2-operacional', label: 'Bloco 2 — Departamental' },
          { key: 'kpi/bloco3-servicos', label: 'Bloco 3 — Serviços' },
          { key: 'kpi/bloco3-pecas', label: 'Bloco 3 — Peças' },
          { key: 'kpi/orcamento-backlog', label: 'Orçamento & Backlog' },
          { key: 'kpi/auditoria', label: 'Fontes' },
        ],
      },
      // Logo abaixo da Matriz KPIs (a campanha usa os blocos da Matriz). Mesmo padrão da Matriz:
      // o grupo navega direto pra página única; cada aba e cada empresa é uma permissão própria
      // (ver CAMPANHA_ABAS / PERM_EMPRESA em BiCampanha.jsx) e os botões são ações em acoesMenu.js.
      // Precisa de pelo menos 1 aba E 1 empresa para usar a tela.
      {
        key: '_bi.campanha',
        label: 'Campanha Pós-Venda - DAF',
        navTo: 'bi/campanha',
        children: [
          { key: 'bi/campanha/regras', label: 'Aba Regras' },
          { key: 'bi/campanha/apuracao', label: 'Aba Apuração' },
          { key: 'bi/campanha/resultado', label: 'Aba Resultado' },
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
    key: '_documentacoes',
    label: 'Documentações',
    children: [
      { key: 'rpa/agendamentos', label: 'Agendamento de Processos' },
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
