import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getExtratoDaf, getConciliacaoDaf, importarExtratoDaf } from '../services/sharepointExtratoDaf.js'

const router = Router()
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/extrato-daf?arquivo=Account-303920.xlsx&refresh=1 — planilha do extrato de pagamento DAF (SharePoint)
router.get('/', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getExtratoDaf({ arquivo: req.query.arquivo ? String(req.query.arquivo) : undefined, refresh: req.query.refresh === '1' }))
}))

// GET /api/extrato-daf/conciliacao?arquivo=...&refresh=1 — extrato × títulos a receber da DAF (RFN003 Analítico)
router.get('/conciliacao', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getConciliacaoDaf({ arquivo: req.query.arquivo ? String(req.query.arquivo) : undefined, refresh: req.query.refresh === '1' }))
}))

// POST /api/extrato-daf/importar — { nome, conteudoBase64 } da planilha do SAP (ex.: Account-303920.xlsx).
// Confere o arquivo e grava na pasta do SharePoint (substitui o de mesmo nome).
router.post('/importar', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { nome, conteudoBase64 } = req.body || {}
  if (!conteudoBase64) return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
  try {
    res.json(await importarExtratoDaf(String(nome || ''), Buffer.from(conteudoBase64, 'base64')))
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    throw e
  }
}))

export default router
