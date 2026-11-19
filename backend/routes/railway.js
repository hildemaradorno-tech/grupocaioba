import { Router } from 'express'
import { railwayConfigurado, getVisaoGeral, getMetricas, getLogs, ping, getPlano } from '../services/railwayMonitor.js'
import { calcularControles } from '../services/railwayAlertas.js'

// Governança › Monitor Railway (19/11/2026) — montado em /api/railway com requireMenu('governanca/monitor-railway')
const router = Router()
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error('[railway]', e.message)
  res.status(e.status && e.status >= 400 ? e.status : 500).json({ error: e.message })
})
const exigeToken = (req, res, next) => railwayConfigurado()
  ? next()
  : res.status(503).json({ error: 'railway_not_configured' })

router.use(exigeToken)

// GET /api/railway/visao[?refresh=1] — serviços, ambientes, último deploy e histórico
router.get('/visao', wrap(async (req, res) => {
  res.json(await getVisaoGeral({ refresh: req.query.refresh === '1' }))
}))

// GET /api/railway/controles[?refresh=1] — pontos de controle ("Precisa de atenção" da Visão Geral)
router.get('/controles', wrap(async (req, res) => {
  res.json(await calcularControles({ refresh: req.query.refresh === '1' }))
}))

// GET /api/railway/plano[?refresh=1] — plano, situação da assinatura, uso do ciclo e capacidade
router.get('/plano', wrap(async (req, res) => {
  res.json(await getPlano({ refresh: req.query.refresh === '1' }))
}))

// GET /api/railway/metricas?projectId&serviceId&environmentId&horas
router.get('/metricas', wrap(async (req, res) => {
  const { projectId, serviceId, environmentId, horas } = req.query
  if (!projectId || !serviceId || !environmentId) return res.status(400).json({ error: 'projectId, serviceId e environmentId são obrigatórios' })
  res.json(await getMetricas({ projectId: String(projectId), serviceId: String(serviceId), environmentId: String(environmentId), horas }))
}))

// GET /api/railway/logs?deploymentId&limit
router.get('/logs', wrap(async (req, res) => {
  if (!req.query.deploymentId) return res.status(400).json({ error: 'deploymentId é obrigatório' })
  res.json({ logs: await getLogs({ deploymentId: String(req.query.deploymentId), limit: req.query.limit }) })
}))

// GET /api/railway/ping?dominio — teste de saúde do domínio público do serviço
router.get('/ping', wrap(async (req, res) => {
  res.json(await ping(req.query.dominio))
}))

export default router
