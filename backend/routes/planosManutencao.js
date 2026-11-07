import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { requireMenu, requireAcao } from '../middleware/authMiddleware.js'
import { getVeiculosVendidos, clearVeiculosVendidosCache } from '../services/sharepointVeiculosVendidos.js'
import { getOsPlanoManutencao, clearOsPlanoManutencaoCache } from '../services/sharepointOsPlanoManutencao.js'
import { getPotencialRenovacao, clearPotencialRenovacaoCache, importarPotencialRenovacao } from '../services/sharepointPotencialRenovacao.js'

const router = Router()
// Só quem tem o menu do BI (ou é admin) usa estas rotas.
router.use(requireMenu('bi/planos-manutencao'))

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

// GET /api/planos-manutencao/ordens-servico — linhas das O.S. tipo P04 (ROF017), de 2024 em diante
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

// POST /api/planos-manutencao/contratos/importar — { nome, conteudoBase64 } do .xlsx exportado do CRM DAF.
// Confere o arquivo e substitui o da pasta do SharePoint; devolve os contratos já relidos.
router.post('/contratos/importar', requireAcao('bi/planos-manutencao', 'importar_arquivo'), wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { nome, conteudoBase64 } = req.body || {}
  if (!conteudoBase64) return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
  try {
    res.json(await importarPotencialRenovacao(String(nome || ''), Buffer.from(conteudoBase64, 'base64')))
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    throw e
  }
}))

export default router
