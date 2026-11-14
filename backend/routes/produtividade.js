import { Router } from 'express'
import { requireMenu, requireAcao } from '../middleware/authMiddleware.js'
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'
import { sincronizarProdutividadeMes, metasProdutividade } from '../services/produtividadeSync.js'

// Pós-Vendas › Indicadores de Produtividade e Eficiência. Os números a tela lê direto do Supabase
// (vw_pv_prod_diario / vw_pv_prod_mensal / pv_prod_os); aqui ficam a atualização e as metas.
const router = Router()
router.use(requireMenu('pos-vendas/produtividade'))

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/produtividade/metas?anos=2025,2026 — metas de horas aprovadas no Planejamento de Metas
router.get('/metas', wrap(async (req, res) => {
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(503).json({ error: 'supabase_admin_not_configured' })
  const anos = String(req.query.anos || new Date().getFullYear()).split(',').map(Number).filter(a => a > 2000 && a < 2100)
  res.json(await metasProdutividade(admin, anos.length ? anos : [new Date().getFullYear()]))
}))

// POST /api/produtividade/atualizar { ano, mes } — relê os relatórios de 1 mês (Trucks e Motos).
// A tela chama mês a mês quando o período tem mais de um mês.
router.post('/atualizar', requireAcao('pos-vendas/produtividade', 'atualizar'), wrap(async (req, res) => {
  const ano = Number(req.body?.ano), mes = Number(req.body?.mes)
  if (!(ano > 2000 && ano < 2100) || !(mes >= 1 && mes <= 12)) return res.status(400).json({ error: 'Informe ano e mês.' })
  try {
    res.json(await sincronizarProdutividadeMes(getSupabaseAdmin(), ano, mes))
  } catch (err) {
    res.status(409).json({ error: err.message })
  }
}))

export default router
