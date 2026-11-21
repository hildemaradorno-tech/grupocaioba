import { Router } from 'express'
import { getVisao, calcularControles, definirFrequencia } from '../services/sharepointMonitor.js'

// Governança › Monitor SharePoint (19/11/2026) — montado em /api/sharepoint-monitor com requireMenu('governanca/monitor-sharepoint')
const router = Router()
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error('[sharepoint-monitor]', e.message)
  res.status(e.status && e.status >= 400 ? e.status : 500).json({ error: e.message })
})

// GET /api/sharepoint-monitor/visao[?refresh=1] — planilhas, biblioteca, senha do app + pontos de controle
router.get('/visao', wrap(async (req, res) => {
  const v = await getVisao({ refresh: req.query.refresh === '1' })
  res.json({ ...v, controles: calcularControles(v) })
}))

// PUT /api/sharepoint-monitor/frequencia  { fonte_id, frequencia: diaria|semanal|mensal|manual }
router.put('/frequencia', wrap(async (req, res) => {
  const { fonte_id, frequencia } = req.body || {}
  await definirFrequencia(String(fonte_id || ''), String(frequencia || ''), req.user?.email || req.user?.id || null)
  res.json({ ok: true })
}))

export default router
