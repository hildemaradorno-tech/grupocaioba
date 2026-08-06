import { Router } from 'express'
import { isMicroworkConfigured, buscarGarantiasReceberHonda } from '../services/microworkIntegracao.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/honda/garantias-a-receber — consulta o relatório de Garantias a Receber (MicroWork Cloud)
router.get('/garantias-a-receber', wrap(async (req, res) => {
  if (!isMicroworkConfigured()) {
    return res.status(503).json({ error: 'microwork_not_configured', message: 'MICROWORK_API_TOKEN não configurado no ambiente.' })
  }
  const data = await buscarGarantiasReceberHonda()
  res.json(data)
}))

export default router
