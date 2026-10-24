/**
 * Endpoint de leitura para o Power BI (conector "Página da Web").
 *
 * O acesso anônimo (anon key) ao banco foi fechado; em vez de reabri-lo, o Power BI lê as views
 * da Controladoria por aqui. O backend usa a service role (ignora RLS) e só devolve as views da
 * lista abaixo, protegidas por um token fixo (POWERBI_TOKEN) enviado no cabeçalho — nunca na URL.
 *
 *   GET /api/powerbi              → lista das views disponíveis
 *   GET /api/powerbi/:view        → todas as linhas da view (JSON), já paginadas internamente
 *   Cabeçalho: x-api-key: <POWERBI_TOKEN>   (ou Authorization: Bearer <POWERBI_TOKEN>)
 */
import { Router } from 'express'
import crypto from 'crypto'
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// view liberada → coluna usada para ordenar (paginação estável)
const VIEWS = {
  vw_ctb_centros_resultado: 'centro_resultado_id',
  vw_ctb_orcamento: 'orcamento_id',
  vw_ctb_plano_contas: 'conta_id',
  vw_ctb_dre_estrutura: 'linha_dre_id',
}

const PAGINA = 1000 // limite de linhas por chamada do PostgREST

function tokenValido(req) {
  const esperado = process.env.POWERBI_TOKEN
  if (!esperado) return false
  const auth = req.get('authorization') || ''
  const enviado = req.get('x-api-key') || (auth.startsWith('Bearer ') ? auth.slice(7) : '')
  const a = Buffer.from(enviado)
  const b = Buffer.from(esperado)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

router.use((req, res, next) => {
  if (!process.env.POWERBI_TOKEN) return res.status(503).json({ error: 'powerbi_not_configured' })
  if (!tokenValido(req)) return res.status(401).json({ error: 'token_invalido' })
  next()
})

router.get('/', (req, res) => {
  res.json(Object.keys(VIEWS))
})

router.get('/:view', wrap(async (req, res) => {
  const view = req.params.view
  if (!Object.prototype.hasOwnProperty.call(VIEWS, view)) {
    return res.status(404).json({ error: 'view_nao_disponivel', disponiveis: Object.keys(VIEWS) })
  }
  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(503).json({ error: 'supabase_not_configured' })

  const linhas = []
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from(view)
      .select('*')
      .order(VIEWS[view], { ascending: true })
      .range(inicio, inicio + PAGINA - 1)
    if (error) throw new Error(error.message)
    linhas.push(...data)
    if (data.length < PAGINA) break
  }
  res.json(linhas)
}))

export default router
