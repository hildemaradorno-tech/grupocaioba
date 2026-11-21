import { Router } from 'express'
import { getVisao, calcularControles } from '../services/cloudflareMonitor.js'

// Governança › Monitor Cloudflare (19/11/2026) — montado em /api/cloudflare-monitor com requireMenu('governanca/monitor-cloudflare')
const router = Router()
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error('[cloudflare-monitor]', e.message)
  res.status(e.status && e.status >= 400 ? e.status : 500).json({ error: e.message })
})

// GET /api/cloudflare-monitor/visao[?refresh=1] — teste do site + projeto/publicações (com token) + pontos de controle
router.get('/visao', wrap(async (req, res) => {
  const v = await getVisao({ refresh: req.query.refresh === '1' })
  res.json({ ...v, controles: calcularControles(v) })
}))

export default router
