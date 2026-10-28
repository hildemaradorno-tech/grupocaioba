import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getCampanhasCrm, clearCampanhasCrmCache, getPassagensOs, clearPassagensOsCache } from '../services/sharepointAgendamentoCrm.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/agendamento-crm/campanhas — contatos das campanhas CRM (RCR038), todos os anos
router.get('/campanhas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getCampanhasCrm())
}))

// POST /api/agendamento-crm/campanhas/refresh — invalida cache e relê a pasta
router.post('/campanhas/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearCampanhasCrmCache()
  res.json(await getCampanhasCrm())
}))

// GET /api/agendamento-crm/passagens — O.S. do ano (ROF001 TODAS) p/ contar passagens por data de abertura
router.get('/passagens', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getPassagensOs())
}))

// POST /api/agendamento-crm/passagens/refresh
router.post('/passagens/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearPassagensOsCache()
  res.json(await getPassagensOs())
}))

export default router
