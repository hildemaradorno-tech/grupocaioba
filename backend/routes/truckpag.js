import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import {
  getTruckPagTitulos, clearTruckPagTitulosCache,
  getTruckPagCreditos, clearTruckPagCreditosCache,
  getTruckPagRepasses, clearTruckPagRepassesCache,
} from '../services/sharepointTruckPag.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/truckpag/titulos — posição de títulos a receber TruckPag (RFN003)
router.get('/titulos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getTruckPagTitulos())
}))

// POST /api/truckpag/titulos/refresh — invalida cache e recarrega
router.post('/titulos/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearTruckPagTitulosCache()
  res.json(await getTruckPagTitulos())
}))

// GET /api/truckpag/creditos — créditos não identificados na tesouraria (RFN024)
router.get('/creditos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getTruckPagCreditos())
}))

// POST /api/truckpag/creditos/refresh
router.post('/creditos/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearTruckPagCreditosCache()
  res.json(await getTruckPagCreditos())
}))

// GET /api/truckpag/repasses — histórico de repasses recebidos da TruckPag
router.get('/repasses', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getTruckPagRepasses())
}))

// POST /api/truckpag/repasses/refresh
router.post('/repasses/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearTruckPagRepassesCache()
  res.json(await getTruckPagRepasses())
}))

export default router
