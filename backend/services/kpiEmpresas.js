// Mapeamento tituloGerente → nome da empresa nos arquivos SharePoint.
// Compartilhado entre routes/kpi.js (montagem dos quadros) e kpiSyncService.js
// (sincronização agendada), para não divergir em duas cópias.
export const CASA_EMPRESA_MAP = {
  'GERENTE CASA CAMPO GRANDE':    'CAIOBA TRUCKS - CAMPO GRANDE',
  'GERENTE CASA DOURADOS':        'CAIOBA TRUCKS - DOURADOS',
  'GERENTE CASA TRÊS LAGOAS':     'CAIOBA TRUCKS - TRES LAGOAS',
  'GERENTE CASA CHAPADÃO DO SUL': 'CAIOBA TRUCKS - CHAPADAO',
}

// 'todas' (painel consolidado de Gerente Geral) + as 4 casas
export const EMPRESAS_SYNC = ['todas', ...Object.values(CASA_EMPRESA_MAP)]
