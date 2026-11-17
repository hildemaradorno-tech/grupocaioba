import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getRpaLog, getRpaLogArquivo } from '../services/sharepointRpaLog.js'

const router = Router()
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/rpa-log — execuções do Robert Automation (CSV do SharePoint) + agenda do Agendamento de Processos
router.get('/', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getRpaLog())
}))

// POST /api/rpa-log/refresh — ignora o cache de 5 min e relê o CSV
router.post('/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getRpaLog({ refresh: true }))
}))

// GET /api/rpa-log/arquivo?pasta=Financeiro&arquivo=xxx.txt — relatório .txt de uma execução
router.get('/arquivo', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  try {
    res.json({ texto: await getRpaLogArquivo(String(req.query.pasta || ''), String(req.query.arquivo || '')) })
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ error: e.message })
    throw e
  }
}))

export default router
