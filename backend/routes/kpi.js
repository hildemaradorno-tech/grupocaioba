import { Router } from 'express'
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'
import { getFiltroBoxOficina } from '../services/boxFuncionarios.js'
import { isConfigured } from '../services/graphClient.js'
import {
  getResultados, getBloco1, getBloco2,
  getBacklog,
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
  listVendedoresBalcao,
  extractPecasOficinaPorConsultor,
  listConsultoresOficina,
  extractServicosPorConsultor,
  listConsultoresServicos,
  extractROF042PorMecanico,
  listMecanicosROF042,
  extractROF096PorMecanico,
  listMecanicosROF096,
} from '../services/sharepointExtractor.js'
import { CASA_EMPRESA_MAP, EMPRESAS_SYNC } from '../services/kpiEmpresas.js'
import {
  getCachePlanilha,
  getCacheExtrator,
  getStatusSincronizacao,
  executarSincronizacao,
  executarSincronizacaoCampanha,
  sincronizacaoEmAndamento,
} from '../services/kpiSyncService.js'
import { getPesos, setPeso, aplicarPesos } from '../services/kpiPesos.js'
import { getMetasManuais, setMetaManual, aplicarMetasManuais } from '../services/kpiMetasManuais.js'
import { getMetaPecasPeriodos, getMetaOficinaPeriodos, getMetaMecanicoPeriodos, getMetaMargemOficinaPeriodos, getMetaPecasBalcaoPeriodos, getMetaMargemBalcaoPeriodos, getMetaTrpPeriodos, getMetaTicketMedioPeriodos } from '../services/kpiMetas.js'

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
    tituloGerente: 'GERENTE GERAL PÓS-VENDAS',
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
    tituloGerente: 'GERENTE DE SERVIÇO - CAMPO GRANDE',
    cor: 'indigo',
    kpis: [
      { id:  1, indicador: 'Faturamento Total Oficina (Peças + Serviços)', orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
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
    tituloGerente: 'GERENTE FILIAL - DOURADOS',
    cor: 'violet',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Peças + Serviços)',  orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
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
    tituloGerente: 'GERENTE FILIAL - TRÊS LAGOAS',
    cor: 'purple',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Peças + Serviços)', orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
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
    tituloGerente: 'GERENTE FILIAL - CHAPADÃO DO SUL',
    cor: 'fuchsia',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Peças + Serviços)', orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
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
    tituloGerente: 'GERENTE DE QUALIDADE',
    cor: 'teal',
    kpis: [
      { id:  1, indicador: 'O.S. de Garantia em Aberto',           orientacao: '<', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  2, indicador: 'Agendamentos Ativos',                  orientacao: '>', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  3, indicador: 'Total Agendamento',                    orientacao: '>', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  4, indicador: 'Penetração Plano de Manutenção',       orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  5, indicador: 'Recusa de Garantia',                   orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  6, indicador: 'Auditoria Padrão DOURADOS',            orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  7, indicador: 'Auditoria Padrão TRÊS LAGOAS',         orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  8, indicador: 'Auditoria Padrão CAMPO GRANDE',        orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id:  9, indicador: 'Auditoria Padrão CHAPADÃO',            orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 10, indicador: 'NPS Fábrica',                          orientacao: '>', metrica: 'pts', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

// ── Template Bloco 3 Peças — QuadroGerente[] sem valores; preenchido pelo SharePoint ─
const BLOCO3_PECAS_TEMPLATE = [
  {
    tituloGerente: 'GERENTE ATACADO PEÇAS',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Peças Balcão',           orientacao: '>', metrica: 'R$',     metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças Balcão',            orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Faturamento TRP',                         orientacao: '>', metrica: 'R$',     metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Gestão de Clientes (Evolução Carteira)',  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Giro de Estoque',                         orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'Resultado de Auditoria',                  orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 7, indicador: 'Obsoletos',                               orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'COORDENADOR ATACADO PEÇAS',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Peças Balcão',           orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças Balcão',            orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Faturamento TRP',                         orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Ativação Clientes (Carteira Coordenador)', orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Gestão de Clientes (Evolução Carteira)',  orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'VENDEDOR DE PEÇAS',
    cor: 'indigo',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Peças Balcão',            orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta de Peças Balcão',              orientacao: '>', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Ticket Médio da Carteira',                  orientacao: '>', metrica: 'R$',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Positivação de Clientes (Inativos e Leads)', orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Índice de Devoluções (Vendedor)',           orientacao: '<', metrica: '%',   metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'CRM — Contatos de Relacionamento',          orientacao: '=', metrica: 'qtd', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'GERENTE DE COMPRAS',
    cor: 'violet',
    kpis: [
      { id: 1, indicador: 'Giro de Estoque',                         orientacao: '>', metrica: 'índice', metaAnual: null, pesoObj: 0.50, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Gestão de Obsoletos',                     orientacao: '<', metrica: '%',      metaAnual: null, pesoObj: 0.15, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'MDI — Nível de Atendimento',              orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: 0.10, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Fluxo de Caixa (Compra vs. Venda)',       orientacao: '>', metrica: '%',      metaAnual: null, pesoObj: 0.20, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Bônus Compra',                            orientacao: '>', metrica: 'R$',     metaAnual: null, pesoObj: 0.05, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'SUPERVISÃO DE PEÇAS/ENCARREGADO ESTOQUE',
    cor: 'purple',
    kpis: [
      { id: 1, indicador: 'Acuracidade do Estoque (Auditoria)',      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.40, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Auditoria Ferramentas Especiais',         orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.20, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Controle dos Canhotos',                   orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.20, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Controle de Cascos',                      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.20, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'ESTOQUISTA/AUXILIAR PEÇAS',
    cor: 'teal',
    kpis: [
      { id: 1, indicador: 'Divergência de Inventário (Faltas)',      orientacao: '<', metrica: '%',  metaAnual: null, pesoObj: 0.15, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Divergência de Inventário (Sobras)',      orientacao: '<', metrica: '%',  metaAnual: null, pesoObj: 0.15, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Cumprimento de Inventário Cíclico',       orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.30, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Controle dos Canhotos',                   orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.20, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'Controle de Cascos',                      orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: 0.20, q1: np, q2: np, q3: np, q4: np, fy: np },
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

// Injeta as metas aprovadas (kpiMetas.js) na coluna "Meta" de cada período,
// preservando o realizado já injetado. metas = null deixa tudo como está.
function injectMeta(kpi, metas) {
  if (!metas) return kpi
  const out = { ...kpi, metaAnual: metas.fy ?? kpi.metaAnual }
  for (const k of ['q1', 'q2', 'q3', 'q4', 'fy', ...ALL_MONTHS, ...ALL_WEEKS]) {
    out[k] = { ...(kpi[k] ?? { meta: null, realizado: null }), meta: metas[k] ?? null }
  }
  return out
}

function injectPeriods(kpi, src, fn) {
  src = src ?? {}
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

function mergeBloco3PV(quadros, pv, horas = null, meta = null, margem = null, metaBalcao = null, margemBalcao = null) {
  if (!pv && !horas) return quadros
  const r = (v) => (v != null ? Math.round(v) : null)
  const p = (v) => (v != null ? v : null)

  return quadros.map(quadro => {
    const kpis = quadro.kpis.map(kpi => {
      if (quadro.tituloGerente === 'GERENTE GERAL PÓS-VENDAS') {
        switch (kpi.id) {
          case 1: return injectMeta(injectPeriods(kpi, sumPeriods(pv?.faturamentoOficina, pv?.faturamentoBrutoServicos), r), meta)
          case 2: return injectMeta(injectPeriods(kpi, pv?.margemBrutaServicosRecep, p), margem?.servicos)
          case 3: return injectMeta(injectPeriods(kpi, pv?.margemBrutaPecasOficina, p), margem?.pecas)
        }
      }
      if (CASA_EMPRESA_MAP[quadro.tituloGerente]) {
        if (kpi.indicador === 'Faturamento Oficina (Serviços)') return injectPeriods(kpi, pv?.faturamentoBrutoServicos ?? {}, r)
        if (kpi.indicador === 'Faturamento Total Oficina (Peças + Serviços)') return injectMeta(injectPeriods(kpi, sumPeriods(pv?.faturamentoOficina, pv?.faturamentoBrutoServicos), r), meta)
        if (kpi.indicador === 'Faturamento Balcão')             return injectMeta(injectPeriods(kpi, pv?.faturamentoBalcao        ?? {}, r), metaBalcao)
        if (kpi.indicador === 'Margem Bruta Peças Balcão')    return injectMeta(injectPeriods(kpi, pv?.margemBrutaPecasBalcao   ?? {}, p), margemBalcao)
        if (kpi.indicador === 'Margem Bruta Serviços')          return injectMeta(injectPeriods(kpi, pv?.margemBrutaServicosRecep ?? {}, p), margem?.servicos)
        if (kpi.indicador === 'Margem Bruta Peças Oficina')     return injectMeta(injectPeriods(kpi, pv?.margemBrutaPecasOficina  ?? {}, p), margem?.pecas)
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
 * balcaoTodas    = Balcão agregado de TODAS as lojas (mesma fonte dos Indicadores
 *                  8 e 9 da Auditoria — extractBalcao sem filtro de empresa), usado
 *                  no Faturamento Total Peças Balcão e Margem Bruta de Peças Balcão
 *                  do GERENTE e COORDENADOR ATACADO PEÇAS.
 * balcaoVendedor = mesma fonte, mas filtrada pelo vendedor selecionado na tela (ou
 *                  igual a balcaoTodas quando nenhum vendedor está selecionado) —
 *                  usado só no quadro VENDEDOR DE PEÇAS.
 * metaTodos / metaVendedor = metas aprovadas de Peças (Total Grupo → Gestão de
 *                  Aprovação) no mesmo recorte: soma de todos os vendedores ou só o
 *                  vendedor selecionado. Alimentam a coluna Meta do Faturamento Total
 *                  Peças Balcão.
 */
function mergeBloco3Pecas(quadros, pecas, balcaoTodas, balcaoVendedor, metaTodos, metaVendedor, margemTodos = null, margemVendedor = null, trpTodos = null) {
  if (!pecas && !balcaoTodas) return quadros
  const r = (v) => (v != null ? Math.round(v) : null)
  const p = (v) => (v != null ? v : null)
  const isAtacado = (t) => t === 'GERENTE ATACADO PEÇAS' || t === 'COORDENADOR ATACADO PEÇAS'

  return quadros.map(quadro => {
    const ehVendedor = quadro.tituloGerente === 'VENDEDOR DE PEÇAS'
    const balcaoFonte = ehVendedor ? balcaoVendedor : balcaoTodas
    const metaFonte   = ehVendedor ? metaVendedor   : metaTodos
    const margemFonte = ehVendedor ? margemVendedor : margemTodos
    const kpis = quadro.kpis.map(kpi => {
      if ((isAtacado(quadro.tituloGerente) || ehVendedor) && kpi.id === 1) {
        return injectMeta(injectPeriods(kpi, balcaoFonte?.liquido, r), metaFonte)
      }
      if ((isAtacado(quadro.tituloGerente) || ehVendedor) && kpi.id === 2) {
        return injectMeta(injectPeriods(kpi, balcaoFonte?.margemPct, p), margemFonte)
      }
      if (pecas && isAtacado(quadro.tituloGerente)) {
        switch (kpi.id) {
          case 3: return injectMeta(injectPeriods(kpi, pecas.faturamentoTrp, r), trpTodos)
        }
      }
      return kpi
    })
    return { ...quadro, kpis }
  })
}

// ── Template Bloco 3 Serviços — CONSULTOR DE SERVIÇOS + MECÂNICO ────────────
const BLOCO_SERVICOS_TEMPLATE = [
  {
    tituloGerente: 'CONSULTOR DE SERVIÇOS',
    cor: 'blue',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Peças + Serviços)', orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Margem Bruta Serviços',                        orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Margem Bruta Peças Oficina',                   orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 4, indicador: 'Produtividade da Oficina',                     orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 5, indicador: 'O.S. aberta sem veículo na oficina',           orientacao: '<', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 6, indicador: 'O.S. >= 30 dias (% do Valor)',                 orientacao: '<', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 7, indicador: 'Ticket Médio da Oficina',                      orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
  {
    tituloGerente: 'MECÂNICO',
    cor: 'indigo',
    kpis: [
      { id: 1, indicador: 'Faturamento Total Oficina (Serviços)', orientacao: '>', metrica: 'R$', metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 2, indicador: 'Eficácia da Oficina',                  orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
      { id: 3, indicador: 'Produtividade da Oficina',             orientacao: '>', metrica: '%',  metaAnual: null, pesoObj: null, q1: np, q2: np, q3: np, q4: np, fy: np },
    ],
  },
]

/**
 * Injeta realizados nos quadros do Bloco 3 Serviços.
 * consultorData = { pecasOficina, servicos } já filtrados pelo Consultor selecionado
 *                 (ou agregado de todos, sem seleção) — RPR001 linhas de Oficina +
 *                 Recepcionista, mesma dupla fonte do Faturamento Total Oficina do
 *                 Gerente Geral Pós-Venda.
 * mecanicoData  = { vlLiquido, eficacia, produtividade } já filtrados pelo Mecânico
 *                 selecionado (ROF042 "Produtivo" + ROF096 "Usuario_Nome").
 * metaConsultor = meta de Faturamento Total Oficina (fato_metas_publicadas, tipo
 *                 'consultor' sem seleção = todos os tipos mecanico+funilaria+
 *                 terceiros; com consultor selecionado = só a meta dele).
 */
// Ticket médio do consultor = faturamento da oficina (peças líquidas + serviços) ÷ OS únicas (passagens).
function ticketMedioConsultor(consultorData) {
  const fat = sumPeriods(consultorData?.pecasOficina?.liquido, consultorData?.servicos?.faturamentoBruto) ?? {}
  const pas = consultorData?.pecasOficina?.passagens ?? {}
  const out = {}
  for (const k of new Set([...Object.keys(fat), ...Object.keys(pas)])) {
    out[k] = (pas[k] > 0 && fat[k] != null) ? fat[k] / pas[k] : null
  }
  return out
}

function mergeBlocoServicos(quadros, consultorData, mecanicoData, metaConsultor, metaMecanico, margemConsultor = null, metaTicket = null) {
  const r = (v) => (v != null ? Math.round(v) : null)
  const p = (v) => (v != null ? v : null)

  return quadros.map(quadro => {
    if (quadro.tituloGerente === 'CONSULTOR DE SERVIÇOS') {
      const kpis = quadro.kpis.map(kpi => {
        switch (kpi.id) {
          case 1: return injectMeta(injectPeriods(kpi, sumPeriods(consultorData?.pecasOficina?.liquido, consultorData?.servicos?.faturamentoBruto), r), metaConsultor)
          case 2: return injectMeta(injectPeriods(kpi, consultorData?.servicos?.margemBruta ?? {}, p), margemConsultor?.servicos)
          case 3: return injectMeta(injectPeriods(kpi, consultorData?.pecasOficina?.margemPct ?? {}, p), margemConsultor?.pecas)
          case 7: return injectMeta(injectPeriods(kpi, ticketMedioConsultor(consultorData), r), metaTicket)
        }
        return kpi
      })
      return { ...quadro, kpis }
    }
    if (quadro.tituloGerente === 'MECÂNICO') {
      const kpis = quadro.kpis.map(kpi => {
        switch (kpi.id) {
          case 1: return injectMeta(injectPeriods(kpi, mecanicoData?.vlLiquido ?? {}, r), metaMecanico)
          case 2: return injectPeriods(kpi, mecanicoData?.eficacia ?? {}, p)
          case 3: return injectPeriods(kpi, mecanicoData?.produtividade ?? {}, p)
        }
        return kpi
      })
      return { ...quadro, kpis }
    }
    return quadro
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

  // Meta de Faturamento Total Oficina: geral (todas as empresas) pro Gerente
  // Geral, e uma por casa (empresa_nome em fato_metas_publicadas) pros
  // quadros das casas.
  const casasNomes = [...new Set(Object.values(CASA_EMPRESA_MAP))]
  const [metaGeral, ...metasCasas] = await Promise.all([
    getMetaOficinaPeriodos(year).catch(() => null),
    ...casasNomes.map(nome => getMetaOficinaPeriodos(year, { empresaNome: nome }).catch(() => null)),
  ])
  const metaByEmpresa = Object.fromEntries(casasNomes.map((nome, i) => [nome, metasCasas[i]]))
  const [margemGeral, ...margensCasas] = await Promise.all([
    getMetaMargemOficinaPeriodos(year).catch(() => null),
    ...casasNomes.map(nome => getMetaMargemOficinaPeriodos(year, { empresaNome: nome }).catch(() => null)),
  ])
  const margemByEmpresa = Object.fromEntries(casasNomes.map((nome, i) => [nome, margensCasas[i]]))
  const metasBalcao = await Promise.all(casasNomes.map(nome => getMetaPecasBalcaoPeriodos(year, { empresaNome: nome }).catch(() => null)))
  const balcaoByEmpresa = Object.fromEntries(casasNomes.map((nome, i) => [nome, metasBalcao[i]]))
  const margensBalcao = await Promise.all(casasNomes.map(nome => getMetaMargemBalcaoPeriodos(year, { empresaNome: nome }).catch(() => null)))
  const margemBalcaoByEmpresa = Object.fromEntries(casasNomes.map((nome, i) => [nome, margensBalcao[i]]))

  // Injeta dados por quadro: GERENTE GERAL PÓS-VENDAS usa 'todas', casas usam a empresa mapeada
  let quadros = BLOCO3_PV_TEMPLATE.map(quadro => {
    const empresa = CASA_EMPRESA_MAP[quadro.tituloGerente] || 'todas'
    const pv    = pvByEmpresa[empresa] ?? pvByEmpresa['todas']
    const horas = horasByEmpresa[empresa] ?? null
    const meta  = CASA_EMPRESA_MAP[quadro.tituloGerente] ? metaByEmpresa[empresa] : metaGeral
    const margem = CASA_EMPRESA_MAP[quadro.tituloGerente] ? margemByEmpresa[empresa] : margemGeral
    const metaBalcao = CASA_EMPRESA_MAP[quadro.tituloGerente] ? balcaoByEmpresa[empresa] : null
    const margemBalcao = CASA_EMPRESA_MAP[quadro.tituloGerente] ? margemBalcaoByEmpresa[empresa] : null
    return mergeBloco3PV([quadro], pv, horas, meta, margem, metaBalcao, margemBalcao)[0]
  })

  const pesos = await getPesos('bloco3-pos-venda')
  quadros = aplicarPesos(quadros, pesos)

  const metasManuais = await getMetasManuais('bloco3-pos-venda', year)
  quadros = aplicarMetasManuais(quadros, metasManuais)

  res.json(quadros)
}))

// GET  /api/kpi/pesos?bloco=bloco3-pos-venda        — { 'tituloGerente|kpiId': peso }
// PUT  /api/kpi/pesos { bloco, tituloGerente, kpiId, peso } — grava/atualiza um peso
router.get('/pesos', wrap(async (req, res) => {
  if (!req.query.bloco) return res.status(400).json({ error: 'parametro_obrigatorio', message: 'bloco é obrigatório.' })
  res.json(await getPesos(req.query.bloco))
}))

router.put('/pesos', wrap(async (req, res) => {
  const { bloco, tituloGerente, kpiId, peso } = req.body || {}
  if (!bloco || !tituloGerente || kpiId == null || peso == null) {
    return res.status(400).json({ error: 'parametros_invalidos', message: 'bloco, tituloGerente, kpiId e peso são obrigatórios.' })
  }
  await setPeso(bloco, tituloGerente, kpiId, peso)
  res.json({ ok: true })
}))

// GET  /api/kpi/metas-manuais?bloco=bloco3-pos-venda&ano=2026 — { 'tituloGerente|kpiId': { m01: valor, ... } }
// PUT  /api/kpi/metas-manuais { bloco, tituloGerente, kpiId, ano, mes, valor } — grava/atualiza uma meta digitada
router.get('/metas-manuais', wrap(async (req, res) => {
  if (!req.query.bloco) return res.status(400).json({ error: 'parametro_obrigatorio', message: 'bloco é obrigatório.' })
  const ano = parseInt(req.query.ano) || new Date().getFullYear()
  res.json(await getMetasManuais(req.query.bloco, ano))
}))

router.put('/metas-manuais', wrap(async (req, res) => {
  const { bloco, tituloGerente, kpiId, ano, mes, valor } = req.body || {}
  if (!bloco || !tituloGerente || kpiId == null || !ano || !mes || valor == null) {
    return res.status(400).json({ error: 'parametros_invalidos', message: 'bloco, tituloGerente, kpiId, ano, mes e valor são obrigatórios.' })
  }
  await setMetaManual(bloco, tituloGerente, kpiId, ano, mes, valor)
  res.json({ ok: true })
}))

router.get('/bloco3-pecas', requireConfig, wrap(async (req, res) => {
  const year    = parseInt(req.query.year) || new Date().getFullYear()
  const empresa = req.query.empresa || null
  const empresaChave = empresa || 'todas'
  const vendedor = req.query.vendedor || null

  let extractorData = null
  try { extractorData = await getExtratorComCache('CONSOLIDADO', getConsolidatedKpiData, year, empresaChave, empresa) } catch (_) { /* sem dados */ }

  // Faturamento Total do GERENTE/COORDENADOR ATACADO PEÇAS vem do Balcão
  // agregando TODAS as lojas (Indicador 9 da Auditoria), independente do
  // filtro de empresa/vendedor da tela.
  let balcaoTodas = null
  try { balcaoTodas = await getExtratorComCache('BALCAO', extractBalcao, year, 'todas', null) } catch (_) { /* sem dados */ }

  // Balcão filtrado pelo vendedor selecionado — só afeta o quadro VENDEDOR DE
  // PEÇAS. Sem vendedor selecionado, cai no mesmo agregado de todas as lojas.
  // Busca ao vivo (não passa pelo cache do sync agendado, que só cobre as
  // combinações fonte/ano/empresa sincronizadas, sem recorte por vendedor).
  let balcaoVendedor = balcaoTodas
  if (vendedor) {
    try { balcaoVendedor = await extractBalcao(year, null, vendedor) } catch (_) { balcaoVendedor = null }
  }

  // Metas aprovadas de Peças (tipo 'pecas' em fato_metas_publicadas): soma de
  // todos os vendedores pros quadros Gerente/Coordenador e, no VENDEDOR DE
  // PEÇAS, só a do vendedor selecionado (ou a soma quando não há seleção).
  let metaTodos = null
  try { metaTodos = await getMetaPecasPeriodos(year) } catch (_) { /* sem meta */ }
  let metaVendedor = metaTodos
  if (vendedor) {
    try { metaVendedor = await getMetaPecasPeriodos(year, vendedor) } catch (_) { metaVendedor = null }
  }

  // Margem de Peças Balcão planejada (departamento Balcão da Total Pós-Vendas): todos os vendedores
  // pros quadros Gerente/Coordenador; no VENDEDOR DE PEÇAS, só o selecionado.
  let margemTodos = null, margemVendedor = null
  try { margemTodos = await getMetaMargemBalcaoPeriodos(year) } catch (_) { /* sem meta */ }
  margemVendedor = margemTodos
  if (vendedor) {
    try { margemVendedor = await getMetaMargemBalcaoPeriodos(year, { vendedorNome: vendedor }) } catch (_) { margemVendedor = null }
  }

  let trpTodos = null
  try { trpTodos = await getMetaTrpPeriodos(year) } catch (_) { /* sem meta */ }

  let quadros = mergeBloco3Pecas(BLOCO3_PECAS_TEMPLATE, extractorData?.bloco3PecasRealizado, balcaoTodas, balcaoVendedor, metaTodos, metaVendedor, margemTodos, margemVendedor, trpTodos)
  const pesos = await getPesos('bloco3-pecas')
  quadros = aplicarPesos(quadros, pesos)

  res.json(quadros)
}))

// Só nomes de funcionários ATIVOS (cadastro dim_funcionarios: sem situação, "1" em
// atividade ou "9" férias, e sem data de demissão) entram nos seletores de pessoa.
const _ativosCache = { ts: 0, porNome: null }
const normPessoa = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')
// setorTrecho (opcional): só quem está agrupado num setor cujo nome contém o trecho (ex.: 'mecanic').
async function filtrarAtivos(nomes, setorTrecho = null) {
  const admin = getSupabaseAdmin()
  if (!admin) return nomes
  if (!_ativosCache.porNome || Date.now() - _ativosCache.ts > 60_000) {
    const { data: setores, error: eS } = await admin.from('dim_setores').select('id, nome_setor')
    if (eS) return nomes
    const nomeSetor = new Map((setores || []).map(x => [String(x.id), normPessoa(x.nome_setor)]))
    const porNome = new Map()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from('dim_funcionarios')
        .select('nome_funcionario, situacao_funcionario, data_demissao, setor_ids').order('id').range(from, from + 999)
      if (error) return nomes
      for (const f of data || []) {
        const sit = f.situacao_funcionario
        if (f.data_demissao || !(!sit || sit === '1' || sit === '9')) continue
        const k = normPessoa(f.nome_funcionario)
        if (!porNome.has(k)) porNome.set(k, new Set())
        for (const id of (f.setor_ids || [])) { const n = nomeSetor.get(String(id)); if (n) porNome.get(k).add(n) }
      }
      if (!data || data.length < 1000) break
    }
    _ativosCache.porNome = porNome
    _ativosCache.ts = Date.now()
  }
  const trecho = setorTrecho ? normPessoa(setorTrecho) : null
  return nomes.filter(n => {
    const setores = _ativosCache.porNome.get(normPessoa(n))
    if (!setores) return false
    return !trecho || [...setores].some(x => x.includes(trecho))
  })
}

// GET /api/kpi/extractor/balcao/vendedores?year=2026 — lista de vendedores do
// Balcão pro seletor da tela de Peças (bloco VENDEDOR DE PEÇAS)
router.get('/extractor/balcao/vendedores', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const vendedores = await filtrarAtivos(await listVendedoresBalcao(year, null))
  res.json({ year, vendedores })
}))

// ── Bloco 3 - Serviços: resposta com cache "devolve na hora, atualiza por trás" ─────────────────
// Montar os quadros lê os arquivos do SharePoint (cache do extrator dura KPI_CACHE_TTL_MIN, 15 min);
// com o cache frio, cada pedido levava ~3 min (Campanha Pós-Venda pede 1 por consultor e ficava em
// "Carregando…"). Agora a base (quadros já com realizado e metas, ANTES de pesos/metas manuais) fica
// em memória e em kpi_cache_planilhas (sobrevive a reinício do backend): o pedido devolve a última
// base na hora e, se ela tiver mais de BLOCO3_SERV_TTL_MS, recalcula em segundo plano. Pesos e metas
// manuais são aplicados a cada pedido, então edições na Matriz aparecem na hora. ?refresh=1 força o
// recálculo e espera.
const BLOCO3_SERV_TTL_MS = parseInt(process.env.KPI_CACHE_TTL_MIN || '15') * 60 * 1000
const _b3ServMem = new Map()      // chave → { ts, base }
const _b3ServCalculando = new Map() // chave → Promise (um recálculo por chave de cada vez)

async function lerBaseBloco3Servicos(chave) {
  const admin = getSupabaseAdmin()
  if (!admin) return null
  try {
    const { data } = await admin.from('kpi_cache_planilhas').select('dados, atualizado_em').eq('chave', chave).maybeSingle()
    return data?.dados ? { ts: new Date(data.atualizado_em).getTime(), base: data.dados } : null
  } catch { return null }
}

async function gravarBaseBloco3Servicos(chave, base) {
  const admin = getSupabaseAdmin()
  if (!admin) return
  try { await admin.from('kpi_cache_planilhas').upsert({ chave, dados: base, atualizado_em: new Date().toISOString() }) } catch { /* só cache */ }
}

function recalcularBaseBloco3Servicos(chave, year, consultor, mecanico) {
  if (!_b3ServCalculando.has(chave)) {
    const p = montarBaseBloco3Servicos(year, consultor, mecanico)
      .then(async (base) => {
        _b3ServMem.set(chave, { ts: Date.now(), base })
        await gravarBaseBloco3Servicos(chave, base)
        return base
      })
      .finally(() => _b3ServCalculando.delete(chave))
    _b3ServCalculando.set(chave, p)
  }
  return _b3ServCalculando.get(chave)
}

router.get('/bloco3-servicos', requireConfig, wrap(async (req, res) => {
  const year      = parseInt(req.query.year) || new Date().getFullYear()
  const consultor = req.query.consultor || null
  const mecanico  = req.query.mecanico || null
  const chave = `bloco3-servicos|${year}|${consultor || ''}|${mecanico || ''}`

  let base
  if (req.query.refresh) {
    base = await recalcularBaseBloco3Servicos(chave, year, consultor, mecanico)
  } else {
    let hit = _b3ServMem.get(chave)
    if (!hit) {
      hit = await lerBaseBloco3Servicos(chave)
      if (hit) _b3ServMem.set(chave, hit)
    }
    if (hit) {
      base = hit.base
      if (Date.now() - hit.ts > BLOCO3_SERV_TTL_MS) {
        recalcularBaseBloco3Servicos(chave, year, consultor, mecanico)
          .catch(err => console.error('[bloco3-servicos] recálculo em segundo plano falhou:', err.message))
      }
    } else {
      base = await recalcularBaseBloco3Servicos(chave, year, consultor, mecanico)
    }
  }

  let quadros = aplicarPesos(base, await getPesos('bloco3-servicos'))
  quadros = aplicarMetasManuais(quadros, await getMetasManuais('bloco3-servicos', year))
  res.json(quadros)
}))

// Quadros do Bloco 3 - Serviços com realizado e metas (sem pesos/metas manuais — aplicados na rota).
async function montarBaseBloco3Servicos(year, consultor, mecanico) {
  // Consultor: Peças de Oficina (RPR001) + Serviços (Recepcionista), mesma
  // dupla fonte do Faturamento Total Oficina do Gerente Geral Pós-Venda —
  // ao vivo, sem filtro de empresa (seletor da tela é só por pessoa).
  let pecasOficina = null, servicos = null
  try { pecasOficina = await extractPecasOficinaPorConsultor(year, null, consultor) } catch (_) { /* sem dados */ }
  try { servicos     = await extractServicosPorConsultor(year, null, consultor) } catch (_) { /* sem dados */ }

  // Mecânico: ROF042 (Vl Líquido + horas) e ROF096 (Horas Disponíveis) do
  // mesmo mecânico selecionado.
  let rof042 = null, rof096 = null
  try { rof042 = await extractROF042PorMecanico(year, null, mecanico) } catch (_) { /* sem dados */ }
  try { rof096 = await extractROF096PorMecanico(year, null, mecanico) } catch (_) { /* sem dados */ }
  const horas = computeHoras(rof042, rof096)

  // Meta de Faturamento Total Oficina: sem consultor selecionado, usa o total
  // (mecanico+funilaria+terceiros); com consultor, a meta já quebrada por ele.
  let metaConsultor = null
  try {
    metaConsultor = consultor
      ? await getMetaOficinaPeriodos(year, { consultorNome: consultor })
      : await getMetaOficinaPeriodos(year)
  } catch (_) { /* sem meta */ }

  let margemConsultor = null
  try { margemConsultor = await getMetaMargemOficinaPeriodos(year, { consultorNome: consultor }) } catch (_) { /* sem meta */ }

  let metaTicket = null
  try { metaTicket = await getMetaTicketMedioPeriodos(year, { consultorNome: consultor }) } catch (_) { /* sem meta */ }

  let metaMecanico = null
  try { metaMecanico = await getMetaMecanicoPeriodos(year, mecanico, await getFiltroBoxOficina()) } catch (_) { /* sem meta */ }

  return mergeBlocoServicos(
    BLOCO_SERVICOS_TEMPLATE,
    { pecasOficina, servicos },
    { vlLiquido: rof042?.vlLiquido ?? null, eficacia: horas.eficacia, produtividade: horas.produtividade },
    metaConsultor,
    metaMecanico,
    margemConsultor,
    metaTicket
  )
}

// GET /api/kpi/extractor/consultores?year=2026 — lista de consultores (RPR001
// Oficina + Recepcionista) pro seletor do bloco CONSULTOR DE SERVIÇOS
router.get('/extractor/consultores', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const [a, b] = await Promise.all([listConsultoresOficina(year, null), listConsultoresServicos(year, null)])
  const consultores = (await filtrarAtivos([...new Set([...a, ...b])])).sort((x, y) => x.localeCompare(y, 'pt-BR'))
  res.json({ year, consultores })
}))

// GET /api/kpi/extractor/mecanicos?year=2026 — lista de mecânicos (ROF042 +
// ROF096) pro seletor do bloco MECÂNICO
router.get('/extractor/mecanicos', requireConfig, wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  const [a, b] = await Promise.all([listMecanicosROF042(year, null), listMecanicosROF096(year, null)])
  const mecanicos = (await filtrarAtivos([...new Set([...a, ...b])], 'mecanic')).sort((x, y) => x.localeCompare(y, 'pt-BR'))
  res.json({ year, mecanicos })
}))

// Metas aprovadas (fato_metas_publicadas) por período pros indicadores da aba Operacional
// que já têm meta na Gestão de Aprovação: hoje só o Faturamento total oficina (Peças + Serviços).
router.get('/bloco2-metas', wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  let oficina = null
  try { oficina = await getMetaOficinaPeriodos(year) } catch (_) { /* sem meta */ }
  res.json({ year, faturamentoTotalOficina: oficina })
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

// ── Sincronização manual da Matriz KPIs ───────────────────────────────────────

// GET /api/kpi/sync/status — última execução manual
router.get('/sync/status', wrap(async (_, res) => {
  const status = await getStatusSincronizacao()
  res.json({ ...status, executandoAgora: sincronizacaoEmAndamento() })
}))

// POST /api/kpi/sync/executar — dispara "Atualizar KPIs"; roda em background e
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

// POST /api/kpi/sync/campanha?year=2026 — só o passo da Campanha Pós-Venda (fato_campanha_diario).
// Espera terminar (normalmente segundos, quando os arquivos já estão no cache do extrator).
router.post('/sync/campanha', requireConfig, wrap(async (req, res) => {
  if (sincronizacaoEmAndamento()) {
    return res.status(409).json({ error: 'sincronizacao_em_andamento', message: 'Já existe uma sincronização em andamento. Tente em alguns minutos.' })
  }
  const ano = parseInt(req.query.year) || new Date().getFullYear()
  const resultado = await executarSincronizacaoCampanha(ano)
  res.json({ ok: true, ano, ...resultado })
}))

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


// Descrição de origem de cada linha da Auditoria de Fontes (botão "i" na tela): arquivo,
// coluna usada e filtros aplicados. Letras/índices seguem o mapa C do sharepointExtractor.
// ── Mesclagem de várias empresas no Auditoria de Fontes ──────────────────────
// Mapas por período (q1..q4, fy, meses, semanas) são somados; percentuais são
// recalculados a partir das somas (lucro ÷ faturamento), nunca somados.
function somarMapas(mapas) {
  const chaves = new Set(mapas.flatMap(m => Object.keys(m || {})))
  const out = {}
  for (const k of chaves) {
    const vals = mapas.map(m => m?.[k]).filter(v => typeof v === 'number')
    out[k] = vals.length ? vals.reduce((s, v) => s + v, 0) : null
  }
  return out
}
function razaoMapas(num, den) {
  const out = {}
  for (const k of new Set([...Object.keys(num || {}), ...Object.keys(den || {})])) {
    const n = num?.[k], d = den?.[k]
    out[k] = (typeof d === 'number' && d > 0 && typeof n === 'number') ? (n / d) * 100 : null
  }
  return out
}
function mesclarFontes(partes) {
  const primeiroMeta = (campo) => partes.map(p => p[campo]?.metaData).find(Boolean) ?? null
  const ext = partes.map(p => p.extractorData).filter(Boolean)
  const srv = partes.map(p => p.servicosData).filter(Boolean)
  const r42 = partes.map(p => p.rof042Data).filter(Boolean)
  const r96 = partes.map(p => p.rof096Data).filter(Boolean)
  const blc = partes.map(p => p.blcData).filter(Boolean)
  const campos = (lista, nomes) => Object.fromEntries(nomes.map(n => [n, somarMapas(lista.map(x => x[n]))]))

  let extractorData = null
  if (ext.length) {
    const auds = ext.map(e => e.auditoria ?? {})
    const chaves = new Set(auds.flatMap(a => Object.keys(a)))
    const aud = {}
    for (const k of chaves) {
      if (/_margem$/.test(k)) continue
      aud[k] = somarMapas(auds.map(a => a[k]))
    }
    aud.ind3_margem = razaoMapas(aud.ind3_lucroLiquido, aud.ind3_fatLiquido)
    extractorData = { auditoria: aud, metaData: ext.find(e => e.metaData)?.metaData ?? null }
  }
  let servicosData = null
  if (srv.length) {
    const c = campos(srv, ['faturamentoBruto', 'margemBrutaRs'])
    servicosData = { ...c, margemBruta: razaoMapas(c.margemBrutaRs, c.faturamentoBruto), metaData: primeiroMeta('servicosData') }
  }
  let rof042Data = null
  if (r42.length) rof042Data = { ...campos(r42, ['hrVend', 'hrAplic', 'vlLiquido']), metaData: primeiroMeta('rof042Data') }
  let rof096Data = null
  if (r96.length) rof096Data = { ...campos(r96, ['disponiveis']), metaData: primeiroMeta('rof096Data') }
  let blcData = null
  if (blc.length) {
    const c = campos(blc, ['vendas', 'devolucoes', 'liquido', 'margemContVendas', 'margemContDevolucoes', 'margemContLiquido'])
    blcData = { ...c, margemPct: razaoMapas(c.margemContLiquido, c.liquido), metaData: primeiroMeta('blcData') }
  }
  return { extractorData, servicosData, rof042Data, rof096Data, blcData }
}

function infoAuditoria(row) {
  if (row.fonte === 'RESULTADO') return null
  const f = row.fonte
  const m = row.metrica || ''
  const boxFiltro = ['Somente produtivos dos boxes Mecânica e Box Express (pelo nome, no Cadastro de Funcionários; quem não está no cadastro ou não tem box fica de fora)']
  if (/RPR001/.test(f)) {
    const balcao = row.id === 9 || row.id === 10
    const coluna = /VlMargemCont/.test(m) ? 'NFItem_VlMargemCont (coluna U)' : /VlTotal/.test(m) ? 'NFItem_VlTotal (coluna AV)' : m
    const filtros = [
      balcao ? 'Somente linhas SEM OS vinculada (NF_OsTipoDes, coluna H, em branco) — Balcão'
             : 'Somente linhas COM OS vinculada (NF_OsTipoDes, coluna H, preenchida) — Oficina',
      'Natureza da operação (coluna E): "VEN" = venda, "DVE"/"DEVOLU" = devolução; outras linhas são ignoradas',
      'Linhas com valor total zerado são ignoradas',
      'Período pela data de movimento (NF_DataMov, coluna AG)',
    ]
    if (row.id === 11) filtros.splice(2, 0, 'Somente tipo de produto (NFItem_ProdTipoCod, coluna AL) 2, 24, 27 ou 28 (TRP)')
    if (/VEN/.test(m) && !/−/.test(m)) filtros.splice(2, 0, 'Considera só as linhas de venda (VEN)')
    if (/DVE/.test(m) && !/−/.test(m)) filtros.splice(2, 0, 'Considera só as linhas de devolução (DVE)')
    return { arquivo: 'RPR001_VENDAPRODUTO AAAA.MM.xlsx (Vendas de Produtos)', coluna, filtros }
  }
  if (/Recepcionista/.test(f)) {
    return {
      arquivo: 'REL_VENDARECEPCIONISTA_REPORT',
      coluna: m === 'margem_servico' ? 'margem_servico' : 'tot_serv',
      filtros: ['Período pela data de emissão (NotaFiscal_DataEmissao)', 'Linhas com valor zerado são ignoradas'],
    }
  }
  if (/ROF042/.test(f)) {
    return {
      arquivo: 'ROF042_FaturamentoServicosProdutivos_Excel',
      coluna: /Hr. Total/.test(m) ? 'Hr. Total (coluna P)' : 'Hr. Vend. (coluna Q)',
      filtros: ['Período pela data NF Data (coluna AB)', 'Linhas cujo Produtivo (coluna B) é "Produtivo Não Associado ..." ficam de fora', 'Linhas sem horas e sem valor líquido são ignoradas', ...boxFiltro],
    }
  }
  if (/ROF096/.test(f)) {
    return {
      arquivo: 'ROF096_FECHAMENTOCARTAOPRODUCAO',
      coluna: 'Horas disponíveis (coluna M)',
      filtros: ['Período pela data (coluna D)', 'Linhas com horas disponíveis zeradas são ignoradas', ...boxFiltro],
    }
  }
  return null
}

// GET /api/kpi/auditoria?year=2026&empresa=CAMPO+GRANDE  — valores brutos por fonte para conferência
router.get('/auditoria', requireConfig, wrap(async (req, res) => {
  const year        = parseInt(req.query.year) || new Date().getFullYear()
  if (req.query.refresh === '1') clearExtractorCache()
  // empresas: uma, várias (separadas por vírgula) ou nenhuma = todas.
  const lista = String(req.query.empresas || req.query.empresa || '')
    .split(',').map(e => e.trim()).filter(e => e && e !== 'todas')
  const indicadorId = parseInt(req.query.indicador) || null
  const precisa = (fontes) => !indicadorId || fontes.includes(indicadorId)
  const USA = { consolidado: [1, 2, 5, 11, 12], servicos: [1, 3, 4, 12], rof042: [6, 7, 8], rof096: [6, 7], balcao: [9, 10] }

  const buscarFontes = async (empresaKey) => {
    const empresaRecep = empresaKey ? EMPRESA_KEY_TO_RECEP[empresaKey.toUpperCase()] ?? null : null
    const pedidos = [
      precisa(USA.consolidado) ? getConsolidatedKpiData(year, empresaKey) : null,
      precisa(USA.servicos)    ? extractServicosOficina(year, empresaRecep) : null,
      precisa(USA.rof042)      ? extractROF042(year, empresaKey) : null,
      precisa(USA.rof096)      ? extractROF096(year, empresaKey) : null,
      precisa(USA.balcao)      ? extractBalcao(year, empresaKey) : null,
    ]
    const [extractorData, servicosData, rof042Data, rof096Data, blcData] = await Promise.allSettled(
      pedidos.map(p => p ?? Promise.resolve(null))
    ).then(rs => rs.map(r => r.status === 'fulfilled' ? r.value : null))
    return { extractorData, servicosData, rof042Data, rof096Data, blcData }
  }

  let fontes
  if (lista.length <= 1) {
    fontes = await buscarFontes(lista[0] ?? null)
  } else {
    const partes = await Promise.all(lista.map(buscarFontes))
    fontes = mesclarFontes(partes)
  }
  const { extractorData, servicosData, rof042Data, rof096Data, blcData } = fontes

  if (precisa(USA.consolidado) && !extractorData) return res.status(404).json({ error: 'Sem dados para o ano solicitado.' })

  const a = extractorData?.auditoria ?? {}

  const indicadores = [
      // ── Indicador 1 ──────────────────────────────────────────────────────
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte A — RPR001',        metrica: 'NFItem_VlTotal — VEN',         tipo: 'R$', valores: a.ind1_fatVendas },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte A — RPR001',        metrica: 'NFItem_VlTotal — DVE',         tipo: 'R$', valores: a.ind1_fatDevolucoes },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte A — RPR001',        metrica: 'VEN − DVE (líquido)',          tipo: 'R$', valores: a.ind1_fatLiquido },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'Fonte B — Recepcionista', metrica: 'tot_serv',                     tipo: 'R$', valores: servicosData?.faturamentoBruto ?? {} },
      { id: 1, indicador: 'Faturamento Total Oficina', fonte: 'RESULTADO',               metrica: 'Fonte A líquido + Fonte B',    tipo: 'R$', valores: (() => {
        const a1 = a.ind1_fatLiquido ?? {}, b1 = servicosData?.faturamentoBruto ?? {}
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

      // ── Indicador 9 — Faturamento Total Peças Balcão ────────────────────
      { id: 9, indicador: 'Faturamento Total Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — VEN', tipo: 'R$', valores: blcData?.vendas      ?? {} },
      { id: 9, indicador: 'Faturamento Total Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — DVE', tipo: 'R$', valores: blcData?.devolucoes  ?? {} },
      { id: 9, indicador: 'Faturamento Total Peças Balcão', fonte: 'RESULTADO',        metrica: 'VEN − DVE (líquido)', tipo: 'R$', valores: blcData?.liquido     ?? {} },

      // ── Indicador 10 — Margem Bruta Peças Balcão ──────────────────────────
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlMargemCont — VEN',    tipo: 'R$', valores: blcData?.margemContVendas     ?? {} },
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlMargemCont — DVE',    tipo: 'R$', valores: blcData?.margemContDevolucoes  ?? {} },
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte A — RPR001', metrica: 'VEN − DVE (líquido margem)',  tipo: 'R$', valores: blcData?.margemContLiquido     ?? {} },
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte B — RPR001', metrica: 'NFItem_VlTotal — VEN',         tipo: 'R$', valores: blcData?.vendas               ?? {} },
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte B — RPR001', metrica: 'NFItem_VlTotal — DVE',         tipo: 'R$', valores: blcData?.devolucoes            ?? {} },
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'Fonte B — RPR001', metrica: 'VEN − DVE (líquido fat.)',     tipo: 'R$', valores: blcData?.liquido               ?? {} },
      { id: 10, indicador: 'Margem Bruta Peças Balcão', fonte: 'RESULTADO',        metrica: 'Fonte A ÷ Fonte B × 100',     tipo: '%',  valores: blcData?.margemPct              ?? {} },

      // ── Indicador 11 — Faturamento TRP ──────────────────────────────────
      // ── Indicador 12 — Ticket Médio da Oficina (Faturamento Total Oficina ÷ Passagens) ──
      { id: 12, indicador: 'Ticket Médio da Oficina', fonte: 'Fonte A — Faturamento Total Oficina', metrica: 'Fonte A líquido + Fonte B', tipo: 'R$', valores: (() => {
        const a1 = a.ind1_fatLiquido ?? {}, b1 = servicosData?.faturamentoBruto ?? {}
        const r = {}; for (const k of new Set([...Object.keys(a1), ...Object.keys(b1)])) r[k] = (a1[k] ?? 0) + (b1[k] ?? 0); return r
      })() },
      { id: 12, indicador: 'Ticket Médio da Oficina', fonte: 'Fonte B — RPR001', metrica: 'OS únicas (passagens na oficina)', tipo: 'un', valores: a.ind12_passagens ?? {} },
      { id: 12, indicador: 'Ticket Médio da Oficina', fonte: 'RESULTADO', metrica: 'Fonte A ÷ Fonte B', tipo: 'R$', valores: (() => {
        const fat = (() => { const a1 = a.ind1_fatLiquido ?? {}, b1 = servicosData?.faturamentoBruto ?? {}; const r = {}; for (const k of new Set([...Object.keys(a1), ...Object.keys(b1)])) r[k] = (a1[k] ?? 0) + (b1[k] ?? 0); return r })()
        const pas = a.ind12_passagens ?? {}
        const r = {}
        for (const k of new Set([...Object.keys(fat), ...Object.keys(pas)])) r[k] = (pas[k] > 0 && fat[k] != null) ? fat[k] / pas[k] : null
        return r
      })() },

      // ── Indicador 11 — Faturamento TRP ──
      { id: 11, indicador: 'Faturamento TRP', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — VEN (ProdTipoCod 2,24,27,28)', tipo: 'R$', valores: a.ind10_trpVendas },
      { id: 11, indicador: 'Faturamento TRP', fonte: 'Fonte A — RPR001', metrica: 'NFItem_VlTotal — DVE (ProdTipoCod 2,24,27,28)', tipo: 'R$', valores: a.ind10_trpDevolucoes },
      { id: 11, indicador: 'Faturamento TRP', fonte: 'RESULTADO',        metrica: 'VEN − DVE (líquido)',                           tipo: 'R$', valores: a.ind10_trpLiquido },

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

      // ── Indicador 8 — Eficiência da Oficina ─────────────────────────────
      { id: 8, indicador: 'Eficiência da Oficina', fonte: 'Fonte A — ROF042', metrica: 'Hr. Vend.',  tipo: 'h', valores: rof042Data?.hrVend  ?? {} },
      { id: 8, indicador: 'Eficiência da Oficina', fonte: 'Fonte B — ROF042', metrica: 'Hr. Total',  tipo: 'h', valores: rof042Data?.hrAplic ?? {} },
      { id: 8, indicador: 'Eficiência da Oficina', fonte: 'RESULTADO',        metrica: 'Hr. Vend. ÷ Hr. Total × 100', tipo: '%', valores: (() => {
        const vend = rof042Data?.hrVend  ?? {}
        const gast = rof042Data?.hrAplic ?? {}
        const keys = [...new Set([...Object.keys(vend), ...Object.keys(gast)])]
        const r = {}
        for (const k of keys) {
          const v = vend[k] ?? null, g = gast[k] ?? null
          r[k] = (g != null && g > 0) ? (v ?? 0) / g * 100 : null
        }
        return r
      })() },
  ]
  res.json({
    year,
    indicadores: indicadores.filter(r => !indicadorId || r.id === indicadorId).map(r => ({ ...r, info: infoAuditoria(r) })),
    metaData: (extractorData ?? rof042Data ?? rof096Data ?? blcData ?? servicosData)?.metaData ?? null,
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
