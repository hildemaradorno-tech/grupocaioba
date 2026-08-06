import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import {
  getResultados, getBloco1, getBloco2,
  getBloco3PosVenda, getBloco3Pecas, getBacklog,
  invalidateCache, SHEET_NAMES,
} from '../services/sharepointKpi.js'
import {
  getConsolidatedKpiData,
  listVendasProdutoFiles,
  clearExtractorCache,
  extractServicosOficina,
  listRecepcionistaFiles,
  listROF042Files,
  extractROF042,
  listROF096Files,
  extractROF096,
  extractBalcao,
} from '../services/sharepointExtractor.js'
import { CASA_EMPRESA_MAP, EMPRESAS_SYNC } from '../services/kpiEmpresas.js'
import {
  getCachePlanilha,
  getCacheExtrator,
  getStatusSincronizacao,
  executarSincronizacao,
  sincronizacaoEmAndamento,
} from '../services/kpiSyncService.js'

const router = Router()

// Lê o cache (kpi_cache_extrator); se ainda não sincronizado para essa
// fonte/ano/empresa, cai no caminho ao vivo como rede de segurança.
async function getExtratorComCache(fonte, fn, ano, empresaChave, empresaFiltro) {
  const cache = await getCacheExtrator(fonte, ano, empresaChave)
  if (cache !== null) return cache
  return fn(ano, empresaFiltro)
}

function requireConfig(req, res, next) {
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'sharepoint_not_configured',
      message: 'Credenciais Azure AD não configuradas. O frontend usará dados mock.',
    })
  }
  next()
}

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

const np = { meta: null, realizado: null }

// ── Template Bloco 3 PV — QuadroGerente[] sem valores; preenchido pelo SharePoint ──
const BLOCO3_PV_TEMPLATE = [
  {
    tituloGerente: 'GERENTE GERAL',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Peças + Serviços)', orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta Serviços',                        orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta Peças Oficina',                   orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'O.S. aberta sem veículo',                      orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Absorção de Pós-Venda',                        orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Recusa de Garantia',                           orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 7, indicador: 'Penetração Plano de Manutenção',               orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 8, indicador: 'NPS (Net Promoter Score)',                     orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 9, indicador: 'O.S. abertas >= 30 dias',                      orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA CAMPO GRANDE',
    cor: 'indigo',
    kpis: [
      { id:  1, indicador: 'Faturamento Oficina (Serviços)',       orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  2, indicador: 'Margem Bruta Serviços',                orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  3, indicador: 'Margem Bruta Peças Oficina',           orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  4, indicador: 'Eficácia da Oficina',                  orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  5, indicador: 'Produtividade da Oficina',             orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  6, indicador: 'O.S. aberta sem veículo na oficina',   orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  7, indicador: 'O.S. >= 30 dias (% do Valor)',         orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  8, indicador: 'Absorção de PV',                       orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  9, indicador: 'NPS Fábrica',                          orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA DOURADOS',
    cor: 'violet',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',  orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta Serviços',           orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta Peças Oficina',      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Eficácia da Oficina',             orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Produtividade da Oficina',        orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Faturamento Balcão',              orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  7, indicador: 'Margem Bruta Peças Balcão',             orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  8, indicador: 'O.S. aberta sem veículo na oficina',   orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  9, indicador: 'O.S. >= 30 dias (% do Valor)',         orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 10, indicador: 'Absorção de PV',                       orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 11, indicador: 'NPS Fábrica',                          orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 12, indicador: 'Auditoria Padrão',                     orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA TRÊS LAGOAS',
    cor: 'purple',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',  orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta Serviços',           orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta Peças Oficina',      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Eficácia da Oficina',             orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Produtividade da Oficina',        orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Faturamento Balcão',              orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  7, indicador: 'Margem Bruta Peças Balcão',             orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  8, indicador: 'O.S. aberta sem veículo na oficina',   orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  9, indicador: 'O.S. >= 30 dias (% do Valor)',         orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 10, indicador: 'Absorção de PV',                       orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 11, indicador: 'NPS Fábrica',                          orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 12, indicador: 'Auditoria Padrão',                     orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE CASA CHAPADÃO DO SUL',
    cor: 'fuchsia',
    kpis: [
      { id: 1, indicador: 'Faturamento Oficina (Serviços)',  orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta Serviços',           orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta Peças Oficina',      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Eficácia da Oficina',             orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Produtividade da Oficina',        orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Faturamento Balcão',              orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  7, indicador: 'Margem Bruta Peças Balcão',             orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  8, indicador: 'O.S. aberta sem veículo na oficina',   orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  9, indicador: 'O.S. >= 30 dias (% do Valor)',         orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 10, indicador: 'Absorção de PV',                       orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 11, indicador: 'NPS Fábrica',                          orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 12, indicador: 'Auditoria Padrão',                     orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE QUALIDADE',
    cor: 'teal',
    kpis: [
      { id: 1, indicador: 'O.S. Garantia em Aberto',    orientacao: '<', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Total de Agendamentos',      orientacao: '>', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: '% Agendamentos Convertidos', orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Auditorias por Casa',        orientacao: '>', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'NPS (Net Promoter Score)',   orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

// ── Template Bloco 3 Peças — QuadroGerente[] sem valores; preenchido pelo SharePoint ─
const BLOCO3_PECAS_TEMPLATE = [
  {
    tituloGerente: 'GERENTE',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total',                       orientacao: '>', metrica: 'R$',     metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças',                   orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Faturamento TRP',                         orientacao: '>', metrica: 'R$',     metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Gestão de Clientes (Evolução Carteira)',  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Giro de Estoque',                         orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Resultado de Auditoria',                  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 7, indicador: 'Obsoletos',                               orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'COORDENADOR',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total',                       orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças',                   orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Faturamento TRP',                         orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Ativação Clientes (Carteira Coordenador)', orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Gestão de Clientes (Evolução Carteira)',  orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'VENDEDOR',
    cor: 'indigo',
    kpis: [
      { id: 1, indicador: 'Faturamento Individual',                  orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta',                            orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Ticket Médio da Carteira',                orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Positivação de Clientes (Inativos e Leads)', orientacao: '>', metrica: '%', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Índice de Devoluções (Vendedor)',         orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'CRM — Contatos de Relacionamento',        orientacao: '>', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'COMPRADOR',
    cor: 'violet',
    kpis: [
      { id: 1, indicador: 'Giro de Estoque',                         orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Gestão de Obsoletos',                     orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'MDI — Nível de Atendimento',              orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Fluxo de Caixa (Compra vs. Venda)',       orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Bônus Compra',                            orientacao: '>', metrica: 'R$',     metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'ENCARREGADO ESTOQUE',
    cor: 'purple',
    kpis: [
      { id: 1, indicador: 'Acuracidade do Estoque (Auditoria)',      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Auditoria Ferramentas Especiais',         orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Controle dos Canhotos',                   orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Controle de Cascos',                      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'ESTOQUISTA',
    cor: 'teal',
    kpis: [
      { id: 1, indicador: 'Divergência de Inventário (Faltas)',      orientacao: '<', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Divergência de Inventário (Sobras)',      orientacao: '<', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Cumprimento de Inventário Cíclico',       orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Controle dos Canhotos',                   orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Controle de Cascos',                      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

/**
 * Injeta realizados do extractor nos quadros QuadroGerente[] do Bloco 3 PV.
 */
const ALL_MONTHS = ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12']
const ALL_WEEKS  = Array.from({length: 70}, (_, i) => `s${String(i + 1).padStart(2, '0')}`)

// Soma dois objetos de períodos campo a campo — inclui semanas s01..s52.
function sumPeriods(a, b) {
  if (!a && !b) return null
  const keys = ['q1','q2','q3','q4','fy',...ALL_MONTHS,...ALL_WEEKS]
  const result = {}
  for (const k of keys) {
    const va = a?.[k] ?? null
    const vb = b?.[k] ?? null
    result[k] = (va === null && vb === null) ? null : (va ?? 0) + (vb ?? 0)
  }
  return result
}

function injectPeriods(kpi, src, fn) {
  const base = {
    q1: { ...kpi.q1, realizado: fn(src.q1) },
    q2: { ...kpi.q2, realizado: fn(src.q2) },
    q3: { ...kpi.q3, realizado: fn(src.q3) },
    q4: { ...kpi.q4, realizado: fn(src.q4) },
    fy: { ...kpi.fy, realizado: fn(src.fy) },
  }
  for (const m of ALL_MONTHS) {
    base[m] = { meta: kpi[m]?.meta ?? null, realizado: fn(src[m]) }
  }
  for (const s of ALL_WEEKS) {
    base[s] = { meta: null, realizado: fn(src?.[s]) }
  }
  return { ...kpi, ...base }
}

function mergeBloco3PV(quadros, pv, horas = null) {
  if (!pv && !horas) return quadros
  const r = (v) => (v != null ? Math.round(v) : null)
  const p = (v) => (v != null ? v : null)

  return quadros.map(quadro => {
    const kpis = quadro.kpis.map(kpi => {
      if (quadro.tituloGerente === 'GERENTE GERAL') {
        switch (kpi.id) {
          case 1: return injectPeriods(kpi, sumPeriods(pv?.faturamentoOficina, pv?.faturamentoBrutoServicos), r)
          case 2: return injectPeriods(kpi, pv?.margemBrutaServicosRecep, p)
          case 3: return injectPeriods(kpi, pv?.margemBrutaPecasOficina, p)
        }
      }
      if (CASA_EMPRESA_MAP[quadro.tituloGerente]) {
        if (kpi.indicador === 'Faturamento Oficina (Serviços)') return injectPeriods(kpi, pv?.faturamentoBrutoServicos ?? {}, r)
        if (kpi.indicador === 'Faturamento Balcão')             return injectPeriods(kpi, pv?.faturamentoBalcao        ?? {}, r)
        if (kpi.indicador === 'Margem Bruta Peças Balcão')    return injectPeriods(kpi, pv?.margemBrutaPecasBalcao   ?? {}, p)
        if (kpi.indicador === 'Margem Bruta Serviços')          return injectPeriods(kpi, pv?.margemBrutaServicosRecep ?? {}, p)
        if (kpi.indicador === 'Margem Bruta Peças Oficina')     return injectPeriods(kpi, pv?.margemBrutaPecasOficina  ?? {}, p)
        if (kpi.indicador === 'Eficácia da Oficina')            return horas ? injectPeriods(kpi, horas.eficacia,      p) : kpi
        if (kpi.indicador === 'Produtividade da Oficina')       return horas ? injectPeriods(kpi, horas.produtividade, p) : kpi
      }
      return kpi
    })
    return { ...quadro, kpis }
  })
}

function computeHoras(rof042, rof096) {
  const hrVend  = rof042?.hrVend  ?? {}
  const hrAplic = rof042?.hrAplic ?? {}
  const disp    = rof096?.disponiveis ?? {}
  const keys    = [...new Set([...Object.keys(hrVend), ...Object.keys(hrAplic), ...Object.keys(disp)])]
  const eficacia = {}, produtividade = {}
  for (const k of keys) {
    const v = hrVend[k] ?? null, a = hrAplic[k] ?? null, d = disp[k] ?? null
    eficacia[k]     = (d != null && d > 0) ? (v ?? 0) / d * 100 : null
    produtividade[k] = (d != null && d > 0) ? (a ?? 0) / d * 100 : null
  }
  return { eficacia, produtividade }
}

/**
 * Injeta realizados do extractor nos quadros QuadroGerente[] do Bloco 3 Peças.
 */
function mergeBloco3Pecas(quadros, pecas) {
  if (!pecas) return quadros
  const r = (v) => (v != null ? Math.round(v) : null)
  const p = (v) => (v != null ? v : null)

  return quadros.map(quadro => {
    const kpis = quadro.kpis.map(kpi => {
      if (quadro.tituloGerente === 'GERENTE' || quadro.tituloGerente === 'COORDENADOR') {
        switch (kpi.id) {
          case 1: return injectPeriods(kpi, pecas.faturamentoTotal, r)
          case 2: return injectPeriods(kpi, pecas.margemBrutaPecas, p)
          case 3: return injectPeriods(kpi, pecas.faturamentoTrp,   r)
        }
      }
      return kpi
    })
    return { ...quadro, kpis }
  })
}

router.get('/status', (req, res) => {
  res.json({ configured: isConfigured(), sheets: SHEET_NAMES, cacheTtlMin: parseInt(process.env.KPI_CACHE_TTL_MIN || '10') })
})

router.get('/bloco3-pos-venda', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()

  // Carrega dados consolidados + ROF042 + ROF096 para cada empresa em paralelo
  // (lê primeiro do cache sincronizado; só cai no SharePoint ao vivo se a
  // combinação fonte/ano/empresa ainda não tiver sido sincronizada)
  const empresas = EMPRESAS_SYNC
  const results  = await Promise.allSettled(
    empresas.map(emp => {
      const filtro = emp === 'todas' ? null : emp
      return Promise.allSettled([
        getExtratorComCache('CONSOLIDADO', getConsolidatedKpiData, year, emp, filtro),
        getExtratorComCache('SERVICOS_OFICINA', extractServicosOficina, year, emp, filtro),
        getExtratorComCache('ROF042', extractROF042, year, emp, filtro),
        getExtratorComCache('ROF096', extractROF096, year, emp, filtro),
        getExtratorComCache('BALCAO', extractBalcao, year, emp, filtro),
      ]).then(rs => rs.map(r => r.status === 'fulfilled' ? r.value : null))
    })
  )

  const pvByEmpresa = {}
  const horasByEmpresa = {}
  empresas.forEach((emp, i) => {
    const [extData, servData, rof042Data, rof096Data, blcData] = results[i].status === 'fulfilled' ? results[i].value : [null, null, null, null, null]
    pvByEmpresa[emp] = {
      ...(extData?.bloco3PvRealizado ?? {}),
      faturamentoBrutoServicos: servData?.faturamentoBruto      ?? null,
      margemBrutaServicosRecep: servData?.margemBruta           ?? null,
      margemBrutaPecasOficina:  extData?.auditoria?.ind3_margem ?? null,
      faturamentoBalcao:        blcData?.liquido                ?? null,
      margemBrutaPecasBalcao:   blcData?.margemPct             ?? null,
    }
    horasByEmpresa[emp] = computeHoras(rof042Data, rof096Data)
  })

  // Injeta dados por quadro: GERENTE GERAL usa 'todas', casas usam a empresa mapeada
  const quadros = BLOCO3_PV_TEMPLATE.map(quadro => {
    const empresa = CASA_EMPRESA_MAP[quadro.tituloGerente] || 'todas'
    const pv    = pvByEmpresa[empresa] ?? pvByEmpresa['todas']
    const horas = horasByEmpresa[empresa] ?? null
    return mergeBloco3PV([quadro], pv, horas)[0]
  })

  res.json(quadros)
}))

router.get('/bloco3-pecas', requireConfig, wrap(async (req, res) => {
  const year    = parseInt(req.query.year) || new Date().getFullYear()
  const empresa = req.query.empresa || null
  const empresaChave = empresa || 'todas'

  let extractorData = null
  try { extractorData = await getExtratorComCache('CONSOLIDADO', getConsolidatedKpiData, year, empresaChave, empresa) } catch (_) { /* sem dados */ }

  res.json(mergeBloco3Pecas(BLOCO3_PECAS_TEMPLATE, extractorData?.bloco3PecasRealizado))
}))

router.get('/bloco2', requireConfig, wrap(async (req, res) => {
  const cache = await getCachePlanilha('bloco2')
  res.json(cache ?? await getBloco2())
}))

router.get('/bloco1', requireConfig, wrap(async (_, res) => {
  const cache = await getCachePlanilha('bloco1')
  res.json(cache ?? await getBloco1())
}))
router.get('/resultados', requireConfig, wrap(async (_, res) => {
  const cache = await getCachePlanilha('resultados')
  res.json(cache ?? await getResultados())
}))

router.get('/backlog', requireConfig, wrap(async (_, res) => {
  const cache = await getCachePlanilha('backlog')
  res.json(cache ?? await getBacklog())
}))

// ── Sincronização agendada ────────────────────────────────────────────────────

// GET /api/kpi/sync/status — config atual + última execução (agendada ou manual)
router.get('/sync/status', wrap(async (_, res) => {
  const status = await getStatusSincronizacao()
  res.json({ ...status, executandoAgora: sincronizacaoEmAndamento() })
}))

// POST /api/kpi/sync/executar — dispara "Atualizar Agora"; roda em background e
// responde de imediato (o passe completo pode levar minutos) — o frontend faz
// polling de /sync/status até ultimaExecucao.finalizado_em aparecer.
router.post('/sync/executar', requireConfig, (req, res) => {
  if (sincronizacaoEmAndamento()) {
    return res.status(409).json({ error: 'sincronizacao_em_andamento', message: 'Já existe uma sincronização em andamento.' })
  }
  executarSincronizacao('MANUAL', req.body?.usuario_email || null)
    .catch(err => console.error('[KPI Sync] Erro na sincronização manual:', err.message))
  res.status(202).json({ message: 'Sincronização iniciada.' })
})

router.post('/cache/invalidate', requireConfig, (req, res) => {
  invalidateCache()
  clearExtractorCache()
  res.json({ message: 'Cache limpo. Próxima requisição buscará dados frescos do SharePoint.' })
})

// ── Rotas do Extractor (Vendas de Produtos) ──────────────────────────────────

// GET /api/kpi/extractor/files?year=2026  — lista arquivos disponíveis na pasta
router.get('/extractor/files', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const files = await listVendasProdutoFiles(year)
  res.json({ year, count: files.length, files })
}))

// GET /api/kpi/extractor/consolidado?year=2026  — pipeline completo RPR001
router.get('/extractor/consolidado', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const data = await getConsolidatedKpiData(year)
  if (!data) return res.status(404).json({ error: 'Nenhum arquivo encontrado para o ano solicitado.' })
  res.json(data)
}))

// Converte chave do EmpresaSelector → nome usado no arquivo recepcionista
const EMPRESA_KEY_TO_RECEP = {
  'CAMPO GRANDE':     'CAIOBA TRUCKS - CAMPO GRANDE',
  'DOURADOS':         'CAIOBA TRUCKS - DOURADOS',
  'TRÊS LAGOAS':      'CAIOBA TRUCKS - TRES LAGOAS',
  'CHAPADÃO DO SUL':  'CAIOBA TRUCKS - CHAPADAO',
}

// GET /api/kpi/auditoria?year=2026&empresa=CAMPO+GRANDE  — valores brutos por fonte para conferência
router.get('/auditoria', requireConfig, wrap(async (req, res) => {
  const year        = parseInt(req.query.year) || new Date().getFullYear()
  const empresaKey  = req.query.empresa && req.query.empresa !== 'todas' ? req.query.empresa : null
  const empresaRecep = empresaKey ? EMPRESA_KEY_TO_RECEP[empresaKey.toUpperCase()] ?? null : null

  let extractorData = null, servicosData = null, rof042Data = null, rof096Data = null, blcData = null
  try {
    ;[extractorData, servicosData, rof042Data, rof096Data, blcData] = await Promise.allSettled([
      getConsolidatedKpiData(year, empresaKey),
      extractServicosOficina(year, empresaRecep),
      extractROF042(year, empresaKey),
      extractROF096(year, empresaKey),
      extractBalcao(year, empresaKey),
    ]).then(rs => rs.map(r => r.status === 'fulfilled' ? r.value : null))
  } catch (_) {}

  if (!extractorData) return res.status(404).json({ error: 'Sem dados para o ano solicitado.' })

  const { auditoria: a } = extractorData

  res.json({
    year,
    indicadores: [
      // ── Indicador 1 ──────────────────────────────────────────────────────
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte A — RPR001',        metrica: 'NFItem_VlTotal — VEN',         tipo: 'R$', valores: a.ind1_fatVendas },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte A — RPR001',        metrica: 'NFItem_VlTotal — DVE',         tipo: 'R$', valores: a.ind1_fatDevolucoes },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte A — RPR001',        metrica: 'VEN − DVE (líquido)',          tipo: 'R$', valores: a.ind1_fatLiquido },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte B — Recepcionista', metrica: 'tot_serv',                     tipo: 'R$', valores: servicosData?.faturamentoBruto ?? {} },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'RESULTADO',               metrica: 'Fonte A líquido + Fonte B',    tipo: 'R$', valores: (() => {
        const a1 = a.ind1_fatLiquido, b1 = servicosData?.faturamentoBruto ?? {}
        const r = {}; for (const k of Object.keys(a1)) r[k] = (a1[k] ?? 0) + (b1[k] ?? 0); return r
      })() },

      // ── Indicador 2 — Faturamento Total Peças Oficina ───────────────────
      { id: 2, indicador: 'Faturamento Total Peças Oficina', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — VEN',   tipo: 'R$', valores: a.ind1_fatVendas },
      { id: 2, indicador: 'Faturamento Total Peças Oficina', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — DVE',   tipo: 'R$', valores: a.ind1_fatDevolucoes },
      { id: 2, indicador: 'Faturamento Total Peças Oficina', fonte: 'RESULTADO',        metrica: 'Fonte A VEN − Fonte A DVE', tipo: 'R$', valores: a.ind1_fatLiquido },

      // ── Indicador 3 — Faturamento Total Serviços Oficina ───────────────
      { id: 3, indicador: 'Faturamento Total Serviços Oficina', fonte: 'Fonte A — Recepcionista', metrica: 'tot_serv',         tipo: 'R$', valores: servicosData?.faturamentoBruto ?? {} },
      { id: 3, indicador: 'Faturamento Total Serviços Oficina', fonte: 'RESULTADO',               metrica: 'SUM(tot_serv)',    tipo: 'R$', valores: servicosData?.faturamentoBruto ?? {} },

      // ── Indicador 4 — Margem Bruta Serviços ─────────────────────────────
      { id: 4, indicador: 'Margem Bruta Serviços',     fonte: 'Fonte A — Recepcionista', metrica: 'margem_servico',               tipo: 'R$', valores: servicosData?.margemBrutaRs ?? {} },
      { id: 4, indicador: 'Margem Bruta Serviços',     fonte: 'Fonte B — Recepcionista', metrica: 'tot_serv',                     tipo: 'R$', valores: servicosData?.faturamentoBruto ?? {} },
      { id: 4, indicador: 'Margem Bruta Serviços',     fonte: 'RESULTADO',               metrica: 'Fonte A ÷ Fonte B × 100',      tipo: '%',  valores: servicosData?.margemBruta ?? {} },

      // ── Indicador 5 — Margem Bruta Peças Oficina ────────────────────────
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'Fonte A — RPR001',         metrica: 'NFItem_VlMargemCont — VEN',   tipo: 'R$', valores: a.ind3_lucroVendas },
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'Fonte A — RPR001',         metrica: 'NFItem_VlMargemCont — DVE',   tipo: 'R$', valores: a.ind3_lucroDevolucoes },
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'Fonte A — RPR001',         metrica: 'VEN − DVE (líquido)',         tipo: 'R$', valores: a.ind3_lucroLiquido },
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'Fonte B — RPR001',         metrica: 'NFItem_VlTotal — VEN',        tipo: 'R$', valores: a.ind3_fatVendas },
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'Fonte B — RPR001',         metrica: 'NFItem_VlTotal — DVE',        tipo: 'R$', valores: a.ind3_fatDevolucoes },
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'Fonte B — RPR001',         metrica: 'VEN − DVE (líquido)',         tipo: 'R$', valores: a.ind3_fatLiquido },
      { id: 5, indicador: 'Margem Bruta Peças Oficina', fonte: 'RESULTADO',                metrica: 'Fonte A ÷ Fonte B × 100',    tipo: '%',  valores: a.ind3_margem },

      // ── Indicador 8 — Faturamento Total Peças Balcão ────────────────────
      { id: 8, indicador: 'Faturamento Total Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — VEN', tipo: 'R$', valores: blcData?.vendas      ?? {} },
      { id: 8, indicador: 'Faturamento Total Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — DVE', tipo: 'R$', valores: blcData?.devolucoes  ?? {} },
      { id: 8, indicador: 'Faturamento Total Peças Balcão', fonte: 'RESULTADO',        metrica: 'VEN − DVE (líquido)', tipo: 'R$', valores: blcData?.liquido     ?? {} },

      // ── Indicador 9 — Margem Bruta Peças Balcão ──────────────────────────
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlMargemCont — VEN',    tipo: 'R$', valores: blcData?.margemContVendas     ?? {} },
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlMargemCont — DVE',    tipo: 'R$', valores: blcData?.margemContDevolucoes  ?? {} },
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'VEN − DVE (líquido margem)',  tipo: 'R$', valores: blcData?.margemContLiquido     ?? {} },
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte B — RPR001', metrica: 'NFItem_VlTotal — VEN',         tipo: 'R$', valores: blcData?.vendas               ?? {} },
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte B — RPR001', metrica: 'NFItem_VlTotal — DVE',         tipo: 'R$', valores: blcData?.devolucoes            ?? {} },
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte B — RPR001', metrica: 'VEN − DVE (líquido fat.)',     tipo: 'R$', valores: blcData?.liquido               ?? {} },
      { id: 9, indicador: 'Margem Bruta Peças Balcão', fonte: 'RESULTADO',        metrica: 'Fonte A ÷ Fonte B × 100',     tipo: '%',  valores: blcData?.margemPct              ?? {} },

      // ── Indicador 10 — Faturamento TRP ──────────────────────────────────
      { id: 10, indicador: 'Faturamento TRP', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — VEN (ProdTipoCod 2,24,27,28)', tipo: 'R$', valores: a.ind10_trpVendas },
      { id: 10, indicador: 'Faturamento TRP', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — DVE (ProdTipoCod 2,24,27,28)', tipo: 'R$', valores: a.ind10_trpDevolucoes },
      { id: 10, indicador: 'Faturamento TRP', fonte: 'RESULTADO',        metrica: 'VEN − DVE (líquido)',                           tipo: 'R$', valores: a.ind10_trpLiquido },

      // ── Indicador 6 — Eficácia da Oficina ───────────────────────────────
      { id: 6, indicador: 'Eficácia da Oficina', fonte: 'Fonte A — ROF042', metrica: 'Hr. Vend.',      tipo: 'h',  valores: rof042Data?.hrVend      ?? {} },
      { id: 6, indicador: 'Eficácia da Oficina', fonte: 'Fonte B — ROF096', metrica: 'disponíveis',    tipo: 'h',  valores: rof096Data?.disponiveis ?? {} },
      { id: 6, indicador: 'Eficácia da Oficina', fonte: 'RESULTADO',        metrica: 'Hr. Vend. ÷ Disponíveis × 100', tipo: '%', valores: (() => {
        const vend = rof042Data?.hrVend      ?? {}
        const disp = rof096Data?.disponiveis ?? {}
        const keys = [...new Set([...Object.keys(vend), ...Object.keys(disp)])]
        const r = {}
        for (const k of keys) {
          const v = vend[k] ?? null, d = disp[k] ?? null
          r[k] = (d != null && d > 0) ? (v ?? 0) / d * 100 : null
        }
        return r
      })() },

      // ── Indicador 7 — Produtividade da Oficina ──────────────────────────
      { id: 7, indicador: 'Produtividade da Oficina', fonte: 'Fonte A — ROF042', metrica: 'Hr. Total',    tipo: 'h',  valores: rof042Data?.hrAplic     ?? {} },
      { id: 7, indicador: 'Produtividade da Oficina', fonte: 'Fonte B — ROF096', metrica: 'disponíveis',  tipo: 'h',  valores: rof096Data?.disponiveis ?? {} },
      { id: 7, indicador: 'Produtividade da Oficina', fonte: 'RESULTADO',        metrica: 'Hr. Total ÷ Disponíveis × 100', tipo: '%', valores: (() => {
        const aplic = rof042Data?.hrAplic    ?? {}
        const disp  = rof096Data?.disponiveis ?? {}
        const keys  = [...new Set([...Object.keys(aplic), ...Object.keys(disp)])]
        const r = {}
        for (const k of keys) {
          const a = aplic[k] ?? null, d = disp[k] ?? null
          r[k] = (d != null && d > 0) ? (a ?? 0) / d * 100 : null
        }
        return r
      })() },
    ],
    metaData: extractorData.metaData,
  })
}))

// GET /api/kpi/extractor/rof096/files
router.get('/extractor/rof096/files', requireConfig, wrap(async (req, res) => {
  const files = await listROF096Files()
  res.json({ count: files.length, files })
}))

// GET /api/kpi/extractor/rof096/horas?year=2026&empresa=CAMPO+GRANDE
router.get('/extractor/rof096/horas', requireConfig, wrap(async (req, res) => {
  const year    = parseInt(req.query.year) || new Date().getFullYear()
  const empresa = req.query.empresa && req.query.empresa !== 'todas' ? req.query.empresa : null
  const data    = await extractROF096(year, empresa)
  if (!data) return res.status(404).json({ error: 'Nenhum dado ROF096 encontrado.' })
  res.json(data)
}))

// GET /api/kpi/extractor/rof042/files  — lista arquivos ROF042
router.get('/extractor/rof042/files', requireConfig, wrap(async (req, res) => {
  const files = await listROF042Files()
  res.json({ count: files.length, files })
}))

// GET /api/kpi/extractor/rof042/horas?year=2026&empresa=CAMPO+GRANDE
router.get('/extractor/rof042/horas', requireConfig, wrap(async (req, res) => {
  const year    = parseInt(req.query.year) || new Date().getFullYear()
  const empresa = req.query.empresa && req.query.empresa !== 'todas' ? req.query.empresa : null
  const data    = await extractROF042(year, empresa)
  if (!data) return res.status(404).json({ error: 'Nenhum dado ROF042 encontrado.' })
  res.json(data)
}))

// GET /api/kpi/extractor/recepcionista/files  — lista todos os arquivos REL_VENDARECEPCIONISTA_REPORT
router.get('/extractor/recepcionista/files', requireConfig, wrap(async (req, res) => {
  const files = await listRecepcionistaFiles()
  res.json({ count: files.length, files })
}))

// GET /api/kpi/extractor/recepcionista/servicos?year=2026  — faturamento bruto de serviços consolidado
router.get('/extractor/recepcionista/servicos', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const data = await extractServicosOficina(year)
  if (!data) return res.status(404).json({ error: 'Nenhum dado de serviços encontrado para o ano solicitado.' })
  res.json(data)
}))

// Handler de erros das rotas KPI
router.use((err, req, res, _next) => {
  console.error('[KPI]', err.message)
  res.status(500).json({ error: 'sharepoint_error', message: err.message })
})

export default router
