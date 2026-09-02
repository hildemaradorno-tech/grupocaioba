export const MENU_TREE = [
  {
    key: '_config',
    label: 'Configurações',
    children: [
      { key: 'usuarios', label: 'Usuários' },
      { key: 'grupos', label: 'Grupos de Acessos' },
      { key: 'permissoes-matriz', label: 'Matriz de Permissões' },
      { key: 'funcionarios', label: 'Funcionários' },
      {
        key: '_gestao-tempo',
        label: 'Gestão de Tempo',
        children: [
          { key: 'feriados', label: 'Feriados' },
          { key: 'calendario', label: 'Calendário' },
        ],
      },
      { key: 'sincronizacao-dados', label: 'Sincronização de Dados' },
      {
        key: '_cadastros',
        label: 'Cadastro de Tabelas',
        children: [
          {
            key: '_cadastros.gerais',
            label: 'Tabelas Gerais',
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
        ],
      },
    ],
  },
  {
    key: '_comissoes-calculo',
    label: 'Comissões',
    children: [
      {
        key: '_comissoes',
        label: 'Regras de Comissões',
        children: [
          { key: 'fontes-calculo', label: 'Fonte de Cálculo' },
          { key: 'bases-calculo', label: 'Base de Cálculo' },
          { key: 'politica-comissao', label: 'Política de Comissões' },
          { key: 'cargos-remuneracoes', label: 'Cargos e Remunerações' },
          { key: 'rubricas', label: 'Rubrica' },
          { key: 'tipos-processo', label: 'Tipo de Processo' },
          { key: 'plano-dms', label: 'Valor Plano DMS' },
        ],
      },
      { key: 'ferias', label: 'Férias' },
      { key: 'calculo-comissoes', label: 'Cálculo de Comissões' },
      { key: 'plano-dms-calculo', label: 'Plano DMS' },
      { key: 'processamento-comissoes', label: 'Processamento de Comissões' },
      { key: 'sobreaviso-plantao', label: 'Sobreaviso/Plantão' },
    ],
  },
  {
    key: '_metas',
    label: 'Planejamento de Metas',
    children: [
      {
        key: '_metas.vendas',
        label: 'Vendas',
        children: [
          { key: 'metas/vendas/novos', label: 'Novos' },
          { key: 'metas/vendas/seminovos', label: 'Seminovos' },
          { key: 'metas/vendas/total', label: 'Total Vendas' },
        ],
      },
      {
        key: '_metas.pos-vendas',
        label: 'Pós-Vendas',
        children: [
          { key: 'metas/pos-vendas/pecas', label: 'Peças' },
          { key: 'metas/pos-vendas/servicos', label: 'Serviços' },
          { key: 'metas/pos-vendas/total', label: 'Total Pós-Vendas' },
          { key: 'metas/pos-vendas/distribuicao-consultores', label: 'Distribuição — Consultores', virtual: true },
        ],
      },
      { key: 'metas/gestao-aprovacao', label: 'Gestão de Aprovação' },
      { key: 'metas/total-grupo', label: 'Total Grupo' },
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
          { key: 'garantias-daf-faturadas', label: 'Garantias DAF Faturadas' },
          { key: 'garantias-daf-titulos',   label: 'Garantias DAF a Receber' },
        ],
      },
      { key: 'honda/garantias-a-receber', label: 'Contas a Receber HONDA' },
      {
        key: '_auditoria.cadastros',
        label: 'Cadastros de Auditoria',
        children: [
          { key: 'auditoria/responsaveis', label: 'Responsáveis' },
          { key: 'auditoria/situacoes', label: 'Situações' },
          { key: 'auditoria-os-aberto', label: 'Auditoria O.S. Aberta' },
        ],
      },
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
          { key: 'auditoria-externa/impactos', label: 'Impactos' },
        ],
      },
      {
        key: '_gestao-projetos.cadastros',
        label: 'Cadastros',
        children: [
          { key: 'projetos/empresas', label: 'Empresas' },
          { key: 'projetos/departamentos', label: 'Departamentos' },
          { key: 'projetos/areas', label: 'Áreas' },
          { key: 'projetos/sistemas', label: 'Sistemas' },
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
    key: '_bi',
    label: 'BI - Dashboard',
    children: [
      { key: 'bi/garantias-daf', label: 'BI — Garantias DAF' },
      { key: 'bi/projetos', label: 'BI — Gestão de Projetos' },
      { key: 'bi/possibilidades', label: 'BI — Possibilidades' },
      { key: 'bi/fontes', label: 'BI — Fontes' },
      { key: 'bi/medidas', label: 'BI — Medidas' },
      { key: 'bi/comissoes', label: 'BI — Comissões' },
      {
        // Permissões individuais mantidas (controlam quais abas aparecem em /kpi/matriz),
        // mas o grupo inteiro navega direto pra página única — ver navTo no Home.jsx (TabelaMenu).
        key: '_bi.kpis',
        label: 'Matriz KPIs',
        navTo: 'kpi/matriz',
        children: [
          { key: 'kpi/resultados', label: 'Resultados' },
          { key: 'kpi/bloco1-corporativo', label: 'Bloco 1 — Corporativo' },
          { key: 'kpi/bloco2-operacional', label: 'Bloco 2 — Operacional' },
          { key: 'kpi/bloco3-pos-venda', label: 'Bloco 3 — Pós-Venda' },
          { key: 'kpi/bloco3-pecas', label: 'Bloco 3 — Peças' },
          { key: 'kpi/bloco3-servicos', label: 'Bloco 3 — Serviços' },
          { key: 'kpi/orcamento-backlog', label: 'Orçamento & Backlog' },
          { key: 'kpi/auditoria', label: 'Auditoria de Fontes' },
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
  {
    key: '_governanca',
    label: 'Governança',
    children: [
      { key: 'governanca/grupo-acessos', label: 'Grupo de Acessos' },
      { key: 'governanca/perfis-acesso', label: 'Perfis de Acesso' },
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
