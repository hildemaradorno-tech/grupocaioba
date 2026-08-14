import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getOsAbertasGarantia, clearGarantiasCache, getRof001Colunas, getRof001EncerradaColunas, getOsAbertasGeral, getOsEncerradas, clearEncerradasCache } from '../services/sharepointGarantias.js'
import { getAllFaturamentos, clearFaturamentoCache } from '../services/sharepointFaturamento.js'
import { getAllFaturamentosRof017, getFaturamentoPorOSRof017, getRof017Colunas, clearRof017Cache } from '../services/sharepointRof017.js'
import { getRfn003Colunas, getTitulosAReceber, clearFinanceiroCache } from '../services/sharepointFinanceiro.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/garantias/sharepoint/aberta — todas as OS sem data de fechamento (módulo Auditoria)
router.get('/sharepoint/aberta', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { rows, lastModified } = await getOsAbertasGeral()
  res.json({ rows, lastModified })
}))

// POST /api/garantias/sharepoint/aberta/refresh — força nova leitura do ROF001_OSABERTA
router.post('/sharepoint/aberta/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { rows, lastModified } = await getOsAbertasGeral()
  res.json({ rows, lastModified })
}))

// GET /api/garantias/sharepoint/encerrada — todas as OS do ROF001_OSABERTA_ENCERRADA
router.get('/sharepoint/encerrada', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const data = await getOsEncerradas()
  res.json(data)
}))

// POST /api/garantias/sharepoint/encerrada/refresh — invalida cache e recarrega
router.post('/sharepoint/encerrada/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearEncerradasCache()
  const data = await getOsEncerradas()
  res.json(data)
}))

// GET /api/garantias/colunas — diagnóstico: nomes exatos das colunas do Excel
router.get('/colunas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const info = await getRof001Colunas()
  res.json(info)
}))

// GET /api/garantias/colunas/encerrada — diagnóstico: colunas do ROF001_OSABERTA_ENCERRADA
router.get('/colunas/encerrada', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const info = await getRof001EncerradaColunas()
  res.json(info)
}))

// GET /api/garantias/sharepoint
// Retorna todas as OS do ROF001_OSABERTA com classificação GAR
router.get('/sharepoint', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'sharepoint_not_configured',
      message: 'Credenciais Azure AD não configuradas.',
    })
  }
  const data = await getOsAbertasGarantia()
  res.json(data)
}))

// POST /api/garantias/sharepoint/refresh
// Invalida o cache e força nova leitura do arquivo
router.post('/sharepoint/refresh', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured' })
  }
  clearGarantiasCache()
  const data = await getOsAbertasGarantia()
  res.json(data)
}))

// GET /api/garantias/faturados?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
// Retorna linhas do ROF017_FATURAMENTOPOROS filtradas por Data_Criacao
router.get('/faturados', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured', message: 'Credenciais Azure AD não configuradas.' })
  }
  const { dataInicio, dataFim, numeroOS } = req.query
  const data = await getAllFaturamentosRof017(dataInicio || null, dataFim || null, numeroOS || null)
  res.json(data)
}))

// POST /api/garantias/faturados/refresh
router.post('/faturados/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearRof017Cache()
  const { dataInicio, dataFim, numeroOS } = req.query
  const data = await getAllFaturamentosRof017(dataInicio || null, dataFim || null, numeroOS || null)
  res.json(data)
}))

// GET /api/garantias/faturamento/colunas
// Diagnóstico: retorna as colunas disponíveis no ROF017_FATURAMENTOPOROS
router.get('/faturamento/colunas', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured' })
  }
  const info = await getRof017Colunas()
  res.json(info)
}))

// GET /api/garantias/faturamento/:numeroOS?tipoOS=...&tipoSigla=...
// Busca dados de faturamento de uma OS no ROF017_FATURAMENTOPOROS
router.get('/faturamento/:numeroOS', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured', message: 'Credenciais Azure AD não configuradas.' })
  }
  const { numeroOS } = req.params
  const { tipoOS, tipoSigla } = req.query
  const data = await getFaturamentoPorOSRof017(numeroOS, tipoOS, tipoSigla)
  if (!data || data._notFound) {
    return res.status(404).json({
      error: 'not_found',
      message: `OS ${numeroOS} não encontrada no ROF017.`,
      siglas_disponiveis: data?.siglas_disponiveis || [],
    })
  }
  res.json(data)
}))

// POST /api/garantias/faturamento/refresh
router.post('/faturamento/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearRof017Cache()
  res.json({ refreshed: true })
}))

// GET /api/garantias/financeiro/titulos — títulos a receber do RFN003
router.get('/financeiro/titulos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const data = await getTitulosAReceber()
  res.json(data)
}))

// POST /api/garantias/financeiro/titulos/refresh — invalida cache e recarrega
router.post('/financeiro/titulos/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearFinanceiroCache()
  const data = await getTitulosAReceber()
  res.json(data)
}))

// GET /api/garantias/financeiro/colunas — diagnóstico: colunas do RFN003
router.get('/financeiro/colunas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const info = await getRfn003Colunas()
  res.json(info)
}))

export default router
