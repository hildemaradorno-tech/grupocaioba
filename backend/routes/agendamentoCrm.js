import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getCampanhasCrm, clearCampanhasCrmCache } from '../services/sharepointAgendamentoCrm.js'

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

export default router
