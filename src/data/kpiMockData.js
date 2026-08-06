// Estruturas de fallback da Matriz KPIs.
// Todos os valores numéricos são null — os dados reais vêm do SharePoint.

// ── RESULTADOS (Painel Executivo) ───────────────────────────────────────────
export const MOCK_RESULTADOS = {
  Vendas: [
    { bloco: 'Companhia',    peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Departamento', peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Individual',   peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
  ],
  'Pós-Vendas': [
    { bloco: 'Companhia',    peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Departamento', peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Individual',   peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
  ],
  Peças: [
    { bloco: 'Companhia',    peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Departamento', peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
    { bloco: 'Individual',   peso: null, q1: null, q2: null, q3: null, q4: null, fy: null },
  ],
}

const np = { meta: null, realizado: null }

// ── BLOCO 1 — Indicadores Corporativos/Financeiros ──────────────────────────
export const MOCK_BLOCO1 = [
  { indicador: 'Receita Líquida Total',    orientacao: '>', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Bruta Total',       orientacao: '>', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Bruta %',           orientacao: '>', metrica: '%',          metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Líquida Total',     orientacao: '>', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Margem Líquida %',         orientacao: '>', metrica: '%',          metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
  { indicador: 'Despesas Operacionais',    orientacao: '<', metrica: 'R$', metaAnual: null, peso: null, origem: 'PEO', responsavel: 'Renan', q1: np, q2: np, q3: np, q4: np, fy: np },
]

// ── BLOCO 2 — Indicadores Operacionais por Área ─────────────────────────────
export const MOCK_BLOCO2 = [
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Market Share TOTAL',         orientacao: '>', metrica: '%',       metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Retail Novos',               orientacao: '>', metrica: 'Unid.',   metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Margem Bruta Novos',         orientacao: '>', metrica: '%',       metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Seminovos', indicador: 'Volume de Vendas Seminovos', orientacao: '>', metrica: 'Unid.',   metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'F&I',              indicador: 'Penetração de Seguros %',    orientacao: '>', metrica: '%',       metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Score Card', responsavel: 'João',    q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Oficina',          indicador: 'Passagens na Oficina',       orientacao: '>', metrica: 'OS/mês',  metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Score Card', responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Oficina',          indicador: 'Clientes Ativos',            orientacao: '>', metrica: 'Clientes',metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Peças',            indicador: 'Faturamento Peças (R$)',     orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'João',    q1: np, q2: np, q3: np, q4: np, fy: np },
]

// ── BLOCO 3 — Pós-Venda ──────────────────────────────────────────────────────
export const MOCK_BLOCO3_POS_VENDA = [
  {
    tituloGerente: 'GERENTE GERAL',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Peças + Serviços)', orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta Serviços',                        orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta Peças Oficina',                   orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'O.S. aberta sem veículo',                      orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Absorção de Pós-Venda',                        orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Recusa de Garantia',                           orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 7, indicador: 'Penetração Plano de Manutenção',               orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 8, indicador: 'NPS (Net Promoter Score)',                     orientacao: '>', metrica: 'pts',    metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 9, indicador: 'O.S. abertas >= 30 dias',                      orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA CAMPO GRANDE',
    cor: 'indigo',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',         orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Eficácia da Oficina',         orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Produtividade da Oficina',    orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Margem Bruta Serviços',       orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Penetração Plano Manutenção', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Recusa de Garantia',          orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA DOURADOS',
    cor: 'violet',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',         orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Faturamento Balcão',          orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Eficácia da Oficina',         orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Produtividade da Oficina',    orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Auditoria (Score)',           orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Recusa de Garantia',          orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA TRÊS LAGOAS',
    cor: 'purple',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',         orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Eficácia da Oficina',         orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Produtividade da Oficina',    orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Penetração Plano Manutenção', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Recusa de Garantia',          orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA CHAPADÃO DO SUL',
    cor: 'fuchsia',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',         orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Eficácia da Oficina',         orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Produtividade da Oficina',    orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Penetração Plano Manutenção', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Recusa de Garantia',          orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE QUALIDADE',
    cor: 'teal',
    kpis: [
      { id: 1, indicador: 'O.S. Garantia em Aberto',    orientacao: '<', metrica: 'qtd',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Total de Agendamentos',      orientacao: '>', metrica: 'qtd',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: '% Agendamentos Convertidos', orientacao: '>', metrica: '%',    metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Auditorias por Casa',        orientacao: '>', metrica: 'qtd',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'NPS (Net Promoter Score)',   orientacao: '>', metrica: 'pts',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

// ── BLOCO 3 — Peças ──────────────────────────────────────────────────────────
export const MOCK_BLOCO3_PECAS = [
  {
    tituloGerente: 'GERENTE GERAL — PEÇAS',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Peças',                orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças',                  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Faturamento TRP',                        orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Gestão de Clientes (Evolução Carteira)', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Giro de Estoque',                        orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Resultado de Auditoria',                 orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 7, indicador: 'Obsoletos',                              orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE PEÇAS CAMPO GRANDE',
    cor: 'indigo',
    kpis: [
      { id: 1, indicador: 'Faturamento Peças',      orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças',  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Faturamento TRP',        orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Giro de Estoque',        orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Obsoletos',              orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Resultado de Auditoria', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE PEÇAS DOURADOS',
    cor: 'violet',
    kpis: [
      { id: 1, indicador: 'Faturamento Peças',      orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Faturamento Balcão',     orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta de Peças',  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Giro de Estoque',        orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Obsoletos',              orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE PEÇAS TRÊS LAGOAS',
    cor: 'purple',
    kpis: [
      { id: 1, indicador: 'Faturamento Peças',      orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças',  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Giro de Estoque',        orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Obsoletos',              orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Resultado de Auditoria', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE PEÇAS CHAPADÃO DO SUL',
    cor: 'fuchsia',
    kpis: [
      { id: 1, indicador: 'Faturamento Peças',      orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças',  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Giro de Estoque',        orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Obsoletos',              orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Resultado de Auditoria', orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

export const MOCK_BLOCO3_SERVICOS = [
  {
    tituloGerente: 'INDIVIDUAL',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)', orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Eficácia da Oficina',           orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Produtividade da Oficina',      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

// ── ORÇAMENTO & BACKLOG ──────────────────────────────────────────────────────
export const MOCK_ORCAMENTO_BACKLOG = []
