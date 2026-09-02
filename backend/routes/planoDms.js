import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { calcularPlanoDms, clearPlanoDmsCache } from '../services/sharepointPlanoDms.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/plano-dms/calcular?ano=&periodoInicio=&periodoFim= — cruza O.S. P04 do período com
// o arquivo de Chassi -> Plano vendido; devolve { matched, semPlano } cru (sem funcionário/valor,
// isso é resolvido no front, igual o resto do motor de comissões).
router.get('/calcular', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { ano, periodoInicio, periodoFim } = req.query
  if (!ano || !periodoInicio || !periodoFim) {
    return res.status(400).json({ error: 'parametros_obrigatorios', detalhe: 'ano, periodoInicio e periodoFim são obrigatórios' })
  }
  const resultado = await calcularPlanoDms({ ano: parseInt(ano, 10), periodoInicio, periodoFim })
  res.json(resultado)
}))

// POST /api/plano-dms/calcular/refresh — invalida cache e recalcula
router.post('/calcular/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearPlanoDmsCache()
  const { ano, periodoInicio, periodoFim } = req.query
  if (!ano || !periodoInicio || !periodoFim) {
    return res.status(400).json({ error: 'parametros_obrigatorios', detalhe: 'ano, periodoInicio e periodoFim são obrigatórios' })
  }
  const resultado = await calcularPlanoDms({ ano: parseInt(ano, 10), periodoInicio, periodoFim })
  res.json(resultado)
}))

export default router
