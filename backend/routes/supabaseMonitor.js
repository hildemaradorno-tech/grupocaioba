import { Router } from 'express'
import {
  getBanco, getProjetoApi, getRequisicoes, getLogs, calcularControles, planoEfetivo, tokenConfigurado, projetoRef, LIMITES,
} from '../services/supabaseMonitor.js'

// Governança › Monitor Supabase (19/11/2026) — montado em /api/supabase-monitor com requireMenu('governanca/monitor-supabase')
const router = Router()
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error('[supabase-monitor]', e.message)
  res.status(e.status && e.status >= 400 ? e.status : 500).json({ error: e.message })
})
const exigeToken = (req, res, next) => tokenConfigurado() ? next() : res.status(503).json({ error: 'supabase_token_not_configured' })

// GET /api/supabase-monitor/visao[?refresh=1] — banco + projeto/saúde/disco (se houver token) + plano
router.get('/visao', wrap(async (req, res) => {
  const refresh = req.query.refresh === '1'
  const [banco, api] = await Promise.all([
    getBanco({ refresh }).then(d => ({ d }), e => ({ e: e.message })),
    getProjetoApi({ refresh }).then(d => ({ d }), e => ({ e: e.message })),
  ])
  res.json({
    ref: projetoRef(),
    banco: banco.d || null, erro_banco: banco.e || null,
    api: api.d || { configurado: tokenConfigurado() }, erro_api: api.e || null,
    plano: planoEfetivo(api.d),
    limites: LIMITES,
    lido_em: new Date().toISOString(),
  })
}))

// GET /api/supabase-monitor/controles[?refresh=1] — "Precisa de atenção"
router.get('/controles', wrap(async (req, res) => {
  res.json(await calcularControles({ refresh: req.query.refresh === '1' }))
}))

// GET /api/supabase-monitor/requisicoes?intervalo=1hr|3hr|1day|3day|7day  (precisa de token)
router.get('/requisicoes', exigeToken, wrap(async (req, res) => {
  res.json({ pontos: await getRequisicoes(String(req.query.intervalo || '7day')) })
}))

// GET /api/supabase-monitor/logs?tipo=banco|api&horas=1..24  (precisa de token)
router.get('/logs', exigeToken, wrap(async (req, res) => {
  res.json({ logs: await getLogs({ tipo: String(req.query.tipo || 'banco'), horas: req.query.horas }) })
}))

export default router
