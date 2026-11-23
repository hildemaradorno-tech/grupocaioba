import { Router } from 'express'
import { isConfigured, graphGet } from '../services/graphClient.js'
import { requireMenu, requireAcao } from '../middleware/authMiddleware.js'
import { getVeiculosVendidos, clearVeiculosVendidosCache } from '../services/sharepointVeiculosVendidos.js'
import { getOsPlanoManutencao, clearOsPlanoManutencaoCache } from '../services/sharepointOsPlanoManutencao.js'
import { getPotencialRenovacao, clearPotencialRenovacaoCache, importarPotencialRenovacao } from '../services/sharepointPotencialRenovacao.js'

const router = Router()
// Só quem tem o menu do BI (ou é admin) usa estas rotas.
router.use(requireMenu('bi/planos-manutencao'))

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/planos-manutencao/veiculos-vendidos — notas de veículos vendidos/devolvidos (todos os anos)
router.get('/veiculos-vendidos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getVeiculosVendidos())
}))

// POST /api/planos-manutencao/veiculos-vendidos/refresh — invalida cache e relê a pasta
router.post('/veiculos-vendidos/refresh', requireAcao('bi/planos-manutencao', 'atualizar'), wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearVeiculosVendidosCache()
  res.json(await getVeiculosVendidos())
}))

// GET /api/planos-manutencao/ordens-servico — linhas das O.S. tipo P04 (ROF017), de 2024 em diante
router.get('/ordens-servico', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getOsPlanoManutencao())
}))

// POST /api/planos-manutencao/ordens-servico/refresh — invalida cache e relê a pasta
router.post('/ordens-servico/refresh', requireAcao('bi/planos-manutencao', 'atualizar'), wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearOsPlanoManutencaoCache()
  res.json(await getOsPlanoManutencao())
}))

// GET /api/planos-manutencao/contratos — contratos com potencial de renovação (Potencial Renovação)
router.get('/contratos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getPotencialRenovacao())
}))

// POST /api/planos-manutencao/contratos/refresh — invalida cache e relê a pasta
router.post('/contratos/refresh', requireAcao('bi/planos-manutencao', 'atualizar'), wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearPotencialRenovacaoCache()
  res.json(await getPotencialRenovacao())
}))

// POST /api/planos-manutencao/contratos/importar — { nome, conteudoBase64 } do .xlsx exportado do CRM DAF.
// Confere o arquivo e substitui o da pasta do SharePoint; devolve os contratos já relidos.
router.post('/contratos/importar', requireAcao('bi/planos-manutencao', 'importar_arquivo'), wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { nome, conteudoBase64 } = req.body || {}
  if (!conteudoBase64) return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
  try {
    res.json(await importarPotencialRenovacao(String(nome || ''), Buffer.from(conteudoBase64, 'base64')))
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    throw e
  }
}))

// GET /api/planos-manutencao/fontes — relatórios que alimentam o BI: pasta do SharePoint e os arquivos com a
// data/hora da última alteração (só lista as pastas, não baixa nada). Engrenagem › Fonte de dados.
const FONTES = [
  { relatorio: 'REL_VEICULOSVENDIDOSPORPERIODO_REPORT', uso: 'Veículos vendidos (Resultado, Oportunidades, Veículos Vendidos)',
    pasta: '/Banco de Dados - DAF - Veículos', casa: n => n.toUpperCase().startsWith('REL_VEICULOSVENDIDOSPORPERIODO_REPORT') },
  { relatorio: 'CRM DAF - Plano de Manutenção - Potencial Renovação', uso: 'Contratos (Resultado, Oportunidades, Contratos)',
    pasta: '/Banco de Dados - DAF - Pós-Vendas/CRM DMS DAF', casa: n => /\.xlsx?$/i.test(n) && n.normalize('NFC').toLowerCase().includes('potencial renovação'.normalize('NFC')) },
  { relatorio: 'ROF017_FATURAMENTOPOROS', uso: 'Faturamento das O.S. P04 (Veículos Vendidos, Contratos, Oportunidades, Ordens de Serviço)',
    pasta: '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS', casa: n => n.toUpperCase().startsWith('ROF017_FATURAMENTOPOROS') && Number((n.match(/\d{4}/) || [])[0]) >= 2024 },
  { relatorio: 'ROF001_OSAberta_Excel <ano>', uso: 'Todas as O.S. P04 (um arquivo por ano; Ordens de Serviço, Contratos)',
    pasta: '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS', casa: n => n.toUpperCase().startsWith('ROF001_OSABERTA_EXCEL') },
]
router.get('/fontes', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  const cachePasta = {}
  const listar = async (pasta) => {
    if (cachePasta[pasta]) return cachePasta[pasta]
    const itens = []
    let url = `/drives/${driveId}/root:${encodeURI(pasta)}:/children?$top=200`
    while (url) {
      const r2 = await graphGet(url)
      itens.push(...(r2.value || []))
      url = r2['@odata.nextLink'] ? r2['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null
    }
    return (cachePasta[pasta] = itens)
  }
  const fontes = []
  for (const fo of FONTES) {
    const arquivos = (await listar(fo.pasta)).filter(i => i.file && fo.casa(i.name || ''))
      .map(i => ({ nome: i.name, modificado: i.lastModifiedDateTime, tamanho: i.size }))
      .sort((a, b) => (b.modificado || '').localeCompare(a.modificado || ''))
    fontes.push({ relatorio: fo.relatorio, uso: fo.uso, pasta: fo.pasta.replace(/^\//, '').split('/').join(' › '), arquivos })
  }
  res.json({ fontes })
}))

export default router
