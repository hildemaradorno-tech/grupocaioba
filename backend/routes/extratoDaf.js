import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { importarExtratoDaf } from '../services/sharepointExtratoDaf.js'

const router = Router()
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// POST /api/extrato-daf/importar — { nome, conteudoBase64, refresh } da planilha do SAP (ex.: Account-303920.xlsx).
// Desde 23/11/2026 o extrato é lido SÓ por aqui: confere o arquivo, lê e concilia com o RFN003 (SharePoint) e
// devolve { extrato, conciliacao }. Nada é gravado. refresh = true relê o RFN003 sem usar o cache.
router.post('/importar', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { nome, conteudoBase64, refresh } = req.body || {}
  if (!conteudoBase64) return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
  try {
    res.json(await importarExtratoDaf(String(nome || ''), Buffer.from(conteudoBase64, 'base64'), { refresh: !!refresh }))
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    throw e
  }
}))

export default router
