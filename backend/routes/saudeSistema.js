import { Router } from 'express'
import { getResumo, getRotinas, getIntegracoes } from '../services/saudeSistema.js'

// Governança › Saúde do Sistema (19/11/2026) — montado em /api/saude-sistema com requireMenu('governanca/saude-sistema')
const router = Router()
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error('[saude-sistema]', e.message)
  res.status(e.status && e.status >= 400 ? e.status : 500).json({ error: e.message })
})

// GET /api/saude-sistema/resumo[?refresh=1] — semáforo de todos os monitores
router.get('/resumo', wrap(async (req, res) => res.json(await getResumo({ refresh: req.query.refresh === '1' }))))
// GET /api/saude-sistema/rotinas — schedulers e sincronizações
router.get('/rotinas', wrap(async (req, res) => res.json(await getRotinas())))
// GET /api/saude-sistema/integracoes[?refresh=1] — e-mail, MicroWork, IA, Power BI, planilha da Matriz de KPIs
router.get('/integracoes', wrap(async (req, res) => res.json(await getIntegracoes({ refresh: req.query.refresh === '1' }))))

export default router
