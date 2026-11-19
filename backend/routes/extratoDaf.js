import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getExtratoDaf, getConciliacaoDaf } from '../services/sharepointExtratoDaf.js'

const router = Router()
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/extrato-daf?arquivo=Account-303920.xlsx&refresh=1 — planilha do extrato de pagamento DAF (SharePoint)
router.get('/', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getExtratoDaf({ arquivo: req.query.arquivo ? String(req.query.arquivo) : undefined, refresh: req.query.refresh === '1' }))
}))

// GET /api/extrato-daf/conciliacao?arquivo=...&refresh=1 — extrato × títulos a receber da DAF (RFN003 Analítico)
router.get('/conciliacao', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getConciliacaoDaf({ arquivo: req.query.arquivo ? String(req.query.arquivo) : undefined, refresh: req.query.refresh === '1' }))
}))

export default router
