import { Router } from 'express'
import { requireMenu } from '../middleware/authMiddleware.js'
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
router.post('/atualizar', requireMenu('pos-vendas/produtividade'), wrap(async (req, res) => {
  const ano = Number(req.body?.ano), mes = Number(req.body?.mes)
  if (!(ano > 2000 && ano < 2100) || !(mes >= 1 && mes <= 12)) return res.status(400).json({ error: 'Informe ano e mês.' })
  try {
    res.json(await sincronizarProdutividadeMes(getSupabaseAdmin(), ano, mes))
  } catch (err) {
    res.status(409).json({ error: err.message })
  }
}))

// POST /api/produtividade/auto-diario — atualização automática no 1º acesso do dia (pedido do usuário 19/11/2026).
// Qualquer pessoa com o menu dispara (não precisa da ação "atualizar"): se o mês atual (e, até o dia 5, também o
// anterior) ainda não foi lido HOJE (horário de Campo Grande), relê; senão não faz nada. As próximas atualizações
// do dia são pelo botão azul. Se já houver uma atualização rodando, devolve { emAndamento: true }.
const diaCG = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Campo_Grande' })
router.post('/auto-diario', wrap(async (req, res) => {
  const admin = getSupabaseAdmin()
  if (!admin) return res.status(503).json({ error: 'supabase_admin_not_configured' })
  const hoje = diaCG(new Date())
  const [a, m, d] = hoje.split('-').map(Number)
  const meses = [[a, m]]
  if (d <= 5) meses.unshift(m === 1 ? [a - 1, 12] : [a, m - 1])
  const { data: sy, error } = await admin.from('pv_prod_sync').select('ano, mes, marca, atualizado_em')
    .in('ano', [...new Set(meses.map(x => x[0]))])
  if (error) throw error
  const lidoHoje = (ano, mes) => ['TRUCKS', 'MOTOS'].every(mc => (sy || []).some(s => s.ano === ano && s.mes === mes && s.marca === mc && diaCG(s.atualizado_em) === hoje))
  const pendentes = meses.filter(([ano, mes]) => !lidoHoje(ano, mes))
  if (!pendentes.length) return res.json({ jaAtualizado: true, hoje })
  const resultado = {}
  try {
    for (const [ano, mes] of pendentes) resultado[`${ano}-${mes}`] = await sincronizarProdutividadeMes(admin, ano, mes)
  } catch (err) {
    if (/andamento/i.test(err.message || '')) return res.json({ emAndamento: true, hoje })
    throw err
  }
  res.json({ atualizado: true, hoje, meses: pendentes, resultado })
}))

export default router
