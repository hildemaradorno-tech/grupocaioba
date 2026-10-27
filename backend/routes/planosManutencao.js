import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getVeiculosVendidos, clearVeiculosVendidosCache } from '../services/sharepointVeiculosVendidos.js'
import { getOsPlanoManutencao, clearOsPlanoManutencaoCache } from '../services/sharepointOsPlanoManutencao.js'
import { getPotencialRenovacao, clearPotencialRenovacaoCache } from '../services/sharepointPotencialRenovacao.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/planos-manutencao/veiculos-vendidos — notas de veículos vendidos/devolvidos (todos os anos)
router.get('/veiculos-vendidos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getVeiculosVendidos())
}))

// POST /api/planos-manutencao/veiculos-vendidos/refresh — invalida cache e relê a pasta
router.post('/veiculos-vendidos/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearVeiculosVendidosCache()
  res.json(await getVeiculosVendidos())
}))

// GET /api/planos-manutencao/ordens-servico — linhas das O.S. tipo P04 (ROF042), todos os anos
router.get('/ordens-servico', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getOsPlanoManutencao())
}))

// POST /api/planos-manutencao/ordens-servico/refresh — invalida cache e relê a pasta
router.post('/ordens-servico/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearOsPlanoManutencaoCache()
  res.json(await getOsPlanoManutencao())
}))

// GET /api/planos-manutencao/contratos — contratos com potencial de renovação (Potencial Renovação)
router.get('/contratos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getPotencialRenovacao())
}))

// POST /api/planos-manutencao/contratos/refresh — invalida cache e relê a pasta
router.post('/contratos/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearPotencialRenovacaoCache()
  res.json(await getPotencialRenovacao())
}))

export default router
