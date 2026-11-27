import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getOsAbertasGarantia, clearGarantiasCache, getRof001Colunas, getRof001EncerradaColunas, getOsAbertasGeral, getOsAbertasInfo, getOsEncerradas, clearEncerradasCache, getOsTempoOficina } from '../services/sharepointGarantias.js'
import { getAllFaturamentosRof017, getFaturamentoPorOSRof017, getRof017Colunas, clearRof017Cache } from '../services/sharepointRof017.js'
import { getRfn003Colunas, getTitulosAReceber, clearFinanceiroCache } from '../services/sharepointFinanceiro.js'
import { FONTES, verificarFonte } from '../services/sharepointMonitor.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/garantias/sharepoint/aberta — todas as OS sem data de fechamento (módulo Auditoria)
router.get('/sharepoint/aberta', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { rows, lastModified } = await getOsAbertasGeral()
  res.json({ rows, lastModified })
}))

// GET /api/garantias/sharepoint/aberta/info — só a data de atualização do ROF001_OSABERTA (sem baixar)
router.get('/sharepoint/aberta/info', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  res.json(await getOsAbertasInfo())
}))

// POST /api/garantias/sharepoint/aberta/refresh — força nova leitura do ROF001_OSABERTA
router.post('/sharepoint/aberta/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { rows, lastModified } = await getOsAbertasGeral()
  res.json({ rows, lastModified })
}))

// GET /api/garantias/sharepoint/tempo-oficina?de=&ate=&empresa= — O.S. fechadas (entrada → saída) dos arquivos
// ROF001_OSAberta_Excel <ano>, todos os tipos, pela data de saída (Fechado). Aba Tempo na Oficina da Auditoria.
router.get('/sharepoint/tempo-oficina', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { de, ate, empresa } = req.query
  res.json(await getOsTempoOficina({ de, ate, empresa }))
}))

// GET /api/garantias/sharepoint/encerrada —O.S. de garantia dos arquivos ROF001_OSAberta_Excel <ano> (com a Situação)
router.get('/sharepoint/encerrada', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const data = await getOsEncerradas()
  res.json(data)
}))

// POST /api/garantias/sharepoint/encerrada/refresh — invalida cache e recarrega
router.post('/sharepoint/encerrada/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearEncerradasCache()
  const data = await getOsEncerradas()
  res.json(data)
}))

// GET /api/garantias/fontes — arquivos do SharePoint usados pela Garantias DAF: pasta, arquivo mais recente e
// data da última atualização (mesma leitura do Monitor SharePoint). Engrenagem → Fontes de dados.
const FONTES_GARANTIAS = [
  { id: 'rof001-aberta', uso: 'Na Oficina (Em Aberto) — O.S. de garantia abertas na oficina' },
  { id: 'rof001-excel',  uso: 'Com Garantista (Em Aberto) — importa as O.S. Encerradas com valor e a Situação das cadastradas (um arquivo por ano)' },
  { id: 'rof017',        uso: 'Buscar NF, Buscar Faturamento e Importar O.S. Faturadas (um arquivo por ano)' },
  { id: 'rfn003',        uso: 'Títulos a Receber (Faturadas) — títulos a receber da DAF (um arquivo por unidade)' },
]
// GET /api/garantias/sharepoint/rof017/info — só a data do ROF017 mais recente (aba Histórico de O.S.)
router.get('/sharepoint/rof017/info', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const v = await verificarFonte(FONTES.find(f => f.id === 'rof017'))
  res.json({ nome: v.recente?.nome || null, lastModified: v.recente?.modificado_em || null })
}))

router.get('/fontes', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const lista = await Promise.all(FONTES_GARANTIAS.map(async ({ id, uso }) => {
    const fonte = FONTES.find(f => f.id === id)
    if (!fonte) return null
    const v = await verificarFonte(fonte)
    return {
      id, nome: v.nome, uso, pasta: v.pasta, padrao: v.padrao, encontrado: v.encontrado, arquivos: v.arquivos,
      arquivo: v.recente?.nome || null, modificado_em: v.recente?.modificado_em || null, link: v.recente?.link || null,
      todos: v.todos || [], nivel: v.nivel, motivo: v.motivo || null,
    }
  }))
  res.json({ fontes: lista.filter(Boolean), lidoEm: new Date().toISOString() })
}))

// GET /api/garantias/colunas — diagnóstico: nomes exatos das colunas do Excel
router.get('/colunas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const info = await getRof001Colunas()
  res.json(info)
}))

// GET /api/garantias/colunas/encerrada — diagnóstico: colunas do ROF001_OSABERTA_ENCERRADA
router.get('/colunas/encerrada', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const info = await getRof001EncerradaColunas()
  res.json(info)
}))

// GET /api/garantias/sharepoint
// Retorna todas as OS do ROF001_OSABERTA com classificação GAR
router.get('/sharepoint', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'sharepoint_not_configured',
      message: 'Credenciais Azure AD não configuradas.',
    })
  }
  const data = await getOsAbertasGarantia()
  res.json(data)
}))

// POST /api/garantias/sharepoint/refresh
// Invalida o cache e força nova leitura do arquivo
router.post('/sharepoint/refresh', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured' })
  }
  clearGarantiasCache()
  const data = await getOsAbertasGarantia()
  res.json(data)
}))

// GET /api/garantias/faturados?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
// Retorna linhas do ROF017_FATURAMENTOPOROS filtradas por Data_Criacao
router.get('/faturados', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured', message: 'Credenciais Azure AD não configuradas.' })
  }
  const { dataInicio, dataFim, numeroOS } = req.query
  const data = await getAllFaturamentosRof017(dataInicio || null, dataFim || null, numeroOS || null)
  res.json(data)
}))

// POST /api/garantias/faturados/refresh
router.post('/faturados/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearRof017Cache()
  const { dataInicio, dataFim, numeroOS } = req.query
  const data = await getAllFaturamentosRof017(dataInicio || null, dataFim || null, numeroOS || null)
  res.json(data)
}))

// GET /api/garantias/faturamento/colunas
// Diagnóstico: retorna as colunas disponíveis no ROF017_FATURAMENTOPOROS
router.get('/faturamento/colunas', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured' })
  }
  const info = await getRof017Colunas()
  res.json(info)
}))

// GET /api/garantias/faturamento/:numeroOS?tipoOS=...&tipoSigla=...&chassi=...&dataAbertura=YYYY-MM-DD
// Busca dados de faturamento de uma OS no ROF017_FATURAMENTOPOROS
router.get('/faturamento/:numeroOS', wrap(async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'sharepoint_not_configured', message: 'Credenciais Azure AD não configuradas.' })
  }
  const { numeroOS } = req.params
  const { tipoOS, tipoSigla, chassi, dataAbertura } = req.query
  const data = await getFaturamentoPorOSRof017(numeroOS, tipoOS, tipoSigla, chassi, dataAbertura)
  if (!data || data._notFound) {
    return res.status(404).json({
      error: 'not_found',
      message: `OS ${numeroOS} não encontrada no ROF017.`,
      siglas_disponiveis: data?.siglas_disponiveis || [],
    })
  }
  res.json(data)
}))

// POST /api/garantias/faturamento/refresh
router.post('/faturamento/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearRof017Cache()
  res.json({ refreshed: true })
}))

// GET /api/garantias/financeiro/titulos — títulos a receber do RFN003
router.get('/financeiro/titulos', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const data = await getTitulosAReceber()
  res.json(data)
}))

// POST /api/garantias/financeiro/titulos/refresh — invalida cache e recarrega
router.post('/financeiro/titulos/refresh', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  clearFinanceiroCache()
  const data = await getTitulosAReceber()
  res.json(data)
}))

// GET /api/garantias/financeiro/colunas — diagnóstico: colunas do RFN003
router.get('/financeiro/colunas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const info = await getRfn003Colunas()
  res.json(info)
}))

export default router
