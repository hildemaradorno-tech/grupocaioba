import { Router } from 'express'
import { getDataset } from '../services/gestorPecas/dataProvider.js'
import { limparCacheTrucks } from '../services/gestorPecas/dealernetTrucks.js'
import * as E from '../services/gestorPecas/engine.js'
import { analisarTela, conversar, contextoTela } from '../services/gestorPecas/aiAnalise.js'
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'
import { getPerfilUsuario, nomesEmpresasPermitidas, normalizar } from '../middleware/authMiddleware.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// Dois Gestores separados: 'trucks' (Caioba Trucks — Dealer.net, menus pecas/...) e 'motos'
// (Caioba Motos — MicroWork, menus pecas-motos/...). O segmento vem em ?segmento= e cada um exige
// o menu do próprio Gestor (admin vê os dois).
const SEGMENTOS = {
  trucks: { prefixo: 'pecas/', bi: 'bi/gestor-pecas', idParametros: 1 },
  motos:  { prefixo: 'pecas-motos/', bi: 'bi/gestor-pecas-motos', idParametros: 2 },
}
router.use(wrap(async (req, res, next) => {
  req.segmento = req.query.segmento === 'motos' ? 'motos' : 'trucks'
  const seg = SEGMENTOS[req.segmento]
  const perfil = req.perfil || await getPerfilUsuario(req.user?.email)
  if (!perfil) return res.status(403).json({ error: 'Usuário sem perfil ativo.' })
  if (!perfil.is_admin && ![...perfil.menus].some(m => m.startsWith(seg.prefixo) || m === seg.bi)) {
    return res.status(403).json({ error: 'Sem permissão para este Gestor de Peças.' })
  }
  req.perfil = perfil
  next()
}))

// Parâmetros (pec_parametros: id 1 = trucks, id 2 = motos) — cache curto; sem linha, usa os padrões
const _params = {}
async function getParametros(segmento) {
  const hit = _params[segmento]
  if (hit && Date.now() - hit.em < 30_000) return hit.valor
  let salvos = null
  const sb = getSupabaseAdmin()
  if (sb) {
    const { data } = await sb.from('pec_parametros').select('valores').eq('id', SEGMENTOS[segmento].idParametros).maybeSingle()
    salvos = data?.valores || null
  }
  const valor = E.mesclarParametros(salvos, segmento)
  _params[segmento] = { valor, em: Date.now() }
  return valor
}

// Lojas do dataset que o grupo do usuário pode ver (admin = todas). O recorte é feito ANTES do
// cálculo para os KPIs/ABC já saírem só com as lojas liberadas; filtrarPorEmpresa (server.js)
// continua como segunda barreira nas linhas.
async function lojasPermitidas(req, ds) {
  const perfil = req.perfil || await getPerfilUsuario(req.user?.email)
  if (!perfil || perfil.is_admin) return ds.lojas
  const nomes = await nomesEmpresasPermitidas(perfil.grupo_id)
  return ds.lojas.filter(l => nomes.has(normalizar(l)))
}

const CAMPOS_FILTRO = ['loja', 'marca', 'grupo', 'fornecedor', 'abc', 'xyz', 'freq', 'situacao', 'busca']
function lerFiltros(origem = {}) {
  const f = {}
  for (const c of CAMPOS_FILTRO) if (origem[c]) f[c] = String(origem[c])
  return f
}

async function contexto(req, filtrosOrigem) {
  const ds = await getDataset(req.segmento)
  const params = await getParametros(req.segmento)
  const lojas = await lojasPermitidas(req, ds)
  const f = lerFiltros(filtrosOrigem)
  if (f.loja && !lojas.includes(f.loja)) f.loja = '__sem_acesso__'
  const base = E.calcularBase(ds, params, { lojas, loja: f.loja })
  return { ds, params, lojas, f, base }
}

const TELAS = {
  'painel':            (b, f) => { const { _sub, ...r } = E.telaPainel(b, f); return r },
  'alertas':           E.telaAlertas,
  'estoque':           E.telaEstoque,
  'classificacao':     E.telaClassificacao,
  'demanda':           E.telaDemanda,
  'reposicao':         E.telaReposicao,
  'cobertura-ruptura': E.telaCoberturaRuptura,
  'excesso-obsoletos': E.telaExcessoObsoletos,
  'promocoes':         E.telaPromocoes,
  'pedidos-pendentes': E.telaPedidosPendentes,
  'transferencias':    E.telaTransferencias,
  'anomalias-compra':  E.telaAnomaliasCompra,
  'anomalias-preco':   E.telaAnomaliasPreco,
  'fornecedores':      E.telaFornecedores,
}

const cabecalho = (ds, lojas) => ({ fonte: ds.fonte, segmento: ds.segmento, data_base: ds.data_base, lojas, pendencias: ds.pendencias || [] })

// GET /api/gestor-pecas/opcoes — listas para os filtros + parâmetros vigentes
router.get('/opcoes', wrap(async (req, res) => {
  const ds = await getDataset(req.segmento)
  const lojas = await lojasPermitidas(req, ds)
  const uniq = (campo) => [...new Set(ds.itens.map(i => i[campo]))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  res.json({ ...cabecalho(ds, lojas), marcas: uniq('marca'), grupos: uniq('grupo'), fornecedores: uniq('fornecedor'), parametros: await getParametros(req.segmento), parametros_padrao: E.parametrosPadrao(req.segmento) })
}))

// GET /api/gestor-pecas/produtos?busca= — autocomplete da Evolução do Produto
router.get('/produtos', wrap(async (req, res) => {
  const { base } = await contexto(req, {})
  res.json(E.buscarProdutos(base, req.query.busca))
}))

// GET /api/gestor-pecas/produto/:codigo
router.get('/produto/:codigo', wrap(async (req, res) => {
  const { ds, lojas, base } = await contexto(req, req.query)
  const r = E.telaProduto(base, req.params.codigo)
  if (!r) return res.status(404).json({ error: 'Item não encontrado.' })
  res.json({ ...cabecalho(ds, lojas), ...r })
}))

// GET /api/gestor-pecas/tela/:nome?loja=&marca=... — dados calculados de cada tela
router.get('/tela/:nome', wrap(async (req, res) => {
  const fn = TELAS[req.params.nome]
  if (!fn) return res.status(404).json({ error: 'Tela desconhecida.' })
  const { ds, lojas, f, base } = await contexto(req, req.query)
  res.json({ ...cabecalho(ds, lojas), filtros: f, ...fn(base, f) })
}))

// POST /api/gestor-pecas/ia/analisar { tela, titulo, filtros, codigo? } — o backend recalcula a tela
// (não confia em dados vindos do frontend) e manda só o resumo para a IA
router.post('/ia/analisar', wrap(async (req, res) => {
  const { tela, titulo, filtros, codigo } = req.body || {}
  const { base, f } = await contexto(req, filtros)
  let dados
  if (tela === 'produto') dados = E.telaProduto(base, String(codigo || ''))
  else if (TELAS[tela]) dados = TELAS[tela](base, f)
  if (!dados) return res.status(400).json({ error: 'Tela inválida para análise.' })
  res.json(await analisarTela({ tela, titulo, dados, filtros: f, segmento: req.segmento }))
}))

// POST /api/gestor-pecas/ia/chat { mensagem, historico, filtros }
router.post('/ia/chat', wrap(async (req, res) => {
  const { mensagem, historico, filtros } = req.body || {}
  if (!String(mensagem || '').trim()) return res.status(400).json({ error: 'Campo "mensagem" é obrigatório.' })
  const { base, f, lojas } = await contexto(req, filtros)
  const alertas = E.telaAlertas(base, f)
  const ctx = { lojas, ...contextoTela('alertas', alertas) }
  // Itens citados pelo código na pergunta entram com detalhe
  const codigos = (String(mensagem).match(/\d{5,}/g) || []).slice(0, 3)
  const citados = codigos.map(c => E.telaProduto(base, c)).filter(Boolean)
  if (citados.length) ctx.itens_citados = citados.map(p => contextoTela('produto', p).listas)
  // Resumos rápidos das demais telas
  ctx.reposicao = E.telaReposicao(base, f).kpis
  ctx.excesso_obsoletos = E.telaExcessoObsoletos(base, f).kpis
  ctx.ruptura_por_classe = E.telaCoberturaRuptura(base, f).porClasse
  ctx.demanda = (({ kpis, crescentes, em_queda }) => ({ kpis, crescentes: crescentes.slice(0, 10).map(({ serie12, ...x }) => x), em_queda: em_queda.slice(0, 10).map(({ serie12, ...x }) => x) }))(E.telaDemanda(base, f))
  res.json(await conversar({ mensagem, historico, contexto: ctx, segmento: req.segmento }))
}))

// POST /api/gestor-pecas/snapshot — grava a foto do dia (item × loja) em pec_snapshot_item.
// Fase 1: botão manual sobre os dados simulados; fase 2: node-cron diário.
router.post('/snapshot', wrap(async (req, res) => {
  const sb = getSupabaseAdmin()
  if (!sb) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY não configurada no backend.' })
  const ds = await getDataset(req.segmento)
  const base = E.calcularBase(ds, await getParametros(req.segmento), { lojas: ds.lojas })
  const linhas = E.linhasSnapshot(base).map(l => ({ ...l, segmento: req.segmento }))
  for (let i = 0; i < linhas.length; i += 1000) {
    const { error } = await sb.from('pec_snapshot_item').upsert(linhas.slice(i, i + 1000), { onConflict: 'data,codigo,empresa_nome' })
    if (error) throw new Error(`Falha ao gravar snapshot: ${error.message}`)
  }
  res.json({ ok: true, data: ds.data_base, linhas: linhas.length })
}))

// POST /api/gestor-pecas/simular { parametros } — Configuração de Classificação: antes × depois
router.post('/simular', wrap(async (req, res) => {
  const ds = await getDataset(req.segmento)
  const atuais = await getParametros(req.segmento)
  const lojas = await lojasPermitidas(req, ds)
  res.json(E.simular(ds, atuais, E.mesclarParametros(req.body?.parametros || {}, req.segmento), lojas))
}))

// POST /api/gestor-pecas/fontes/recarregar — relê os relatórios (RPR073 e mês corrente do RPR001)
router.post('/fontes/recarregar', wrap(async (req, res) => {
  if (req.segmento === 'trucks') limparCacheTrucks()
  const ds = await getDataset(req.segmento)
  res.json({ fonte: ds.fonte, gerado_em: ds.gerado_em, origem: ds.origem || null })
}))

// POST /api/gestor-pecas/parametros/recarregar — após salvar Parâmetros no frontend
router.post('/parametros/recarregar', wrap(async (req, res) => {
  delete _params[req.segmento]
  res.json(await getParametros(req.segmento))
}))

// Aquecimento: a 1ª leitura do Dealer.net (RPR073 + 24 meses de RPR001) leva 1–2 min; começa logo
// que o backend sobe para a primeira tela não esperar por isso.
setTimeout(() => {
  getDataset('trucks')
    .then(ds => console.log(`[GestorPecas] Trucks carregado: ${ds.itens.length} itens, ${ds.posicoes.length} posições (${ds.origem?.montado_em_ms ?? '?'} ms)`))
    .catch(e => console.warn('[GestorPecas] aquecimento Trucks falhou:', e.message))
}, 10_000)

export default router
